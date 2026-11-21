# Clippit (Microsoft Office 97)

Generate the transparent WebP clips here from Microsoft's original Office 97
`Clippit.act` (Actor 2.0). The extractor keeps the poses and timings; the dock
enlarges the 80×60 bitmaps slightly to give the original animation a pixel edge.
Do not use the later Office 2000 `.acs` file. Microsoft's artwork is not included
in this repository or covered by the project's license.

Use a copy of the Office 97 asset. The tested English `Clippit.act` is 468,266
bytes (SHA-256 `47026de14f910ac2c51e6e509a043ac8e43fd24e0de8266e8feeeadbf65cac4b`).

To rebuild from the `clippy` folder with Windows PowerShell and Python/Pillow:

```powershell
.\tools\extract-clippit97.ps1 -Act .\clippit.act -Output .\clippit-layers
python .\tools\clippit97.py .\clippit.act .\clippit-layers .\media
```

Expected output: `still.webp`, `idle.webp`, `plan.webp`, `read.webp`,
`edit.webp`, `check.webp`, `wrap.webp`, `ask.webp`, and `done.webp`.

Actor format reference: [robert.js](https://github.com/Treeki/robert.js).
