import { BrowserWindow, desktopCapturer } from 'electron';
import strings from '../I18n/en.js';
import {
  formatError,
  getPlatform,
  quoteAppleScript,
  quotePowerShell,
  runCommand,
  runAppleScript,
  runPowerShell,
  toJsonOutput,
} from './Platform.js';

function listElectronWindows() {
  return BrowserWindow.getAllWindows()
    .filter((window) => !window.isDestroyed() && window.isVisible())
    .map((window, index) => ({
      index,
      title: window.getTitle() || strings.output.untitled,
      process: strings.output.appProcess,
      bounds: window.getBounds(),
      isFocused: window.isFocused(),
    }));
}

function normalizeWindowList(windows) {
  const seen = new Set();
  const normalized = [];

  for (const window of windows) {
    const title = String(window.title || '').trim() || strings.output.untitled;
    const key = title.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({
      ...window,
      index: normalized.length,
      title,
    });
  }

  return normalized;
}

async function listDesktopCapturerWindows() {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 1, height: 1 },
    fetchWindowIcons: false,
  });

  return sources
    .filter((source) => source.name)
    .map((source) => ({
      id: source.id,
      process: strings.output.externalProcess,
      title: source.name,
    }));
}

function parseJsonArray(stdout) {
  const value = stdout.trim();

  if (!value) {
    return [];
  }

  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function listWindowsWindowsFallback() {
  const psScript = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class JoaniumWindowList {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowTextLength(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@

$windows = [System.Collections.Generic.List[object]]::new()
$callback = [JoaniumWindowList+EnumWindowsProc]{
  param([IntPtr]$handle, [IntPtr]$param)

  if (-not [JoaniumWindowList]::IsWindowVisible($handle)) { return $true }

  $length = [JoaniumWindowList]::GetWindowTextLength($handle)
  if ($length -le 0) { return $true }

  $builder = [System.Text.StringBuilder]::new($length + 1)
  [void][JoaniumWindowList]::GetWindowText($handle, $builder, $builder.Capacity)
  $title = $builder.ToString()

  if ([string]::IsNullOrWhiteSpace($title)) { return $true }

  [uint32]$processId = 0
  [void][JoaniumWindowList]::GetWindowThreadProcessId($handle, [ref]$processId)
  $processName = ''

  try {
    $processName = [System.Diagnostics.Process]::GetProcessById($processId).ProcessName
  } catch {}

  $windows.Add([pscustomobject]@{
    Id = $handle.ToInt64()
    ProcessId = $processId
    ProcessName = $processName
    MainWindowTitle = $title
  })

  return $true
}

[void][JoaniumWindowList]::EnumWindows($callback, [IntPtr]::Zero)
$windows | Sort-Object ProcessName, MainWindowTitle | ConvertTo-Json -Depth 3
  `;
  const { stdout } = await runPowerShell(psScript, 8000);
  return parseJsonArray(stdout).map((window) => ({
    id: window.Id,
    processId: window.ProcessId,
    process: window.ProcessName,
    title: window.MainWindowTitle,
  }));
}

async function listWindowsMacOS() {
  const osascript = `
    tell application "System Events"
      set output to ""
      repeat with proc in (processes whose background only is false)
        set windowTitles to {}
        repeat with win in windows of proc
          set end of windowTitles to name of win
        end repeat
        if (count of windowTitles) > 0 then
          set output to output & name of proc & "||" & (windowTitles as text) & linefeed
        end if
      end repeat
      return output
    end tell
  `;
  const { stdout } = await runAppleScript(osascript, 8000);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [processName, title = ''] = line.split('||');
      return {
        index,
        process: processName,
        title,
      };
    });
}

async function listWindowsLinuxFallback() {
  const { stdout } = await runCommand('wmctrl', ['-lpG'], 3000);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const [id, , processId, x, y, width, height] = parts;
      const title = parts.slice(8).join(' ');

      return {
        id,
        processId,
        title,
        bounds: {
          x: Number(x),
          y: Number(y),
          width: Number(width),
          height: Number(height),
        },
      };
    })
    .filter((window) => window.title);
}

async function listPlatformWindowsFallback() {
  const platform = getPlatform();

  if (platform === 'win32') {
    return listWindowsWindowsFallback();
  }

  if (platform === 'darwin') {
    return listWindowsMacOS();
  }

  if (platform === 'linux') {
    return listWindowsLinuxFallback();
  }

  return [];
}

export async function listWindows() {
  try {
    const electronWindows = listElectronWindows();
    let platformWindows = [];
    let platformError = null;

    try {
      platformWindows = await listDesktopCapturerWindows();
    } catch (error) {
      platformError = error;
    }

    if (platformWindows.length === 0) {
      try {
        platformWindows = await listPlatformWindowsFallback();
      } catch (error) {
        platformError = error;
      }
    }

    const windows = normalizeWindowList([...electronWindows, ...platformWindows]);

    if (windows.length === 0 && platformError) {
      throw platformError;
    }

    return {
      ok: true,
      output: windows.length > 0 ? toJsonOutput(windows) : strings.output.noWindows,
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.windowListFailed.replace('{error}', formatError(error)),
    };
  }
}

function focusElectronWindow(title) {
  const match = BrowserWindow.getAllWindows().find(
    (window) =>
      !window.isDestroyed() && window.getTitle().toLowerCase().includes(title.toLowerCase()),
  );

  if (!match) {
    return null;
  }

  if (match.isMinimized()) {
    match.restore();
  }

  match.focus();
  return match.getTitle();
}

async function focusWindowsWindow(title) {
  const psScript = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class JoaniumWindowFocus {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowTextLength(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@

$needle = ${quotePowerShell(title)}
$script:matchedHandle = [IntPtr]::Zero
$script:matchedTitle = ''
$callback = [JoaniumWindowFocus+EnumWindowsProc]{
  param([IntPtr]$handle, [IntPtr]$param)

  if (-not [JoaniumWindowFocus]::IsWindowVisible($handle)) { return $true }

  $length = [JoaniumWindowFocus]::GetWindowTextLength($handle)
  if ($length -le 0) { return $true }

  $builder = [System.Text.StringBuilder]::new($length + 1)
  [void][JoaniumWindowFocus]::GetWindowText($handle, $builder, $builder.Capacity)
  $windowTitle = $builder.ToString()

  if ($windowTitle.IndexOf($needle, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
    $script:matchedHandle = $handle
    $script:matchedTitle = $windowTitle
    return $false
  }

  return $true
}

[void][JoaniumWindowFocus]::EnumWindows($callback, [IntPtr]::Zero)

if ($script:matchedHandle -eq [IntPtr]::Zero) { throw "No matching window" }

[void][JoaniumWindowFocus]::ShowWindow($script:matchedHandle, 9)
[void][JoaniumWindowFocus]::SetForegroundWindow($script:matchedHandle)
$script:matchedTitle
  `;
  const { stdout } = await runPowerShell(psScript, 8000);
  return stdout.trim() || title;
}

async function focusMacOSWindow(title) {
  const osascript = `
    tell application "System Events"
      repeat with proc in (processes whose background only is false)
        repeat with win in windows of proc
          if (name of win) contains ${quoteAppleScript(title)} then
            set frontmost of proc to true
            perform action "AXRaise" of win
            return name of win
          end if
        end repeat
      end repeat
      error "No matching window"
    end tell
  `;
  const { stdout } = await runAppleScript(osascript, 8000);
  return stdout.trim() || title;
}

async function focusLinuxWindow(title) {
  try {
    await runCommand('wmctrl', ['-a', title], 3000);
    return title;
  } catch {
    const { stdout } = await runCommand(
      'xdotool',
      ['search', '--onlyvisible', '--name', title],
      3000,
    );
    const windowId = stdout
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);

    if (!windowId) {
      throw new Error(strings.errors.windowNotFound.replace('{title}', title));
    }

    await runCommand('xdotool', ['windowactivate', windowId], 3000);

    try {
      const { stdout: windowTitle } = await runCommand(
        'xdotool',
        ['getwindowname', windowId],
        3000,
      );
      return windowTitle.trim() || title;
    } catch {
      return title;
    }
  }
}

export async function focusWindow(title) {
  try {
    const electronTitle = focusElectronWindow(title);
    const platform = getPlatform();
    const focusedTitle =
      electronTitle ??
      (platform === 'win32'
        ? await focusWindowsWindow(title)
        : platform === 'darwin'
          ? await focusMacOSWindow(title)
          : platform === 'linux'
            ? await focusLinuxWindow(title)
            : null);

    if (!focusedTitle) {
      throw new Error(strings.errors.windowNotFound.replace('{title}', title));
    }

    return {
      ok: true,
      output: strings.output.windowFocused.replace('{title}', focusedTitle),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.focusFailed.replace('{error}', formatError(error)),
    };
  }
}
