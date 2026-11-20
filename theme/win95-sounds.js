const files = {
  startup: "startup.wav",
  chimes: "chimes.wav",
  chord: "chord.wav",
  ding: "ding.wav",
  error: "chord.wav",
  shutdown: "tada.wav"
}

class Win95SoundPlayer {
  enabled = false
  current = null
  startupRetry = null

  setEnabled(enabled) {
    this.enabled = enabled
    if (enabled) return
    this.startupRetry?.abort()
    this.current?.pause()
  }

  async playStartup() {
    this.startupRetry?.abort()
    const retry = new AbortController()
    this.startupRetry = retry
    const result = await this.play("startup")
    if (result !== "NotAllowedError" || !this.enabled || retry.signal.aborted) return

    const resume = () => {
      if (!navigator.userActivation.isActive) return
      retry.abort()
      void this.play("startup")
    }
    window.addEventListener("click", resume, { capture: true, signal: retry.signal })
    window.addEventListener("keydown", resume, { capture: true, signal: retry.signal })
  }

  async play(name, { waitForEnd = false } = {}) {
    if (!this.enabled) return
    const file = files[name]
    if (!file) return

    this.current?.pause()
    const audio = new Audio(new URL("./sounds/" + file, import.meta.url))
    audio.volume = name === "startup" ? 0.55 : 0.45
    this.current = audio

    try {
      if (waitForEnd) {
        // Preserve the whole shutdown cue without blocking app exit on a media error.
        await new Promise((resolve) => {
          const listeners = new AbortController()
          const finish = () => {
            clearTimeout(timeout)
            listeners.abort()
            resolve()
          }
          const timeout = setTimeout(finish, 1700)
          for (const event of ["ended", "pause", "error"]) {
            audio.addEventListener(event, finish, { once: true, signal: listeners.signal })
          }
          audio.play().catch(finish)
        })
      } else {
        await audio.play()
      }
    } catch (error) {
      return error.name
    }
  }
}

export const sounds = new Win95SoundPlayer()

