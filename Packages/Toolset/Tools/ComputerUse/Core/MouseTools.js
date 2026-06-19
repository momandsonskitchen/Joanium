import strings from '../I18n/en.js';
import {
  formatError,
  getPlatform,
  requireMacOS,
  requireWindows,
  roundCoordinate,
  runCommand,
  runAppleScript,
  runPowerShell,
} from './Platform.js';

function mouseButtonFlags(button) {
  if (button === 'right') {
    return { down: '0x08', up: '0x10' };
  }

  if (button === 'middle') {
    return { down: '0x20', up: '0x40' };
  }

  return { down: '0x02', up: '0x04' };
}

async function windowsClick(x, y, button = 'left', double = false) {
  requireWindows();
  const clickCount = double ? 2 : 1;
  const flags = mouseButtonFlags(button);
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${roundCoordinate(x)}, ${roundCoordinate(y)})
    Start-Sleep -Milliseconds 40
    $type = Add-Type -MemberDefinition '
      [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, IntPtr dwExtraInfo);
    ' -Name "MouseSimulator" -Namespace "Win32" -PassThru
    for ($i = 0; $i -lt ${clickCount}; $i++) {
      $type::mouse_event(${flags.down}, 0, 0, 0, [IntPtr]::Zero)
      Start-Sleep -Milliseconds 24
      $type::mouse_event(${flags.up}, 0, 0, 0, [IntPtr]::Zero)
      if ($i -lt ${clickCount - 1}) { Start-Sleep -Milliseconds 70 }
    }
  `;

  await runPowerShell(psScript);
}

async function macosClick(x, y, button = 'left', double = false) {
  requireMacOS();
  const buttonArg = button === 'right' ? 'right' : 'left';
  const clickCount = double ? 2 : 1;
  const osascript = `
    tell application "System Events"
      repeat ${clickCount} times
        click at {${roundCoordinate(x)}, ${roundCoordinate(y)}} using ${buttonArg} button
        delay 0.07
      end repeat
    end tell
  `;

  await runAppleScript(osascript);
}

async function linuxClick(x, y, button = 'left', double = false) {
  const buttonMap = {
    left: '1',
    middle: '2',
    right: '3',
  };
  const args = [
    'mousemove',
    String(roundCoordinate(x)),
    String(roundCoordinate(y)),
    'click',
    ...(double ? ['--repeat', '2', '--delay', '70'] : []),
    buttonMap[button],
  ];

  await runCommand('xdotool', args, 3000);
}

export async function computerClick(x, y, button = 'left', double = false) {
  try {
    const platform = getPlatform();
    if (platform === 'win32') {
      await windowsClick(x, y, button, double);
    } else if (platform === 'darwin') {
      await macosClick(x, y, button, double);
    } else if (platform === 'linux') {
      await linuxClick(x, y, button, double);
    } else {
      return { ok: false, error: strings.errors.platformNotSupported };
    }

    return {
      ok: true,
      output: strings.output.clicked
        .replace('{x}', String(roundCoordinate(x)))
        .replace('{y}', String(roundCoordinate(y))),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.clickFailed.replace('{error}', formatError(error)),
    };
  }
}

async function windowsMouseMove(x, y) {
  requireWindows();
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${roundCoordinate(x)}, ${roundCoordinate(y)})
  `;

  await runPowerShell(psScript, 3000);
}

async function linuxMouseMove(x, y) {
  await runCommand(
    'xdotool',
    ['mousemove', String(roundCoordinate(x)), String(roundCoordinate(y))],
    3000,
  );
}

export async function computerMouseMove(x, y) {
  try {
    const platform = getPlatform();
    if (platform === 'win32') {
      await windowsMouseMove(x, y);
    } else if (platform === 'linux') {
      await linuxMouseMove(x, y);
    } else {
      return { ok: false, error: strings.errors.platformNotSupported };
    }

    return {
      ok: true,
      output: strings.output.mouseMoved
        .replace('{x}', String(roundCoordinate(x)))
        .replace('{y}', String(roundCoordinate(y))),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.clickFailed.replace('{error}', formatError(error)),
    };
  }
}

async function windowsScroll(direction = 'up', amount = 3) {
  requireWindows();
  const wheelData = direction === 'up' ? amount * 120 : -(amount * 120);
  const psScript = `
    $type = Add-Type -MemberDefinition '
      [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, int dwData, IntPtr dwExtraInfo);
    ' -Name "MouseWheelSimulator" -Namespace "Win32" -PassThru
    $type::mouse_event(0x0800, 0, 0, ${Math.trunc(wheelData)}, [IntPtr]::Zero)
  `;

  await runPowerShell(psScript, 3000);
}

async function linuxScroll(direction = 'up', amount = 3) {
  const button = direction === 'up' ? '4' : '5';
  await runCommand('xdotool', ['click', '--repeat', String(amount), button], 3000);
}

export async function computerScroll(direction = 'up', amount = 3) {
  try {
    const platform = getPlatform();
    if (platform === 'win32') {
      await windowsScroll(direction, amount);
    } else if (platform === 'linux') {
      await linuxScroll(direction, amount);
    } else {
      return { ok: false, error: strings.errors.platformNotSupported };
    }

    return {
      ok: true,
      output: strings.output.scrolled
        .replace('{direction}', direction)
        .replace('{amount}', String(amount)),
    };
  } catch (error) {
    return {
      ok: false,
      error: strings.errors.scrollFailed.replace('{error}', formatError(error)),
    };
  }
}
