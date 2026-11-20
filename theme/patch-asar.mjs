import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import os from "node:os"
import { spawnSync } from "node:child_process"

const DEFAULT_ASAR = path.join(
  os.homedir(),
  "AppData",
  "Local",
  "Programs",
  "@opencode-aidesktop",
  "resources",
  "app.asar"
)

const args = process.argv.slice(2)
const checkOnly = args.includes("--check")
const asarPath = args.find((a) => !a.startsWith("--")) || DEFAULT_ASAR
const backupPath = `${asarPath}.bak`

if (!fs.existsSync(asarPath)) {
  console.error(`ERROR: app.asar not found at ${asarPath}`)
  process.exit(1)
}

function openAsar(filePath) {
  const fd = fs.openSync(filePath, "r")
  const stat = fs.fstatSync(fd)
  const prefixBuf = Buffer.alloc(16)
  fs.readSync(fd, prefixBuf, 0, 16, 0)
  const headerPickleSize = prefixBuf.readUInt32LE(4)
  const jsonSize = prefixBuf.readUInt32LE(12)
  const dataOffset = 8 + headerPickleSize
  const payloadSize = stat.size - dataOffset
  const jsonBuf = Buffer.alloc(jsonSize)
  fs.readSync(fd, jsonBuf, 0, jsonSize, 16)
  const header = JSON.parse(jsonBuf.toString("utf8"))
  return { fd, stat, dataOffset, payloadSize, header }
}

function getEntry(header, relPath) {
  let cur = header
  for (const p of relPath.split("/")) {
    if (!cur.files || !cur.files[p]) return null
    cur = cur.files[p]
  }
  return cur
}

function readEntryText(asar, relPath) {
  const entry = getEntry(asar.header, relPath)
  if (!entry) return null
  const buf = Buffer.alloc(entry.size)
  fs.readSync(asar.fd, buf, 0, entry.size, asar.dataOffset + Number(entry.offset))
  return buf.toString("utf8")
}

function resolveMainPath(asar) {
  try {
    const pkg = JSON.parse(readEntryText(asar, "package.json") || "{}")
    if (pkg.main) return pkg.main.replace(/^\.\//, "")
  } catch {}
  return "out/main/index.js"
}

function resolvePreloadPath(asar) {
  for (const candidate of ["out/preload/index.cjs", "out/preload/index.js", "out/preload/index.mjs"]) {
    if (getEntry(asar.header, candidate)) return candidate
  }
  return null
}

function isAsarPatched(filePath) {
  let asar
  try {
    asar = openAsar(filePath)
    const html = readEntryText(asar, "out/renderer/index.html") || ""
    const main = readEntryText(asar, resolveMainPath(asar)) || ""
    return html.includes("win95://theme/win95.js") && main.includes("__OPENCODE_WIN95_MAIN_HOOK__")
  } catch {
    return false
  } finally {
    if (asar) fs.closeSync(asar.fd)
  }
}

function readVersion(filePath) {
  let asar
  try {
    asar = openAsar(filePath)
    const pkg = JSON.parse(readEntryText(asar, "package.json") || "{}")
    return pkg.version || "unknown"
  } catch {
    return "unknown"
  } finally {
    if (asar) fs.closeSync(asar.fd)
  }
}

// Fast ~50ms check mode used by guard & launcher
if (checkOnly) {
  process.exit(isAsarPatched(asarPath) ? 0 : 2)
}

// Refresh backup whenever live app.asar is unpatched or updated to a newer version
const livePatched = isAsarPatched(asarPath)
const liveVer = readVersion(asarPath)
if (!livePatched || !fs.existsSync(backupPath)) {
  console.log(`Saving clean backup for OpenCode v${liveVer}: ${backupPath}`)
  fs.copyFileSync(asarPath, backupPath)
} else {
  const bakVer = readVersion(backupPath)
  if (bakVer !== liveVer) {
    console.log(`Version changed (${bakVer} -> ${liveVer}), refreshing backup...`)
    fs.copyFileSync(asarPath, backupPath)
  } else {
    console.log(`Using clean backup (v${bakVer}): ${backupPath}`)
  }
}

const src = openAsar(backupPath)
const mainRelPath = resolveMainPath(src)
const preloadRelPath = resolvePreloadPath(src)
const htmlRelPath = "out/renderer/index.html"

if (!preloadRelPath) {
  throw new Error("Could not find preload entry in out/preload/")
}

function computeIntegrity(buf) {
  const blockSize = 4194304
  const hash = crypto.createHash("sha256").update(buf).digest("hex")
  const blocks = []
  if (buf.length === 0) {
    blocks.push(crypto.createHash("sha256").update(Buffer.alloc(0)).digest("hex"))
  } else {
    for (let i = 0; i < buf.length; i += blockSize) {
      blocks.push(crypto.createHash("sha256").update(buf.subarray(i, i + blockSize)).digest("hex"))
    }
  }
  return { algorithm: "SHA256", hash, blockSize, blocks }
}

// ============================================================================
// 1. Version-agnostic main process hook (uses ONLY official Electron APIs!)
//    Works on OpenCode 1.x, 2.x, 2.3.2, and future releases regardless of bundler.
// ============================================================================
const MAIN_HOOK = `/* __OPENCODE_WIN95_MAIN_HOOK__ */
import { app as __w95App, BrowserWindow as __w95BW, ipcMain as __w95Ipc, net as __w95Net, protocol as __w95Proto } from "electron";
import * as __w95Fs from "node:fs";
import * as __w95Path from "node:path";
import * as __w95Os from "node:os";
import { pathToFileURL as __w95ToUrl } from "node:url";

;(function __initOpenCodeWin95Main() {
  const w95Dir = () => __w95Path.join(__w95Os.homedir(), ".config", "opencode", "win95-theme");
  const w95ReadState = () => {
    try {
      const p = __w95Path.join(w95Dir(), "state.json");
      if (__w95Fs.existsSync(p)) return JSON.parse(__w95Fs.readFileSync(p, "utf8"));
    } catch {}
    return { enabled: true };
  };

  try {
    const w95Scheme = {
      scheme: "win95",
      privileges: {
        secure: true,
        standard: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true
      }
    };
    const origReg = __w95Proto.registerSchemesAsPrivileged.bind(__w95Proto);
    __w95Proto.registerSchemesAsPrivileged = (list) => {
      const arr = Array.isArray(list) ? list.slice() : [];
      if (!arr.some((s) => s && s.scheme === "win95")) arr.push(w95Scheme);
      return origReg(arr);
    };
  } catch {}

  __w95App.whenReady().then(() => {
    try {
      if (!__w95Proto.isProtocolHandled("win95")) {
        __w95Proto.handle("win95", async (request) => {
          const url = new URL(request.url);
          if (url.host !== "theme") return new Response("Not found", { status: 404 });
          const root = w95Dir();
          const file = __w95Path.resolve(root, "." + decodeURIComponent(url.pathname));
          const rel = __w95Path.relative(root, file);
          if (rel.startsWith("..") || __w95Path.isAbsolute(rel) || !__w95Fs.existsSync(file)) {
            return new Response("Not found", { status: 404 });
          }
          try {
            const resp = await __w95Net.fetch(__w95ToUrl(file).toString());
            const hdrs = new Headers(resp.headers);
            hdrs.set("Cache-Control", "no-store");
            hdrs.set("Access-Control-Allow-Origin", "*");
            return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: hdrs });
          } catch {
            return new Response("Not found", { status: 404 });
          }
        });
      }
    } catch {}
  });

  __w95App.on("browser-window-created", (_event, win) => {
    try {
      if (process.platform === "win32") {
        // Prevent any OpenCode chunk from throwing when native titleBarOverlay is stripped
        win.setTitleBarOverlay = () => {};
      }
      const st = w95ReadState();
      if (st && st.enabled !== false) {
        try { win.setBackgroundColor("#008080"); } catch {}
      }
      win.on("maximize", () => { try { win.webContents.send("win95-maximized"); } catch {} });
      win.on("unmaximize", () => { try { win.webContents.send("win95-unmaximized"); } catch {} });
    } catch {}
  });

  __w95Ipc.handle("win95-trigger-command", (event, id) => {
    const win = __w95BW.fromWebContents(event.sender);
    if (win && typeof id === "string") {
      try { win.webContents.send("menu-command", id); } catch {}
    }
  });

  __w95Ipc.handle("win95-host-action", (event, action) => {
    const win = __w95BW.fromWebContents(event.sender);
    if (!win) return;
    switch (action) {
      case "window.minimize": win.minimize(); break;
      case "window.toggleMaximize": win.isMaximized() ? win.unmaximize() : win.maximize(); break;
      case "window.close": win.close(); break;
      case "app.relaunch": __w95App.relaunch(); __w95App.exit(0); break;
      case "view.reload": win.reload(); break;
      case "view.toggleDevTools": win.webContents.toggleDevTools(); break;
      case "view.resetZoom": win.webContents.setZoomFactor(1); break;
      case "view.zoomIn": win.webContents.setZoomFactor(Math.min(3, (win.webContents.getZoomFactor() || 1) + 0.15)); break;
      case "view.zoomOut": win.webContents.setZoomFactor(Math.max(0.5, (win.webContents.getZoomFactor() || 1) - 0.15)); break;
      case "view.toggleFullscreen": win.setFullScreen(!win.isFullScreen()); break;
      case "edit.undo": win.webContents.undo(); break;
      case "edit.redo": win.webContents.redo(); break;
      case "edit.cut": win.webContents.cut(); break;
      case "edit.copy": win.webContents.copy(); break;
      case "edit.paste": win.webContents.paste(); break;
      case "edit.delete": win.webContents.delete(); break;
      case "edit.selectAll": win.webContents.selectAll(); break;
    }
  });

  __w95Ipc.handle("win95-is-maximized", (event) => {
    return __w95BW.fromWebContents(event.sender)?.isMaximized() ?? false;
  });

  __w95Ipc.handle("win95-get-state", () => w95ReadState());

  __w95Ipc.handle("win95-set-state", (_event, next) => {
    try {
      const dir = w95Dir();
      __w95Fs.mkdirSync(dir, { recursive: true });
      __w95Fs.writeFileSync(__w95Path.join(dir, "state.json"), JSON.stringify(next, null, 2), "utf8");
    } catch {}
    return next;
  });

  __w95Ipc.handle("win95-get-system-info", () => ({
    version: __w95App.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    arch: process.arch,
    user: (() => { try { return __w95Os.userInfo().username; } catch { return "User"; } })(),
    platform: process.platform
  }));
})();
`

let mainJs = readEntryText(src, mainRelPath)
if (!mainJs) throw new Error(`${mainRelPath} not found in app.asar`)

// Safely disable native Win11 titleBarOverlay in both v1.x (object literal) and v2.x (assignment)
mainJs = mainJs
  .replace(/(\btitleBarOverlay\s*:\s*)(?:[\w$.]+\([^()]*\)|\{[^{}]*\})/g, "$1false")
  .replace(/(\btitleBarOverlay\s*=\s*)(?:[\w$.]+\([^()]*\)|\{[^{}]*\})/g, "$1!1")

mainJs = MAIN_HOOK + "\n" + mainJs

// Syntax-validate patched mainJs before ever touching app.asar
const syntaxTmp = path.join(os.tmpdir(), `opencode-win95-syntax-${process.pid}.mjs`)
try {
  fs.writeFileSync(syntaxTmp, mainJs, "utf8")
  const chk = spawnSync(process.execPath, ["--check", syntaxTmp], { encoding: "utf8" })
  if (chk.status !== 0) {
    throw new Error(`Patched mainJs failed syntax check:\n${chk.stderr || chk.stdout}`)
  }
} finally {
  try { fs.unlinkSync(syntaxTmp) } catch {}
}

// ============================================================================
// 2. Version-agnostic preload append (zero anchors, works on .cjs and .js!)
// ============================================================================
let preloadJs = readEntryText(src, preloadRelPath)
if (!preloadJs) throw new Error(`${preloadRelPath} not found in app.asar`)

const PRELOAD_APPEND = `
;/* __OPENCODE_WIN95_PRELOAD_HOOK__ */
(function(){
  try {
    const __el = require("electron");
    __el.contextBridge.exposeInMainWorld("win95Api", {
      triggerCommand: (id) => __el.ipcRenderer.invoke("win95-trigger-command", id),
      runHostAction: (action) => __el.ipcRenderer.invoke("win95-host-action", action),
      isMaximized: () => __el.ipcRenderer.invoke("win95-is-maximized"),
      getState: () => __el.ipcRenderer.invoke("win95-get-state"),
      setState: (state) => __el.ipcRenderer.invoke("win95-set-state", state),
      getSystemInfo: () => __el.ipcRenderer.invoke("win95-get-system-info"),
      onMaximizedChange: (cb) => {
        const onMax = () => cb(true);
        const onUnmax = () => cb(false);
        __el.ipcRenderer.on("win95-maximized", onMax);
        __el.ipcRenderer.on("win95-unmaximized", onUnmax);
        return () => {
          __el.ipcRenderer.removeListener("win95-maximized", onMax);
          __el.ipcRenderer.removeListener("win95-unmaximized", onUnmax);
        };
      }
    });
  } catch {}
})();
`
preloadJs = preloadJs + PRELOAD_APPEND

// ============================================================================
// 3. Renderer index.html injection via win95://theme/ protocol
// ============================================================================
let indexHtml = readEntryText(src, htmlRelPath)
if (!indexHtml) throw new Error(`${htmlRelPath} not found in app.asar`)

if (!indexHtml.includes("</head>") || !indexHtml.includes("</body>")) {
  throw new Error("Unexpected index.html structure")
}

indexHtml = indexHtml.replace(
  "</head>",
  `    <link id="win95-theme-css" rel="stylesheet" href="win95://theme/win95.css" />
    <script src="win95://theme/win95-boot.js"></script>
  </head>`
)
indexHtml = indexHtml.replace(
  "</body>",
  `    <script type="module" src="win95://theme/win95.js"></script>
  </body>`
)

// ============================================================================
// 4. Write patched ASAR atomically
// ============================================================================
const replacements = [
  { relPath: mainRelPath, buf: Buffer.from(mainJs, "utf8") },
  { relPath: preloadRelPath, buf: Buffer.from(preloadJs, "utf8") },
  { relPath: htmlRelPath, buf: Buffer.from(indexHtml, "utf8") }
]

let nextOffset = src.payloadSize
for (const item of replacements) {
  const entry = getEntry(src.header, item.relPath)
  if (!entry) throw new Error(`Missing ASAR entry: ${item.relPath}`)
  entry.offset = String(nextOffset)
  entry.size = item.buf.length
  entry.integrity = computeIntegrity(item.buf)
  nextOffset += item.buf.length
}

const newJsonBuf = Buffer.from(JSON.stringify(src.header), "utf8")
const alignedJsonLen = (newJsonBuf.length + 3) & ~3
const padLen = alignedJsonLen - newJsonBuf.length
const newHeaderInnerSize = 4 + alignedJsonLen
const newHeaderPickleSize = 4 + newHeaderInnerSize

const newPrefix = Buffer.alloc(16)
newPrefix.writeUInt32LE(4, 0)
newPrefix.writeUInt32LE(newHeaderPickleSize, 4)
newPrefix.writeUInt32LE(newHeaderInnerSize, 8)
newPrefix.writeUInt32LE(newJsonBuf.length, 12)

const tmpPath = `${asarPath}.win95.tmp`
const outFd = fs.openSync(tmpPath, "w")

fs.writeSync(outFd, newPrefix)
fs.writeSync(outFd, newJsonBuf)
if (padLen > 0) fs.writeSync(outFd, Buffer.alloc(padLen, 0))

const chunkBuf = Buffer.alloc(4 * 1024 * 1024)
let remaining = src.payloadSize
let readPos = src.dataOffset
while (remaining > 0) {
  const toRead = Math.min(chunkBuf.length, remaining)
  const n = fs.readSync(src.fd, chunkBuf, 0, toRead, readPos)
  if (n <= 0) break
  fs.writeSync(outFd, chunkBuf, 0, n)
  readPos += n
  remaining -= n
}

for (const item of replacements) {
  fs.writeSync(outFd, item.buf)
}

fs.closeSync(src.fd)
fs.closeSync(outFd)

fs.renameSync(tmpPath, asarPath)
console.log(`SUCCESS: OpenCode Desktop v${liveVer} patched cleanly (universal hook: ${mainRelPath}, ${preloadRelPath}, ${htmlRelPath}).`)
