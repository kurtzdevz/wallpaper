using System.Collections.ObjectModel;
using System.IO;
using System.Windows.Media;
using System.Windows.Threading;
using WallpaperApp.Models;
using WallpaperApp.Mvvm;
using WallpaperApp.Services;

namespace WallpaperApp.ViewModels;

// Tela inicial (dashboard): resumo do estado local, uso de recursos ao vivo
// (CPU/RAM reais) e uma faixa "Em Alta" com os wallpapers mais baixados.
public sealed class HomeViewModel : ObservableObject
{
    public const double ChartW = 300;
    public const double ChartH = 72;

    private readonly ResourceMonitor _mon = new();
    private readonly DispatcherTimer _timer;
    private readonly double[] _cpu = new double[50];
    private int _cpuCount;

    // ---- Resumo ----
    private string _activeTitle = "Nenhum aplicado";
    public string ActiveTitle { get => _activeTitle; private set => Set(ref _activeTitle, value); }

    public int DownloadedCount => App.Library.Entries.Count(e => File.Exists(e.LocalPath));
    public int LibraryCount => App.Library.Entries.Count;

    public string StorageUsedLabel => FormatBytes(App.Library.TotalBytes());
    public string StorageCapLabel => "1 TB";
    public double StoragePercent
    {
        get { var p = App.Library.TotalBytes() / 1_099_511_627_776.0 * 100.0; return p > 100 ? 100 : p; }
    }
    public string StoragePercentLabel => $"{StoragePercent:0}%";

    // ---- Uso de recursos ----
    private int _cpuNow, _ramNow, _diskNow;
    public string CpuText => $"{_cpuNow}%";
    public string RamText => $"{_ramNow}%";
    public string DiskText => $"{_diskNow}%";

    private PointCollection _cpuLine = new();
    public PointCollection CpuLine { get => _cpuLine; private set => Set(ref _cpuLine, value); }
    private PointCollection _cpuArea = new();
    public PointCollection CpuArea { get => _cpuArea; private set => Set(ref _cpuArea, value); }

    // ---- Em Alta ----
    public ObservableCollection<HomeTileViewModel> Trending { get; } = new();

    public RelayCommand ExploreCommand { get; } = new(_ => App.Navigate?.Invoke("discover"));

    public HomeViewModel()
    {
        RefreshActive();
        _diskNow = DiskPercent();

        _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        _timer.Tick += (_, _) => Tick();
        _timer.Start();

        _ = LoadTrendingAsync();
    }

    // Chamado ao voltar para a Início: atualiza números locais.
    public void Refresh()
    {
        RefreshActive();
        _diskNow = DiskPercent();
        OnPropertyChanged(nameof(DownloadedCount));
        OnPropertyChanged(nameof(LibraryCount));
        OnPropertyChanged(nameof(StorageUsedLabel));
        OnPropertyChanged(nameof(StoragePercent));
        OnPropertyChanged(nameof(StoragePercentLabel));
        OnPropertyChanged(nameof(DiskText));
    }

    private void RefreshActive()
    {
        var id = App.Settings.Current.ActiveWallpaperId;
        ActiveTitle = id != null && App.Library.Get(id) is { } e ? e.Title : "Nenhum aplicado";
    }

    private void Tick()
    {
        _mon.Sample();
        _cpuNow = _mon.Cpu;
        _ramNow = _mon.Ram;
        OnPropertyChanged(nameof(CpuText));
        OnPropertyChanged(nameof(RamText));

        // buffer rolante
        if (_cpuCount < _cpu.Length) _cpu[_cpuCount++] = _cpuNow;
        else { Array.Copy(_cpu, 1, _cpu, 0, _cpu.Length - 1); _cpu[^1] = _cpuNow; }

        BuildChart();
    }

    private void BuildChart()
    {
        var line = new PointCollection();
        int n = _cpuCount;
        if (n >= 2)
        {
            double step = ChartW / (n - 1);
            for (int i = 0; i < n; i++)
            {
                double x = i * step;
                double y = ChartH - (_cpu[i] / 100.0 * (ChartH - 6)) - 3;
                line.Add(new System.Windows.Point(x, y));
            }
        }
        var area = new PointCollection();
        if (line.Count >= 2)
        {
            area.Add(new System.Windows.Point(line[0].X, ChartH));
            foreach (var p in line) area.Add(p);
            area.Add(new System.Windows.Point(line[^1].X, ChartH));
        }
        CpuLine = line;
        CpuArea = area;
    }

    private async Task LoadTrendingAsync()
    {
        try
        {
            var r = await App.Api.GetWallpapersAsync(new ApiClient.WallpaperFilter(
                Page: 1, PageSize: 5, Category: null, Type: "all", Search: null, Sort: "popular"));
            Trending.Clear();
            foreach (var dto in r.Items) Trending.Add(new HomeTileViewModel(dto));
        }
        catch { /* offline: faixa vazia */ }
    }

    private static int DiskPercent()
    {
        try
        {
            var root = Path.GetPathRoot(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData)) ?? "C:\\";
            var d = new DriveInfo(root);
            if (d.IsReady && d.TotalSize > 0)
                return (int)(100.0 * (d.TotalSize - d.TotalFreeSpace) / d.TotalSize);
        }
        catch { }
        return 0;
    }

    private static string FormatBytes(long b)
    {
        string[] u = { "B", "KB", "MB", "GB", "TB" };
        double v = b; int i = 0;
        while (v >= 1024 && i < u.Length - 1) { v /= 1024; i++; }
        return $"{v:0.#} {u[i]}";
    }
}

// Card pequeno da faixa "Em Alta".
public sealed class HomeTileViewModel
{
    private readonly WallpaperDto _m;
    public HomeTileViewModel(WallpaperDto m) => _m = m;

    public string Title => _m.Title;
    public string? Thumb => _m.ThumbnailUrl ?? (_m.Kind == WallpaperKind.Image ? _m.FileUrl : null);
    public string DownloadsLabel => _m.DownloadCount >= 1000 ? $"{_m.DownloadCount / 1000.0:0.#} mil" : _m.DownloadCount.ToString();
    public bool Is4k => _m.ResolutionWidth >= 3840 || _m.ResolutionHeight >= 2160;
    public bool IsVideo => _m.Kind == WallpaperKind.Video;

    public RelayCommand OpenCommand { get; } = new(_ => App.Navigate?.Invoke("discover"));
}
