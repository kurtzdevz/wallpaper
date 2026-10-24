using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;
using LibVLCSharp.Shared;
using LibVLCSharp.WPF;

namespace WallpaperApp.Engine;

// Janela borderless que reproduz o vídeo e é "grudada" no WorkerW, cobrindo
// um monitor. Posicionada em pixels físicos relativos à origem da virtual screen.
internal sealed class VideoWallpaperWindow : Window, IDisposable
{
    private const uint SWP_NOACTIVATE = 0x0010;
    private const uint SWP_NOZORDER = 0x0004;
    private const int SW_SHOWNOACTIVATE = 4;

    private readonly LibVLC _libvlc;
    private readonly MediaPlayer _player;
    private readonly VideoView _videoView;
    private readonly MonitorInfo _monitor;
    private readonly IntPtr _workerW;

    public VideoWallpaperWindow(LibVLC libvlc, MonitorInfo monitor, IntPtr workerW)
    {
        _libvlc = libvlc;
        _monitor = monitor;
        _workerW = workerW;

        WindowStyle = WindowStyle.None;
        ResizeMode = ResizeMode.NoResize;
        ShowInTaskbar = false;
        AllowsTransparency = false;
        Background = Brushes.Black;
        Topmost = false;
        Focusable = false;
        ShowActivated = false;

        _player = new MediaPlayer(_libvlc) { EnableKeyInput = false, EnableMouseInput = false };
        _videoView = new VideoView { MediaPlayer = _player };
        Content = _videoView;

        Loaded += OnLoaded;
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        var helper = new WindowInteropHelper(this);
        var hwnd = helper.Handle;

        // gruda atrás dos ícones
        if (_workerW != IntPtr.Zero)
            NativeMethods.SetParent(hwnd, _workerW);

        // posiciona em pixels físicos, relativo à origem da virtual screen
        var (vx, vy, _, _) = WorkerWService.GetVirtualScreen();
        int x = _monitor.X - vx;
        int y = _monitor.Y - vy;
        NativeMethods.SetWindowPos(hwnd, IntPtr.Zero, x, y, _monitor.Width, _monitor.Height,
            SWP_NOACTIVATE | SWP_NOZORDER);
        NativeMethods.ShowWindow(hwnd, SW_SHOWNOACTIVATE);
    }

    public void Play(string path, bool mute, bool hardwareDecode)
    {
        using var media = new Media(_libvlc, new Uri(path));
        // loop infinito
        media.AddOption(":input-repeat=65535");
        if (!hardwareDecode) media.AddOption(":avcodec-hw=none");
        _player.Media = media;
        _player.Mute = mute;
        _player.Play();
    }

    public void Pause() { if (_player.CanPause) _player.SetPause(true); }
    public void Resume() => _player.SetPause(false);

    public void Dispose()
    {
        try { _player.Stop(); } catch { }
        try { _player.Dispose(); } catch { }
        try { Close(); } catch { }
    }
}
