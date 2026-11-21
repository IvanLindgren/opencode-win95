import { expect, test } from "bun:test"
import { runInNewContext } from "node:vm"

const boot = await Bun.file(new URL("../../win95-boot.js", import.meta.url)).text()
const chimes = "win95://theme/sounds/chimes.wav"
const nativeCompletion = "/assets/staplebops-01-hashed.aac"

function renderer() {
  const played: string[] = []
  const dataset = { win95: "", win95Sounds: "" }
  let clock = 1000
  let rejectNext = false
  class Audio {
    volume = 1
    constructor(private src = "") {}
    play() {
      if (rejectNext) {
        rejectNext = false
        return Promise.reject(new Error("playback blocked"))
      }
      played.push(this.src)
      return Promise.resolve()
    }
  }
  const window = {
    Audio,
    addEventListener() {},
    __WIN95_PLAY_COMPLETION__: (_receivedAt: number) => {},
  }
  runInNewContext(boot, {
    window,
    document: { documentElement: { dataset, style: {} } },
    localStorage: { getItem: () => null },
    performance: { now: () => clock },
  })
  return {
    played,
    dataset,
    time: (value: number) => { clock = value },
    failPlayback: () => { rejectNext = true },
    play: (src: string) => new window.Audio(src).play(),
    fallback: (receivedAt = 1000) => window.__WIN95_PLAY_COMPLETION__(receivedAt),
  }
}

test("plays Win95 Chimes if no native completion has played", () => {
  const app = renderer()
  app.time(1650)
  app.fallback()
  expect(app.played).toEqual([chimes])
})

test("pairs each native chime with at most one fallback", async () => {
  const app = renderer()
  await app.play(nativeCompletion)
  app.time(1650)
  app.fallback()
  expect(app.played).toEqual([chimes])
  app.fallback(1020)
  expect(app.played).toEqual([chimes, chimes])
})

test("does not double-play a late native chime or suppress other sounds", async () => {
  const app = renderer()
  app.time(1650)
  app.fallback()
  app.time(1730)
  await app.play(nativeCompletion)
  await app.play("/assets/nope-01.aac")
  await app.play("/assets/bip-bop-01.aac")
  expect(app.played).toEqual([chimes, "win95://theme/sounds/chord.wav", "win95://theme/sounds/ding.wav"])
})

test("a failed native playback leaves the fallback available", async () => {
  const app = renderer()
  app.failPlayback()
  await expect(app.play(nativeCompletion)).rejects.toThrow("playback blocked")
  app.time(1650)
  app.fallback()
  expect(app.played).toEqual([chimes])
})

test("Win95 sound toggle silences both paths and disabling the theme restores the native clip", async () => {
  const app = renderer()
  app.dataset.win95Sounds = "off"
  app.fallback()
  await app.play(nativeCompletion)
  expect(app.played).toEqual([])

  app.dataset.win95 = "off"
  app.dataset.win95Sounds = "on"
  app.fallback()
  await app.play(nativeCompletion)
  expect(app.played).toEqual([nativeCompletion])
})
