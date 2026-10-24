using System.Runtime.InteropServices;
using LibVLCSharp.Shared;
using WallpaperApp.Services;

namespace WallpaperApp.Engine;

// Implementação do motor. Imagem via IDesktopWallpaper (COM, por monitor + modo
// de ajuste). Vídeo via janelas LibVLC grudadas no WorkerW (uma por monitor).
public sealed class WallpaperEngine : IWallpaperEngine
{
    private readonly LibVLC _libvlc;
    private IntPtr _workerW;
    // vídeos ativos por índice de monitor
    private readonly Dictionary<int, VideoWallpaperWindow> _videos = new();
    // lembra o último vídeo por monitor para re-aplicar após mudança de ambiente
    private readonly Dictionary<int, (string path, AppSettings settings)> _lastVideo = new();

    public WallpaperEngine()
    {
        // Core.Initialize() localiza a libvlc (pacote VideoLAN.LibVLC.Windows).
        Core.Initialize();
        _libvlc = new LibVLC("--no-osd", "--quiet");
        _workerW = WorkerWService.GetWorkerW();
    }

    // ---------- Imagem ----------
    public void ApplyImage(string localPath, string fit, int? monitorIndex = null)
    {
        var dw = (IDesktopWallpaper)new DesktopWallpaperClass();
        dw.SetPosition(MapFit(fit));

        if (monitorIndex is int idx)
        {
            // para um monitor específico, remove o vídeo dele antes
            RemoveVideo(idx);
            var count = dw.GetMonitorDevicePathCount();
            if (idx < count)
            {
                var monId = dw.GetMonitorDevicePathAt((uint)idx);
                dw.SetWallpaper(monId, localPath);
            }
        }
        else
        {
            ClearVideo();
            dw.SetWallpaper(null, localPath); // todos os monitores
        }
    }

    private static DesktopWallpaperPosition MapFit(string fit) => fit switch
    {
        "fit" => DesktopWallpaperPosition.Fit,
        "stretch" => DesktopWallpaperPosition.Stretch,
        "center" => DesktopWallpaperPosition.Center,
        "tile" => DesktopWallpaperPosition.Tile,
        "span" => DesktopWallpaperPosition.Span,
        _ => DesktopWallpaperPosition.Fill,
    };

    // ---------- Vídeo ----------
    public void ApplyVideo(string localPath, AppSettings settings, int? monitorIndex = null)
    {
        EnsureWorkerW();
        var monitors = DisplayService.GetMonitors();

        IEnumerable<MonitorInfo> targets = monitorIndex is int idx
            ? monitors.Where(m => m.Index == idx)
            : monitors;

        foreach (var mon in targets)
        {
            RemoveVideo(mon.Index);
            var win = new VideoWallpaperWindow(_libvlc, mon, _workerW);
            win.Show();
            win.Play(localPath, settings.MuteVideo, settings.HardwareDecode);
            _videos[mon.Index] = win;
            _lastVideo[mon.Index] = (localPath, settings);
        }
    }

    public void ClearVideo()
    {
        foreach (var w in _videos.Values) w.Dispose();
        _videos.Clear();
        _lastVideo.Clear();
    }

    private void RemoveVideo(int monitorIndex)
    {
        if (_videos.TryGetValue(monitorIndex, out var w))
        {
            w.Dispose();
            _videos.Remove(monitorIndex);
        }
    }

    public void PauseVideo() { foreach (var w in _videos.Values) w.Pause(); }
    public void ResumeVideo() { foreach (var w in _videos.Values) w.Resume(); }

    // ---------- Recuperação de ambiente ----------
    public void OnExplorerRestarted()
    {
        _workerW = WorkerWService.GetWorkerW();
        ReapplyVideos();
    }

    public void OnDisplayChanged()
    {
        EnsureWorkerW();
        ReapplyVideos();
    }

    private void ReapplyVideos()
    {
        if (_lastVideo.Count == 0) return;
        var snapshot = _lastVideo.ToDictionary(kv => kv.Key, kv => kv.Value);
        ClearVideo();
        var monitors = DisplayService.GetMonitors();
        foreach (var (idx, info) in snapshot)
        {
            // só re-aplica em monitores que ainda existem
            if (monitors.Any(m => m.Index == idx))
                ApplyVideo(info.path, info.settings, idx);
        }
    }

    private void EnsureWorkerW()
    {
        if (_workerW == IntPtr.Zero || !WorkerWService.IsExplorerRunning())
            _workerW = WorkerWService.GetWorkerW();
    }

    public void Dispose()
    {
        ClearVideo();
        try { _libvlc.Dispose(); } catch { }
    }
}
