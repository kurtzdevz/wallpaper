using WallpaperApp.Mvvm;

namespace WallpaperApp.ViewModels;

// Tela inicial: resumo do estado local (ativo, baixados, espaço).
public sealed class HomeViewModel : ObservableObject
{
    public string ActiveTitle { get; private set; } = "Nenhum aplicado";
    public int DownloadedCount => App.Library.Entries.Count;
    public string StorageLabel => FormatBytes(App.Library.TotalBytes());

    public HomeViewModel()
    {
        var activeId = App.Settings.Current.ActiveWallpaperId;
        if (activeId != null)
        {
            var e = App.Library.Get(activeId);
            if (e != null) ActiveTitle = e.Title;
        }
    }

    private static string FormatBytes(long b)
    {
        string[] u = { "B", "KB", "MB", "GB", "TB" };
        double v = b; int i = 0;
        while (v >= 1024 && i < u.Length - 1) { v /= 1024; i++; }
        return $"{v:0.#} {u[i]}";
    }
}
