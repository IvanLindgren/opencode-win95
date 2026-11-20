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
      var bg = bgMap[wallpaper] || "#008080"
      html.style.backgroundColor = bg
      html.dataset.colorScheme = scheme === "hc-dark" ? "dark" : "light"
    }
  } catch (e) {
    // ignore storage errors
  }
})()
