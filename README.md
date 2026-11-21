# opencode-win95

Windows 95 desktop theme and shell for OpenCode Desktop (Windows, Electron).

Includes a Windows 95 desktop with icons, framed draggable OpenCode window, taskbar, Start menu, wallpaper and color scheme switcher (Display Properties), Windows 95 WAV sounds (including OpenCode notification sounds), pixel fonts (MS Sans Serif with Cyrillic + Fixedsys Excelsior), update protection, and a quick toggle back to the default OpenCode UI.

## Screenshots

![Desktop and Welcome dialog](screenshots/desktop-welcome.png)

![Start menu](screenshots/start-menu.png)

![Wallpapers and System Properties](screenshots/display-and-system.png)

![Session view](screenshots/session.png)

![Model picker dialog](screenshots/models-dialog.png)

## Requirements

- Windows with OpenCode Desktop installed
- Node.js 18+

## Install

```powershell
git clone https://github.com/IvanLindgren/opencode-win95.git
cd opencode-win95
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

What `install.ps1` does:
1. Copies the theme files, fonts, and sounds to `%USERPROFILE%\.config\opencode\win95-theme\`.
2. Backs up the original `app.asar` to `app.asar.bak`.
3. Patches `app.asar` to load the local theme folder. The theme routes OpenCode notification audio to the bundled Win95 WAVs, including embedded OpenCode sounds.
4. Installs automatic update protection:
   - Updates Desktop and Start Menu `OpenCode` shortcuts to check and re-patch `app.asar` automatically before launch (~15 ms when already patched).
   - Adds a background guard to Windows Startup. It checks `app.asar` once at startup and again only when the archive changes. After an OpenCode update, it re-patches the archive, repairs shortcuts, and relaunches OpenCode in Win95 mode.

Optional flags:

```powershell
# Custom app.asar path
powershell -ExecutionPolicy Bypass -File .\install.ps1 -AsarPath "D:\path\to\resources\app.asar"

# Install without the background update guard
powershell -ExecutionPolicy Bypass -File .\install.ps1 -NoGuard

# Also disable OpenCode's auto-updater feed (renames app-update.yml)
powershell -ExecutionPolicy Bypass -File .\install.ps1 -BlockAutoUpdate
```

### Optional: build the smaller native guard

The installer uses the Node.js guard unless `win95-guard.exe` is available. To use the native Windows watcher, build it with MinGW-w64 GCC on `PATH`, then run `install.ps1` again. Node.js is still needed to check and patch the archive.

```powershell
powershell -ExecutionPolicy Bypass -File .\theme\build-win95-guard.ps1
```

## Controls

- `Settings -> Appearance -> Theme` (`Windows 95`), `Ctrl+Shift+9`, or the top bar / tray toggle button: switch between Win95 and any built-in OpenCode theme without restarting.
- `Ctrl+Esc`: open the Start menu.
- Right-click desktop or double-click `Display`: change wallpapers, color schemes, sounds, and pixel cursor.
- `Ctrl+R`: reload the UI after editing files in `%USERPROFILE%\.config\opencode\win95-theme\`.

The Win95 notification cues are Chimes for completion, Ding for permission and question prompts, and Chord for the default error sound. Turning Win95 sounds off mutes these cues; turning the theme off restores OpenCode's original sound behavior.

## Tests

On Windows, run `node tests/guard.test.mjs` to check guard startup, single-instance behavior, and repair dispatch. Run `node tests/guard-install.test.mjs` to check the Startup launcher and `-NoGuard`. Add `--native` to either command after building the native executable.

Run `node --test tests/notification-audio.test.mjs` to check sound routing. To also test your installed OpenCode sound assets, set `OPENCODE_AUDIO_TEST_ASAR` to the path of `app.asar` first. These tests don't modify the installation.

## Uninstall

Stops the update guard, removes it from Startup, restores shortcuts and `app.asar` from backup:

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

Restore everything and also delete `%USERPROFILE%\.config\opencode\win95-theme\`:

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1 -RemoveFiles
```
