import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import net from "node:net"
import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const themeDir = path.dirname(fileURLToPath(import.meta.url))
const asar = path.resolve(
  process.argv[2] || path.join(process.env.LOCALAPPDATA, "Programs", "@opencode-aidesktop", "resources", "app.asar")
)
const dir = path.dirname(asar)
const name = path.basename(asar).toLowerCase()
const log = path.join(themeDir, "guard.log")
const scope = createHash("sha256").update(`${os.homedir()}\0${asar}`.toLowerCase()).digest("hex").slice(0, 24)
// A named pipe is an OS-owned singleton lock: no TCP listener, commands, or stale lock file.
const lock = net.createServer((socket) => socket.destroy())

function writeLog(message) {
  try {
    if (fs.existsSync(log) && fs.statSync(log).size > 131072) fs.truncateSync(log)
    fs.appendFileSync(log, `[${new Date().toISOString()}] [guard] ${message}\n`)
  } catch {}
}

function stamp() {
  try {
    const stat = fs.statSync(asar)
    return `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`
  } catch {
    return ""
  }
}

function run(exe, args) {
  return new Promise((resolve) => {
    const child = spawn(exe, args, { windowsHide: true, stdio: "ignore" })
    child.once("error", () => resolve(null))
    child.once("close", (code) => resolve(code))
  })
}

let watcher
let timer
let busy = false
let checkedStamp = ""

function schedule(delay = 1200) {
  clearTimeout(timer)
  timer = setTimeout(check, delay)
}

function watch() {
  if (watcher) return
  try {
    const current = fs.watch(dir, (_event, changed) => {
      if (!changed || changed.toLowerCase() === name) schedule()
    })
    watcher = current
    current.on("error", () => current.close())
    current.on("close", () => {
      if (watcher === current) watcher = undefined
    })
  } catch {
    // The installer may temporarily remove the directory. The heartbeat retries.
  }
}

async function check() {
  if (busy) return
  const observed = stamp()
  if (!observed) {
    checkedStamp = ""
    return
  }
  if (observed === checkedStamp) return
  busy = true
  try {
    const status = await run(process.execPath, [path.join(themeDir, "patch-asar.mjs"), "--check", asar])
    if (stamp() !== observed) return
    if (status === 2) {
      writeLog("Unpatched app.asar detected; running repair.")
      const result = await run("powershell.exe", [
        "-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass",
        "-File", path.join(themeDir, "ensure-patched.ps1"),
        "-AsarPath", asar, "-RelaunchIfRunning", "-RepairShortcuts",
      ])
      if (result !== 0) {
        checkedStamp = stamp()
        writeLog(`Auto-patch failed (${result}); pausing retries until app.asar changes.`)
        return
      }
    } else if (status !== 0) {
      writeLog(`ASAR check failed (${status}); pausing retries until app.asar changes.`)
    }
    checkedStamp = observed
  } finally {
    busy = false
    if (stamp() !== checkedStamp) schedule()
  }
}

lock.on("error", (error) => {
  if (error.code !== "EADDRINUSE") {
    writeLog(`Update guard could not start: ${error.message}`)
    process.exitCode = 1
  }
})
lock.listen(`\\\\.\\pipe\\OpenCodeWin95Guard-${scope}`, () => {
  writeLog(`Win95 update guard started (PID ${process.pid}), watching ${asar}`)
  watch()
  schedule(0)
  // Recover from missed filesystem notifications without re-reading an unchanged archive.
  setInterval(() => {
    watch()
    if (stamp() !== checkedStamp && !busy) schedule()
  }, 20000)
})
