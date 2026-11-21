import { Rpc } from "@opencode/plugin/rpc"

export const pluginID = "win95-clippy"
export const heartbeatMs = 20_000
export const leaseMs = 50_000

export const Clippy = Rpc.define({
  id: pluginID,
  methods: {
    watch: {
      input: {
        type: "object",
        properties: { sessionID: { type: "string" } },
        required: ["sessionID"],
        additionalProperties: false,
      },
      output: { type: "boolean" },
    },
  },
  events: {},
})
