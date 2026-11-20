// Crisp pixel-art Windows 95 SVG icons & retro cursors (16-color VGA palette)

function svgUri(svg) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim())
}

export const WIN95_ICONS = {
  // Iconic 4-color Windows 95 waving flag (16x16)
  winFlag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="1" y="3" width="2" height="2" fill="#000"/>
    <rect x="2" y="6" width="2" height="2" fill="#000"/>
    <rect x="1" y="9" width="2" height="2" fill="#000"/>
    <rect x="4" y="2" width="1" height="11" fill="#000"/>
    <rect x="5" y="2" width="4" height="5" fill="#ff0000"/>
    <rect x="5" y="2" width="4" height="1" fill="#800000"/>
    <rect x="10" y="3" width="5" height="5" fill="#00a800"/>
    <rect x="10" y="3" width="5" height="1" fill="#005800"/>
    <rect x="5" y="8" width="4" height="5" fill="#0068ff"/>
    <rect x="5" y="12" width="4" height="1" fill="#000080"/>
    <rect x="10" y="9" width="5" height="5" fill="#ffcc00"/>
    <rect x="10" y="13" width="5" height="1" fill="#808000"/>
    <rect x="9" y="2" width="1" height="12" fill="#000"/>
    <rect x="5" y="7" width="10" height="1" fill="#000"/>
    <rect x="15" y="3" width="1" height="11" fill="#000"/>
  </svg>`,

  // My Computer - Classic beige CRT monitor on desktop tower (32x32)
  myComputer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="5" y="3" width="22" height="17" fill="#000"/>
    <rect x="6" y="4" width="20" height="15" fill="#c0c0c0"/>
    <rect x="6" y="4" width="19" height="1" fill="#fff"/>
    <rect x="6" y="4" width="1" height="14" fill="#fff"/>
    <rect x="7" y="18" width="19" height="1" fill="#808080"/>
    <rect x="25" y="5" width="1" height="14" fill="#808080"/>
    <rect x="8" y="6" width="16" height="11" fill="#000"/>
    <rect x="9" y="7" width="14" height="9" fill="#008080"/>
    <rect x="10" y="8" width="10" height="2" fill="#000080"/>
    <rect x="10" y="10" width="10" height="4" fill="#fff"/>
    <rect x="11" y="11" width="4" height="1" fill="#000"/>
    <rect x="11" y="13" width="6" height="1" fill="#808080"/>
    <rect x="11" y="20" width="10" height="2" fill="#808080"/>
    <rect x="3" y="22" width="26" height="7" fill="#000"/>
    <rect x="4" y="23" width="24" height="5" fill="#c0c0c0"/>
    <rect x="4" y="23" width="23" height="1" fill="#fff"/>
    <rect x="4" y="23" width="1" height="4" fill="#fff"/>
    <rect x="5" y="27" width="23" height="1" fill="#808080"/>
    <rect x="17" y="25" width="8" height="2" fill="#000"/>
    <rect x="18" y="25" width="6" height="1" fill="#808080"/>
    <rect x="6" y="25" width="2" height="1" fill="#00ff00"/>
    <rect x="9" y="25" width="2" height="1" fill="#ffff00"/>
  </svg>`,

  // OpenCode 95 App icon - Retro CRT with glowing code cursor
  opencode: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="3" y="3" width="26" height="20" fill="#000"/>
    <rect x="4" y="4" width="24" height="18" fill="#c0c0c0"/>
    <rect x="4" y="4" width="23" height="1" fill="#fff"/>
    <rect x="4" y="4" width="1" height="17" fill="#fff"/>
    <rect x="5" y="21" width="23" height="1" fill="#808080"/>
    <rect x="27" y="5" width="1" height="17" fill="#808080"/>
    <rect x="6" y="6" width="20" height="14" fill="#000080"/>
    <rect x="7" y="7" width="18" height="12" fill="#000040"/>
    <rect x="8" y="9" width="2" height="2" fill="#00ff00"/>
    <rect x="10" y="11" width="2" height="2" fill="#00ff00"/>
    <rect x="8" y="13" width="2" height="2" fill="#00ff00"/>
    <rect x="14" y="13" width="7" height="2" fill="#ffff00"/>
    <rect x="8" y="16" width="14" height="1" fill="#00ffff"/>
    <rect x="12" y="23" width="8" height="2" fill="#808080"/>
    <rect x="8" y="25" width="16" height="4" fill="#000"/>
    <rect x="9" y="26" width="14" height="2" fill="#c0c0c0"/>
    <rect x="9" y="26" width="13" height="1" fill="#fff"/>
  </svg>`,

  // Yellow Win95 Folder (Projects)
  folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="3" y="6" width="10" height="3" fill="#000"/>
    <rect x="4" y="7" width="8" height="2" fill="#ffff80"/>
    <rect x="2" y="9" width="27" height="18" fill="#000"/>
    <rect x="3" y="10" width="25" height="16" fill="#ffcc33"/>
    <rect x="3" y="10" width="24" height="1" fill="#ffffaa"/>
    <rect x="3" y="10" width="1" height="15" fill="#ffffaa"/>
    <rect x="4" y="25" width="24" height="1" fill="#806000"/>
    <rect x="27" y="11" width="1" height="15" fill="#806000"/>
    <rect x="5" y="13" width="21" height="1" fill="#e6b020"/>
  </svg>`,

  // Open Folder
  folderOpen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="3" y="6" width="10" height="3" fill="#000"/>
    <rect x="4" y="7" width="8" height="2" fill="#ffff80"/>
    <rect x="2" y="9" width="23" height="17" fill="#000"/>
    <rect x="3" y="10" width="21" height="15" fill="#cc9900"/>
    <rect x="5" y="14" width="25" height="12" fill="#000"/>
    <rect x="6" y="15" width="23" height="10" fill="#ffcc33"/>
    <rect x="6" y="15" width="22" height="1" fill="#ffffaa"/>
    <rect x="7" y="24" width="22" height="1" fill="#806000"/>
  </svg>`,

  // New Session / Notepad
  notepad: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="6" y="3" width="20" height="26" fill="#000"/>
    <rect x="7" y="4" width="18" height="24" fill="#fff"/>
    <rect x="7" y="4" width="18" height="5" fill="#008080"/>
    <rect x="9" y="3" width="2" height="3" fill="#c0c0c0"/>
    <rect x="13" y="3" width="2" height="3" fill="#c0c0c0"/>
    <rect x="17" y="3" width="2" height="3" fill="#c0c0c0"/>
    <rect x="21" y="3" width="2" height="3" fill="#c0c0c0"/>
    <rect x="9" y="12" width="14" height="1" fill="#000080"/>
    <rect x="9" y="15" width="12" height="1" fill="#000"/>
    <rect x="9" y="18" width="14" height="1" fill="#000"/>
    <rect x="9" y="21" width="9" height="1" fill="#808080"/>
    <rect x="9" y="24" width="11" height="1" fill="#808080"/>
  </svg>`,

  // MS-DOS Prompt (Terminal)
  msdos: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="2" y="4" width="28" height="24" fill="#000"/>
    <rect x="3" y="5" width="26" height="22" fill="#c0c0c0"/>
    <rect x="4" y="6" width="24" height="4" fill="#000080"/>
    <rect x="25" y="7" width="2" height="2" fill="#c0c0c0"/>
    <rect x="4" y="11" width="24" height="15" fill="#000"/>
    <!-- C:\> -->
    <rect x="6" y="14" width="3" height="1" fill="#fff"/>
    <rect x="6" y="15" width="1" height="4" fill="#fff"/>
    <rect x="6" y="19" width="3" height="1" fill="#fff"/>
    <rect x="10" y="15" width="1" height="1" fill="#fff"/>
    <rect x="10" y="18" width="1" height="1" fill="#fff"/>
    <rect x="12" y="14" width="1" height="2" fill="#fff"/>
    <rect x="13" y="16" width="1" height="2" fill="#fff"/>
    <rect x="14" y="18" width="1" height="2" fill="#fff"/>
    <rect x="16" y="15" width="1" height="1" fill="#fff"/>
    <rect x="17" y="16" width="1" height="2" fill="#fff"/>
    <rect x="16" y="18" width="1" height="1" fill="#fff"/>
    <rect x="19" y="19" width="4" height="1" fill="#00ff00"/>
  </svg>`,

  // Control Panel / Settings
  controlPanel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="3" y="6" width="10" height="3" fill="#000"/>
    <rect x="4" y="7" width="8" height="2" fill="#ffff80"/>
    <rect x="2" y="9" width="26" height="18" fill="#000"/>
    <rect x="3" y="10" width="24" height="16" fill="#ffcc33"/>
    <rect x="3" y="10" width="23" height="1" fill="#ffffaa"/>
    <rect x="8" y="13" width="17" height="12" fill="#000"/>
    <rect x="9" y="14" width="15" height="10" fill="#c0c0c0"/>
    <rect x="9" y="14" width="14" height="1" fill="#fff"/>
    <rect x="11" y="16" width="4" height="2" fill="#000080"/>
    <rect x="11" y="19" width="4" height="3" fill="#ff0000"/>
    <rect x="17" y="16" width="5" height="2" fill="#008000"/>
    <rect x="17" y="19" width="5" height="3" fill="#008080"/>
  </svg>`,

  // Display Properties (Monitor + Palette)
  display: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="4" y="3" width="24" height="18" fill="#000"/>
    <rect x="5" y="4" width="22" height="16" fill="#c0c0c0"/>
    <rect x="5" y="4" width="21" height="1" fill="#fff"/>
    <rect x="7" y="6" width="18" height="12" fill="#008080"/>
    <rect x="9" y="8" width="5" height="4" fill="#ff0000"/>
    <rect x="14" y="8" width="5" height="4" fill="#ffff00"/>
    <rect x="9" y="12" width="5" height="4" fill="#0000ff"/>
    <rect x="14" y="12" width="5" height="4" fill="#00ff00"/>
    <rect x="12" y="21" width="8" height="3" fill="#808080"/>
    <rect x="8" y="24" width="16" height="4" fill="#000"/>
    <rect x="9" y="25" width="14" height="2" fill="#c0c0c0"/>
    <rect x="9" y="25" width="13" height="1" fill="#fff"/>
  </svg>`,

  // Welcome Lightbulb (inspired directly by Screenshot #1!)
  lightbulb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="15" y="2" width="2" height="3" fill="#ffcc00"/>
    <rect x="6" y="6" width="3" height="2" fill="#ffcc00"/>
    <rect x="23" y="6" width="3" height="2" fill="#ffcc00"/>
    <rect x="4" y="13" width="3" height="2" fill="#ffcc00"/>
    <rect x="25" y="13" width="3" height="2" fill="#ffcc00"/>
    <rect x="11" y="6" width="10" height="2" fill="#000"/>
    <rect x="9" y="8" width="2" height="2" fill="#000"/>
    <rect x="21" y="8" width="2" height="2" fill="#000"/>
    <rect x="8" y="10" width="2" height="7" fill="#000"/>
    <rect x="22" y="10" width="2" height="7" fill="#000"/>
    <rect x="10" y="17" width="2" height="3" fill="#000"/>
    <rect x="20" y="17" width="2" height="3" fill="#000"/>
    <rect x="11" y="8" width="10" height="11" fill="#ffff66"/>
    <rect x="10" y="10" width="12" height="7" fill="#ffff66"/>
    <rect x="12" y="9" width="3" height="4" fill="#ffffff"/>
    <rect x="15" y="13" width="2" height="5" fill="#cc9900"/>
    <rect x="11" y="20" width="10" height="7" fill="#000"/>
    <rect x="12" y="21" width="8" height="2" fill="#c0c0c0"/>
    <rect x="12" y="23" width="8" height="1" fill="#808080"/>
    <rect x="12" y="24" width="8" height="2" fill="#c0c0c0"/>
    <rect x="13" y="27" width="6" height="2" fill="#000"/>
    <rect x="14" y="27" width="4" height="1" fill="#808080"/>
  </svg>`,

  // Recycle Bin (classic grey Win95 trash bin)
  recycleBin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="6" y="6" width="20" height="3" fill="#000"/>
    <rect x="7" y="7" width="18" height="1" fill="#fff"/>
    <rect x="8" y="9" width="16" height="19" fill="#000"/>
    <rect x="9" y="10" width="14" height="17" fill="#c0c0c0"/>
    <rect x="9" y="10" width="2" height="17" fill="#fff"/>
    <rect x="21" y="10" width="2" height="17" fill="#808080"/>
    <rect x="12" y="12" width="1" height="12" fill="#808080"/>
    <rect x="15" y="12" width="2" height="12" fill="#808080"/>
    <rect x="19" y="12" width="1" height="12" fill="#808080"/>
    <rect x="12" y="15" width="8" height="2" fill="#008000"/>
    <rect x="14" y="13" width="4" height="2" fill="#00a800"/>
    <rect x="13" y="18" width="6" height="2" fill="#00a800"/>
    <rect x="10" y="27" width="12" height="2" fill="#000"/>
  </svg>`,

  // Find / Magnifying Glass
  find: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="6" y="4" width="14" height="18" fill="#000"/>
    <rect x="7" y="5" width="12" height="16" fill="#fff"/>
    <rect x="9" y="8" width="8" height="1" fill="#808080"/>
    <rect x="9" y="11" width="6" height="1" fill="#808080"/>
    <rect x="14" y="11" width="10" height="10" fill="#000"/>
    <rect x="15" y="12" width="8" height="8" fill="#80ffff"/>
    <rect x="16" y="13" width="3" height="2" fill="#fff"/>
    <rect x="23" y="21" width="3" height="3" fill="#000"/>
    <rect x="25" y="23" width="4" height="4" fill="#804000"/>
    <rect x="24" y="22" width="2" height="2" fill="#c0c0c0"/>
  </svg>`,

  // Help Book
  help: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="6" y="4" width="20" height="24" fill="#000"/>
    <rect x="7" y="5" width="18" height="22" fill="#800080"/>
    <rect x="7" y="5" width="3" height="22" fill="#400040"/>
    <rect x="10" y="24" width="15" height="3" fill="#fff"/>
    <rect x="14" y="9" width="6" height="2" fill="#ffff00"/>
    <rect x="18" y="11" width="2" height="3" fill="#ffff00"/>
    <rect x="16" y="14" width="2" height="3" fill="#ffff00"/>
    <rect x="16" y="19" width="2" height="2" fill="#ffff00"/>
  </svg>`,

  // Run...
  run: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="4" y="6" width="24" height="18" fill="#000"/>
    <rect x="5" y="7" width="22" height="16" fill="#c0c0c0"/>
    <rect x="6" y="8" width="20" height="4" fill="#000080"/>
    <rect x="7" y="14" width="18" height="7" fill="#fff"/>
    <rect x="11" y="15" width="10" height="5" fill="#008080"/>
    <rect x="14" y="16" width="4" height="3" fill="#ffff00"/>
  </svg>`,

  // Shut Down Computer
  shutdown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
    <rect x="5" y="4" width="22" height="17" fill="#000"/>
    <rect x="6" y="5" width="20" height="15" fill="#c0c0c0"/>
    <rect x="8" y="7" width="16" height="11" fill="#000080"/>
    <rect x="15" y="9" width="2" height="4" fill="#ff4040"/>
    <rect x="12" y="11" width="2" height="4" fill="#ff4040"/>
    <rect x="18" y="11" width="2" height="4" fill="#ff4040"/>
    <rect x="13" y="15" width="6" height="2" fill="#ff4040"/>
    <rect x="9" y="22" width="14" height="5" fill="#000"/>
    <rect x="10" y="23" width="12" height="3" fill="#c0c0c0"/>
  </svg>`,

  // Speaker On (16x16 tray)
  speakerOn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="2" y="6" width="3" height="4" fill="#000"/>
    <rect x="3" y="7" width="2" height="2" fill="#808080"/>
    <rect x="5" y="5" width="2" height="6" fill="#000"/>
    <rect x="7" y="3" width="2" height="10" fill="#000"/>
    <rect x="6" y="5" width="2" height="6" fill="#c0c0c0"/>
    <rect x="10" y="6" width="1" height="4" fill="#008000"/>
    <rect x="12" y="4" width="1" height="8" fill="#008000"/>
    <rect x="14" y="3" width="1" height="10" fill="#008000"/>
  </svg>`,

  // Speaker Off (16x16 tray)
  speakerOff: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="2" y="6" width="3" height="4" fill="#000"/>
    <rect x="5" y="5" width="2" height="6" fill="#000"/>
    <rect x="7" y="3" width="2" height="10" fill="#000"/>
    <rect x="6" y="5" width="2" height="6" fill="#808080"/>
    <rect x="10" y="5" width="2" height="2" fill="#ff0000"/>
    <rect x="12" y="7" width="2" height="2" fill="#ff0000"/>
    <rect x="14" y="9" width="2" height="2" fill="#ff0000"/>
    <rect x="14" y="5" width="2" height="2" fill="#ff0000"/>
    <rect x="10" y="9" width="2" height="2" fill="#ff0000"/>
  </svg>`,

  // Theme Switch / Modern toggle (16x16)
  themeSwitch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="1" y="2" width="14" height="12" fill="#000"/>
    <rect x="2" y="3" width="6" height="10" fill="#008080"/>
    <rect x="8" y="3" width="6" height="10" fill="#222222"/>
    <rect x="3" y="5" width="4" height="2" fill="#ffff00"/>
    <rect x="9" y="5" width="4" height="2" fill="#ffffff"/>
    <rect x="9" y="9" width="4" height="2" fill="#888888"/>
  </svg>`,

  // Show Desktop (Quick Launch 16x16)
  showDesktop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="1" y="3" width="14" height="11" fill="#000"/>
    <rect x="2" y="4" width="12" height="9" fill="#008080"/>
    <rect x="3" y="5" width="4" height="5" fill="#fff"/>
    <rect x="4" y="6" width="2" height="1" fill="#000080"/>
    <rect x="9" y="7" width="4" height="4" fill="#ffcc00"/>
    <rect x="2" y="11" width="12" height="2" fill="#c0c0c0"/>
  </svg>`,

  // Big Welcome CRT graphic (pointing to Start button, homage to Screenshot #1!)
  welcomeCrt: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 116" shape-rendering="crispEdges">
    <!-- Outer CRT Monitor -->
    <rect x="14" y="4" width="128" height="86" fill="#000"/>
    <rect x="15" y="5" width="126" height="84" fill="#c0c0c0"/>
    <rect x="15" y="5" width="125" height="2" fill="#fff"/>
    <rect x="15" y="5" width="2" height="83" fill="#fff"/>
    <rect x="16" y="87" width="125" height="2" fill="#808080"/>
    <rect x="139" y="6" width="2" height="83" fill="#808080"/>
    <!-- Screen bezel -->
    <rect x="22" y="11" width="112" height="70" fill="#808080"/>
    <rect x="23" y="12" width="110" height="68" fill="#000"/>
    <!-- Teal Win95 Screen -->
    <rect x="24" y="13" width="108" height="66" fill="#008080"/>
    <!-- Mini Taskbar inside CRT -->
    <rect x="24" y="71" width="108" height="8" fill="#c0c0c0"/>
    <rect x="24" y="71" width="108" height="1" fill="#fff"/>
    <rect x="26" y="73" width="18" height="5" fill="#000"/>
    <rect x="26" y="73" width="17" height="4" fill="#c0c0c0"/>
    <rect x="27" y="74" width="3" height="2" fill="#ff0000"/>
    <rect x="31" y="74" width="10" height="2" fill="#000"/>
    <!-- Iconic Cyan Arrow pointing down-left to Start! -->
    <polygon points="104,20 112,28 60,60 66,65 40,68 48,46 53,52" fill="#00ffff" stroke="#000" stroke-width="1"/>
    <!-- Power LED -->
    <rect x="122" y="83" width="6" height="3" fill="#00aa00"/>
    <!-- Monitor Stand -->
    <rect x="58" y="90" width="40" height="8" fill="#808080"/>
    <rect x="60" y="90" width="36" height="6" fill="#a0a0a0"/>
    <rect x="40" y="98" width="76" height="12" fill="#000"/>
    <rect x="41" y="99" width="74" height="10" fill="#c0c0c0"/>
    <rect x="41" y="99" width="73" height="2" fill="#fff"/>
    <rect x="42" y="107" width="73" height="2" fill="#808080"/>
  </svg>`,

  // System Properties CRT Monitor with Win95 4-color Flag (homage to Screenshot #2!)
  sysPropCrt: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 100" shape-rendering="crispEdges">
    <rect x="10" y="6" width="90" height="68" fill="#000"/>
    <rect x="11" y="7" width="88" height="66" fill="#c0c0c0"/>
    <rect x="11" y="7" width="87" height="2" fill="#fff"/>
    <rect x="11" y="7" width="2" height="65" fill="#fff"/>
    <rect x="12" y="71" width="87" height="2" fill="#808080"/>
    <rect x="97" y="8" width="2" height="65" fill="#808080"/>
    <rect x="18" y="13" width="74" height="52" fill="#808080"/>
    <rect x="20" y="15" width="70" height="48" fill="#008080"/>
    <!-- Pixel Win95 flag on CRT -->
    <rect x="33" y="26" width="4" height="4" fill="#000"/>
    <rect x="35" y="34" width="4" height="4" fill="#000"/>
    <rect x="33" y="42" width="4" height="4" fill="#000"/>
    <rect x="40" y="23" width="3" height="30" fill="#000"/>
    <rect x="43" y="23" width="14" height="13" fill="#ff0000"/>
    <rect x="60" y="25" width="16" height="13" fill="#00aa00"/>
    <rect x="43" y="39" width="14" height="13" fill="#0066ff"/>
    <rect x="60" y="41" width="16" height="13" fill="#ffcc00"/>
    <rect x="57" y="23" width="3" height="31" fill="#000"/>
    <rect x="43" y="36" width="33" height="3" fill="#000"/>
    <rect x="76" y="25" width="3" height="29" fill="#000"/>
    <!-- Stand -->
    <rect x="38" y="74" width="34" height="8" fill="#808080"/>
    <rect x="24" y="82" width="62" height="10" fill="#000"/>
    <rect x="25" y="83" width="60" height="8" fill="#c0c0c0"/>
    <rect x="25" y="83" width="59" height="2" fill="#fff"/>
    <rect x="26" y="89" width="59" height="2" fill="#808080"/>
  </svg>`
}

export const WIN95_CURSORS = {
  arrow: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 20 24" shape-rendering="crispEdges">
    <path d="M1 1 L1 19 L5 15 L8 22 L11 21 L8 14 L14 14 Z" fill="#ffffff" stroke="#000000" stroke-width="1.4" stroke-linejoin="miter"/>
  </svg>`),
  pointer: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="24" viewBox="0 0 22 24" shape-rendering="crispEdges">
    <path d="M7 1 L10 1 L10 9 L13 8 L15 9 L18 10 L19 13 L18 20 L15 22 L8 22 L5 18 L2 13 L4 11 L7 13 Z" fill="#ffffff" stroke="#000000" stroke-width="1.3"/>
  </svg>`),
  text: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="22" viewBox="0 0 16 22" shape-rendering="crispEdges">
    <rect x="4" y="2" width="8" height="2" fill="#000"/>
    <rect x="7" y="4" width="2" height="14" fill="#000"/>
    <rect x="4" y="18" width="8" height="2" fill="#000"/>
  </svg>`)
}
