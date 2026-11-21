export const phases = ["plan", "read", "edit", "check", "wrap"] as const
export type Phase = (typeof phases)[number]

export const reportTool = "win95_clippy_progress"

export interface Report {
  phase: Phase
  status: string
  percent?: number
  stepEtaSeconds?: number
  etaSeconds?: number
}

export function parseReport(input: unknown): Report | undefined {
  if (!input || typeof input !== "object") return
  const report = input as Record<string, unknown>
  const phase = phases.find((value) => value === report.phase)
  if (!phase || typeof report.status !== "string") return
  const status = report.status.trim().replace(/\s+/g, " ").slice(0, 180)
  if (!status) return
  return {
    phase,
    status,
    percent: integerIn(report.percent, 0, 99),
    stepEtaSeconds: integerIn(report.stepEtaSeconds, 1, 7200),
    etaSeconds: integerIn(report.etaSeconds, 1, 7200),
  }
}

function integerIn(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isInteger(value) && min <= value && value <= max ? value : undefined
}

export function remainingSeconds(estimate: number | undefined, reportedAt: number | undefined, now: number) {
  if (estimate === undefined || reportedAt === undefined) return
  const seconds = Math.ceil((reportedAt + estimate * 1000 - now) / 1000)
  return seconds > 0 ? seconds : undefined
}

export function toolPhase(name: string): Phase | undefined {
  if (/^(read|glob|grep|ls|webfetch|websearch|search)(_|$)/.test(name)) return "read"
  if (/^(edit|write|patch|apply_patch|multiedit)(_|$)/.test(name)) return "edit"
  if (/^(test|lint|typecheck|verify)(_|$)/.test(name)) return "check"
}
