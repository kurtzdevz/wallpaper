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
    public static DownloadsService DownloadTracker { get; } = new();
    public static LicenseService License { get; private set; } = null!;
    public static IWallpaperEngine Engine { get; private set; } = null!;
    public static TrayService Tray { get; } = new();
    public static WallpaperGuard Guard { get; } = new();
    public static PlaylistService Playlist { get; } = new();

    // true quando o usuário realmente mandou sair (pela bandeja)
    public static bool ExitRequested { get; private set; }

    // Permite que telas (ex.: Início) peçam navegação à casca.
    public static Action<string>? Navigate { get; set; }

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // Captura qualquer erro fatal em um arquivo (ajuda a diagnosticar crash na abertura).
        DispatcherUnhandledException += (_, ev) => { LogCrash(ev.Exception); };
        AppDomain.CurrentDomain.UnhandledException += (_, ev) => { LogCrash(ev.ExceptionObject as Exception); };

        // fechar a janela NÃO encerra o app — ele vive em segundo plano (bandeja)
        ShutdownMode = ShutdownMode.OnExplicitShutdown;

        // composição dos serviços (sem container externo — simples e explícito)
        Config = AppConfig.Load();
        Api = new ApiClient(Config);
        Library = new LibraryStore();
        Settings = new SettingsService();
        ThemeService.Apply(Settings.Current.Theme);   // aplica tema antes de abrir janelas
        Downloads = new DownloadManager(Api, Library);
        License = new LicenseService(Api);

        try
        {
            Engine = new WallpaperEngine();
        }
        catch (Exception ex)
        {
            // libvlc ausente ou Windows incompatível: app ainda abre (catálogo/biblioteca),
            // só a aplicação de wallpaper fica indisponível.
            MessageBox.Show("Motor de wallpaper indisponível: " + ex.Message,
                "WlpBrasil", MessageBoxButton.OK, MessageBoxImage.Warning);
            Engine = new NullWallpaperEngine();
        }

        // reage a troca de monitores / resolução
        SystemEvents.DisplaySettingsChanged += (_, _) => Engine.OnDisplayChanged();

        // gate de licença: sem ativação, abre a tela de ativação primeiro
        if (License.IsActivated)
        {
            StartApp();
        }
        else
        {
            var vm = new ActivationViewModel();
            var win = new ActivationWindow { DataContext = vm };
            vm.Activated += () => { StartApp(); win.Close(); };
            win.Show();
        }
    }

    // Inicia os serviços de segundo plano + abre a janela principal.
    private void StartApp()
    {
        try { Tray.Initialize(); } catch { }
        try { Guard.Start(); } catch { }
        try { Playlist.Apply(); } catch { }
        ShowMain();
    }

    private void ShowMain()
    {
        var main = new MainWindow { DataContext = new MainViewModel() };
        if (Settings.Current.StartMinimized) main.WindowState = WindowState.Minimized;
        MainWindow = main;
        if (!Settings.Current.StartMinimized) main.Show();

        if (Settings.Current.RestoreOnStartup && Settings.Current.ActiveWallpaperId is string id)
            RestoreActive(id);
    }

    // chamado pela bandeja / ao reabrir
    public static void ShowMainWindow()
    {
        var w = Current.MainWindow;
        if (w == null) return;
        w.Show();
        w.WindowState = WindowState.Normal;
        w.Activate();
    }

    // saída real (pela bandeja)
    public static void ExitApp()
    {
        ExitRequested = true;
        try { Tray.Dispose(); } catch { }
        Current.Shutdown();
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

    private static void LogCrash(Exception? ex)
    {
        try
        {
            System.IO.File.WriteAllText(
                System.IO.Path.Combine(AppConfig.DataDir, "crash.log"),
                DateTime.Now + "\n\n" + (ex?.ToString() ?? "erro desconhecido"));
        }
        catch { }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        try { Guard.Stop(); } catch { }
        try { Tray.Dispose(); } catch { }
        try { Engine.Dispose(); } catch { }
        base.OnExit(e);
    }
}
