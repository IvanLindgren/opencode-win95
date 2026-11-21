import type { SessionMessageInfo } from "@opencode/client/promise"
import { parseReport, reportTool, toolPhase, type Phase, type Report } from "./progress"

export type Mode = Phase | "idle" | "ask" | "done" | "stopped"

interface Turn {
  report?: Report
  reportedAt?: number
  phase?: Phase
  publicStatus?: string
  result?: string
  outcome?: "succeeded" | "failed" | "interrupted"
}

export function readTurn(messages: readonly SessionMessageInfo[], running: boolean): Turn {
  let turn: Turn = {}
  let candidate: string | undefined
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.type === "user" || message.type === "shell") break
    if (message.type === "idle") {
      // During a new run, an older idle marker is a boundary, not today's outcome.
      if (i !== messages.length - 1 || running) break
      turn.outcome = message.outcome
    }
    if (message.type !== "assistant") continue

    if (!running && candidate === undefined && message.time.completed !== undefined &&
      !message.error && message.finish !== "tool-calls" && message.finish !== "error" && !message.retry) {
      const text = message.content.flatMap((part) => part.type === "text" ? [part.text] : []).join("\n\n").trim()
      candidate = text || undefined
    }

    if (!running) continue
    for (let j = message.content.length - 1; j >= 0; j--) {
      const part = message.content[j]
      if (part.type === "text" && turn.publicStatus === undefined) {
        turn.publicStatus = part.text.split("\n").find((line) => line.trim())?.trim().slice(0, 180)
      }
      if (part.type !== "tool") continue
      if (part.name !== reportTool) {
        turn.phase ??= toolPhase(part.name)
        continue
      }
      if (turn.report || part.state.status !== "completed") continue
      turn.report = parseReport(part.state.input)
      if (turn.report) turn.reportedAt = part.time.completed ?? part.time.ran ?? part.time.created
    }
  }

  if (!running && turn.outcome !== "interrupted" && turn.outcome !== "failed" && candidate) {
    turn = { ...turn, result: candidate, outcome: "succeeded" }
  }
  return turn
}
