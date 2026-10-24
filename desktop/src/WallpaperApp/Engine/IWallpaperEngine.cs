using WallpaperApp.Services;

namespace WallpaperApp.Engine;

// Contrato do motor de wallpapers. Imagem via API nativa do Windows; vídeo
// renderizado atrás dos ícones (WorkerW). Suporta alvo por monitor.
public interface IWallpaperEngine : IDisposable
{
    // Aplica imagem estática. monitorIndex = null → todos os monitores.
    void ApplyImage(string localPath, string fit, int? monitorIndex = null);

    // Aplica vídeo animado atrás dos ícones. monitorIndex = null → todos.
    void ApplyVideo(string localPath, AppSettings settings, int? monitorIndex = null);

    // Remove os wallpapers de vídeo ativos e libera recursos de GPU/decoder.
    void ClearVideo();

    void PauseVideo();
    void ResumeVideo();

    // Reage a mudanças do ambiente.
    void OnDisplayChanged();     // resolução/monitor conectado ou removido
    void OnExplorerRestarted();  // recupera o WorkerW
}
