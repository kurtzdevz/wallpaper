using System.IO;
using System.Text.Json;

namespace WallpaperApp.Services;

public sealed class AppSettings
{
    public bool StartWithWindows { get; set; } = false;
    public bool StartMinimized { get; set; } = false;
    public bool MinimizeToTray { get; set; } = true;
    public int FpsLimit { get; set; } = 30;          // 15, 30, 60
    public bool PauseOnFullscreen { get; set; } = true;
    public bool PauseOnBattery { get; set; } = true;
    public bool MuteVideo { get; set; } = true;
    public bool HardwareDecode { get; set; } = true;
    public string ImageFit { get; set; } = "fill";   // fill, fit, stretch, center, tile
    public string Theme { get; set; } = "dark";       // dark, light, system
    public string? ActiveWallpaperId { get; set; }
    public bool RestoreOnStartup { get; set; } = true;

    // Troca automática (playlist)
    public bool AutoSwitchEnabled { get; set; } = false;
    public int AutoSwitchMinutes { get; set; } = 30;     // intervalo entre trocas
    public bool AutoSwitchFavoritesOnly { get; set; } = false;
}

public sealed class SettingsService
{
    private readonly string _path = Path.Combine(AppConfig.DataDir, "settings.json");
    private static readonly JsonSerializerOptions Opts = new() { WriteIndented = true };
    public AppSettings Current { get; private set; } = new();

    public SettingsService() => Load();

    public void Load()
    {
        try
        {
            if (File.Exists(_path))
                Current = JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(_path)) ?? new();
        }
        catch { Current = new(); }
    }

    public void Save()
    {
        try { File.WriteAllText(_path, JsonSerializer.Serialize(Current, Opts)); }
        catch { /* best-effort */ }
    }
}
