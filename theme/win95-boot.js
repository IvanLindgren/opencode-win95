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

  // Zero-patch Win95 notification audio router (works on OpenCode 1.x, 2.x, and future builds)
  try {
    var NativeAudio = window.Audio
    if (typeof NativeAudio === "function") {
      function Win95Audio(src) {
        var resolved = src
        try {
          var s = typeof src === "string" ? src : src ? String(src) : ""
          var isWin95On = document.documentElement.dataset.win95 === "on"
          if (isWin95On && s && s.indexOf("win95://") !== 0 && s.indexOf("/win95/") === -1) {
            var m = s.match(/(?:^|\/)(alert|bip-bop|staplebops|nope|yup)-[\w-]+/i)
            if (m) {
              if (document.documentElement.dataset.win95Sounds === "off") {
                var muted = new NativeAudio()
                muted.play = function () { return Promise.resolve() }
                return muted
              }
              var family = m[1].toLowerCase()
              var cue =
                family === "nope"
                  ? "chord"
                  : family === "alert" || family === "bip-bop" || /staplebops-02/i.test(s)
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
