using WallpaperApp.Mvvm;
using WallpaperApp.Services;

namespace WallpaperApp.ViewModels;

// Configurações persistidas; algumas com efeito imediato (iniciar com Windows).
public sealed class SettingsViewModel : ObservableObject
{
    private AppSettings S => App.Settings.Current;
    private void Save() => App.Settings.Save();

    public bool StartWithWindows
    {
        get => S.StartWithWindows;
        set { if (S.StartWithWindows != value) { S.StartWithWindows = value; StartupService.Set(value); Save(); OnPropertyChanged(); } }
    }
    public bool StartMinimized { get => S.StartMinimized; set { S.StartMinimized = value; Save(); OnPropertyChanged(); } }
    public bool MinimizeToTray { get => S.MinimizeToTray; set { S.MinimizeToTray = value; Save(); OnPropertyChanged(); } }
    public bool PauseOnFullscreen { get => S.PauseOnFullscreen; set { S.PauseOnFullscreen = value; Save(); OnPropertyChanged(); } }
    public bool PauseOnBattery { get => S.PauseOnBattery; set { S.PauseOnBattery = value; Save(); OnPropertyChanged(); } }
    public bool MuteVideo { get => S.MuteVideo; set { S.MuteVideo = value; Save(); OnPropertyChanged(); } }
    public bool HardwareDecode { get => S.HardwareDecode; set { S.HardwareDecode = value; Save(); OnPropertyChanged(); } }
    public bool RestoreOnStartup { get => S.RestoreOnStartup; set { S.RestoreOnStartup = value; Save(); OnPropertyChanged(); } }

    public int FpsLimit { get => S.FpsLimit; set { S.FpsLimit = value; Save(); OnPropertyChanged(); } }
    public string ImageFit { get => S.ImageFit; set { S.ImageFit = value; Save(); OnPropertyChanged(); } }

    // Tema: dark, light, system
    public string Theme
    {
        get => S.Theme;
        set { S.Theme = value; ThemeService.Apply(value); Save(); OnPropertyChanged(); }
    }
    public RelayCommand SetThemeCommand { get; }

    // Troca automática (playlist)
    public bool AutoSwitchEnabled
    {
        get => S.AutoSwitchEnabled;
        set { S.AutoSwitchEnabled = value; Save(); App.Playlist.Apply(); OnPropertyChanged(); }
    }
    public bool AutoSwitchFavoritesOnly
    {
        get => S.AutoSwitchFavoritesOnly;
        set { S.AutoSwitchFavoritesOnly = value; Save(); OnPropertyChanged(); }
    }
    public int AutoSwitchMinutes
    {
        get => S.AutoSwitchMinutes;
        set { S.AutoSwitchMinutes = value; Save(); App.Playlist.Apply(); OnPropertyChanged(); }
    }
    public RelayCommand SetIntervalCommand { get; }

    public RelayCommand SetFpsCommand { get; }
    public RelayCommand SetFitCommand { get; }

    public SettingsViewModel()
    {
        // sincroniza o estado real do "iniciar com Windows"
        S.StartWithWindows = StartupService.IsEnabled();
        SetFpsCommand = new RelayCommand(p => { if (int.TryParse(p?.ToString(), out var v)) FpsLimit = v; });
        SetFitCommand = new RelayCommand(p => ImageFit = p?.ToString() ?? "fill");
        SetThemeCommand = new RelayCommand(p => Theme = p?.ToString() ?? "dark");
        SetIntervalCommand = new RelayCommand(p => { if (int.TryParse(p?.ToString(), out var v)) AutoSwitchMinutes = v; });
    }
}
