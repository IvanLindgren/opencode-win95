import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import os from "node:os"

const DEFAULT_ASAR = path.join(
  os.homedir(),
  "AppData",
  "Local",
  "Programs",
  "@opencode-aidesktop",
  "resources",
  "app.asar"
)

const asarPath = process.argv[2] || DEFAULT_ASAR
const backupPath = `${asarPath}.bak`

if (!fs.existsSync(asarPath)) {
  console.error(`ERROR: app.asar not found at ${asarPath}`)
  process.exit(1)
}

// 1. Create untouched backup once (or if someone restored/updated and deleted .bak)
if (!fs.existsSync(backupPath)) {
  console.log(`Creating untouched backup: ${backupPath}`)
  fs.copyFileSync(asarPath, backupPath)
} else {
  console.log(`Using existing original backup: ${backupPath}`)
}

// 2. Read header and payload metadata from untouched backup
const srcFd = fs.openSync(backupPath, "r")
const srcStat = fs.fstatSync(srcFd)
const prefixBuf = Buffer.alloc(16)
fs.readSync(srcFd, prefixBuf, 0, 16, 0)

const oldHeaderPickleSize = prefixBuf.readUInt32LE(4)
const oldJsonSize = prefixBuf.readUInt32LE(12)
const oldDataOffset = 8 + oldHeaderPickleSize
const oldPayloadSize = srcStat.size - oldDataOffset

const oldJsonBuf = Buffer.alloc(oldJsonSize)
fs.readSync(srcFd, oldJsonBuf, 0, oldJsonSize, 16)
const header = JSON.parse(oldJsonBuf.toString("utf8"))

function getEntry(relPath) {
  const parts = relPath.split("/")
  let cur = header
  for (const p of parts) {
    if (!cur.files || !cur.files[p]) {
      throw new Error(`Entry not found in app.asar: ${relPath}`)
    }
    cur = cur.files[p]
  }
  return cur
}

function readEntryText(relPath) {
  const entry = getEntry(relPath)
  const buf = Buffer.alloc(entry.size)
  fs.readSync(srcFd, buf, 0, entry.size, oldDataOffset + Number(entry.offset))
  return buf.toString("utf8")
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

function replaceOnce(source, target, replacement, label) {
  const idx = source.indexOf(target)
  if (idx === -1) {
    throw new Error(`Patch anchor not found [${label}]`)
  }
  return source.slice(0, idx) + replacement + source.slice(idx + target.length)
}

// 3. Patch out/main/index.js
let mainJs = readEntryText("out/main/index.js")

// 3a. Serve /win95/* live from ~/.config/opencode/win95-theme
mainJs = replaceOnce(
  mainJs,
  `    const file = resolve(rendererRoot, \`.\${decodeURIComponent(url.pathname)}\`);`,
  `    if (url.pathname.startsWith("/win95/")) {
      const w95Root = join(homedir(), ".config", "opencode", "win95-theme");
      const w95File = resolve(w95Root, \`.\${decodeURIComponent(url.pathname.slice("/win95".length))}\`);
      const w95Rel = relative(w95Root, w95File);
      if (w95Rel.startsWith("..") || isAbsolute(w95Rel) || !existsSync(w95File)) {
        return new Response("Not found", { status: 404 });
      }
      try {
        const w95Resp = await net.fetch(pathToFileURL(w95File).toString());
        const w95Hdrs = new Headers(w95Resp.headers);
        w95Hdrs.set("Cache-Control", "no-store");
        return new Response(w95Resp.body, { status: w95Resp.status, statusText: w95Resp.statusText, headers: w95Hdrs });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    }
    const file = resolve(rendererRoot, \`.\${decodeURIComponent(url.pathname)}\`);`,
  "main/registerRendererProtocol"
)

// 3b. Remove native Windows 11 titleBarOverlay so Win95 chrome isn't overlaid by Win11 buttons
mainJs = replaceOnce(
  mainJs,
  `    ...process.platform === "win32" ? {
      frame: false,
      titleBarStyle: "hidden",
      titleBarOverlay: overlay({ mode })
    } : {},`,
  `    ...process.platform === "win32" ? {
      frame: false,
      titleBarStyle: "hidden"
    } : {},`,
  "main/createMainWindow-win32"
)

// 3c. Use teal startup background when Win95 is enabled
mainJs = replaceOnce(
  mainJs,
  `    backgroundColor: backgroundColor ?? defaultBackgroundColor(),`,
  `    backgroundColor: (() => {
      try {
        const p = join(homedir(), ".config", "opencode", "win95-theme", "state.json");
        if (existsSync(p)) {
          const st = JSON.parse(readFileSync(p, "utf8"));
          if (st.enabled !== false) return "#008080";
        } else {
          return "#008080";
        }
      } catch {}
      return backgroundColor ?? defaultBackgroundColor();
    })(),`,
  "main/backgroundColor"
)

// 3d. Forward maximize/unmaximize state to renderer
mainJs = replaceOnce(
  mainJs,
  `  wireZoom(win);`,
  `  wireZoom(win);
  win.on("maximize", () => { try { win.webContents.send("win95-maximized"); } catch {} });
  win.on("unmaximize", () => { try { win.webContents.send("win95-unmaximized"); } catch {} });`,
  "main/wireZoom"
)

// 3e. Guard setTitleBarOverlay so it never throws when titleBarOverlay is omitted
mainJs = replaceOnce(
  mainJs,
  `function updateTitlebar(win) {
  if (process.platform !== "win32") return;
  win.setTitleBarOverlay(overlay(titlebarThemes.get(win), win.webContents.getZoomFactor()));
}`,
  `function updateTitlebar(win) {
  if (process.platform !== "win32") return;
  try {
    win.setTitleBarOverlay(overlay(titlebarThemes.get(win), win.webContents.getZoomFactor()));
  } catch {}
}`,
  "main/updateTitlebar"
)

// 3f. Register Win95 IPC handlers
mainJs = replaceOnce(
  mainJs,
  `  ipcMain.handle("run-desktop-menu-action", (event, action) => {
    runDesktopMenuAction(BrowserWindow.fromWebContents(event.sender), action, {
      checkForUpdates: () => void deps.showUpdater(),
      relaunch: deps.relaunch
    });
  });`,
  `  ipcMain.handle("run-desktop-menu-action", (event, action) => {
    runDesktopMenuAction(BrowserWindow.fromWebContents(event.sender), action, {
      checkForUpdates: () => void deps.showUpdater(),
      relaunch: deps.relaunch
    });
  });
  ipcMain.handle("win95-trigger-command", (event, id) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && typeof id === "string") sendMenuCommand(win, id);
  });
  ipcMain.handle("win95-is-maximized", (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });
  ipcMain.handle("win95-get-state", () => {
    try {
      const p = join(homedir(), ".config", "opencode", "win95-theme", "state.json");
      if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
    } catch {}
    return null;
  });
  ipcMain.handle("win95-set-state", (_event, next) => {
    try {
      const dir = join(homedir(), ".config", "opencode", "win95-theme");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "state.json"), JSON.stringify(next, null, 2), "utf8");
    } catch {}
    return next;
  });
  ipcMain.handle("win95-get-system-info", () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    arch: process.arch,
    user: (() => { try { return userInfo().username; } catch { return "User"; } })(),
    platform: process.platform
  }));`,
  "main/ipc-win95"
)

// 4. Patch out/preload/index.js
let preloadJs = readEntryText("out/preload/index.js")
preloadJs = replaceOnce(
  preloadJs,
  `  setNativeTranslations: (bundle) => electron.ipcRenderer.invoke("set-native-translations", bundle)
};`,
  `  setNativeTranslations: (bundle) => electron.ipcRenderer.invoke("set-native-translations", bundle),
  win95: {
    triggerCommand: (id) => electron.ipcRenderer.invoke("win95-trigger-command", id),
    isMaximized: () => electron.ipcRenderer.invoke("win95-is-maximized"),
    getState: () => electron.ipcRenderer.invoke("win95-get-state"),
    setState: (state) => electron.ipcRenderer.invoke("win95-set-state", state),
    getSystemInfo: () => electron.ipcRenderer.invoke("win95-get-system-info"),
    onMaximizedChange: (cb) => {
      const onMax = () => cb(true);
      const onUnmax = () => cb(false);
      electron.ipcRenderer.on("win95-maximized", onMax);
      electron.ipcRenderer.on("win95-unmaximized", onUnmax);
      return () => {
        electron.ipcRenderer.removeListener("win95-maximized", onMax);
        electron.ipcRenderer.removeListener("win95-unmaximized", onUnmax);
      };
    }
  }
};`,
  "preload/api"
)

// 5. Patch out/renderer/index.html
let indexHtml = readEntryText("out/renderer/index.html")
indexHtml = replaceOnce(
  indexHtml,
  `</head>`,
  `    <link id="win95-theme-css" rel="stylesheet" href="./win95/win95.css" />
    <script src="./win95/win95-boot.js"></script>
  </head>`,
  "renderer/index.html-head"
)
indexHtml = replaceOnce(
  indexHtml,
  `</body>`,
  `    <script type="module" src="./win95/win95.js"></script>
  </body>`,
  "renderer/index.html-body"
)

// 6. Append patched file buffers cleanly & update header entries
const replacements = [
  { relPath: "out/main/index.js", buf: Buffer.from(mainJs, "utf8") },
  { relPath: "out/preload/index.js", buf: Buffer.from(preloadJs, "utf8") },
  { relPath: "out/renderer/index.html", buf: Buffer.from(indexHtml, "utf8") }
]

let nextOffset = oldPayloadSize
for (const item of replacements) {
  const entry = getEntry(item.relPath)
  entry.offset = String(nextOffset)
  entry.size = item.buf.length
  entry.integrity = computeIntegrity(item.buf)
  nextOffset += item.buf.length
}

const newJsonBuf = Buffer.from(JSON.stringify(header), "utf8")
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

// Write new ASAR header
fs.writeSync(outFd, newPrefix)
fs.writeSync(outFd, newJsonBuf)
if (padLen > 0) fs.writeSync(outFd, Buffer.alloc(padLen, 0))

// Stream original payload verbatim
const chunkBuf = Buffer.alloc(4 * 1024 * 1024)
let remaining = oldPayloadSize
let readPos = oldDataOffset
while (remaining > 0) {
  const toRead = Math.min(chunkBuf.length, remaining)
  const n = fs.readSync(srcFd, chunkBuf, 0, toRead, readPos)
  if (n <= 0) break
  fs.writeSync(outFd, chunkBuf, 0, n)
  readPos += n
  remaining -= n
}

// Write appended patched entries
for (const item of replacements) {
  fs.writeSync(outFd, item.buf)
}

fs.closeSync(srcFd)
fs.closeSync(outFd)

// Replace live app.asar atomically
fs.renameSync(tmpPath, asarPath)
console.log("SUCCESS: OpenCode Desktop app.asar patched cleanly with OpenCode 95 hooks!")
console.log("  Backup preserved at:", backupPath)
console.log("  Theme directory:    ", path.join(os.homedir(), ".config", "opencode", "win95-theme"))
