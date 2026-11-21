;(function () {
  try {
    var enabledRaw = localStorage.getItem("opencode-win95-enabled")
    var enabled = enabledRaw === null ? true : enabledRaw === "true"
    var wallpaper = localStorage.getItem("opencode-win95-wallpaper") || "teal"
    var scheme = localStorage.getItem("opencode-win95-scheme") || "standard"
    var cursor = localStorage.getItem("opencode-win95-cursor")
    var cursorOn = cursor === null ? true : cursor === "true"

    var html = document.documentElement
    html.dataset.win95 = enabled ? "on" : "off"
    html.dataset.win95Sounds = localStorage.getItem("opencode-win95-sounds") === "false" ? "off" : "on"
    html.dataset.win95Wallpaper = wallpaper
    html.dataset.win95Scheme = scheme
    html.dataset.win95Cursor = cursorOn ? "on" : "off"

    if (enabled) {
      var bgMap = {
        teal: "#008080",
        woven: "#9e5c1f",
        clouds: "#6b9ed4",
        bricks: "#7d2e24",
        tartan: "#1e4b3c",
        steel: "#3a5a78",
        forest: "#234a2c",
        midnight: "#0d1b3e"
      }
      html.style.backgroundColor = bgMap[wallpaper] || "#008080"
      html.dataset.colorScheme = scheme === "hc-dark" ? "dark" : "light"
    }
  } catch (e) {}

  // Zero-patch OpenCode 2.x Desktop RPC bridge (captures desktop-rpc-port to dispatch MenuCommandTriggered)
  try {
    var rpcPort = null
    var rpcHandlers = []
    var desktopEventsReqId = null
    var suppressAck = false

    window.addEventListener(
      "message",
      function (ev) {
        if (ev.source !== window || ev.data !== "desktop-rpc-port") return
        var port = ev.ports && ev.ports[0]
        if (!port || port.__w95Hooked) return
        port.__w95Hooked = true
        rpcPort = port

        var origPost = port.postMessage.bind(port)
        port.postMessage = function (msg) {
          try {
            if (suppressAck && msg && msg._tag === "Ack") return
            if (msg && msg._tag === "Request" && msg.tag === "DesktopEvents") {
              desktopEventsReqId = msg.id
            }
          } catch (e) {}
          return origPost.apply(port, arguments)
        }

        var origAdd = port.addEventListener.bind(port)
        port.addEventListener = function (type, fn) {
          if (type === "message" && typeof fn === "function") rpcHandlers.push(fn)
          return origAdd.apply(port, arguments)
        }
      },
      true
    )

    window.__WIN95_TRIGGER_V2_CMD__ = function (id) {
      if (!rpcPort || desktopEventsReqId === null || rpcHandlers.length === 0) return false
      suppressAck = true
      try {
        var fakeEv = {
          data: {
            _tag: "Chunk",
            requestId: desktopEventsReqId,
            values: [{ _tag: "MenuCommandTriggered", id: id }]
          }
        }
        for (var i = 0; i < rpcHandlers.length; i++) {
          rpcHandlers[i](fakeEv)
        }
        return true
      } catch (e) {
        return false
      } finally {
        suppressAck = false
      }
    }
  } catch (e) {}

  // Route OpenCode notification clips without modifying the app's renderer bundle.
  try {
    var NativeAudio = window.Audio
    if (typeof NativeAudio === "function") {
      // Small Vite assets are data URLs with no filename. Match the known
      // OpenCode 2.3.2 clips by URL length and FNV-1a hash, not by MIME type alone.
      // Keep only fingerprints, not another copy of the app's audio.
      var inlineSounds = {
        2162: { "550b5916": "alert-03" },
        2370: { "5e46a24": "nope-01" },
        2522: { "654234f7": "nope-04" },
        2818: { "7cb0ed39": "nope-07" },
        3094: { "8ba34523": "nope-10" },
        3774: { "c419db09": "nope-06" },
        3862: { "de15d0ca": "yup-06" },
        4014: { "78c2d9d": "nope-09" },
        4110: { "962545d1": "bip-bop-01" },
        4298: { "a92918ed": "bip-bop-10" },
        4638: { "8a7351dc": "staplebops-05" },
        4746: { "aca8dad7": "staplebops-02" },
        5046: { "ba1f5019": "nope-03", "cade1470": "yup-02" },
        5130: { "87fe2853": "bip-bop-05" },
        5138: { "69458e55": "alert-09" },
        5206: { "a1f80d84": "staplebops-01" },
        5370: { "4c5b5951": "bip-bop-02" },
        5406: { "9672f78": "bip-bop-07" },
      }
      var namedSound = /(?:^|\/)((?:alert|bip-bop|staplebops|nope|yup)-\d+)(?:-[\w-]+)?\.(?:aac|m4a|mp3|ogg|wav)$/i

      function notificationId(src) {
        if (src.startsWith("win95://") || src.indexOf("/win95/") !== -1) return
        if (src.startsWith("data:")) {
          var matches = inlineSounds[src.length]
          if (!matches || !src.startsWith("data:audio/")) return
          var hash = 2166136261
          for (var i = 0; i < src.length; i++) {
            hash = Math.imul(hash ^ src.charCodeAt(i), 16777619)
          }
          return matches[(hash >>> 0).toString(16)]
        }
        var suffix = src.search(/[?#]/)
        var match = namedSound.exec(suffix === -1 ? src : src.slice(0, suffix))
        return match && match[1].toLowerCase()
      }

      function Win95Audio(src) {
        var resolved = src
        try {
          var state = document.documentElement.dataset
          if (state.win95 === "on" && src) {
            var id = notificationId(String(src))
            if (id) {
              if (state.win95Sounds === "off") {
                var muted = new NativeAudio()
                muted.play = function () { return Promise.resolve() }
                return muted
              }
              var cue =
                id.startsWith("nope-")
                  ? "chord"
                  : id.startsWith("alert-") || id.startsWith("bip-bop-") ||
                    id === "staplebops-02" || id === "staplebops-05"
                    ? "ding"
                    : "chimes"
              resolved = "win95://theme/sounds/" + cue + ".wav"
            }
          }
        } catch (e) {}
        return resolved !== undefined ? new NativeAudio(resolved) : new NativeAudio()
      }
      Win95Audio.prototype = NativeAudio.prototype
      window.Audio = Win95Audio
    }
  } catch (e) {}
})()
