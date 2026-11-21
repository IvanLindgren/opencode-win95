import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"

assert.equal(process.platform, "win32", "The guard installer test requires Windows.")
const native = process.argv.includes("--native")
const source = fileURLToPath(new URL("../", import.meta.url))
const preferredTemp = path.join(os.tmpdir(), "opencode")
const dir = fs.mkdtempSync(path.join(fs.existsSync(preferredTemp) ? preferredTemp : os.tmpdir(), "win95 install test-"))
const env = {
  ...process.env,
  USERPROFILE: path.join(dir, "Test Pröfile"),
  APPDATA: path.join(dir, "Test Roaming"),
  LOCALAPPDATA: path.join(dir, "Test Local"),
}
const srcTheme = path.join(dir, "theme")
const theme = path.join(env.USERPROFILE, ".config", "opencode", "win95-theme")
const clippySource = path.join(srcTheme, "clippy")
const clippyTarget = path.join(theme, "clippy")
const asar = path.join(dir, "Custom üpdate", "resources", "app.asar")
const startup = path.join(env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "OpenCodeWin95Guard.vbs")
const stateFile = path.join(theme, "state.json")
const guardLog = path.join(theme, "guard.log")
const events = path.join(theme, "guard-events.json")

function install(...args) {
  const result = spawnSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(dir, "install.ps1"),
    "-AsarPath", path.relative(dir, asar), ...args,
  ], { cwd: dir, env, encoding: "utf8", windowsHide: true, timeout: 15000 })
  assert.ifError(result.error)
  assert.equal(result.status, 0, [result.stdout, result.stderr].join("\n"))
}

function guardPid() {
  if (!fs.existsSync(guardLog)) return 0
  return Number(fs.readFileSync(guardLog, "utf8")
    .match(/(?:\(PID |watching app\.asar \()(\d+)\)/)?.[1] ?? 0)
}

let pid = 0
try {
  fs.mkdirSync(srcTheme)
  fs.copyFileSync(path.join(source, "install.ps1"), path.join(dir, "install.ps1"))
  for (const file of ["win95-guard.vbs", "win95-guard.mjs", "stop-win95-guard.ps1", "state.json",
    ...(native ? ["win95-guard.exe"] : [])]) {
    fs.copyFileSync(path.join(source, "theme", file), path.join(srcTheme, file))
  }
  fs.writeFileSync(path.join(srcTheme, "ensure-patched.ps1"), `
    param([string]$AsarPath,[switch]$Force,[switch]$RepairShortcuts,[switch]$RelaunchIfRunning)
    if (-not ($Force -and $RepairShortcuts -and $RelaunchIfRunning -and [IO.File]::Exists($AsarPath))) { exit 5 }
    exit 0
  `)
  fs.writeFileSync(path.join(srcTheme, "patch-asar.mjs"), `
    import fs from "node:fs"
    const [, , mode, asar] = process.argv
    fs.writeFileSync(new URL("./guard-events.json", import.meta.url), JSON.stringify({ mode, asar }))
    process.exit(fs.readFileSync(asar, "utf8") === "patched" ? 0 : 2)
  `)
  fs.mkdirSync(path.dirname(asar), { recursive: true })
  fs.writeFileSync(asar, "patched")
  fs.mkdirSync(theme, { recursive: true })
  for (const name of ["package.json", "bun.lock", "tsconfig.json", "vite.config.ts", "src/gui.tsx",
    "tools/extract-clippit97.ps1", "tools/clippit97.py", "media/README.md"]) {
    fs.mkdirSync(path.dirname(path.join(clippySource, name)), { recursive: true })
    fs.copyFileSync(path.join(source, "theme", "clippy", name), path.join(clippySource, name))
  }
  fs.mkdirSync(path.join(clippySource, "node_modules"))
  fs.writeFileSync(path.join(clippySource, "media", "still.webp"), "local dev artwork")
  fs.mkdirSync(path.join(clippyTarget, "media"), { recursive: true })
  fs.writeFileSync(path.join(clippyTarget, "media", "still.webp"), "installed artwork")
  const savedState = '{"enabled":false,"wallpaper":"clouds"}\n'
  fs.writeFileSync(stateFile, savedState)

  install()
  assert.ok(fs.existsSync(startup))
  const deadline = Date.now() + 10000
  while (!fs.existsSync(events)) {
    assert.ok(Date.now() < deadline, "Startup launcher never checked the custom archive")
    await delay(100)
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(events, "utf8")), { mode: "--check", asar })
  assert.equal(fs.readFileSync(stateFile, "utf8"), savedState)
  assert.ok(fs.existsSync(path.join(clippyTarget, "src", "gui.tsx")))
  assert.ok(!fs.existsSync(path.join(clippyTarget, "node_modules")))
  assert.equal(fs.readFileSync(path.join(clippyTarget, "media", "still.webp"), "utf8"), "installed artwork")
  pid = guardPid()
  assert.ok(pid, "Expected a running guard")
  assert.ok(process.kill(pid, 0))

  install("-NoGuard")
  assert.ok(!fs.existsSync(startup))
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" })
  pid = 0
  assert.equal(fs.readFileSync(stateFile, "utf8"), savedState)
  console.log(`${native ? "Native" : "Node.js"} guard installer: custom archive, preserved state, and -NoGuard passed.`)
} finally {
  const remaining = pid || guardPid()
  if (remaining) {
    try { process.kill(remaining) } catch {}
  }
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
}
