using System.Windows;
using Microsoft.Win32;
using WallpaperApp.Engine;
using WallpaperApp.Services;
using WallpaperApp.ViewModels;
using WallpaperApp.Views;

namespace WallpaperApp;

public partial class App : Application
{
    public static AppConfig Config { get; private set; } = null!;
    public static ApiClient Api { get; private set; } = null!;
    public static LibraryStore Library { get; private set; } = null!;
    public static SettingsService Settings { get; private set; } = null!;
    public static DownloadManager Downloads { get; private set; } = null!;
    public static IWallpaperEngine Engine { get; private set; } = null!;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // composição dos serviços (sem container externo — simples e explícito)
        Config = AppConfig.Load();
        Api = new ApiClient(Config);
        Library = new LibraryStore();
        Settings = new SettingsService();
        Downloads = new DownloadManager(Api, Library);

        try
        {
            Engine = new WallpaperEngine();
        }
        catch (Exception ex)
        {
            // libvlc ausente ou Windows incompatível: app ainda abre (catálogo/biblioteca),
            // só a aplicação de wallpaper fica indisponível.
            MessageBox.Show("Motor de wallpaper indisponível: " + ex.Message,
                "MeuWallpaper", MessageBoxButton.OK, MessageBoxImage.Warning);
            Engine = new NullWallpaperEngine();
        }

        // reage a troca de monitores / resolução
        SystemEvents.DisplaySettingsChanged += (_, _) => Engine.OnDisplayChanged();

        var main = new MainWindow { DataContext = new MainViewModel() };

        if (Settings.Current.StartMinimized) main.WindowState = WindowState.Minimized;
        main.Show();

        // restaura o wallpaper ativo, se habilitado
        if (Settings.Current.RestoreOnStartup && Settings.Current.ActiveWallpaperId is string id)
            RestoreActive(id);
    }

    private static void RestoreActive(string id)
    {
        var entry = Library.Get(id);
        if (entry == null || !System.IO.File.Exists(entry.LocalPath)) return;
        try
        {
            if (entry.Kind == Models.WallpaperKind.Video)
                Engine.ApplyVideo(entry.LocalPath, Settings.Current);
            else
                Engine.ApplyImage(entry.LocalPath, Settings.Current.ImageFit);
        }
        catch { /* best-effort na inicialização */ }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        try { Engine.Dispose(); } catch { }
        base.OnExit(e);
    }
}
