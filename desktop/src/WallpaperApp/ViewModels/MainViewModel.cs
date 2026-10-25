using WallpaperApp.Mvvm;
using WallpaperApp.Services;

namespace WallpaperApp.ViewModels;

public sealed class MainViewModel : ObservableObject
{
    private object _current;
    public object CurrentViewModel { get => _current; private set => Set(ref _current, value); }

    private string _section = "home";
    public string Section { get => _section; private set => Set(ref _section, value); }

    private string _sectionTitle = "Início";
    public string SectionTitle { get => _sectionTitle; private set => Set(ref _sectionTitle, value); }

    private string _sectionSubtitle = "Bem-vindo ao WlpBrasil";
    public string SectionSubtitle { get => _sectionSubtitle; private set => Set(ref _sectionSubtitle, value); }

    private bool _isDark = ThemeService.Effective != "light";
    public bool IsDark { get => _isDark; private set { if (Set(ref _isDark, value)) OnPropertyChanged(nameof(ThemeModeLabel)); } }
    public string ThemeModeLabel => IsDark ? "Escuro" : "Claro";

    private string _themeIcon = ThemeService.Effective == "light" ? "🌙" : "☀";
    public string ThemeIcon { get => _themeIcon; private set => Set(ref _themeIcon, value); }

    // Busca global (topo) — sempre direciona para a aba Descobrir.
    private string _topSearch = "";
    public string TopSearch
    {
        get => _topSearch;
        set { if (Set(ref _topSearch, value)) _discover.Search = value; }
    }
    public RelayCommand TopSearchCommand { get; }

    // seções persistentes
    private readonly HomeViewModel _home = new();
    private readonly DiscoverViewModel _discover = new();
    private readonly DownloadsViewModel _downloads = new();

    public RelayCommand NavigateCommand { get; }
    public RelayCommand ToggleThemeCommand { get; }

    public MainViewModel()
    {
        _current = _home;
        App.Navigate = Navigate;

        NavigateCommand = new RelayCommand(p => Navigate(p as string ?? "home"));
        TopSearchCommand = new RelayCommand(_ => Navigate("discover"));
        ToggleThemeCommand = new RelayCommand(_ =>
        {
            var v = ThemeService.Toggle();
            App.Settings.Current.Theme = v;
            App.Settings.Save();
            IsDark = v != "light";
            ThemeIcon = v == "light" ? "🌙" : "☀";
        });
        _ = _discover.InitializeAsync();
    }

    public void Navigate(string section)
    {
        Section = section;
        (SectionTitle, SectionSubtitle) = section switch
        {
            "discover"  => ("Descobrir", "Explore e aplique wallpapers"),
            "library"   => ("Minha Biblioteca", "Seus wallpapers baixados"),
            "favorites" => ("Favoritos", "Seus wallpapers favoritos"),
            "downloads" => ("Downloads", "Em andamento e concluídos"),
            "active"    => ("Wallpapers Ativos", "O que está no seu desktop"),
            "settings"  => ("Configurações", "Preferências do app"),
            _           => ("Início", "Bem-vindo ao WlpBrasil"),
        };

        if (section == "home") _home.Refresh();

        CurrentViewModel = section switch
        {
            "discover" => _discover,
            "library" => new LibraryListViewModel(false),
            "favorites" => new LibraryListViewModel(true),
            "downloads" => _downloads,
            "active" => new ActiveViewModel(),
            "settings" => new SettingsViewModel(),
            _ => (object)_home,
        };
    }
}
