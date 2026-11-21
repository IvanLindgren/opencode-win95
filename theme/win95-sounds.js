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
    this.cancelStartupRetry()
    this.current?.()
  }

  cancelStartupRetry() {
    this.startupRetry?.abort()
    this.startupRetry = null
  }

  async playStartup() {
    this.cancelStartupRetry()
    const retry = new AbortController()
    this.startupRetry = retry
    const result = await this.play("startup")
    if (retry.signal.aborted) return
    if (result !== "NotAllowedError" || !this.enabled) {
      this.cancelStartupRetry()
      return
    }

    const resume = () => {
      if (!navigator.userActivation.isActive) return
      this.cancelStartupRetry()
      void this.play("startup")
    }
    window.addEventListener("click", resume, { capture: true, signal: retry.signal })
    window.addEventListener("keydown", resume, { capture: true, signal: retry.signal })
  }

  async play(name, { waitForEnd = false } = {}) {
    if (!this.enabled) return
    const file = files[name]
    if (!file) return

    this.current?.()
    const audio = new Audio(new URL("./sounds/" + file, import.meta.url))
    audio.volume = name === "startup" ? 0.55 : 0.45
    const listeners = new AbortController()
    let timeout
    let resolveEnd
    const end = waitForEnd ? new Promise((resolve) => { resolveEnd = resolve }) : null
    const finish = () => {
      if (listeners.signal.aborted) return
      listeners.abort()
      clearTimeout(timeout)
      this.current = null
      audio.pause()
      audio.removeAttribute("src")
      audio.load()
      resolveEnd?.()
    }
    this.current = finish
    for (const event of ["ended", "error"]) {
      audio.addEventListener(event, finish, { once: true, signal: listeners.signal })
    }

    try {
      if (waitForEnd) {
        // Preserve the shutdown cue without blocking app exit if media stalls.
        timeout = setTimeout(finish, 1700)
        audio.play().catch(finish)
        await end
      } else {
        await audio.play()
      }
    } catch (error) {
      finish()
      return error.name
    }
  }
}

export const sounds = new Win95SoundPlayer()
