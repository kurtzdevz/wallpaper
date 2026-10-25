using System.Text;
using System.Windows.Threading;
using WallpaperApp.Engine;

namespace WallpaperApp.Services;

// Pausa automaticamente o wallpaper de vídeo quando há um app em tela cheia
// (jogo/vídeo) ou quando o PC está na bateria — economiza GPU/energia.
public sealed class WallpaperGuard
{
    private readonly DispatcherTimer _timer;
    private bool _paused;

    public WallpaperGuard()
    {
        _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2) };
        _timer.Tick += (_, _) => Check();
    }

    public void Start() => _timer.Start();
    public void Stop() => _timer.Stop();

    private void Check()
    {
        var s = App.Settings.Current;
        bool shouldPause = false;

        if (s.PauseOnFullscreen && IsForegroundFullscreen()) shouldPause = true;
        if (s.PauseOnBattery && OnBattery()) shouldPause = true;

        if (shouldPause && !_paused) { App.Engine.PauseVideo(); _paused = true; }
        else if (!shouldPause && _paused) { App.Engine.ResumeVideo(); _paused = false; }
    }

    private static bool OnBattery()
    {
        try
        {
            return System.Windows.Forms.SystemInformation.PowerStatus.PowerLineStatus
                   == System.Windows.Forms.PowerLineStatus.Offline;
        }
        catch { return false; }
    }

    // Há uma janela cobrindo um monitor inteiro em primeiro plano (que não é o shell)?
    private static bool IsForegroundFullscreen()
    {
        var hwnd = NativeMethods.GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return false;
        if (hwnd == NativeMethods.GetDesktopWindow() || hwnd == NativeMethods.GetShellWindow()) return false;

        // ignora a própria área de trabalho / barra de tarefas
        var cls = new StringBuilder(256);
        NativeMethods.GetClassName(hwnd, cls, cls.Capacity);
        var c = cls.ToString();
        if (c is "WorkerW" or "Progman" or "Shell_TrayWnd" or "Windows.UI.Core.CoreWindow") return false;

        if (!NativeMethods.GetWindowRect(hwnd, out var wr)) return false;

        var hMon = NativeMethods.MonitorFromWindow(hwnd, NativeMethods.MONITOR_DEFAULTTONEAREST);
        var mi = new NativeMethods.MONITORINFO { cbSize = System.Runtime.InteropServices.Marshal.SizeOf<NativeMethods.MONITORINFO>() };
        if (!NativeMethods.GetMonitorInfo(hMon, ref mi)) return false;

        var m = mi.rcMonitor;
        // cobre o monitor inteiro (com uma folga de 1px)
        return wr.Left <= m.Left + 1 && wr.Top <= m.Top + 1 &&
               wr.Right >= m.Right - 1 && wr.Bottom >= m.Bottom - 1;
    }
}
