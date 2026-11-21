import { WIN95_ICONS, WIN95_CURSORS } from "./win95-icons.js"
import { shellText } from "./win95-i18n.mjs"
import { sounds } from "./win95-sounds.js"

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

const DEFAULT_STATE = {
  enabled: true,
  wallpaper: "teal",
  colorScheme: "standard",
  sounds: true,
  showWelcome: true,
  retroCursor: true,
  clock24h: true,
  windowMaximized: false,
  windowBounds: null
}

const WALLPAPERS = ["teal", "woven", "clouds", "bricks", "tartan", "steel", "forest", "midnight"]

const SCHEMES = [
  { id: "standard", name: "Windows Standard" },
  { id: "slate", name: "Windows Slate" },
  { id: "desert", name: "Desert 95" },
  { id: "plum", name: "Plum 95" },
  { id: "hc-dark", name: "High Contrast Dark 95" }
]

const WELCOME_TIPS = [
  "Чтобы открыть программы, настройки или сменить обои, нажмите кнопку «Start» в левом нижнем углу — прямо как в настоящей Windows 95.",
  "Вы можете перетаскивать окно OpenCode за синюю шапку, растягивать его за любой край, сворачивать на панель задач или развернуть на весь рабочий стол двойным кликом по заголовку.",
  "Дважды кликните по ярлыку «Display» на рабочем столе (или правой кнопкой по обоям → «Свойства экрана»), чтобы переключить обои — включая плетёный паттерн и цветовые схемы Win95!",
  "В любой момент можно переключиться обратно на обычный современный интерфейс OpenCode в один клик — кнопка «Обычный UI» находится в верхней панели и в системном трее.",
  "Все ярлыки слева настоящие: «Projects» открывает проект, «New Session» создаёт новый чат, «MS-DOS Prompt» открывает встроенный терминал, а «Control Panel» — настройки OpenCode.",
  "Попробуйте меню «Start → Run...» (или нажмите Win95-меню) и введите команды: dos, desk.cpl, sysdm.cpl, control, new, normal или devtools!"
]

const EXTRA_WINDOWS = {
  welcome: "buildWelcomeWindow",
  display: "buildDisplayPropertiesWindow",
  sysprop: "buildSystemPropertiesWindow",
  recycle: "buildRecycleBinWindow",
  run: "buildRunWindow",
  shutdown: "buildShutdownWindow"
}

// Tiny crisp SVG glyphs for window buttons
const CAP_MIN_SVG = `<svg viewBox="0 0 10 10" shape-rendering="crispEdges"><rect x="1" y="7" width="7" height="2" fill="currentColor"/></svg>`
const CAP_MAX_SVG = `<svg viewBox="0 0 10 10" shape-rendering="crispEdges"><rect x="1" y="1" width="8" height="2" fill="currentColor"/><rect x="1" y="1" width="1" height="8" fill="currentColor"/><rect x="8" y="1" width="1" height="8" fill="currentColor"/><rect x="1" y="8" width="8" height="1" fill="currentColor"/></svg>`
const CAP_RESTORE_SVG = `<svg viewBox="0 0 10 10" shape-rendering="crispEdges"><rect x="3" y="1" width="6" height="2" fill="currentColor"/><rect x="8" y="1" width="1" height="6" fill="currentColor"/><rect x="1" y="3" width="6" height="2" fill="currentColor"/><rect x="1" y="3" width="1" height="6" fill="currentColor"/><rect x="6" y="3" width="1" height="6" fill="currentColor"/><rect x="1" y="8" width="6" height="1" fill="currentColor"/></svg>`
const CAP_CLOSE_SVG = `<svg viewBox="0 0 10 10" shape-rendering="crispEdges"><path d="M1,1 L3,1 L5,3.5 L7,1 L9,1 L6,5 L9,9 L7,9 L5,6.5 L3,9 L1,9 L4,5 Z" fill="currentColor"/></svg>`

function t(key) {
  return shellText(document.documentElement.lang, key)
}

function setTextKey(node, key) {
  node.dataset.w95Label = key
  node.textContent = t(key)
}

function setTitleKey(node, key) {
  node.dataset.w95Title = key
  node.title = t(key)
  node.setAttribute("aria-label", node.title)
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v)
    else if (k === "html") node.innerHTML = v
    else if (k === "text") node.textContent = v
    else if (k === "textKey" && v) setTextKey(node, v)
    else if (k === "titleKey" && v) setTitleKey(node, v)
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v)
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v))
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child == null) continue
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child)
  }
  return node
}

class OpenCode95Desktop {
  constructor() {
    this.state = { ...DEFAULT_STATE }
    this.zOrder = ["opencode"]
    this.windows = new Map() // id -> { id, title, icon, el, minimized, open }
    this.dialogPositions = new Map()
    this.activeWindowId = "opencode"
    this.tipIndex = 0
    this.sysInfo = { version: "1.19.4", electron: "42", node: "24", arch: "x64", user: "User", platform: "win32" }
    this.hostMaximized = false
    this.syncDisplayUI = null
  }

  getBridge() {
    return window.win95Api || window.api?.win95
  }

  async init() {
    this.loadLocalState()
    this.applyCursors()
    this.applyStateToDom()

    // Sync with persisted Electron file state & system info
    try {
      const bridge = this.getBridge()
      if (bridge?.getState) {
        const diskState = await bridge.getState()
        if (diskState && typeof diskState === "object") {
          this.state = { ...DEFAULT_STATE, ...diskState }
          this.saveLocalState()
          this.applyStateToDom()
        }
      }
      if (bridge?.getSystemInfo) {
        this.sysInfo = await bridge.getSystemInfo()
      }
      if (bridge?.isMaximized) {
        this.hostMaximized = await bridge.isMaximized()
      }
      bridge?.onMaximizedChange?.((max) => {
        this.hostMaximized = max
        this.updateHostMaxIcon()
      })
    } catch {
      // ignore IPC unavailability
    }

    sounds.setEnabled(this.state.enabled && this.state.sounds)

    this.buildNormalControls()
    this.registerGlobalEvents()
    new MutationObserver(() => {
      this.closeAllMenus()
      for (const node of document.querySelectorAll("[data-w95-label]")) setTextKey(node, node.dataset.w95Label)
      for (const node of document.querySelectorAll("[data-w95-title]")) setTitleKey(node, node.dataset.w95Title)
      this.renderTaskbarWindows()
      this.updateClock()
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] })
    this.hookNativeThemeSelect()
    if (this.state.enabled) this.activateShell()

    // Show Welcome dialog on startup if enabled & Win95 active
    if (this.state.enabled && this.state.showWelcome) {
      setTimeout(() => {
        if (this.state.enabled && !this.windows.has("welcome")) this.openWindow("welcome")
      }, 350)
    }

    if (this.state.enabled && this.state.sounds) sounds.playStartup()
  }

  loadLocalState() {
    try {
      const enabled = localStorage.getItem("opencode-win95-enabled")
      if (enabled !== null) this.state.enabled = enabled === "true"
      const wp = localStorage.getItem("opencode-win95-wallpaper")
      if (wp) this.state.wallpaper = wp
      const sc = localStorage.getItem("opencode-win95-scheme")
      if (sc) this.state.colorScheme = sc
      const snd = localStorage.getItem("opencode-win95-sounds")
      if (snd !== null) this.state.sounds = snd === "true"
      const wel = localStorage.getItem("opencode-win95-welcome")
      if (wel !== null) this.state.showWelcome = wel === "true"
      const cur = localStorage.getItem("opencode-win95-cursor")
      if (cur !== null) this.state.retroCursor = cur === "true"
      const c24 = localStorage.getItem("opencode-win95-clock24h")
      if (c24 !== null) this.state.clock24h = c24 === "true"
      const wmax = localStorage.getItem("opencode-win95-wmax")
      if (wmax !== null) this.state.windowMaximized = wmax === "true"
      const bounds = localStorage.getItem("opencode-win95-bounds")
      if (bounds) this.state.windowBounds = JSON.parse(bounds)
    } catch {
      // ignore
    }
  }

  saveLocalState() {
    try {
      localStorage.setItem("opencode-win95-enabled", String(this.state.enabled))
      localStorage.setItem("opencode-win95-wallpaper", this.state.wallpaper)
      localStorage.setItem("opencode-win95-scheme", this.state.colorScheme)
      localStorage.setItem("opencode-win95-sounds", String(this.state.sounds))
      localStorage.setItem("opencode-win95-welcome", String(this.state.showWelcome))
      localStorage.setItem("opencode-win95-cursor", String(this.state.retroCursor))
      localStorage.setItem("opencode-win95-clock24h", String(this.state.clock24h))
      localStorage.setItem("opencode-win95-wmax", String(this.state.windowMaximized))
      if (this.state.windowBounds) {
        localStorage.setItem("opencode-win95-bounds", JSON.stringify(this.state.windowBounds))
      } else {
        localStorage.removeItem("opencode-win95-bounds")
      }
    } catch {
      // ignore
    }
  }

  persistState(patch = {}) {
    this.state = { ...this.state, ...patch }
    this.saveLocalState()
    this.applyStateToDom()
    sounds.setEnabled(this.state.enabled && this.state.sounds)
    if (typeof this.syncDisplayUI === "function") this.syncDisplayUI()
    try {
      this.getBridge()?.setState?.(this.state)
    } catch {
      // ignore
    }
  }

  applyCursors() {
    const root = document.documentElement
    root.style.setProperty("--w95-cursor-arrow", `url("${WIN95_CURSORS.arrow}") 1 1, default`)
    root.style.setProperty("--w95-cursor-pointer", `url("${WIN95_CURSORS.pointer}") 7 1, pointer`)
    root.style.setProperty("--w95-cursor-text", `url("${WIN95_CURSORS.text}") 8 11, text`)
  }

  applyStateToDom() {
    const html = document.documentElement
    html.dataset.win95 = this.state.enabled ? "on" : "off"
    html.dataset.win95Sounds = this.state.sounds ? "on" : "off"
    html.dataset.win95Wallpaper = this.state.wallpaper
    html.dataset.win95Scheme = this.state.colorScheme
    html.dataset.win95Cursor = this.state.retroCursor ? "on" : "off"
    if (this.state.enabled) {
      html.style.backgroundColor = "#008080"
    } else {
      html.style.backgroundColor = ""
    }
    this.updateTrayIcons()
  }

  toggleWin95Mode(forceValue) {
    const next = typeof forceValue === "boolean" ? forceValue : !this.state.enabled
    if (next === this.state.enabled) return
    this.persistState({ enabled: next })
    this.closeAllMenus()
    if (next) {
      this.activateShell()
      sounds.playStartup()
    } else {
      this.mouseGesture?.cancel()
      this.stopClock()
      this.titleObserver?.disconnect()
      this.titleObserver = null
      for (const id of this.windows.keys()) this.closeWindow(id)
      this.startMenu?.remove()
      this.contextMenu?.remove()
      this.startMenu = this.contextMenu = null
    }
  }

  activateShell() {
    if (!this.mainWindow) this.buildShell()
    else this.applyMainWindowBounds()
    this.observeTitle()
    this.startClock()
  }

  triggerOpencodeCommand(cmd) {
    this.closeAllMenus()
    this.restoreAndFocusMain()
    try {
      const handledV2 = typeof window.__WIN95_TRIGGER_V2_CMD__ === "function" && window.__WIN95_TRIGGER_V2_CMD__(cmd)
      if (!handledV2) {
        this.getBridge()?.triggerCommand?.(cmd)
      }
    } catch {
      // ignore
    }
  }

  runHostAction(action) {
    this.closeAllMenus()
    try {
      const bridge = this.getBridge()
      if (bridge?.runHostAction) {
        bridge.runHostAction(action)
      } else {
        window.api?.runDesktopMenuAction?.(action)
      }
    } catch {
      // ignore
    }
  }

  triggerCommandPalette() {
    this.closeAllMenus()
    this.restoreAndFocusMain()
    // Dispatch standard Ctrl+K / Ctrl+P to open OpenCode command palette
    const evt = new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(evt)
  }

  // ==========================================================================
  // BUILD COMPLETE WINDOWS 95 DESKTOP SHELL
  // ==========================================================================
  buildNormalControls() {
    this.normalControls = el("div", { id: "win95-normal-controls" }, [
      el(
        "button",
        {
          class: "w95-return-btn",
          titleKey: "restoreTheme",
          onclick: () => this.toggleWin95Mode(true)
        },
        [
          el("span", { html: WIN95_ICONS.winFlag, style: { width: "14px", height: "14px", display: "inline-flex" } }),
          "Win95"
        ]
      ),
      el("button", { class: "w95-norm-winbtn", titleKey: "minimize", text: "─", onclick: () => this.runHostAction("window.minimize") }),
      el("button", { class: "w95-norm-winbtn", titleKey: "maximize", text: "☐", onclick: () => this.runHostAction("window.toggleMaximize") }),
      el("button", { class: "w95-norm-winbtn close", titleKey: "close", text: "✕", onclick: () => this.runHostAction("window.close") })
    ])
    document.body.appendChild(this.normalControls)
  }

  buildShell() {
    const body = document.body
    const root = document.getElementById("root")

    // Slim top Electron Host Bar (for moving/snapping/closing Electron host window)
    this.hostMaxBtn = el("button", {
      class: "w95-cap-btn",
      titleKey: "maximize",
      html: this.hostMaximized ? CAP_RESTORE_SVG : CAP_MAX_SVG,
      onclick: () => this.runHostAction("window.toggleMaximize")
    })
    this.hostBar = el("div", { id: "win95-host-bar" }, [
      el("div", { class: "w95-host-title" }, [
        el("span", { html: WIN95_ICONS.winFlag }),
        el("span", { class: "w95-host-label", text: "OpenCode 95" })
      ]),
      el("div", { class: "w95-host-actions" }, [
        el("button", {
          class: "w95-host-pill",
          titleKey: "switchStandard",
          textKey: "standard",
          onclick: () => this.toggleWin95Mode(false)
        }),
        el("button", {
          class: "w95-cap-btn",
          titleKey: "minimize",
          html: CAP_MIN_SVG,
          onclick: () => this.runHostAction("window.minimize")
        }),
        this.hostMaxBtn,
        el("button", {
          class: "w95-cap-btn",
          titleKey: "close",
          html: CAP_CLOSE_SVG,
          onclick: () => this.openWindow("shutdown")
        })
      ])
    ])
    body.appendChild(this.hostBar)

    // Desktop Background Layer + Left Column Icons
    this.desktopIconsEl = el("div", { id: "win95-desktop-icons" })
    this.desktopLayer = el(
      "div",
      {
        id: "win95-desktop-layer",
        onmousedown: (e) => {
          if (e.target === this.desktopLayer || e.target === this.desktopIconsEl) {
            this.clearDesktopSelection()
            this.closeAllMenus()
          }
        },
        oncontextmenu: (e) => {
          if (e.target === this.desktopLayer || e.target === this.desktopIconsEl) {
            e.preventDefault()
            this.openContextMenu(e.clientX, e.clientY)
          }
        }
      },
      [this.desktopIconsEl]
    )
    body.appendChild(this.desktopLayer)
    this.buildDesktopIcons()

    // Main Draggable/Resizable Windows 95 Application Window wrapping #root
    this.buildMainWindow(root)

    // Bottom Taskbar; menus and satellite windows are built as requested.
    this.buildTaskbar()
  }

  updateHostMaxIcon() {
    if (this.hostMaxBtn) {
      this.hostMaxBtn.innerHTML = this.hostMaximized ? CAP_RESTORE_SVG : CAP_MAX_SVG
    }
  }

  // ==========================================================================
  // DESKTOP ICONS (Left Column)
  // ==========================================================================
  buildDesktopIcons() {
    const items = [
      { id: "mycomp", label: "My Computer", icon: WIN95_ICONS.myComputer, action: () => this.openWindow("sysprop") },
      { id: "opencode", label: "OpenCode 95", icon: WIN95_ICONS.opencode, action: () => this.restoreAndFocusMain() },
      { id: "projects", label: "Projects", icon: WIN95_ICONS.folder, action: () => this.triggerOpencodeCommand("project.open") },
      { id: "newchat", label: "New Session", icon: WIN95_ICONS.notepad, action: () => this.triggerOpencodeCommand("session.new") },
      { id: "terminal", label: "MS-DOS Prompt", icon: WIN95_ICONS.msdos, action: () => this.triggerOpencodeCommand("terminal.toggle") },
      { id: "control", label: "Control Panel", icon: WIN95_ICONS.controlPanel, action: () => this.triggerOpencodeCommand("settings.open") },
      { id: "display", label: "Display", icon: WIN95_ICONS.display, action: () => this.openWindow("display") },
      { id: "welcome", label: "Welcome Tour", icon: WIN95_ICONS.lightbulb, action: () => this.openWindow("welcome") },
      { id: "recycle", label: "Recycle Bin", icon: WIN95_ICONS.recycleBin, action: () => this.openWindow("recycle") }
    ]

    for (const item of items) {
      const btn = el(
        "button",
        {
          class: "w95-desk-icon",
          type: "button",
          "data-icon-id": item.id,
          onclick: (e) => {
            e.stopPropagation()
            this.closeAllMenus()
            this.selectDesktopIcon(btn)
          },
          ondblclick: (e) => {
            e.stopPropagation()
            this.clearDesktopSelection()
            item.action()
          }
        },
        [
          el("div", { class: "w95-icon-img", html: item.icon }),
          el("div", { class: "w95-icon-label", text: item.label })
        ]
      )
      this.desktopIconsEl.appendChild(btn)
    }
  }

  selectDesktopIcon(target) {
    this.clearDesktopSelection()
    target.classList.add("selected")
  }

  clearDesktopSelection() {
    this.desktopIconsEl?.querySelectorAll(".w95-desk-icon.selected").forEach((n) => n.classList.remove("selected"))
  }

  // ==========================================================================
  // MAIN OPENCODE 95 WINDOW WRAPPING #root
  // ==========================================================================
  buildMainWindow(root) {
    this.mainTitleText = el("span", { class: "w95-titlebar-text", text: "OpenCode 95 — Workspace" })
    this.mainMaxBtn = el("button", {
      class: "w95-cap-btn",
      titleKey: "maximize",
      html: this.state.windowMaximized ? CAP_RESTORE_SVG : CAP_MAX_SVG,
      onclick: (e) => {
        e.stopPropagation()
        this.toggleMainMaximized()
      }
    })

    const titlebar = el(
      "div",
      {
        id: "win95-main-titlebar",
        class: "w95-titlebar",
        ondblclick: (e) => {
          if (!e.target.closest("button")) this.toggleMainMaximized()
        }
      },
      [
        el("div", { class: "w95-titlebar-left" }, [
          el("span", { html: WIN95_ICONS.opencode }),
          this.mainTitleText
        ]),
        el("div", { class: "w95-titlebar-controls" }, [
          el("button", {
            class: "w95-cap-btn",
            titleKey: "minimize",
            html: CAP_MIN_SVG,
            onclick: (e) => {
              e.stopPropagation()
              this.minimizeWindow("opencode")
            }
          }),
          this.mainMaxBtn,
          el("button", {
            class: "w95-cap-btn",
            titleKey: "hideWindow",
            html: CAP_CLOSE_SVG,
            onclick: (e) => {
              e.stopPropagation()
              if (e.shiftKey) this.openWindow("shutdown")
              else this.minimizeWindow("opencode")
            }
          })
        ])
      ]
    )

    const menubar = this.buildMainMenuBar()
    const viewport = el("div", { id: "win95-main-viewport" })

    this.statusLeft = el("div", { class: "w95-status-pane grow" }, [
      el("span", { textKey: "ready" }), " — ", el("span", { text: "OpenCode 95 Desktop" })
    ])
    this.statusRight = el("div", { class: "w95-status-pane", text: `v${this.sysInfo.version}` })
    const statusbar = el("div", { id: "win95-main-statusbar" }, [
      this.statusLeft,
      this.statusRight,
      el("div", { class: "w95-status-grip" })
    ])

    this.mainWindow = el(
      "div",
      {
        id: "win95-main-window",
        onmousedown: () => this.focusWindow("opencode")
      },
      [titlebar, menubar, viewport, statusbar]
    )

    // Add 8-direction resize handles
    for (const dir of ["n", "s", "w", "e", "nw", "ne", "sw", "se"]) {
      const handle = el("div", { class: `win95-resize-handle ${dir}` })
      this.makeResizable(this.mainWindow, handle, dir)
      this.mainWindow.appendChild(handle)
    }

    // Safely move #root inside #win95-main-viewport (preserves exact DOM identity & SolidJS reactivity!)
    if (root) {
      viewport.appendChild(root)
    }
    document.body.appendChild(this.mainWindow)

    // Apply initial floating geometry (leaves desktop icons & teal desktop nicely visible!)
    this.applyMainWindowBounds()
    if (this.state.windowMaximized) {
      this.mainWindow.classList.add("maximized")
    }

    this.makeDraggable(this.mainWindow, titlebar, () => !this.mainWindow.classList.contains("maximized"), (bounds) => {
      this.persistState({ windowBounds: bounds })
    })

    this.windows.set("opencode", {
      id: "opencode",
      title: "OpenCode 95",
      icon: WIN95_ICONS.opencode,
      el: this.mainWindow,
      open: true,
      minimized: false
    })
  }

  applyMainWindowBounds() {
    const area = this.desktopLayer.getBoundingClientRect()
    const bounds = this.state.windowBounds
    const saved = bounds && ["left", "top", "width", "height"].every((key) => Number.isFinite(bounds[key]))
      && bounds.width > 0 && bounds.height > 0
    const inset = area.width >= 680 ? 104 : 4
    const width = saved ? bounds.width : area.width - inset - 12
    const height = saved ? bounds.height : area.height - 20
    Object.assign(this.mainWindow.style, {
      width: `${clamp(width, Math.min(520, area.width), area.width)}px`,
      height: `${clamp(height, Math.min(360, area.height), area.height)}px`
    })
    this.positionWindow(this.mainWindow, saved ? bounds.left : inset, saved ? bounds.top : area.top + 8)
  }

  positionWindow(winEl, left, top) {
    const area = this.desktopLayer.getBoundingClientRect()
    const rect = winEl.getBoundingClientRect()
    winEl.style.left = `${clamp(left, area.left, Math.max(area.left, area.right - rect.width))}px`
    winEl.style.top = `${clamp(top, area.top, Math.max(area.top, area.bottom - rect.height))}px`
  }

  toggleMainMaximized() {
    const next = !this.mainWindow.classList.contains("maximized")
    this.mainWindow.classList.toggle("maximized", next)
    if (!next) this.applyMainWindowBounds()
    this.mainMaxBtn.innerHTML = next ? CAP_RESTORE_SVG : CAP_MAX_SVG
    this.persistState({ windowMaximized: next })
  }

  buildMainMenuBar() {
    const menus = [
      {
        label: "<u>F</u>ile",
        items: [
          { label: "New Session", accel: "Ctrl+Shift+S", action: () => this.triggerOpencodeCommand("session.new") },
          { label: "Open Project...", accel: "Ctrl+O", action: () => this.triggerOpencodeCommand("project.open") },
          { label: "New Window", accel: "Ctrl+Shift+N", action: () => this.runHostAction("window.new") },
          { sep: true },
          { label: "Export Session", action: () => this.triggerOpencodeCommand("session.export") },
          { label: "Export Debug Logs", action: () => this.triggerOpencodeCommand("logs.export") },
          { sep: true },
          { label: "Control Panel (Settings)...", accel: "Ctrl+,", action: () => this.triggerOpencodeCommand("settings.open") },
          { sep: true },
          { label: "Minimize to Taskbar", action: () => this.minimizeWindow("opencode") },
          { label: "Shut Down OpenCode...", action: () => this.openWindow("shutdown") }
        ]
      },
      {
        label: "<u>E</u>dit",
        items: [
          { label: "Undo", accel: "Ctrl+Z", action: () => this.runHostAction("edit.undo") },
          { label: "Redo", accel: "Ctrl+Y", action: () => this.runHostAction("edit.redo") },
          { sep: true },
          { label: "Cut", accel: "Ctrl+X", action: () => this.runHostAction("edit.cut") },
          { label: "Copy", accel: "Ctrl+C", action: () => this.runHostAction("edit.copy") },
          { label: "Paste", accel: "Ctrl+V", action: () => this.runHostAction("edit.paste") },
          { label: "Select All", accel: "Ctrl+A", action: () => this.runHostAction("edit.selectAll") }
        ]
      },
      {
        label: "<u>V</u>iew",
        items: [
          { label: "Toggle Sidebar", action: () => this.triggerOpencodeCommand("sidebar.toggle") },
          { label: "Toggle File Tree", action: () => this.triggerOpencodeCommand("fileTree.toggle") },
          { label: "Toggle MS-DOS Terminal", accel: "Ctrl+`", action: () => this.triggerOpencodeCommand("terminal.toggle") },
          { sep: true },
          { label: "Zoom In", accel: "Ctrl++", action: () => this.runHostAction("view.zoomIn") },
          { label: "Zoom Out", accel: "Ctrl+-", action: () => this.runHostAction("view.zoomOut") },
          { label: "Actual Size", accel: "Ctrl+0", action: () => this.runHostAction("view.resetZoom") },
          { sep: true },
          { labelKey: "display", action: () => this.openWindow("display") },
          { labelKey: "switchStandard", action: () => this.toggleWin95Mode(false) },
          { sep: true },
          { label: "Reload Interface", accel: "Ctrl+R", action: () => this.runHostAction("view.reload") },
          { label: "Developer Tools", action: () => this.runHostAction("view.toggleDevTools") }
        ]
      },
      {
        label: "<u>G</u>o",
        items: [
          { label: "Back", accel: "Alt+←", action: () => this.triggerOpencodeCommand("common.goBack") },
          { label: "Forward", accel: "Alt+→", action: () => this.triggerOpencodeCommand("common.goForward") },
          { sep: true },
          { label: "Next Session", action: () => this.triggerOpencodeCommand("session.next") },
          { label: "Previous Session", action: () => this.triggerOpencodeCommand("session.previous") },
          { label: "Next Project", action: () => this.triggerOpencodeCommand("project.next") },
          { label: "Previous Project", action: () => this.triggerOpencodeCommand("project.previous") }
        ]
      },
      {
        label: "<u>T</u>ools",
        items: [
          { label: "Command Palette...", accel: "Ctrl+K", action: () => this.triggerCommandPalette() },
          { label: "Choose Model...", action: () => this.triggerOpencodeCommand("model.choose") },
          { label: "Cycle Agent Mode", action: () => this.triggerOpencodeCommand("agent.cycle") },
          { label: "MCP Servers...", action: () => this.triggerOpencodeCommand("mcp.toggle") },
          { sep: true },
          { label: "Compact Session", action: () => this.triggerOpencodeCommand("session.compact") },
          { label: "Fork Session", action: () => this.triggerOpencodeCommand("session.fork") },
          { sep: true },
          { label: "Run Command...", action: () => this.openWindow("run") }
        ]
      },
      {
        label: "<u>H</u>elp",
        items: [
          { label: "Welcome to OpenCode 95...", action: () => this.openWindow("welcome") },
          { label: "System Properties...", action: () => this.openWindow("sysprop") },
          { sep: true },
          { label: "Check for Updates...", action: () => this.runHostAction("app.checkForUpdates") }
        ]
      }
    ]

    const bar = el("div", { id: "win95-main-menubar" })
    for (const m of menus) {
      const dd = el("div", { class: "w95-menu-dropdown" })
      for (const item of m.items) {
        if (item.sep) {
          dd.appendChild(el("div", { class: "w95-menu-sep" }))
        } else {
          dd.appendChild(
            el(
              "button",
              {
                class: "w95-menu-entry",
                type: "button",
                onclick: (e) => {
                  e.stopPropagation()
                  this.closeAllMenus()
                  item.action()
                }
              },
              [
                el("span", { text: item.label, textKey: item.labelKey }),
                item.accel ? el("span", { class: "w95-accel", text: item.accel }) : null
              ]
            )
          )
        }
      }

      const group = el("div", { class: "w95-menubar-group" })
      const openMenu = () => {
        this.closeAllMenus()
        group.classList.add("open")
        btn.setAttribute("aria-expanded", "true")
        dd.style.removeProperty("--w95-menu-offset")
        const rect = dd.getBoundingClientRect()
        const area = this.desktopLayer.getBoundingClientRect()
        dd.style.setProperty("--w95-menu-offset", `${Math.min(0, area.right - rect.right)}px`)
        dd.style.maxHeight = `${Math.max(0, area.bottom - rect.top)}px`
      }
      const btn = el("button", {
        class: "w95-menubar-item",
        type: "button",
        "aria-expanded": "false",
        html: m.label,
        onclick: () => {
          if (group.classList.contains("open")) this.closeAllMenus()
          else openMenu()
        },
        onkeydown: (event) => {
          if (event.key !== "ArrowDown") return
          event.preventDefault()
          openMenu()
          dd.querySelector("button")?.focus()
        },
        onmouseenter: () => {
          if (bar.querySelector(".w95-menubar-group.open") && !group.classList.contains("open")) openMenu()
        }
      })
      group.append(btn, dd)
      bar.appendChild(group)
    }

    return bar
  }

  // ==========================================================================
  // WINDOW MANAGER HELPERS
  // ==========================================================================
  createExtraWindow({ id, title, titleKey, icon, width, height, bodyEl }) {
    const titlebar = el("div", { class: "w95-titlebar" }, [
      el("div", { class: "w95-titlebar-left" }, [
        icon ? el("span", { html: icon }) : null,
        el("span", { class: "w95-titlebar-text", text: title, textKey: titleKey })
      ]),
      el("div", { class: "w95-titlebar-controls" }, [
        el("button", {
          class: "w95-cap-btn",
          titleKey: "minimize",
          html: CAP_MIN_SVG,
          onclick: (e) => {
            e.stopPropagation()
            this.minimizeWindow(id)
          }
        }),
        el("button", {
          class: "w95-cap-btn",
          titleKey: "close",
          html: CAP_CLOSE_SVG,
          onclick: (e) => {
            e.stopPropagation()
            this.closeWindow(id)
          }
        })
      ])
    ])

    const winEl = el(
      "div",
      {
        id: `win95-win-${id}`,
        class: "win95-extra-window",
        style: { width: `${width}px` },
        onmousedown: () => this.focusWindow(id)
      },
      [titlebar, bodyEl]
    )

    if (height) winEl.style.setProperty("--w95-dialog-height", `${height}px`)
    const w = { id, title, titleKey, icon: icon || WIN95_ICONS.winFlag, el: winEl, open: false, minimized: false }
    this.makeDraggable(winEl, titlebar, () => true, ({ left, top }) => {
      this.dialogPositions.set(id, { left, top })
    })
    document.body.appendChild(winEl)
    this.windows.set(id, w)
  }

  openWindow(id) {
    if (!this.state.enabled) return
    if (!this.windows.has(id) && Object.hasOwn(EXTRA_WINDOWS, id)) this[EXTRA_WINDOWS[id]]()
    const w = this.windows.get(id)
    if (!w) return
    this.closeAllMenus()
    w.open = true
    w.minimized = false
    w.el.classList.remove("minimized")
    if (id !== "opencode") {
      w.el.classList.add("open")
      this.positionExtraWindow(w)
    }
    this.focusWindow(id)
    if (id === "shutdown") sounds.play("ding")
  }

  positionExtraWindow(w) {
    const area = this.desktopLayer.getBoundingClientRect()
    const rect = w.el.getBoundingClientRect()
    const position = this.dialogPositions.get(w.id)
    const left = position?.left ?? Math.round((area.width - rect.width) / 2)
    const top = position?.top ?? Math.round(area.top + (area.height - rect.height) / 2)
    this.positionWindow(w.el, left, top)
  }

  closeWindow(id) {
    const w = this.windows.get(id)
    if (!w || id === "opencode") return
    if (this.mouseGesture?.winEl === w.el) this.mouseGesture.cancel()
    w.el.remove()
    w.taskbarButton?.remove()
    this.windows.delete(id)
    this.zOrder = this.zOrder.filter((windowId) => windowId !== id)
    if (id === "display") this.syncDisplayUI = null
    if (this.activeWindowId === id) this.focusTopWindow()
  }

  minimizeWindow(id) {
    const w = this.windows.get(id)
    if (!w) return
    w.minimized = true
    w.el.classList.add("minimized")
    if (this.activeWindowId === id) this.focusTopWindow()
    this.renderTaskbarWindows()
  }

  focusTopWindow() {
    this.activeWindowId = null
    const visible = this.zOrder.findLast((id) => {
      const w = this.windows.get(id)
      return w?.open && !w.minimized
    })
    if (visible) this.focusWindow(visible)
  }

  restoreAndFocusMain() {
    const w = this.windows.get("opencode")
    if (!w) return
    w.open = true
    w.minimized = false
    w.el.classList.remove("minimized")
    this.applyMainWindowBounds()
    this.focusWindow("opencode")
  }

  showDesktop() {
    let anyVisible = false
    for (const w of this.windows.values()) {
      if (w.open && !w.minimized) anyVisible = true
    }
    if (anyVisible) {
      for (const w of this.windows.values()) {
        if (w.open && !w.minimized) {
          w.minimized = true
          w.el.classList.add("minimized")
        }
      }
      this.activeWindowId = null
    } else {
      this.restoreAndFocusMain()
    }
    this.renderTaskbarWindows()
  }

  focusWindow(id) {
    const target = this.windows.get(id)
    if (!target || !target.open || target.minimized) return
    if (this.activeWindowId === id) {
      this.renderTaskbarWindows()
      return
    }
    this.activeWindowId = id
    this.zOrder = this.zOrder.filter((x) => x !== id)
    this.zOrder.push(id)
    // Keep all desktop windows strictly in z-index 10..40 (below Kobalte portals & Taskbar!)
    this.zOrder.forEach((wid, idx) => {
      const w = this.windows.get(wid)
      if (w) w.el.style.zIndex = String(10 + idx * 2)
    })
    for (const w of this.windows.values()) {
      w.el.classList.toggle("w95-window-inactive", w.id !== id)
    }
    this.renderTaskbarWindows()
  }

  trackMouse(winEl, onMove, onDone) {
    this.mouseGesture?.cancel()
    const controller = new AbortController()
    const options = { signal: controller.signal }
    const cancel = () => {
      controller.abort()
      this.mouseGesture = null
    }
    const finish = () => {
      cancel()
      const r = winEl.getBoundingClientRect()
      onDone({ left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) })
    }
    this.mouseGesture = { winEl, cancel }
    window.addEventListener("mousemove", onMove, options)
    window.addEventListener("mouseup", finish, options)
    window.addEventListener("blur", finish, options)
  }

  makeDraggable(winEl, handleEl, canDrag, onDone) {
    handleEl.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || e.target.closest("button")) return
      if (!canDrag()) return
      const { clientX: startX, clientY: startY } = e
      const { left, top } = winEl.getBoundingClientRect()
      this.trackMouse(winEl, (move) => {
        this.positionWindow(winEl, left + move.clientX - startX, top + move.clientY - startY)
      }, onDone)
      e.preventDefault()
    })
  }

  makeResizable(winEl, handleEl, dir) {
    handleEl.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || winEl.classList.contains("maximized")) return
      const { clientX: startX, clientY: startY } = e
      const orig = winEl.getBoundingClientRect()
      this.trackMouse(winEl, (move) => {
        const dx = move.clientX - startX
        const dy = move.clientY - startY
        const area = this.desktopLayer.getBoundingClientRect()
        const minWidth = Math.min(520, area.width)
        const minHeight = Math.min(360, area.height)
        const left = dir.includes("w") ? clamp(orig.left + dx, area.left, orig.right - minWidth) : orig.left
        const top = dir.includes("n") ? clamp(orig.top + dy, area.top, orig.bottom - minHeight) : orig.top
        const right = dir.includes("e") ? clamp(orig.right + dx, left + minWidth, area.right) : orig.right
        const bottom = dir.includes("s") ? clamp(orig.bottom + dy, top + minHeight, area.bottom) : orig.bottom
        Object.assign(winEl.style, {
          left: `${Math.round(left)}px`,
          top: `${Math.round(top)}px`,
          width: `${Math.round(right - left)}px`,
          height: `${Math.round(bottom - top)}px`
        })
      }, (bounds) => this.persistState({ windowBounds: bounds }))
      e.preventDefault()
      e.stopPropagation()
    })
  }

  // ==========================================================================
  // 1. WELCOME TO OPENCODE 95 DIALOG (Homage to Screenshot #1!)
  // ==========================================================================
  buildWelcomeWindow() {
    const tipText = el("div", { text: WELCOME_TIPS[this.tipIndex], style: { fontSize: "11px", lineHeight: "1.45" } })
    const showCheck = el("input", {
      type: "checkbox",
      id: "w95-welcome-chk",
      onchange: () => this.persistState({ showWelcome: showCheck.checked })
    })
    showCheck.checked = this.state.showWelcome

    const body = el("div", { class: "w95-dialog-body" }, [
      el("div", {
        class: "w95-welcome-heading",
        html: `Welcome to <b>OpenCode</b><span class="w95-95">95</span>`
      }),
      el("div", { class: "w95-welcome-grid" }, [
        el("div", { class: "w95-welcome-tipbox" }, [
          el("div", { class: "w95-welcome-tip-top" }, [
            el("span", { html: WIN95_ICONS.lightbulb }),
            el("div", {}, [
              el("div", { text: "Did you know...", style: { fontWeight: "700", marginBottom: "5px" } }),
              tipText
            ])
          ]),
          el("div", { class: "w95-welcome-crt", html: WIN95_ICONS.welcomeCrt })
        ]),
        el("div", { class: "w95-welcome-buttons" }, [
          el("button", {
            class: "w95-btn",
            text: "Next Tip →",
            onclick: () => {
              this.tipIndex = (this.tipIndex + 1) % WELCOME_TIPS.length
              tipText.textContent = WELCOME_TIPS[this.tipIndex]
            }
          }),
          el("button", {
            class: "w95-btn",
            textKey: "display",
            onclick: () => this.openWindow("display")
          }),
          el("button", {
            class: "w95-btn",
            text: "System Properties",
            onclick: () => this.openWindow("sysprop")
          }),
          el("button", {
            class: "w95-btn",
            text: "New Session",
            onclick: () => {
              this.closeWindow("welcome")
              this.triggerOpencodeCommand("session.new")
            }
          }),
          el("div", { class: "w95-menu-sep", style: { margin: "8px 0" } }),
          el("button", {
            class: "w95-btn default-btn",
            textKey: "close",
            onclick: () => this.closeWindow("welcome")
          })
        ])
      ]),
      el("div", { class: "w95-welcome-footer" }, [
        el("label", { style: { display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" } }, [
          showCheck,
          el("span", { textKey: "showWelcome" })
        ])
      ])
    ])

    this.createExtraWindow({
      id: "welcome",
      title: "Welcome",
      icon: WIN95_ICONS.lightbulb,
      width: 492,
      height: 335,
      bodyEl: body
    })
  }

  // ==========================================================================
  // 2. DISPLAY PROPERTIES DIALOG (Wallpapers, Schemes, Sounds, Mode Toggle)
  // ==========================================================================
  buildDisplayPropertiesWindow() {
    const previewScreen = el("div", { class: "w95-crt-screen w95-wp-preview" }, [
      el("div", { class: "w95-crt-mini-win" }, [
        el("div", { class: "w95-crt-mini-bar" }),
        el("div", { class: "w95-crt-mini-body" })
      ]),
      el("div", { class: "w95-crt-mini-tb" })
    ])

    const wpRows = WALLPAPERS.map((id) => el("div", {
      class: "w95-listbox-item",
      textKey: id,
      onclick: () => this.persistState({ wallpaper: id })
    }))
    const wpList = el("div", { class: "w95-listbox" }, wpRows)

    const tabBackground = el("div", {}, [
      el("div", { class: "w95-crt-preview-wrap" }, [
        el("div", { class: "w95-crt-monitor" }, [previewScreen])
      ]),
      el("fieldset", { class: "w95-fieldset" }, [
        el("legend", { textKey: "wallpaper" }),
        wpList
      ])
    ])

    const schemeRows = SCHEMES.map((sc) => el("div", {
      class: "w95-listbox-item",
      text: sc.name,
      onclick: () => this.persistState({ colorScheme: sc.id })
    }))
    const schemeList = el("div", { class: "w95-listbox", style: { height: "110px" } }, schemeRows)

    const tabAppearance = el("div", { style: { display: "none" } }, [
      el("fieldset", { class: "w95-fieldset" }, [
        el("legend", { textKey: "colors" }),
        schemeList
      ]),
      el("fieldset", { class: "w95-fieldset" }, [
        el("legend", { textKey: "layout" }),
        el("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, [
          el("button", {
            class: "w95-btn",
            textKey: "floating",
            onclick: () => {
              this.mainWindow.classList.remove("maximized")
              this.mainMaxBtn.innerHTML = CAP_MAX_SVG
              this.persistState({ windowMaximized: false, windowBounds: null })
              this.applyMainWindowBounds()
            }
          }),
          el("button", {
            class: "w95-btn",
            textKey: "fillDesktop",
            onclick: () => {
              this.mainWindow.classList.add("maximized")
              this.mainMaxBtn.innerHTML = CAP_RESTORE_SVG
              this.persistState({ windowMaximized: true })
            }
          })
        ])
      ])
    ])

    const chkSounds = el("input", {
      type: "checkbox",
      onchange: () => {
        this.persistState({ sounds: chkSounds.checked })
        if (chkSounds.checked) sounds.play("ding")
      }
    })
    chkSounds.checked = this.state.sounds

    const chkCursor = el("input", {
      type: "checkbox",
      onchange: () => {
        this.persistState({ retroCursor: chkCursor.checked })
      }
    })
    chkCursor.checked = this.state.retroCursor

    const chkWelcome = el("input", {
      type: "checkbox",
      onchange: () => {
        this.persistState({ showWelcome: chkWelcome.checked })
      }
    })
    chkWelcome.checked = this.state.showWelcome

    const tabSounds = el("div", { style: { display: "none" } }, [
      el("fieldset", { class: "w95-fieldset" }, [
        el("legend", { textKey: "effects" }),
        el("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } }, [
          el("label", { style: { display: "flex", alignItems: "center", gap: "6px" } }, [
            chkSounds,
            el("span", { textKey: "sounds" })
          ]),
          el("label", { style: { display: "flex", alignItems: "center", gap: "6px" } }, [
            chkCursor,
            el("span", { textKey: "pixelCursor" })
          ]),
          el("label", { style: { display: "flex", alignItems: "center", gap: "6px" } }, [
            chkWelcome,
            el("span", { textKey: "showWelcome" })
          ])
        ])
      ]),
      el("fieldset", { class: "w95-fieldset" }, [
        el("legend", { textKey: "soundTest" }),
        el("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" } }, [
          el("button", { class: "w95-btn", text: "▶ Startup", onclick: () => sounds.play("startup") }),
          el("button", { class: "w95-btn", text: "▶ Ding", onclick: () => sounds.play("ding") }),
          el("button", { class: "w95-btn", text: "▶ Chord", onclick: () => sounds.play("chord") }),
          el("button", { class: "w95-btn", text: "▶ Chimes", onclick: () => sounds.play("chimes") }),
          el("button", { class: "w95-btn", text: "▶ Tada", onclick: () => sounds.play("shutdown") })
        ])
      ])
    ])

    const tabMode = el("div", { style: { display: "none" } }, [
      el("fieldset", { class: "w95-fieldset" }, [
        el("legend", { textKey: "uiMode" }),
        el("p", {
          style: { margin: "0 0 10px 0" },
          textKey: "modeHint"
        }),
        el("button", {
          class: "w95-btn",
          textKey: "switchStandard",
          onclick: () => this.toggleWin95Mode(false)
        })
      ]),
      el("fieldset", { class: "w95-fieldset" }, [
        el("legend", { textKey: "themeFiles" }),
        el("div", {
          style: { fontFamily: "var(--w95-font-mono)", fontSize: "10px", lineHeight: "1.5", userSelect: "text" }
        }, [
          el("span", { textKey: "themeFolder" }), " %USERPROFILE%\\.config\\opencode\\win95-theme\\", el("br"),
          el("span", { textKey: "restore" }), " restore.ps1"
        ])
      ])
    ])

    const panels = [tabBackground, tabAppearance, tabSounds, tabMode]
    const tabLabels = ["wallpaper", "appearance", "effects", "uiMode"]
    const tabStrip = el("div", { class: "w95-tabs-strip" })
    const tabBtns = tabLabels.map((lbl, idx) => {
      const b = el("button", {
        class: `w95-tab-btn${idx === 0 ? " active" : ""}`,
        textKey: lbl,
        onclick: () => {
          tabBtns.forEach((x, i) => x.classList.toggle("active", i === idx))
          panels.forEach((p, i) => (p.style.display = i === idx ? "block" : "none"))
        }
      })
      tabStrip.appendChild(b)
      return b
    })

    const body = el("div", { class: "w95-dialog-body" }, [
      tabStrip,
      el("div", { class: "w95-tab-panel" }, panels),
      el("div", { class: "w95-dialog-actions" }, [
        el("button", {
          class: "w95-btn default-btn",
          text: "OK",
          onclick: () => this.closeWindow("display")
        }),
        el("button", {
          class: "w95-btn",
          textKey: "close",
          onclick: () => this.closeWindow("display")
        })
      ])
    ])

    this.syncDisplayUI = () => {
      const { wallpaper, colorScheme } = this.state
      previewScreen.setAttribute("data-wp", wallpaper)
      chkSounds.checked = this.state.sounds
      chkCursor.checked = this.state.retroCursor
      chkWelcome.checked = this.state.showWelcome
      wpRows.forEach((row, i) => row.classList.toggle("selected", WALLPAPERS[i] === wallpaper))
      schemeRows.forEach((row, i) => row.classList.toggle("selected", SCHEMES[i].id === colorScheme))
    }
    this.syncDisplayUI()

    this.createExtraWindow({
      id: "display",
      titleKey: "display",
      icon: WIN95_ICONS.display,
      width: 420,
      height: 390,
      bodyEl: body
    })
  }

  // ==========================================================================
  // 3. SYSTEM PROPERTIES DIALOG (Direct Homage to Screenshot #2!)
  // ==========================================================================
  buildSystemPropertiesWindow() {
    const tabGeneral = el("div", { style: { display: "flex", gap: "18px", padding: "10px 6px" } }, [
      el("div", { html: WIN95_ICONS.sysPropCrt, style: { width: "110px", flexShrink: "0" } }),
      el("div", { style: { fontSize: "11px", lineHeight: "1.6" } }, [
        el("div", { text: "System:", style: { fontWeight: "700" } }),
        el("div", { style: { paddingLeft: "14px", marginBottom: "10px" }, html: `Microsoft Windows 95<br/>OpenCode 95 Edition<br/>4.00.950 B (v${this.sysInfo.version})` }),
        el("div", { text: "Registered to:", style: { fontWeight: "700" } }),
        el("div", { style: { paddingLeft: "14px", marginBottom: "10px" }, html: `${this.sysInfo.user}<br/>OpenCode Desktop<br/>15795-OEM-OPENCODE-95` }),
        el("div", { text: "Computer:", style: { fontWeight: "700" } }),
        el("div", { style: { paddingLeft: "14px" }, html: `Electron ${this.sysInfo.electron} / Node ${this.sysInfo.node}<br/>Architecture: ${this.sysInfo.arch}` })
      ])
    ])

    const tabShortcuts = el("div", { style: { display: "none", padding: "6px" } }, [
      el("fieldset", { class: "w95-fieldset" }, [
        el("legend", { text: "Горячие клавиши OpenCode 95" }),
        el("div", {
          style: { lineHeight: "1.8" },
          html: `
            <b>Ctrl + Esc</b> — Открыть / закрыть меню Start<br/>
            <b>Ctrl + K</b> — Палитра команд OpenCode<br/>
            <b>Ctrl + ,</b> — Настройки OpenCode (Control Panel)<br/>
            <b>Ctrl + \`</b> — MS-DOS Prompt (Терминал)<br/>
            <b>Ctrl + Shift + 9</b> — Быстро переключить Win95 / Обычный UI<br/>
            <b>ПКМ по рабочему столу</b> — Контекстное меню и обои
          `
        })
      ])
    ])

    const panels = [tabGeneral, tabShortcuts]
    const tabStrip = el("div", { class: "w95-tabs-strip" })
    const tabBtns = ["General", "Shortcuts"].map((lbl, idx) => {
      const b = el("button", {
        class: `w95-tab-btn${idx === 0 ? " active" : ""}`,
        text: lbl,
        onclick: () => {
          tabBtns.forEach((x, i) => x.classList.toggle("active", i === idx))
          panels.forEach((p, i) => (p.style.display = i === idx ? (idx === 0 ? "flex" : "block") : "none"))
        }
      })
      tabStrip.appendChild(b)
      return b
    })

    const body = el("div", { class: "w95-dialog-body" }, [
      tabStrip,
      el("div", { class: "w95-tab-panel" }, panels),
      el("div", { class: "w95-dialog-actions" }, [
        el("button", { class: "w95-btn default-btn", text: "OK", onclick: () => this.closeWindow("sysprop") }),
        el("button", { class: "w95-btn", text: "Cancel", onclick: () => this.closeWindow("sysprop") })
      ])
    ])

    this.createExtraWindow({
      id: "sysprop",
      title: "System Properties",
      icon: WIN95_ICONS.myComputer,
      width: 410,
      height: 340,
      bodyEl: body
    })
  }

  // ==========================================================================
  // 4. RECYCLE BIN EXPLORER WINDOW
  // ==========================================================================
  buildRecycleBinWindow() {
    const status = el("div", { class: "w95-status-pane grow", text: "0 object(s) in Recycle Bin" })
    const body = el("div", { style: { display: "flex", flexDirection: "column", padding: "4px", gap: "4px" } }, [
      el("div", {
        style: {
          background: "var(--w95-window-bg)",
          boxShadow: "var(--w95-bevel-in)",
          padding: "16px",
          minHeight: "145px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          textAlign: "center"
        }
      }, [
        el("span", { html: WIN95_ICONS.recycleBin, style: { width: "40px", height: "40px" } }),
        el("div", { text: "Корзина пуста (архивные сессии хранятся в OpenCode).", style: { fontSize: "11px" } }),
        el("div", { style: { display: "flex", gap: "8px" } }, [
          el("button", {
            class: "w95-btn",
            text: "Открыть OpenCode",
            onclick: () => {
              this.closeWindow("recycle")
              this.restoreAndFocusMain()
            }
          }),
          el("button", {
            class: "w95-btn",
            text: "Empty Recycle Bin",
            onclick: () => {
              sounds.play("chord")
              status.textContent = "Корзина уже чиста!"
            }
          })
        ])
      ]),
      el("div", { style: { display: "flex", gap: "3px" } }, [status, el("div", { class: "w95-status-pane", text: "0 bytes" })])
    ])

    this.createExtraWindow({
      id: "recycle",
      title: "Recycle Bin",
      icon: WIN95_ICONS.recycleBin,
      width: 380,
      height: 230,
      bodyEl: body
    })
  }

  // ==========================================================================
  // 5. CLASSIC WIN95 RUN DIALOG
  // ==========================================================================
  buildRunWindow() {
    const input = el("input", {
      type: "text",
      class: "w95-input",
      placeholder: "opencode, dos, desk.cpl, sysdm.cpl, control, new, normal...",
      style: { flex: "1", width: "100%" },
      oninput: () => { this.runDraft = input.value },
      onkeydown: (e) => {
        if (e.key === "Enter") executeRun()
        if (e.key === "Escape") this.closeWindow("run")
      }
    })
    input.value = this.runDraft ?? ""

    const executeRun = () => {
      const cmd = input.value.trim().toLowerCase()
      this.runDraft = ""
      this.closeWindow("run")
      if (!cmd || cmd === "opencode") this.restoreAndFocusMain()
      else if (cmd === "dos" || cmd === "cmd" || cmd === "terminal") this.triggerOpencodeCommand("terminal.toggle")
      else if (cmd === "desk.cpl" || cmd === "display" || cmd === "wallpaper") this.openWindow("display")
      else if (cmd === "sysdm.cpl" || cmd === "sys" || cmd === "about") this.openWindow("sysprop")
      else if (cmd === "control" || cmd === "settings") this.triggerOpencodeCommand("settings.open")
      else if (cmd === "welcome") this.openWindow("welcome")
      else if (cmd === "new" || cmd === "chat") this.triggerOpencodeCommand("session.new")
      else if (cmd === "open" || cmd === "project") this.triggerOpencodeCommand("project.open")
      else if (cmd === "normal" || cmd === "modern") this.toggleWin95Mode(false)
      else if (cmd === "reload") this.runHostAction("view.reload")
      else if (cmd === "devtools") this.runHostAction("view.toggleDevTools")
      else {
        sounds.play("error")
        this.openWindow("run")
      }
    }

    const body = el("div", { class: "w95-dialog-body" }, [
      el("div", { style: { display: "flex", gap: "12px", marginBottom: "12px", alignItems: "center" } }, [
        el("span", { html: WIN95_ICONS.run, style: { width: "32px", height: "32px", flexShrink: "0" } }),
        el("div", { text: "Введите имя команды (opencode, dos, desk.cpl, sysdm.cpl, control, new, normal, devtools):" })
      ]),
      el("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" } }, [
        el("label", { text: "Open:" }),
        input
      ]),
      el("div", { class: "w95-dialog-actions" }, [
        el("button", { class: "w95-btn default-btn", text: "OK", onclick: executeRun }),
        el("button", { class: "w95-btn", text: "Cancel", onclick: () => this.closeWindow("run") })
      ])
    ])

    this.createExtraWindow({
      id: "run",
      title: "Run",
      icon: WIN95_ICONS.run,
      width: 390,
      height: 175,
      bodyEl: body
    })
  }

  // ==========================================================================
  // 6. CLASSIC WIN95 SHUT DOWN DIALOG
  // ==========================================================================
  buildShutdownWindow() {
    let choice = this.shutdownChoice ?? "exit"
    const opts = [
      { id: "exit", label: "Shut down OpenCode (Закрыть приложение)" },
      { id: "restart", label: "Restart OpenCode (Перезапустить)" },
      { id: "normal", label: "Switch to Standard OpenCode UI (Выключить тему Win95)" },
      { id: "minimize", label: "Minimize OpenCode to Windows Taskbar (Свернуть)" }
    ]

    const radioGroup = el("div", { style: { display: "flex", flexDirection: "column", gap: "7px", marginTop: "8px" } })
    for (const o of opts) {
      const inp = el("input", {
        type: "radio",
        name: "w95-shutdown-choice",
        value: o.id,
        onchange: () => {
          this.shutdownChoice = choice = o.id
        }
      })
      inp.checked = o.id === choice
      radioGroup.appendChild(
        el("label", { style: { display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" } }, [inp, o.label])
      )
    }

    const body = el("div", { class: "w95-dialog-body" }, [
      el("div", { style: { display: "flex", gap: "14px", alignItems: "flex-start" } }, [
        el("span", { html: WIN95_ICONS.shutdown, style: { width: "36px", height: "36px", flexShrink: "0" } }),
        el("div", {}, [
          el("div", { text: "Are you sure you want to:", style: { fontWeight: "700" } }),
          radioGroup
        ])
      ]),
      el("div", { class: "w95-dialog-actions", style: { marginTop: "16px" } }, [
        el("button", {
          class: "w95-btn default-btn",
          text: "Yes",
          onclick: async () => {
            this.closeWindow("shutdown")
            if (choice === "exit" || choice === "restart") {
              const action = choice === "exit" ? "window.close" : "app.relaunch"
              await sounds.play("shutdown", { waitForEnd: true })
              this.runHostAction(action)
            } else if (choice === "normal") {
              this.toggleWin95Mode(false)
            } else if (choice === "minimize") {
              this.runHostAction("window.minimize")
            }
          }
        }),
        el("button", { class: "w95-btn", text: "No", onclick: () => this.closeWindow("shutdown") })
      ])
    ])

    this.createExtraWindow({
      id: "shutdown",
      title: "Shut Down OpenCode 95",
      icon: WIN95_ICONS.shutdown,
      width: 400,
      height: 215,
      bodyEl: body
    })
  }

  // ==========================================================================
  // START MENU (Homage to Screenshot #2 with vertical banner & submenus!)
  // ==========================================================================
  buildStartMenu() {
    const mkSub = (items) =>
      el(
        "div",
        { class: "w95-start-submenu" },
        items.map((it) =>
          it.sep
            ? el("div", { class: "w95-menu-sep" })
            : el(
                "button",
                {
                  class: "w95-start-subitem",
                  type: "button",
                  onclick: (e) => {
                    e.stopPropagation()
                    this.closeAllMenus()
                    it.action()
                  }
                },
                [el("span", { html: it.icon || WIN95_ICONS.opencode }), el("span", { text: it.label, textKey: it.labelKey })]
              )
        )
      )

    const mkItem = ({ icon, label, labelKey, sub, action }) => {
      const open = () => {
        this.startMenu.querySelector(".w95-start-group.submenu-open")?.classList.remove("submenu-open")
        if (!sub) return
        group.classList.add("submenu-open")
        sub.style.removeProperty("--w95-submenu-x")
        sub.style.removeProperty("--w95-submenu-y")
        const area = this.desktopLayer.getBoundingClientRect()
        const rect = sub.getBoundingClientRect()
        const left = clamp(rect.left, area.left, Math.max(area.left, area.right - rect.width))
        const top = clamp(rect.top, area.top, Math.max(area.top, area.bottom - rect.height))
        sub.style.setProperty("--w95-submenu-x", `${left - rect.left}px`)
        sub.style.setProperty("--w95-submenu-y", `${top - rect.top}px`)
      }
      const trigger = el("button", {
        class: "w95-start-item",
        type: "button",
        onclick: () => {
          if (sub) {
            open()
            sub.querySelector("button")?.focus()
            return
          }
          this.closeAllMenus()
          action?.()
        },
        onfocus: open,
        onkeydown: (event) => {
          if (event.key === "ArrowRight" && sub) {
            event.preventDefault()
            open()
            sub.querySelector("button")?.focus()
          }
        }
      }, [
        el("span", { html: icon }),
        el("span", { class: "w95-start-label", text: label, textKey: labelKey }),
        sub ? el("span", { class: "w95-start-arrow", text: "▶" }) : null
      ])
      const group = el("div", { class: "w95-start-group", onmouseenter: open }, [trigger, sub])
      return group
    }

    this.startMenu = el("div", { id: "win95-start-menu" }, [
      el("div", { class: "w95-start-banner" }, [
        el("div", { class: "w95-start-banner-text", html: `<strong>OpenCode</strong> 95` })
      ]),
      el("div", { class: "w95-start-list" }, [
        mkItem({
          icon: WIN95_ICONS.folderOpen,
          label: "Programs",
          sub: mkSub([
            { icon: WIN95_ICONS.opencode, label: "OpenCode 95 Workspace", action: () => this.restoreAndFocusMain() },
            { icon: WIN95_ICONS.notepad, label: "New Session", action: () => this.triggerOpencodeCommand("session.new") },
            { icon: WIN95_ICONS.folder, label: "Open Project...", action: () => this.triggerOpencodeCommand("project.open") },
            { icon: WIN95_ICONS.msdos, label: "MS-DOS Prompt (Terminal)", action: () => this.triggerOpencodeCommand("terminal.toggle") },
            { sep: true },
            { icon: WIN95_ICONS.display, labelKey: "display", action: () => this.openWindow("display") },
            { icon: WIN95_ICONS.myComputer, label: "System Properties", action: () => this.openWindow("sysprop") },
            { icon: WIN95_ICONS.lightbulb, label: "Welcome Tour", action: () => this.openWindow("welcome") },
            { icon: WIN95_ICONS.recycleBin, label: "Recycle Bin", action: () => this.openWindow("recycle") }
          ])
        }),
        mkItem({
          icon: WIN95_ICONS.folder,
          label: "Workspace",
          sub: mkSub([
            { icon: WIN95_ICONS.folder, label: "Toggle Sidebar", action: () => this.triggerOpencodeCommand("sidebar.toggle") },
            { icon: WIN95_ICONS.folderOpen, label: "Toggle File Tree", action: () => this.triggerOpencodeCommand("fileTree.toggle") },
            { sep: true },
            { icon: WIN95_ICONS.opencode, label: "Choose Model...", action: () => this.triggerOpencodeCommand("model.choose") },
            { icon: WIN95_ICONS.controlPanel, label: "MCP Servers...", action: () => this.triggerOpencodeCommand("mcp.toggle") },
            { icon: WIN95_ICONS.run, label: "Switch Agent Mode", action: () => this.triggerOpencodeCommand("agent.cycle") }
          ])
        }),
        mkItem({
          icon: WIN95_ICONS.controlPanel,
          labelKey: "settings",
          sub: mkSub([
            { icon: WIN95_ICONS.controlPanel, label: "OpenCode Control Panel...", action: () => this.triggerOpencodeCommand("settings.open") },
            { icon: WIN95_ICONS.display, labelKey: "display", action: () => this.openWindow("display") },
            { icon: WIN95_ICONS.myComputer, label: "System Properties...", action: () => this.openWindow("sysprop") },
            { sep: true },
            { icon: WIN95_ICONS.themeSwitch, labelKey: "switchStandard", action: () => this.toggleWin95Mode(false) }
          ])
        }),
        mkItem({
          icon: WIN95_ICONS.showDesktop,
          label: "Show Desktop",
          action: () => this.showDesktop()
        }),
        mkItem({
          icon: WIN95_ICONS.find,
          label: "Find / Command Palette...",
          action: () => this.triggerCommandPalette()
        }),
        mkItem({
          icon: WIN95_ICONS.help,
          label: "Help / Welcome",
          action: () => this.openWindow("welcome")
        }),
        mkItem({
          icon: WIN95_ICONS.run,
          label: "Run...",
          action: () => this.openWindow("run")
        }),
        el("div", { class: "w95-menu-sep" }),
        mkItem({
          icon: WIN95_ICONS.shutdown,
          label: "Shut Down...",
          action: () => this.openWindow("shutdown")
        })
      ])
    ])

    document.body.appendChild(this.startMenu)
  }

  // ==========================================================================
  // DESKTOP RIGHT-CLICK CONTEXT MENU
  // ==========================================================================
  buildContextMenu() {
    const entries = [
      { label: "New Session", action: () => this.triggerOpencodeCommand("session.new") },
      { label: "Open Project...", action: () => this.triggerOpencodeCommand("project.open") },
      { label: "Open MS-DOS Prompt", action: () => this.triggerOpencodeCommand("terminal.toggle") },
      { sep: true },
      { label: "Show / Hide OpenCode", action: () => this.showDesktop() },
      { label: "Refresh Desktop", action: () => this.clearDesktopSelection() },
      { sep: true },
      { labelKey: "display", action: () => this.openWindow("display") },
      { label: "System Properties...", action: () => this.openWindow("sysprop") },
      { labelKey: "switchStandard", action: () => this.toggleWin95Mode(false) }
    ]

    this.contextMenu = el("div", { id: "win95-context-menu" })
    for (const item of entries) {
      if (item.sep) {
        this.contextMenu.appendChild(el("div", { class: "w95-menu-sep" }))
      } else {
        this.contextMenu.appendChild(
          el("button", {
            class: "w95-menu-entry",
            text: item.label,
            textKey: item.labelKey,
            onclick: (e) => {
              e.stopPropagation()
              this.closeAllMenus()
              item.action()
            }
          })
        )
      }
    }
    document.body.appendChild(this.contextMenu)
  }

  openContextMenu(x, y) {
    this.closeAllMenus()
    if (!this.contextMenu) this.buildContextMenu()
    this.contextMenu.classList.add("open")
    this.positionWindow(this.contextMenu, x, y)
  }

  // ==========================================================================
  // BOTTOM WINDOWS 95 TASKBAR
  // ==========================================================================
  buildTaskbar() {
    this.startBtn = el(
      "button",
      {
        id: "win95-start-btn",
        type: "button",
        "aria-controls": "win95-start-menu",
        "aria-expanded": "false",
        onclick: (e) => {
          e.stopPropagation()
          const isOpen = this.startMenu?.classList.contains("open")
          this.closeAllMenus()
          if (!isOpen) this.openStartMenu(e.detail === 0)
        }
      },
      [el("span", { html: WIN95_ICONS.winFlag }), el("span", { textKey: "start" })]
    )

    this.taskbarWindowsEl = el("div", { id: "win95-taskbar-windows" })

    this.traySoundBtn = el("button", {
      class: "w95-tray-icon",
      onclick: () => {
        const next = !this.state.sounds
        this.persistState({ sounds: next })
        if (next) sounds.play("ding")
      }
    })

    const traySwitchBtn = el("button", {
      class: "w95-tray-icon",
      titleKey: "switchStandard",
      html: WIN95_ICONS.themeSwitch,
      onclick: () => this.toggleWin95Mode(false)
    })

    this.clockEl = el("div", {
      id: "win95-clock",
      titleKey: "clockFormat",
      onclick: () => {
        this.persistState({ clock24h: !this.state.clock24h })
        this.updateClock()
      }
    })

    this.taskbar = el("div", { id: "win95-taskbar" }, [
      this.startBtn,
      el("div", { class: "w95-tb-divider" }),
      this.taskbarWindowsEl,
      el("div", { id: "win95-tray" }, [this.traySoundBtn, traySwitchBtn, this.clockEl])
    ])

    document.body.appendChild(this.taskbar)
    this.updateTrayIcons()
  }

  updateTrayIcons() {
    if (this.traySoundBtn && this.traySoundsEnabled !== this.state.sounds) {
      this.traySoundsEnabled = this.state.sounds
      this.traySoundBtn.innerHTML = this.state.sounds ? WIN95_ICONS.speakerOn : WIN95_ICONS.speakerOff
      setTitleKey(this.traySoundBtn, this.state.sounds ? "soundOn" : "soundOff")
      this.traySoundBtn.setAttribute("aria-pressed", String(this.state.sounds))
    }
  }

  renderTaskbarWindows() {
    if (!this.taskbarWindowsEl) return
    for (const w of this.windows.values()) {
      if (!w.open) continue
      const isActive = !w.minimized && this.activeWindowId === w.id
      if (!w.taskbarButton) {
        w.taskbarButton = el("button", {
          class: "w95-tb-winbtn",
          type: "button",
          onclick: () => {
            this.closeAllMenus()
            if (w.minimized) {
              w.minimized = false
              w.el.classList.remove("minimized")
              if (w.id === "opencode") this.applyMainWindowBounds()
              else this.positionExtraWindow(w)
              this.focusWindow(w.id)
            } else if (this.activeWindowId === w.id) {
              this.minimizeWindow(w.id)
            } else {
              this.focusWindow(w.id)
            }
          }
        }, [el("span", { html: w.icon }), el("span")])
        this.taskbarWindowsEl.appendChild(w.taskbarButton)
      }
      const btn = w.taskbarButton
      const title = w.titleKey ? t(w.titleKey) : w.title
      if (btn.title !== title) {
        btn.title = title
        btn.lastElementChild.textContent = title
      }
      if (btn.getAttribute("aria-pressed") !== String(isActive)) {
        btn.setAttribute("aria-pressed", String(isActive))
        btn.classList.toggle("active", isActive)
      }
    }
  }

  // ==========================================================================
  // CLOCK, TITLE SYNC & GLOBAL SHORTCUTS
  // ==========================================================================
  startClock() {
    this.stopClock()
    this.clockEvents = new AbortController()
    const tick = () => {
      clearTimeout(this.clockTimer)
      this.clockTimer = null
      if (document.hidden) return
      const now = new Date()
      this.updateClock(now)
      this.clockTimer = setTimeout(tick, 60000 - now.getSeconds() * 1000 - now.getMilliseconds())
    }
    document.addEventListener("visibilitychange", tick, { signal: this.clockEvents.signal })
    tick()
  }

  stopClock() {
    clearTimeout(this.clockTimer)
    this.clockTimer = null
    this.clockEvents?.abort()
    this.clockEvents = null
  }

  updateClock(now = new Date()) {
    if (!this.clockEl) return
    const mm = String(now.getMinutes()).padStart(2, "0")
    let label
    if (this.state.clock24h) {
      label = `${String(now.getHours()).padStart(2, "0")}:${mm}`
    } else {
      const h = now.getHours()
      label = `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`
    }
    if (this.clockEl.textContent !== label) this.clockEl.textContent = label
    const locale = document.documentElement.lang || "en"
    const day = `${now.toDateString()}|${locale}`
    if (day !== this.clockDay || !this.clockEl.title) {
      this.clockDay = day
      this.clockEl.title = now.toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    }
  }

  hookNativeThemeSelect() {
    const triggerSelector = '[data-action="settings-theme"] [data-component="select-v2"]'
    const syncListbox = () => {
      const trig = document.querySelector(triggerSelector)
      if (!trig) return
      const controlsId = trig.getAttribute("aria-controls")
      if (!controlsId) return
      const listbox = document.getElementById(controlsId)
      if (!listbox) return

      const setHighlighted = (li, on) => {
        if (!li) return
        const targets = [
          li,
          li.querySelector('[data-slot="menu-v2-item-content"]'),
          li.querySelector('[data-slot="menu-v2-item-indicator"]')
        ]
        for (const t of targets) {
          if (!t) continue
          if (on) t.setAttribute("data-highlighted", "")
          else t.removeAttribute("data-highlighted")
        }
      }

      const setSelected = (li, on) => {
        if (!li) return
        li.setAttribute("aria-selected", on ? "true" : "false")
        const targets = [
          li,
          li.querySelector('[data-slot="menu-v2-item-content"]'),
          li.querySelector('[data-slot="menu-v2-item-indicator"]')
        ]
        for (const t of targets) {
          if (!t) continue
          if (on) t.setAttribute("data-selected", "")
          else t.removeAttribute("data-selected")
        }
        const ind = li.querySelector('[data-slot="menu-v2-item-indicator"]')
        if (ind) ind.style.opacity = on ? "1" : "0"
      }

      let opt = listbox.querySelector('li[data-win95-option="true"]')
      const isNew = !opt

      if (isNew) {
        opt = document.createElement("li")
        opt.setAttribute("role", "option")
        opt.setAttribute("tabindex", "-1")
        opt.setAttribute("aria-disabled", "false")
        opt.setAttribute("data-key", "win95")
        opt.setAttribute("data-win95-option", "true")
        opt.setAttribute("data-component", "menu-v2-item")
        opt.innerHTML =
          '<span data-slot="menu-v2-item-content">Windows 95</span>' +
          '<div aria-hidden="true" data-slot="menu-v2-item-indicator">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<path d="M3.53564 8.17857L6.39279 11.75L12.4642 4.25" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></path>' +
          "</svg></div>"

        let activated = false
        const activateWin95 = (ev) => {
          if (ev.type === "pointerup" && ev.button !== 0) return
          ev.preventDefault()
          ev.stopPropagation()
          if (activated) return
          activated = true
          if (!this.state.enabled) this.toggleWin95Mode(true)
          const esc = new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
          listbox.dispatchEvent(esc)
          document.dispatchEvent(esc)
        }
        opt.addEventListener("pointerdown", (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
        }, true)
        opt.addEventListener("pointerup", activateWin95, true)
        opt.addEventListener("click", activateWin95, true)
        opt.addEventListener("mouseenter", () => {
          listbox.querySelectorAll('li[role="option"]:not([data-win95-option])').forEach((other) => {
            setHighlighted(other, false)
          })
          setHighlighted(opt, true)
        })
        opt.addEventListener("mouseleave", () => setHighlighted(opt, false))

        const firstOption = listbox.querySelector('li[role="option"]')
        if (firstOption) listbox.insertBefore(opt, firstOption)
        else listbox.appendChild(opt)
      }

      if (!listbox.__w95KeyBound) {
        listbox.__w95KeyBound = true
        listbox.addEventListener("keydown", (ev) => {
          if (ev.key !== "Enter" && ev.key !== " ") return
          const hi = listbox.querySelector('li[role="option"][data-highlighted]')
          if (!hi) return
          if (hi.hasAttribute("data-win95-option")) {
            ev.preventDefault()
            ev.stopPropagation()
            if (!this.state.enabled) this.toggleWin95Mode(true)
            const esc = new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
            listbox.dispatchEvent(esc)
            document.dispatchEvent(esc)
          } else if (this.state.enabled) {
            setTimeout(() => this.toggleWin95Mode(false), 0)
          }
        }, true)
      }

      // Mark native selected options so only Windows 95 shows the checkmark while Win95 is active
      listbox.querySelectorAll('li[role="option"]:not([data-win95-option])').forEach((li) => {
        if (this.state.enabled && li.getAttribute("aria-selected") === "true") {
          li.setAttribute("data-win95-muted-selected", "true")
        } else {
          li.removeAttribute("data-win95-muted-selected")
        }
        if (!li.__w95SwitchBound) {
          li.__w95SwitchBound = true
          li.addEventListener("mouseenter", () => {
            listbox.__w95UserInteracted = true
            setHighlighted(opt, false)
          })
          const switchOff = (ev) => {
            if (ev.type === "pointerup" && ev.button !== 0) return
            if (this.state.enabled) {
              setTimeout(() => this.toggleWin95Mode(false), 0)
            }
          }
          li.addEventListener("pointerup", switchOff, true)
          li.addEventListener("click", switchOff, true)
        }
      })

      setSelected(opt, this.state.enabled)

      // When opening the theme dropdown while Win95 is active, scroll to top and highlight Windows 95
      // so it is immediately visible instead of Kobalte scrolling down to the underlying native theme.
      if (isNew && this.state.enabled) {
        const viewport = listbox.closest('[data-slot="menu-scroll-viewport"]') || listbox.parentElement
        if (viewport && !viewport.__w95WheelBound) {
          viewport.__w95WheelBound = true
          viewport.addEventListener("wheel", () => { listbox.__w95UserInteracted = true }, { passive: true })
          viewport.addEventListener("pointerdown", () => { listbox.__w95UserInteracted = true }, { passive: true })
        }
        const focusWin95AtTop = () => {
          if (listbox.__w95UserInteracted || !listbox.isConnected || !this.state.enabled) return
          if (viewport) viewport.scrollTop = 0
          listbox.scrollTop = 0
          listbox.querySelectorAll('li[role="option"]:not([data-win95-option])').forEach((other) => {
            setHighlighted(other, false)
          })
          setHighlighted(opt, true)
        }
        focusWin95AtTop()
        requestAnimationFrame(focusWin95AtTop)
        setTimeout(focusWin95AtTop, 40)
        setTimeout(focusWin95AtTop, 110)
      }
    }

    // The native dropdown mounts in a portal. Watch for it only while it is opening,
    // not for every DOM change made by the workspace and streaming transcript.
    const observer = new MutationObserver(syncListbox)
    let stopTimer
    const onOpen = (e) => {
      if (!e.target?.closest?.(triggerSelector)) return
      if (e.type === "keydown" && !["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) return
      if (e.type === "pointerdown" && e.button !== 0) return
      observer.observe(document.body, { childList: true, subtree: true })
      observer.observe(e.target.closest(triggerSelector), { attributes: true, attributeFilter: ["aria-expanded", "aria-controls"] })
      clearTimeout(stopTimer)
      stopTimer = setTimeout(() => observer.disconnect(), 400)
      queueMicrotask(syncListbox)
    }
    document.addEventListener("pointerdown", onOpen, true)
    document.addEventListener("click", onOpen, true)
    document.addEventListener("keydown", onOpen, true)
  }

  observeTitle() {
    const sync = () => {
      const raw = (document.title || "OpenCode").trim()
      const label = raw === "OpenCode" ? "OpenCode 95 — Workspace" : `OpenCode 95 — ${raw}`
      if (this.mainTitleText) this.mainTitleText.textContent = label
      const mainW = this.windows.get("opencode")
      if (mainW) {
        mainW.title = raw === "OpenCode" ? "OpenCode 95" : raw
        this.renderTaskbarWindows()
      }
      if (this.statusLeft) this.statusLeft.lastElementChild.textContent = raw
    }
    sync()
    const titleEl = document.querySelector("title")
    if (titleEl) {
      this.titleObserver = new MutationObserver(sync)
      this.titleObserver.observe(titleEl, { childList: true, subtree: true, characterData: true })
    }
  }

  openStartMenu(focusFirst) {
    if (!this.startMenu) this.buildStartMenu()
    this.startMenu.classList.add("open")
    this.startBtn.classList.add("open")
    this.startBtn.setAttribute("aria-expanded", "true")
    if (focusFirst) this.startMenu.querySelector(".w95-start-item")?.focus()
  }

  closeAllMenus() {
    this.startMenu?.classList.remove("open")
    this.startMenu?.querySelector(".submenu-open")?.classList.remove("submenu-open")
    this.startBtn?.classList.remove("open")
    this.startBtn?.setAttribute("aria-expanded", "false")
    this.contextMenu?.classList.remove("open")
    const group = this.mainWindow?.querySelector(".w95-menubar-group.open")
    group?.classList.remove("open")
    group?.querySelector(".w95-menubar-item").setAttribute("aria-expanded", "false")
  }

  registerGlobalEvents() {
    document.addEventListener("mousedown", (e) => {
      if (!this.state.enabled) return
      if (
        !e.target.closest("#win95-start-menu") &&
        !e.target.closest("#win95-start-btn") &&
        !e.target.closest("#win95-main-menubar") &&
        !e.target.closest("#win95-context-menu")
      ) {
        this.closeAllMenus()
      }
    })

    window.addEventListener("keydown", (e) => {
      // Ctrl+Shift+9 -> quick toggle Win95 / Normal UI
      if (e.ctrlKey && e.shiftKey && (e.key === "9" || e.code === "Digit9")) {
        e.preventDefault()
        this.toggleWin95Mode()
        return
      }
      if (!this.state.enabled) return
      if (e.key === "Escape" && !e.ctrlKey) {
        const trigger = this.mainWindow.querySelector(".w95-menubar-group.open > button")
          || (this.startMenu?.classList.contains("open") ? this.startBtn : null)
        this.closeAllMenus()
        trigger?.focus()
      }
      // Ctrl+Escape -> Toggle Start Menu (authentic Windows 95 shortcut!)
      if (e.ctrlKey && e.key === "Escape") {
        e.preventDefault()
        const isOpen = this.startMenu?.classList.contains("open")
        this.closeAllMenus()
        if (!isOpen) this.openStartMenu(true)
      }
    })

    window.addEventListener("resize", () => {
      if (!this.state.enabled) return
      this.closeAllMenus()
      if (!this.mainWindow.classList.contains("maximized") && !this.mainWindow.classList.contains("minimized")) {
        this.applyMainWindowBounds()
      }
      for (const w of this.windows.values()) {
        if (w.id === "opencode" || !w.open || w.minimized) continue
        this.positionExtraWindow(w)
      }
    })
  }
}

function boot() {
  if (window.__OPENCODE_WIN95__) return
  const desktop = new OpenCode95Desktop()
  window.__OPENCODE_WIN95__ = desktop
  desktop.init()
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true })
} else {
  boot()
}
