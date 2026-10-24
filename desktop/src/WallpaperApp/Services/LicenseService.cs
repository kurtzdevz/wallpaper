using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace WallpaperApp.Services;

public sealed class LicenseState
{
    public string? Key { get; set; }
    public string? ActivatedAt { get; set; }
    public string? ExpiresAt { get; set; }
}

// Gerencia a licença local do app: hash estável do device, persistência do
// estado de ativação e a chamada de ativação no servidor.
public sealed class LicenseService
{
    private readonly ApiClient _api;
    private readonly string _path = Path.Combine(AppConfig.DataDir, "license.json");
    private static readonly JsonSerializerOptions Opts = new() { WriteIndented = true };

    public LicenseState State { get; private set; } = new();

    public LicenseService(ApiClient api) { _api = api; Load(); }

    public bool IsActivated => !string.IsNullOrWhiteSpace(State.Key);

    // Hash anônimo e estável da máquina (não envia dados identificáveis).
    public static string DeviceHash()
    {
        var seed = Environment.MachineName + "|" + Environment.UserName + "|" +
                   Environment.GetEnvironmentVariable("PROCESSOR_IDENTIFIER");
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(seed)))[..40].ToLowerInvariant();
    }

    public async Task<(bool ok, string? message)> ActivateAsync(string key)
    {
        var resp = await _api.ActivateAsync(key.Trim().ToUpperInvariant(), DeviceHash(), Environment.MachineName);
        if (!resp.Ok) return (false, resp.Message ?? "Falha na ativação");

        State = new LicenseState
        {
            Key = key.Trim().ToUpperInvariant(),
            ActivatedAt = DateTimeOffset.Now.ToString("o"),
            ExpiresAt = resp.ExpiresAt,
        };
        Save();
        return (true, null);
    }

    public void Deactivate() { State = new LicenseState(); try { if (File.Exists(_path)) File.Delete(_path); } catch { } }

    private void Load()
    {
        try { if (File.Exists(_path)) State = JsonSerializer.Deserialize<LicenseState>(File.ReadAllText(_path)) ?? new(); }
        catch { State = new(); }
    }
    private void Save()
    {
        try { File.WriteAllText(_path, JsonSerializer.Serialize(State, Opts)); } catch { }
    }
}
