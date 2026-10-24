using System.IO;
using System.Security.Cryptography;
using System.Text;
using WallpaperApp.Models;

namespace WallpaperApp.Services;

// Baixa um wallpaper real para a pasta do app e registra na biblioteca.
// Previne download duplicado e registra o evento na API.
public sealed class DownloadManager
{
    private readonly ApiClient _api;
    private readonly LibraryStore _library;
    private readonly string _clientHash;

    public DownloadManager(ApiClient api, LibraryStore library)
    {
        _api = api;
        _library = library;
        _clientHash = StableClientHash();
    }

    // hash anônimo e estável por máquina/usuário (dedupe de downloads na API)
    private static string StableClientHash()
    {
        var seed = Environment.MachineName + "|" + Environment.UserName;
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(seed));
        return Convert.ToHexString(bytes)[..32].ToLowerInvariant();
    }

    public sealed record DownloadResult(string LocalPath, bool WasAlreadyLocal);

    public async Task<DownloadResult> DownloadAsync(
        WallpaperDto wp, IProgress<double>? progress = null, CancellationToken ct = default)
    {
        // já baixado e válido? evita refazer
        var existing = _library.Get(wp.Id);
        if (existing != null && File.Exists(existing.LocalPath))
        {
            progress?.Report(1.0);
            return new DownloadResult(existing.LocalPath, true);
        }

        var ext = SafeExtension(wp.FileUrl, wp.Kind);
        var dest = Path.Combine(AppConfig.WallpapersDir, $"{wp.Id}{ext}");
        var tmp = dest + ".part";

        await _api.DownloadFileAsync(wp.FileUrl, tmp, progress, ct);

        // move atômico só após concluir (evita arquivo corrompido)
        if (File.Exists(dest)) File.Delete(dest);
        File.Move(tmp, dest);

        _library.Upsert(new LibraryEntry
        {
            Id = wp.Id, Title = wp.Title, Type = wp.Type, LocalPath = dest,
            ThumbnailUrl = wp.ThumbnailUrl, ResolutionWidth = wp.ResolutionWidth,
            ResolutionHeight = wp.ResolutionHeight, AddedAt = DateTimeOffset.Now,
        });

        // registra o download na API (não bloqueia o fluxo se falhar)
        try { await _api.RegisterDownloadAsync(wp.Id, _clientHash, ct); } catch { }

        return new DownloadResult(dest, false);
    }

    private static string SafeExtension(string url, WallpaperKind kind)
    {
        try
        {
            var ext = Path.GetExtension(new Uri(url).AbsolutePath);
            if (!string.IsNullOrWhiteSpace(ext) && ext.Length <= 6) return ext;
        }
        catch { }
        return kind == WallpaperKind.Video ? ".mp4" : ".jpg";
    }
}
