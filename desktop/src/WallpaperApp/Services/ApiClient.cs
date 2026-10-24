using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Web;
using WallpaperApp.Models;

namespace WallpaperApp.Services;

// Cliente da API /api/v1 (catálogo público + download). Consome os contratos de shared.
public sealed class ApiClient
{
    private readonly HttpClient _http;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public ApiClient(AppConfig cfg)
    {
        _http = new HttpClient { BaseAddress = new Uri(cfg.ApiBaseUrl.TrimEnd('/') + "/"), Timeout = TimeSpan.FromSeconds(30) };
    }

    public sealed record WallpaperFilter(
        int Page = 1, int PageSize = 24, string? Category = null, string? Type = null,
        string? Tag = null, string? Search = null, string Sort = "recent",
        bool Featured = false, int? MinWidth = null, string? Since = null);

    public async Task<PaginatedDto<WallpaperDto>> GetWallpapersAsync(WallpaperFilter f, CancellationToken ct = default)
    {
        var q = HttpUtility.ParseQueryString(string.Empty);
        q["page"] = f.Page.ToString();
        q["pageSize"] = f.PageSize.ToString();
        q["sort"] = f.Sort;
        if (!string.IsNullOrWhiteSpace(f.Category)) q["category"] = f.Category;
        if (!string.IsNullOrWhiteSpace(f.Type) && f.Type != "all") q["type"] = f.Type;
        if (!string.IsNullOrWhiteSpace(f.Tag)) q["tag"] = f.Tag;
        if (!string.IsNullOrWhiteSpace(f.Search)) q["search"] = f.Search;
        if (f.Featured) q["featured"] = "true";
        if (f.MinWidth is int mw) q["minWidth"] = mw.ToString();
        if (!string.IsNullOrWhiteSpace(f.Since)) q["since"] = f.Since;

        var resp = await _http.GetAsync($"api/v1/wallpapers?{q}", ct);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<PaginatedDto<WallpaperDto>>(JsonOpts, ct)
               ?? new PaginatedDto<WallpaperDto>();
    }

    public async Task<WallpaperDto?> GetWallpaperAsync(string id, CancellationToken ct = default)
    {
        var resp = await _http.GetAsync($"api/v1/wallpapers/{id}", ct);
        if (resp.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<WallpaperDto>(JsonOpts, ct);
    }

    public async Task<List<CategoryDto>> GetCategoriesAsync(CancellationToken ct = default)
    {
        var resp = await _http.GetAsync("api/v1/categories", ct);
        resp.EnsureSuccessStatusCode();
        var dto = await resp.Content.ReadFromJsonAsync<CategoryListDto>(JsonOpts, ct);
        return dto?.Items ?? new();
    }

    public sealed record ActivateResponse(bool Ok, bool AlreadyActivated, string? ExpiresAt, string? Error, string? Message);

    // Ativa a licença no servidor. Retorna (ok, mensagem) para a UI.
    public async Task<ActivateResponse> ActivateAsync(string key, string deviceHash, string deviceName, CancellationToken ct = default)
    {
        try
        {
            var resp = await _http.PostAsJsonAsync("api/v1/activate", new { key, deviceHash, deviceName }, ct);
            if (resp.IsSuccessStatusCode)
            {
                var dto = await resp.Content.ReadFromJsonAsync<ActivateResponse>(JsonOpts, ct);
                return dto ?? new ActivateResponse(false, false, null, "parse", "Resposta inválida");
            }
            var err = await resp.Content.ReadFromJsonAsync<ActivateResponse>(JsonOpts, ct);
            return err ?? new ActivateResponse(false, false, null, "http", $"Erro {(int)resp.StatusCode}");
        }
        catch (Exception ex)
        {
            return new ActivateResponse(false, false, null, "network", "Sem conexão com o servidor: " + ex.Message);
        }
    }

    public async Task<RegisterDownloadResult?> RegisterDownloadAsync(string wallpaperId, string clientHash, CancellationToken ct = default)
    {
        var resp = await _http.PostAsJsonAsync("api/v1/downloads", new { wallpaperId, clientHash }, ct);
        if (!resp.IsSuccessStatusCode) return null;
        return await resp.Content.ReadFromJsonAsync<RegisterDownloadResult>(JsonOpts, ct);
    }

    // Baixa o arquivo com progresso (0..1). Retorna o caminho local salvo.
    public async Task<string> DownloadFileAsync(string url, string destPath,
        IProgress<double>? progress = null, CancellationToken ct = default)
    {
        using var resp = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        resp.EnsureSuccessStatusCode();
        var total = resp.Content.Headers.ContentLength ?? -1L;

        await using var src = await resp.Content.ReadAsStreamAsync(ct);
        await using var dst = File.Create(destPath);
        var buffer = new byte[81920];
        long read = 0;
        int n;
        while ((n = await src.ReadAsync(buffer, ct)) > 0)
        {
            await dst.WriteAsync(buffer.AsMemory(0, n), ct);
            read += n;
            if (total > 0) progress?.Report((double)read / total);
        }
        progress?.Report(1.0);
        return destPath;
    }
}
