#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shellapi.h>
#include <stdint.h>
#include <stdio.h>
#include <wchar.h>

#define PATH_CAP 1024
#define HEARTBEAT_MS 20000

static wchar_t theme[PATH_CAP];
static wchar_t archive[PATH_CAP];
static wchar_t node[PATH_CAP];
static wchar_t powershell[PATH_CAP];
static wchar_t log_path[PATH_CAP];

static BOOL join(wchar_t *out, const wchar_t *dir, const wchar_t *file) {
    int n = _snwprintf(out, PATH_CAP, L"%ls\\%ls", dir, file);
    return n >= 0 && n < PATH_CAP;
}

static BOOL parent(wchar_t *file) {
    wchar_t *slash = wcsrchr(file, L'\\');
    if (!slash) return FALSE;
    /* Preserve the root separator for a drive-letter path. */
    slash[slash == file + 2 && file[1] == L':' ? 1 : 0] = L'\0';
    return TRUE;
}

static void log_line(const char *message, DWORD value) {
    HANDLE file = CreateFileW(log_path, GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE |
                              FILE_SHARE_DELETE, NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    if (file == INVALID_HANDLE_VALUE) return;
    LARGE_INTEGER size;
    if (GetFileSizeEx(file, &size) && size.QuadPart > 131072) SetEndOfFile(file);
    SetFilePointer(file, 0, NULL, FILE_END);
    SYSTEMTIME now;
    GetSystemTime(&now);
    char line[256];
    int length = snprintf(line, sizeof(line),
        "[%04u-%02u-%02uT%02u:%02u:%02uZ] [native guard] %s (%lu)\n",
        now.wYear, now.wMonth, now.wDay, now.wHour, now.wMinute, now.wSecond,
        message, (unsigned long)value);
    DWORD written;
    if (length > 0 && (size_t)length < sizeof(line)) WriteFile(file, line, (DWORD)length, &written, NULL);
    CloseHandle(file);
}

typedef struct {
    FILETIME modified;
    FILETIME created;
    DWORD size_high, size_low;
    BOOL present;
} Stamp;

static Stamp stamp(void) {
    WIN32_FILE_ATTRIBUTE_DATA data;
    if (!GetFileAttributesExW(archive, GetFileExInfoStandard, &data) ||
        (data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) return (Stamp){0};
    return (Stamp){data.ftLastWriteTime, data.ftCreationTime, data.nFileSizeHigh, data.nFileSizeLow, TRUE};
}

static BOOL same(Stamp a, Stamp b) {
    if (!a.present || !b.present) return a.present == b.present;
    return !CompareFileTime(&a.modified, &b.modified) && !CompareFileTime(&a.created, &b.created) &&
           a.size_high == b.size_high && a.size_low == b.size_low;
}

static DWORD run(const wchar_t *exe, const wchar_t *args, const wchar_t *script,
                 const wchar_t *archive_arg, const wchar_t *flags) {
    wchar_t command[PATH_CAP * 4];
    int n = _snwprintf(command, _countof(command), L"\"%ls\" %ls \"%ls\\%ls\" %ls \"%ls\"%ls",
        exe, args, theme, script, archive_arg, archive, flags);
    if (n < 0 || (size_t)n >= _countof(command)) return ERROR_INSUFFICIENT_BUFFER;
    STARTUPINFOW startup = {0};
    PROCESS_INFORMATION process;
    startup.cb = sizeof(startup);
    if (!CreateProcessW(exe, command, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, theme, &startup, &process))
        return GetLastError() | 0x80000000u;
    CloseHandle(process.hThread);
    DWORD result = (DWORD)-1;
    if (WaitForSingleObject(process.hProcess, INFINITE) == WAIT_OBJECT_0)
        GetExitCodeProcess(process.hProcess, &result);
    CloseHandle(process.hProcess);
    return result;
}

static Stamp check(Stamp checked) {
    Stamp observed = stamp();
    if (!observed.present || same(observed, checked)) return observed;
    DWORD status = run(node, L"", L"patch-asar.mjs", L"--check", L"");
    if (!same(observed, stamp())) return checked;
    if (status == 2) {
        log_line("Unpatched app.asar detected; running repair", status);
        status = run(powershell, L"-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File",
                     L"ensure-patched.ps1", L"-AsarPath", L" -RelaunchIfRunning -RepairShortcuts");
        if (status != 0) {
            log_line("Auto-patch failed; waiting for next app.asar change", status);
            return stamp();
        }
    } else if (status != 0) {
        log_line("ASAR check failed; waiting for next app.asar change", status);
    }
    return observed;
}

int WINAPI wWinMain(HINSTANCE app, HINSTANCE previous, LPWSTR command, int show) {
    (void)app; (void)previous; (void)command; (void)show;
    DWORD length = GetModuleFileNameW(NULL, theme, PATH_CAP);
    if (!length || length >= PATH_CAP || !parent(theme) || !join(log_path, theme, L"guard.log")) return 1;

    int argc;
    wchar_t **argv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (!argv) return 1;
    wchar_t local[PATH_CAP];
    BOOL have_archive;
    if (argc > 1) {
        length = GetFullPathNameW(argv[1], PATH_CAP, archive, NULL);
        have_archive = length && length < PATH_CAP;
    } else {
        length = GetEnvironmentVariableW(L"LOCALAPPDATA", local, PATH_CAP);
        have_archive = length && length < PATH_CAP &&
            join(archive, local, L"Programs\\@opencode-aidesktop\\resources\\app.asar");
    }
    LocalFree(argv);
    if (!have_archive) return 1;
    wcscpy(local, archive);
    if (!parent(local)) return 1;

    wchar_t folded[PATH_CAP];
    wcscpy(folded, archive);
    CharLowerBuffW(folded, (DWORD)wcslen(folded));
    uint64_t hash = UINT64_C(14695981039346656037);
    for (const wchar_t *p = folded; *p; ++p) hash = (hash ^ (uint16_t)*p) * UINT64_C(1099511628211);
    wchar_t mutex_name[64];
    _snwprintf(mutex_name, _countof(mutex_name), L"Local\\OpenCodeWin95Guard-%016llx", (unsigned long long)hash);
    HANDLE mutex = CreateMutexW(NULL, FALSE, mutex_name);
    if (!mutex) return 1;
    if (GetLastError() == ERROR_ALREADY_EXISTS) {
        CloseHandle(mutex);
        return 0;
    }

    /* Resolve dependencies without searching the working directory. */
    static wchar_t env_path[32768];
    wchar_t system[PATH_CAP];
    length = GetEnvironmentVariableW(L"PATH", env_path, _countof(env_path));
    DWORD node_length = length && length < _countof(env_path) ?
        SearchPathW(env_path, L"node.exe", NULL, PATH_CAP, node, NULL) : 0;
    UINT system_length = GetSystemDirectoryW(system, PATH_CAP);
    if (!node_length || node_length >= PATH_CAP || !system_length || system_length >= PATH_CAP ||
        !join(powershell, system, L"WindowsPowerShell\\v1.0\\powershell.exe")) {
        log_line("Could not resolve Node.js or Windows PowerShell", 0);
        CloseHandle(mutex);
        return 1;
    }

    log_line("Win95 update guard started; watching app.asar", GetCurrentProcessId());
    Stamp checked = {0};
    HANDLE watch = INVALID_HANDLE_VALUE;
    for (;;) {
        if (watch == INVALID_HANDLE_VALUE)
            watch = FindFirstChangeNotificationW(local, FALSE, FILE_NOTIFY_CHANGE_FILE_NAME |
                FILE_NOTIFY_CHANGE_LAST_WRITE | FILE_NOTIFY_CHANGE_SIZE);
        checked = check(checked);
        /* A repair can replace the archive while the child process runs. Verify
           the replacement without depending on its notification arriving. */
        if (!same(checked, stamp())) {
            Sleep(1200);
            continue;
        }
        if (watch == INVALID_HANDLE_VALUE) {
            Sleep(HEARTBEAT_MS);
        } else if (WaitForSingleObject(watch, HEARTBEAT_MS) == WAIT_OBJECT_0 &&
                   FindNextChangeNotification(watch)) {
            Sleep(1200);
        } else {
            /* Reopen on timeout too, so a replaced directory is watched again. */
            FindCloseChangeNotification(watch);
            watch = INVALID_HANDLE_VALUE;
        }
    }
}
