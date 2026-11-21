import { describe, expect, test } from "bun:test"
import type { SessionMessageInfo } from "@opencode/client/promise"
import { parseReport, remainingSeconds, reportTool } from "../src/progress"
import { readTurn } from "../src/session-view"

const content = (parts: unknown[], finish?: string) => ({
  type: "assistant",
  content: parts,
  time: { created: 1, completed: 3 },
  finish,
} as SessionMessageInfo)
const user = { type: "user" } as SessionMessageInfo
const idle = (outcome: "succeeded" | "failed" | "interrupted") => ({ type: "idle", outcome } as SessionMessageInfo)
const text = (value: string) => ({ type: "text", text: value })
const report = (input: unknown, status = "completed", completed = 5_000) => ({
  type: "tool",
  name: reportTool,
  state: { status, input },
  time: { created: 1, completed },
})

describe("Скрепочка: текущий ход", () => {
  test("uses the latest completed report from the current turn only", () => {
    const messages = [
      user,
      content([report({ phase: "read", status: "Старый ход", percent: 70 })]),
      idle("succeeded"),
      user,
      content([report({ phase: "edit", status: "Пишу тесты", percent: 50, etaSeconds: 120 })]),
      content([report({ phase: "check", status: "Проверяю" }, "running")]),
    ]
    expect(readTurn(messages, true)).toMatchObject({
      report: { phase: "edit", status: "Пишу тесты", percent: 50, etaSeconds: 120 },
      reportedAt: 5_000,
    })
    expect(readTurn([...messages, user], true)).toEqual({})
  })

  test("never reads private reasoning and can fall back to a public status", () => {
    const reasoning = { type: "reasoning", get text() { throw new Error("private") } }
    const tool = { type: "tool", name: "grep" }
    expect(readTurn([user, content([reasoning, text("\nСмотрю файлы\n\nПодробности"), tool])], true))
      .toEqual({ phase: "read", publicStatus: "Смотрю файлы" })
  })

  test("uses final Markdown rather than intermediate tool-call commentary", () => {
    const messages = [
      user,
      content([text("Сейчас проверю")], "tool-calls"),
      content([text("## Готово"), text("Все проверки прошли.")], "stop"),
    ]
    expect(readTurn([...messages, idle("succeeded")], false)).toEqual({
      outcome: "succeeded",
      result: "## Готово\n\nВсе проверки прошли.",
    })
    expect(readTurn([...messages, idle("interrupted")], false)).toEqual({ outcome: "interrupted" })
    expect(readTurn([...messages, idle("failed")], false)).toEqual({ outcome: "failed" })
  })

  test("counts down step and task estimates independently", () => {
    const status = parseReport({ phase: "plan", status: "  Смотрю\nзадачу ", percent: 100, stepEtaSeconds: 30, etaSeconds: 120 })
    expect(status).toEqual({ phase: "plan", status: "Смотрю задачу", percent: undefined, stepEtaSeconds: 30, etaSeconds: 120 })
    expect(remainingSeconds(status?.stepEtaSeconds, 5_000, 14_900)).toBe(21)
    expect(remainingSeconds(status?.stepEtaSeconds, 5_000, 35_000)).toBeUndefined()
    expect(remainingSeconds(status?.etaSeconds, 5_000, 35_000)).toBe(90)
    expect(remainingSeconds(status?.etaSeconds, 5_000, 125_000)).toBeUndefined()
  })

  test("a new step without an estimate does not inherit an old estimate", () => {
    const messages = [
      user,
      content([report({ phase: "read", status: "Изучаю", stepEtaSeconds: 60, etaSeconds: 120 })]),
      content([report({ phase: "check", status: "Проверяю", stepEtaSeconds: -1, etaSeconds: 95 }, "completed", 10_000)]),
    ]
    const turn = readTurn(messages, true)
    expect(turn.reportedAt).toBe(10_000)
    expect(turn.report?.stepEtaSeconds).toBeUndefined()
    expect(turn.report?.etaSeconds).toBe(95)
  })
})
