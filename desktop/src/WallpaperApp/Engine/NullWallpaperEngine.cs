using WallpaperApp.Services;

namespace WallpaperApp.Engine;

// Motor "no-op" usado quando a libVLC não está disponível. Mantém o app utilizável
// (catálogo, downloads, biblioteca) mesmo sem aplicar wallpaper.
public sealed class NullWallpaperEngine : IWallpaperEngine
{
    public void ApplyImage(string localPath, string fit, int? monitorIndex = null) { }
    public void ApplyVideo(string localPath, AppSettings settings, int? monitorIndex = null) { }
    public void ClearVideo() { }
    public void PauseVideo() { }
    public void ResumeVideo() { }
    public void OnDisplayChanged() { }
    public void OnExplorerRestarted() { }
    public void Dispose() { }
}
