"""
Wiederverwendbarer Toast-Popup (WinForms, sandfarben, unten rechts).
Nutzung: python toast.py "Nachricht" [timeout_ms]
Oder als Import: from toast import show_toast
"""
import os
import subprocess
import sys
import tempfile


def show_toast(message, timeout_ms=3000):
    ps_lines = [
        "Add-Type -AssemblyName System.Windows.Forms",
        "Add-Type -AssemblyName System.Drawing",
        "",
        "$f = New-Object System.Windows.Forms.Form",
        "$f.FormBorderStyle = 'None'",
        "$f.StartPosition = 'Manual'",
        "$f.TopMost = $true",
        "$f.ShowInTaskbar = $false",
        "$f.BackColor = [System.Drawing.Color]::FromArgb(210, 195, 170)",
        "$f.Size = New-Object System.Drawing.Size(360, 80)",
        "",
        "$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea",
        "$f.Location = New-Object System.Drawing.Point(($screen.Right - 375), ($screen.Bottom - 95))",
        "",
        "$lbl = New-Object System.Windows.Forms.Label",
        "$lbl.Text = '" + message.replace("'", "''") + "'",
        "$lbl.Font = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)",
        "$lbl.ForeColor = [System.Drawing.Color]::FromArgb(60, 40, 25)",
        "$lbl.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter",
        "$lbl.Dock = [System.Windows.Forms.DockStyle]::Fill",
        "$f.Controls.Add($lbl)",
        "",
        "$path = New-Object System.Drawing.Drawing2D.GraphicsPath",
        "$r = New-Object System.Drawing.Rectangle(0, 0, $f.Width, $f.Height)",
        "$radius = 12",
        "$path.AddArc($r.X, $r.Y, $radius, $radius, 180, 90)",
        "$path.AddArc($r.Right - $radius, $r.Y, $radius, $radius, 270, 90)",
        "$path.AddArc($r.Right - $radius, $r.Bottom - $radius, $radius, $radius, 0, 90)",
        "$path.AddArc($r.X, $r.Bottom - $radius, $radius, $radius, 90, 90)",
        "$path.CloseFigure()",
        "$f.Region = New-Object System.Drawing.Region($path)",
        "",
        "$timer = New-Object System.Windows.Forms.Timer",
        f"$timer.Interval = {timeout_ms}",
        "$timer.Add_Tick({ $f.Close() })",
        "$timer.Start()",
        "",
        "$f.Add_Click({ $f.Close() })",
        "$lbl.Add_Click({ $f.Close() })",
        "$f.Add_FormClosed({ $timer.Dispose() })",
        "$f.ShowDialog() | Out-Null",
    ]
    ps_file = os.path.join(tempfile.gettempdir(), 'hotkey-toast.ps1')
    with open(ps_file, 'w', encoding='utf-8') as fh:
        fh.write('\r\n'.join(ps_lines))
    subprocess.Popen(
        ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps_file],
        creationflags=0x08000000,
    )


if __name__ == '__main__':
    msg = sys.argv[1] if len(sys.argv) > 1 else 'Toast'
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 3000
    show_toast(msg, timeout)
