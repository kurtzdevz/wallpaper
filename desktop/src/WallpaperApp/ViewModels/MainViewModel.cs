using WallpaperApp.Mvvm;

namespace WallpaperApp.ViewModels;

public sealed class MainViewModel : ObservableObject
{
    private object _current;
    public object CurrentViewModel { get => _current; private set => Set(ref _current, value); }

    private string _section = "home";
    public string Section { get => _section; private set => Set(ref _section, value); }

    // seções persistentes
    private readonly HomeViewModel _home = new();
    private readonly DiscoverViewModel _discover = new();
    private readonly DownloadsViewModel _downloads = new();

    public RelayCommand NavigateCommand { get; }

    public MainViewModel()
    {
        _current = _home;
        NavigateCommand = new RelayCommand(p => Navigate(p as string ?? "home"));
        _ = _discover.InitializeAsync();
    }

    public void Navigate(string section)
    {
        Section = section;
        // Biblioteca/Favoritos/Ativos são recriados a cada visita para refletir o estado atual.
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
