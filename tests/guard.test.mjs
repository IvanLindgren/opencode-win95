import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"

assert.equal(process.platform, "win32", "The guard test requires Windows.")
const native = process.argv.includes("--native")
const guardName = native ? "win95-guard.exe" : "win95-guard.mjs"
const theme = fileURLToPath(new URL("../theme", import.meta.url))
const preferredTemp = path.join(os.tmpdir(), "opencode")
const temp = fs.existsSync(preferredTemp) ? preferredTemp : os.tmpdir()
const dir = fs.mkdtempSync(path.join(temp, "win95 guard test-"))
const guard = path.join(dir, guardName)
const asar = path.join(dir, "app.asar")
const eventFile = path.join(dir, "events")
const children = []
const start = () => {
  const proc = spawn(native ? guard : process.execPath, native ? [asar] : [guard, asar], {
    windowsHide: true,
    stdio: "ignore"
  })
  const done = new Promise((resolve) => {
    proc.once("error", resolve)
    proc.once("close", (code, signal) => resolve([code, signal]))
  })
  children.push({ proc, done })
  return done
}
const events = () => fs.existsSync(eventFile) ? fs.readFileSync(eventFile, "utf8").trim().split(/\r?\n/) : []
const waitFor = async (expected, timeout = 7000) => {
  const end = Date.now() + timeout
  while (!events().includes(expected)) {
    assert.ok(Date.now() < end, `Expected ${expected}; got ${JSON.stringify(events())}`)
    await delay(50)
  }
}
try {
  fs.copyFileSync(path.join(theme, guardName), guard)
  fs.writeFileSync(asar, "patched")
  fs.writeFileSync(path.join(dir, "patch-asar.mjs"), `
    import fs from "node:fs"
    if (process.argv[2] !== "--check") process.exit(5)
    const content = fs.readFileSync(process.argv[3], "utf8")
    fs.appendFileSync(new URL("./events", import.meta.url), "check " + content + "\\n")
    process.exit(content.startsWith("patched") ? 0 : 2)
  `)
  fs.writeFileSync(path.join(dir, "ensure-patched.ps1"), `
    param([string]$AsarPath,[switch]$RelaunchIfRunning,[switch]$RepairShortcuts)
    if (-not $RelaunchIfRunning -or -not $RepairShortcuts) { exit 5 }
    Add-Content -Path (Join-Path $PSScriptRoot 'events') -Value 'repair'
    [IO.File]::WriteAllText($AsarPath,'patched-after-update')
    exit 0
  `)
  start()
  await waitFor("check patched")
  const duplicate = await Promise.race([start(), delay(5000, "duplicate guard did not exit", { ref: false })])
  assert.deepEqual(duplicate, [0, null])
  await delay(21200)
  assert.deepEqual(events(), ["check patched"], "unchanged ASAR must not be read again on heartbeat")
  fs.renameSync(asar, asar + ".old")
  fs.writeFileSync(asar, "update")
  await waitFor("check patched-after-update")
  assert.deepEqual(events(), ["check patched", "check update", "repair", "check patched-after-update"])
  console.log(`${guardName}: single instance, idle heartbeat, archive replacement, and repair dispatch passed.`)
} finally {
  for (const { proc } of children) proc.kill()
  await Promise.all(children.map(({ done }) => done))
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
}
