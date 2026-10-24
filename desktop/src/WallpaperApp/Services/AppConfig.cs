using System.IO;
using System.Text.Json;

namespace WallpaperApp.Services;

// Configuração do app: lê appsettings.json (ao lado do exe) e variáveis de ambiente.
// Variáveis de ambiente têm prioridade — facilita apontar p/ produção sem recompilar.
public sealed class AppConfig
{
    public string ApiBaseUrl { get; init; } = "http://localhost:3001";
    public string SupabaseUrl { get; init; } = "";
    public string SupabaseAnonKey { get; init; } = "";

    public static AppConfig Load()
    {
        string apiBase = "http://localhost:3001", supaUrl = "", supaKey = "";

        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        if (File.Exists(path))
        {
            try
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(path));
                var root = doc.RootElement;
                if (root.TryGetProperty("api", out var api) && api.TryGetProperty("baseUrl", out var b))
                    apiBase = b.GetString() ?? apiBase;
                if (root.TryGetProperty("supabase", out var s))
                {
                    if (s.TryGetProperty("url", out var u)) supaUrl = u.GetString() ?? "";
                    if (s.TryGetProperty("anonKey", out var k)) supaKey = k.GetString() ?? "";
                }
            }
            catch { /* usa defaults */ }
        }

        return new AppConfig
        {
            ApiBaseUrl = Environment.GetEnvironmentVariable("WP_API_BASE_URL") ?? apiBase,
            SupabaseUrl = Environment.GetEnvironmentVariable("WP_SUPABASE_URL") ?? supaUrl,
            SupabaseAnonKey = Environment.GetEnvironmentVariable("WP_SUPABASE_ANON_KEY") ?? supaKey,
        };
    }

    // Pasta de dados do app (sem precisar de admin): %AppData%\WlpBrasil
    public static string DataDir
    {
        get
        {
            var dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "WlpBrasil");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    public static string WallpapersDir
    {
        get { var d = Path.Combine(DataDir, "wallpapers"); Directory.CreateDirectory(d); return d; }
    }
}
