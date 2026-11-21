import { expect, test } from "bun:test"
import plugin from "../src/server"
import { reportTool } from "../src/progress"

test("offers distinct step and task estimates to models in watched sessions", async () => {
  let registered: { input: { properties: Record<string, unknown>; required: string[] } } | undefined
  let watch: ((input: { sessionID: string }) => Promise<boolean>) | undefined
  type Request = { sessionID: string; tools: Record<string, object>; system: { text: string }[] }
  let prepare: ((request: Request) => void) | undefined
  const context = {
    rpc: { register: (_: unknown, methods: { watch: typeof watch }) => { watch = methods.watch } },
    tool: {
      transform: (register: (editor: { add: (tool: NonNullable<typeof registered>) => void }) => void) => {
        register({ add: (tool) => { registered = tool } })
      },
    },
    session: { hook: (_: string, hook: typeof prepare) => { prepare = hook } },
  }
  await plugin.setup(context as unknown as Parameters<typeof plugin.setup>[0])

  expect(registered?.input.properties).toHaveProperty("stepEtaSeconds")
  expect(registered?.input.properties).toHaveProperty("etaSeconds")
  expect(registered?.input.required).not.toContain("stepEtaSeconds")
  expect(await watch?.({ sessionID: "watched" })).toBe(true)

  const request = (sessionID: string): Request => ({ sessionID, tools: { [reportTool]: {} }, system: [] })
  const visible = request("watched")
  prepare?.(visible)
  expect(visible.tools).toHaveProperty(reportTool)
  expect(visible.system[0]?.text).toContain("before starting each meaningful step")
  expect(visible.system[0]?.text).toContain("stepEtaSeconds")

  const hidden = request("unwatched")
  prepare?.(hidden)
  expect(hidden.tools).not.toHaveProperty(reportTool)
  expect(hidden.system).toEqual([])
})
