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

function isAsarPatched(filePath) {
  let asar
  try {
    asar = openAsar(filePath)
    const html = readEntryText(asar, "out/renderer/index.html") || ""
    const main = readEntryText(asar, "out/main/index.js") || ""
    return html.includes("./win95/win95.js") && main.includes("win95-trigger-command")
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

// Fast 15ms status check mode for guard/launcher
if (checkOnly) {
  process.exit(isAsarPatched(asarPath) ? 0 : 2)
}

// Always refresh backup when live app.asar is unpatched (e.g., right after an OpenCode update!)
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

function replaceMatch(source, pattern, replacement, label, optional = false) {
  if (typeof pattern === "string") {
    const idx = source.indexOf(pattern)
    if (idx === -1) {
      if (optional) {
        console.warn(`WARN: Optional anchor skipped [${label}]`)
        return source
      }
      throw new Error(`Patch anchor not found [${label}]`)
    }
    return source.slice(0, idx) + replacement + source.slice(idx + pattern.length)
  }
  const m = source.match(pattern)
  if (!m) {
    if (optional) {
      console.warn(`WARN: Optional regex anchor skipped [${label}]`)
      return source
    }
    throw new Error(`Patch regex anchor not found [${label}]`)
  }
  return source.replace(pattern, replacement)
}

// 1. Patch out/main/index.js
let mainJs = readEntryText(src, "out/main/index.js")
if (!mainJs) throw new Error("out/main/index.js not found in app.asar")

// 1a. Serve /win95/* live from ~/.config/opencode/win95-theme
mainJs = replaceMatch(
  mainJs,
  /const file = resolve\(rendererRoot, `\.\$\{decodeURIComponent\(url\.pathname\)\}`\);/,
  `if (url.pathname.startsWith("/win95/")) {
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
    $&`,
  "main/registerRendererProtocol"
)

// 1b. Remove native Windows 11 titleBarOverlay so Win95 chrome isn't overlaid by Win11 buttons
mainJs = replaceMatch(
  mainJs,
  /\.\.\.process\.platform === "win32" \? \{\s*frame: false,\s*titleBarStyle: "hidden",\s*titleBarOverlay: overlay\(\{ mode \}\)\s*\} : \{\},/,
  `...process.platform === "win32" ? {
      frame: false,
      titleBarStyle: "hidden"
    } : {},`,
  "main/createMainWindow-win32"
)

// 1c. Use teal startup background when Win95 is enabled
mainJs = replaceMatch(
  mainJs,
  /backgroundColor: backgroundColor \?\? defaultBackgroundColor\(\),/,
  `backgroundColor: (() => {
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
  "main/backgroundColor",
  true
)

// 1d. Forward maximize/unmaximize state to renderer
mainJs = replaceMatch(
  mainJs,
  /  wireZoom\(win\);/,
  `  wireZoom(win);
  win.on("maximize", () => { try { win.webContents.send("win95-maximized"); } catch {} });
  win.on("unmaximize", () => { try { win.webContents.send("win95-unmaximized"); } catch {} });`,
  "main/wireZoom",
  true
)

// 1e. Guard setTitleBarOverlay so it never throws when titleBarOverlay is omitted
mainJs = replaceMatch(
  mainJs,
  /function updateTitlebar\(win\) \{\s*if \(process\.platform !== "win32"\) return;\s*win\.setTitleBarOverlay\(overlay\(titlebarThemes\.get\(win\), win\.webContents\.getZoomFactor\(\)\)\);\s*\}/,
  `function updateTitlebar(win) {
  if (process.platform !== "win32") return;
  try {
    win.setTitleBarOverlay(overlay(titlebarThemes.get(win), win.webContents.getZoomFactor()));
  } catch {}
}`,
  "main/updateTitlebar"
)

// 1f. Register Win95 IPC handlers
mainJs = replaceMatch(
  mainJs,
  /ipcMain\.handle\("run-desktop-menu-action",[\s\S]*?\}\);/,
  `$&
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

// 2. Patch out/preload/index.js
let preloadJs = readEntryText(src, "out/preload/index.js")
if (!preloadJs) throw new Error("out/preload/index.js not found in app.asar")

preloadJs = replaceMatch(
  preloadJs,
  /\n\};\s*\nelectron\.contextBridge\.exposeInMainWorld\("api", api\);/,
  `,
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
};
electron.contextBridge.exposeInMainWorld("api", api);`,
  "preload/api"
)

// 3. Patch out/renderer/index.html
let indexHtml = readEntryText(src, "out/renderer/index.html")
if (!indexHtml) throw new Error("out/renderer/index.html not found in app.asar")

indexHtml = replaceMatch(
  indexHtml,
  `</head>`,
  `    <link id="win95-theme-css" rel="stylesheet" href="./win95/win95.css" />
    <script src="./win95/win95-boot.js"></script>
  </head>`,
  "renderer/index.html-head"
)
indexHtml = replaceMatch(
  indexHtml,
  `</body>`,
  `    <script type="module" src="./win95/win95.js"></script>
  </body>`,
  "renderer/index.html-body"
)

// 4. Route OpenCode's notification audio through the Win95 sound scheme (resilient to minified variable renames)
const replacements = [
  { relPath: "out/main/index.js", buf: Buffer.from(mainJs, "utf8") },
  { relPath: "out/preload/index.js", buf: Buffer.from(preloadJs, "utf8") },
  { relPath: "out/renderer/index.html", buf: Buffer.from(indexHtml, "utf8") }
]

const rendererScript = indexHtml.match(/\bsrc="\.\/(assets\/main-[\w-]+\.js)"/)
if (rendererScript) {
  const rendererPath = `out/renderer/${rendererScript[1]}`
  let rendererJs = readEntryText(src, rendererPath)
  if (rendererJs) {
    const origRenderer = rendererJs
    rendererJs = replaceMatch(
      rendererJs,
      /function playSoundById\((\w+)\) \{\s*return soundSrc\(\1\)\.then\(\(src\) => playSound\(src\)\);\s*\}/,
      `function win95NotificationMode() {
  return document.documentElement.dataset.win95 === "on";
}
async function playSoundById($1, event) {
  if (!win95NotificationMode()) return soundSrc($1).then((src) => playSound(src));
  if (document.documentElement.dataset.win95Sounds === "off" || !$1 || $1 === "none") return;
  const cue = event === "complete" ? "chimes"
    : event === "prompt" ? "ding"
    : event === "error" ? "chord"
    : $1 === "staplebops-02" || /^(alert|bip-bop)-/.test($1) ? "ding"
    : $1.startsWith("nope-") ? "chord" : "chimes";
  return playSound("/win95/sounds/" + cue + ".wav");
}`,
      "renderer/Win95 sound playback",
      true
    )
    for (const [setting, event] of Object.entries({ agent: "complete", permissions: "prompt", errors: "error" })) {
      rendererJs = replaceMatch(
        rendererJs,
        `playSoundById(settings.sounds.${setting}())`,
        `playSoundById(settings.sounds.${setting}(), "${event}")`,
        `renderer/${setting} sound`,
        true
      )
    }
    rendererJs = replaceMatch(
      rendererJs,
      /(if \(\w+\.details\.type === "question\.asked"\) \{\s*)(if \(settings\.notifications\.agent\(\)\))/,
      `$1if (win95NotificationMode() && settings.sounds.permissionsEnabled()) {
          void playSoundById(settings.sounds.permissions(), "prompt");
        }
        $2`,
      "renderer/question sound",
      true
    )
    rendererJs = replaceMatch(
      rendererJs,
      /(const notification = new Notification\(title, \{\s*)(body: description \?\? "",)/,
      `$1...(win95NotificationMode() ? { silent: true } : {}),
        $2`,
      "renderer/silent Windows toast in Win95 mode",
      true
    )
    if (rendererJs !== origRenderer) {
      replacements.push({ relPath: rendererPath, buf: Buffer.from(rendererJs, "utf8") })
    }
  }
}

// 5. Append patched file buffers cleanly & update header entries
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
console.log(`SUCCESS: OpenCode Desktop v${liveVer} patched cleanly (${replacements.length} files hooked).`)
