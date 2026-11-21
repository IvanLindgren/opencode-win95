import type { Context } from "@opencode/plugin/gui"
import { createEffect, onCleanup } from "solid-js"

declare global {
  interface Window {
    __WIN95_PLAY_COMPLETION__?: (receivedAt: number) => void
  }
}

function soundsOn() {
  const theme = document.documentElement.dataset
  return theme.win95 === "on" && theme.win95Sounds !== "off"
}

export function observeCompletionSound(ctx: Context, enabled: () => boolean) {
  const seen = new Set<string>()
  createEffect(() => {
    if (!enabled()) return
    const timers = new Set<number>()
    const subscriptions = ctx.servers.list().flatMap((id) => {
      const server = ctx.servers.get(id)
      if (!server) return []
      const data = server.data
      return [data.on("session.execution.succeeded", (event) => {
        if (!soundsOn() || data.session.get(event.data.sessionID)?.parentID) return
        if (!ctx.sessions.list().some((session) => session.id === event.data.sessionID && session.server.id === id)) return
        const key = `${id}\n${event.id}`
        if (seen.has(key)) return
        seen.add(key)
        if (seen.size > 128) seen.delete(seen.values().next().value!)

        // Give OpenCode's normal notification first chance to play the cue.
        const receivedAt = performance.now()
        const timer = window.setTimeout(() => {
          timers.delete(timer)
          if (!soundsOn()) return
          if (window.__WIN95_PLAY_COMPLETION__) window.__WIN95_PLAY_COMPLETION__(receivedAt)
          else {
            const audio = new Audio("win95://theme/sounds/chimes.wav")
            audio.volume = 0.45
            void audio.play().catch(() => undefined)
          }
        }, 650)
        timers.add(timer)
      })]
    })
    onCleanup(() => {
      for (const unsubscribe of subscriptions) unsubscribe()
      for (const timer of timers) window.clearTimeout(timer)
    })
  })
}
