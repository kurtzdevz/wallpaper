using System.Collections.ObjectModel;
using System.Windows;
using WallpaperApp.Models;
using WallpaperApp.Mvvm;
using WallpaperApp.Services;

namespace WallpaperApp.ViewModels;

// Aba "Descobrir": catálogo vindo da API, com busca, filtros, ordenação e
// paginação incremental. Cada card aplica com um clique (baixar + aplicar).
public sealed class DiscoverViewModel : ObservableObject
{
    public ObservableCollection<WallpaperCardViewModel> Items { get; } = new();
    public ObservableCollection<CategoryDto> Categories { get; } = new();

    private string? _selectedCategory;   // slug ou null = todas
    public string? SelectedCategory { get => _selectedCategory; set { if (Set(ref _selectedCategory, value)) _ = ReloadAsync(); } }

    private string _type = "all";        // all | image | video
    public string Type { get => _type; set { if (Set(ref _type, value)) _ = ReloadAsync(); } }

    private string _sort = "recent";     // recent | popular
    public string Sort { get => _sort; set { if (Set(ref _sort, value)) _ = ReloadAsync(); } }

    private string _search = "";
    public string Search
    {
        get => _search;
        set { if (Set(ref _search, value)) RestartDebounce(); }
    }
    private System.Windows.Threading.DispatcherTimer? _debounce;
    private void RestartDebounce()
    {
        if (_debounce == null) return;
        _debounce.Stop();
        _debounce.Start();
    }

    // Painel de filtros (um único botão "Filtros" abre/fecha)
    private bool _filtersOpen;
    public bool FiltersOpen { get => _filtersOpen; set => Set(ref _filtersOpen, value); }
    public RelayCommand ToggleFiltersCommand { get; }

    private bool _loading;
    public bool Loading { get => _loading; set => Set(ref _loading, value); }

    private bool _empty;
    public bool Empty { get => _empty; set => Set(ref _empty, value); }

    private string? _status;
    public string? Status { get => _status; set => Set(ref _status, value); }

    private int _page = 1;
    private bool _hasMore;
    public bool HasMore { get => _hasMore; set => Set(ref _hasMore, value); }

    // Painel lateral de detalhes: card selecionado (null = painel fechado).
    private WallpaperCardViewModel? _selected;
    public WallpaperCardViewModel? Selected
    {
        get => _selected;
        set { if (Set(ref _selected, value)) OnPropertyChanged(nameof(HasSelection)); }
    }
    public bool HasSelection => _selected != null;

    public RelayCommand SearchCommand { get; }
    public RelayCommand SetTypeCommand { get; }
    public RelayCommand SetSortCommand { get; }
    public RelayCommand SelectCategoryCommand { get; }
    public RelayCommand SelectWallpaperCommand { get; }
    public RelayCommand CloseDetailCommand { get; }
    public AsyncRelayCommand LoadMoreCommand { get; }

    public DiscoverViewModel()
    {
        SearchCommand = new RelayCommand(_ => _ = ReloadAsync());
        SetTypeCommand = new RelayCommand(p => Type = p as string ?? "all");
        SetSortCommand = new RelayCommand(p => Sort = p as string ?? "recent");
        SelectCategoryCommand = new RelayCommand(p => SelectedCategory = p as string);
        SelectWallpaperCommand = new RelayCommand(p => { if (p is WallpaperCardViewModel c) Selected = c; });
        CloseDetailCommand = new RelayCommand(_ => Selected = null);
        ToggleFiltersCommand = new RelayCommand(_ => FiltersOpen = !FiltersOpen);
        LoadMoreCommand = new AsyncRelayCommand(_ => LoadPageAsync(_page + 1), _ => HasMore && !Loading);

        _debounce = new System.Windows.Threading.DispatcherTimer
        { Interval = TimeSpan.FromMilliseconds(350) };
        _debounce.Tick += (_, _) => { _debounce!.Stop(); _ = ReloadAsync(); };
    }

    public async Task InitializeAsync()
    {
        await LoadCategoriesAsync();
        await ReloadAsync();
    }

    private async Task LoadCategoriesAsync()
    {
        try
        {
            var cats = await App.Api.GetCategoriesAsync();
            Categories.Clear();
            Categories.Add(new CategoryDto { Id = "", Name = "Todos", Slug = "" });
            foreach (var c in cats) Categories.Add(c);
        }
        catch { /* offline: deixa só o catálogo local */ }
    }

    public async Task ReloadAsync()
    {
        Items.Clear();
        _page = 0;
        await LoadPageAsync(1);
    }

    private async Task LoadPageAsync(int page)
    {
        Loading = true;
        Status = null;
        try
        {
            var filter = new ApiClient.WallpaperFilter(
                Page: page, PageSize: 24,
                Category: string.IsNullOrEmpty(SelectedCategory) ? null : SelectedCategory,
                Type: Type, Search: string.IsNullOrWhiteSpace(Search) ? null : Search.Trim(),
                Sort: Sort);

            var result = await App.Api.GetWallpapersAsync(filter);
            _page = result.Page;
            HasMore = result.HasMore;

            foreach (var dto in result.Items)
                Items.Add(new WallpaperCardViewModel(dto, ApplyAsync));

            Empty = Items.Count == 0;
        }
        catch (Exception ex)
        {
            Status = "Não consegui carregar o catálogo. Verifique sua conexão com a API.";
            Empty = Items.Count == 0;
            System.Diagnostics.Debug.WriteLine(ex);
        }
        finally { Loading = false; }
    }

    // Fluxo "Baixar e Aplicar" com um clique.
    private async Task ApplyAsync(WallpaperCardViewModel card)
    {
        card.Busy = true;
        card.Progress = 0;
        var track = App.DownloadTracker.Begin(card.Title);
        try
        {
            var progress = new Progress<double>(p => { card.Progress = p; track.Progress = p; });
            var dl = await App.Downloads.DownloadAsync(card.Model, progress);
            track.Done = true;

            if (card.Model.Kind == WallpaperKind.Video)
                App.Engine.ApplyVideo(dl.LocalPath, App.Settings.Current);
            else
                App.Engine.ApplyImage(dl.LocalPath, App.Settings.Current.ImageFit);

            App.Settings.Current.ActiveWallpaperId = card.Model.Id;
            App.Settings.Save();
            App.Library.MarkApplied(card.Model.Id);

            foreach (var c in Items) c.IsActive = false;
            card.IsDownloaded = true;
            card.IsActive = true;
        }
        catch (Exception ex)
        {
            track.Failed = true;
            MessageBox.Show("Não consegui aplicar: " + ex.Message, "WlpBrasil",
                MessageBoxButton.OK, MessageBoxImage.Warning);
        }
        finally { card.Busy = false; }
    }
}
