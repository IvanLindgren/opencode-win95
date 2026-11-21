import { Plugin } from "@opencode/plugin"
import { parseReport, phases, reportTool } from "./progress"
import { Clippy, leaseMs, pluginID } from "./rpc"

export default Plugin.define({
  id: pluginID,
  async setup(ctx) {
    const watched = new Map<string, number>()

    await ctx.rpc.register(Clippy, {
      watch: async (input) => {
        const now = Date.now()
        for (const [id, expires] of watched) if (expires <= now) watched.delete(id)
        watched.set((input as { sessionID: string }).sessionID, now + leaseMs)
        return true
      },
    })

    await ctx.tool.transform((editor) => {
      editor.add({
        name: reportTool,
        description: "Update the user's Win95 Clippy status. Give a short public update, never private reasoning or secrets.",
        input: {
          type: "object",
          properties: {
            phase: { type: "string", enum: [...phases] },
            status: { type: "string", minLength: 1, maxLength: 180 },
            percent: { type: "integer", minimum: 0, maximum: 99 },
            stepEtaSeconds: {
              type: "integer", minimum: 1, maximum: 7200,
              description: "Rough seconds remaining in the step named in status, not the whole task. Omit only if you cannot reasonably estimate it.",
            },
            etaSeconds: {
              type: "integer", minimum: 1, maximum: 7200,
              description: "Optional rough seconds remaining until the final reply for the whole task.",
            },
          },
          required: ["phase", "status"],
          additionalProperties: false,
        },
        options: { codemode: false },
        execute: async (input) => ({
          content: parseReport(input) ? "Clippy status updated." : "No update: invalid status.",
        }),
      })
    })

    await ctx.session.hook("context", (event) => {
      if ((watched.get(event.sessionID) ?? 0) <= Date.now()) {
        delete event.tools[reportTool]
        return
      }
      if (!event.tools[reportTool]) return
      event.system.push({
        type: "text",
        text: `The user has Win95 Clippy open. On multi-step tasks, call ${reportTool} before starting each meaningful step, not for each individual action. Name the current step in one short public status in the user's language and provide stepEtaSeconds, a rough estimate in seconds of how much longer that step will take (for example, 30 for checking a few files). Report a new estimate when the step changes or the estimate materially changes. Leave it out only when you cannot reasonably estimate it or are waiting for the user. Never include private reasoning, secrets, or raw tool output. If useful, also report percent and etaSeconds for the whole task; those are separate from the current step. Skip the tool on quick replies. Use the ordinary question tool when a decision is needed, and give the final reply normally.`,
      })
    })
  },
})
