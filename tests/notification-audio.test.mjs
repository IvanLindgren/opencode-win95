import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import vm from "node:vm"

const boot = new vm.Script(fs.readFileSync(new URL("../theme/win95-boot.js", import.meta.url), "utf8"))
const wav = (name) => `win95://theme/sounds/${name}.wav`

function setup(storage = {}) {
  class NativeAudio {
    constructor(src) {
      this.src = src
      this.plays = 0
    }
    async play() {
      this.plays++
    }
  }

  const window = { Audio: NativeAudio, addEventListener() {} }
  const html = { dataset: {}, style: {} }
  const localStorage = { getItem: (key) => storage[key] ?? null }
  boot.runInNewContext({ window, document: { documentElement: html }, localStorage })
  return { window, state: html.dataset, NativeAudio }
}

const named = [
  ["opencode://app/assets/staplebops-01-Ab_123.aac", "chimes"],
  ["/assets/staplebops-02-Ab_123.aac?cache=1#preview", "ding"],
  ["/assets/staplebops-05-Ab_123.aac", "ding"],
  ["nope-03.wav", "chord"],
  ["./assets/yup-06-Bb9a.aac", "chimes"],
  ["./assets/alert-04-Bb9a.aac", "ding"],
  ["./assets/bip-bop-03-Bb9a.aac", "ding"],
]
const unknownInline = "data:audio/aac;base64,".padEnd(5206, "A")

test("routes named notifications and preserves unrelated audio", () => {
  const { window, NativeAudio } = setup()
  for (const [src, cue] of named) {
    const audio = new window.Audio(src)
    assert.equal(audio.src, wav(cue), src)
    assert.ok(audio instanceof NativeAudio)
  }
  const untouched = [
    undefined,
    wav("startup"),
    "/win95/staplebops-02.aac",
    "blob:https://example.com/media",
    "/clip.ogg?redirect=/assets/staplebops-02-Ab_123.aac",
    unknownInline,
  ]
  for (const src of untouched) assert.equal(new window.Audio(src).src, src)
})

test("obeys sound and theme toggles without muting unrelated audio", async () => {
  const { window, state } = setup({ "opencode-win95-sounds": "false" })
  const [src, cue] = named[0]
  const muted = new window.Audio(src)
  assert.equal(muted.src, undefined)
  await muted.play()
  assert.equal(muted.plays, 0)

  const unrelated = new window.Audio(unknownInline)
  assert.equal(unrelated.src, unknownInline)
  await unrelated.play()
  assert.equal(unrelated.plays, 1)

  state.win95Sounds = "on"
  assert.equal(new window.Audio(src).src, wav(cue))
  state.win95 = "off"
  state.win95Sounds = "off"
  const original = new window.Audio(src)
  assert.equal(original.src, src)
  await original.play()
  assert.equal(original.plays, 1)
})

const asarPath = process.env.OPENCODE_AUDIO_TEST_ASAR

test("routes every notification asset in the installed OpenCode archive", { skip: !asarPath }, async () => {
  const { window, state } = setup()
  const fd = fs.openSync(asarPath, "r")
  const read = (pos, size) => {
    const buf = Buffer.alloc(size)
    assert.equal(fs.readSync(fd, buf, 0, size, pos), size)
    return buf
  }
  try {
    const prefix = read(0, 16)
    const start = 8 + prefix.readUInt32LE(4)
    const header = JSON.parse(read(16, prefix.readUInt32LE(12)).toString("utf8"))
    const assets = header.files.out.files.renderer.files.assets.files
    const defaults = new Map([
      ["staplebops-01", "chimes"], // agent completion
      ["staplebops-02", "ding"],   // permission
      ["staplebops-05", "ding"],   // question
      ["nope-03", "chord"],        // error
    ])
    const seen = new Set()
    let inlineCount = 0

    for (const [name, entry] of Object.entries(assets)) {
      const match = /^((alert|bip-bop|nope|staplebops|yup)-\d+)-[\w-]+\.(aac|js)$/.exec(name)
      if (!match) continue
      const [, id, family, ext] = match
      const src = ext === "aac"
        ? `opencode://app/assets/${name}`
        : read(start + Number(entry.offset), entry.size).toString("utf8")
            .match(/data:audio\/[\w.+-]+;base64,[\w+/=]+/)?.[0]
      if (!src) continue // A named AAC's JS wrapper has no inline data.

      const cue = defaults.get(id) ?? (family === "nope" ? "chord" :
        family === "alert" || family === "bip-bop" ? "ding" : "chimes")
      state.win95 = "on"
      state.win95Sounds = "on"
      assert.equal(new window.Audio(src).src, wav(cue), name)
      state.win95Sounds = "off"
      const muted = new window.Audio(src)
      assert.equal(muted.src, undefined, name)
      await muted.play()
      assert.equal(muted.plays, 0, name)
      state.win95 = "off"
      assert.ok(new window.Audio(src).src === src, name)

      if (ext === "js") {
        inlineCount++
        const pos = src.length - 6
        const changed = src.slice(0, pos) + (src[pos] === "A" ? "B" : "A") + src.slice(pos + 1)
        state.win95 = "on"
        assert.ok(new window.Audio(changed).src === changed, name)
      }
      seen.add(id)
    }

    for (const id of defaults.keys()) assert.ok(seen.has(id), `Missing ${id}`)
    assert.ok(inlineCount > 0, "Expected at least one inline asset to exercise the regression")
    console.log(`Checked ${seen.size} OpenCode sounds (${inlineCount} inline).`)
  } finally {
    fs.closeSync(fd)
  }
})
