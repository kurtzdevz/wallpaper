using WallpaperApp.Mvvm;

namespace WallpaperApp.ViewModels;

public sealed class MainViewModel : ObservableObject
{
    private object _current;
    public object CurrentViewModel { get => _current; private set => Set(ref _current, value); }

    private string _section = "home";
    public string Section { get => _section; private set => Set(ref _section, value); }

    // instâncias reaproveitadas das seções
    private readonly HomeViewModel _home = new();
    private readonly DiscoverViewModel _discover = new();
    private readonly PlaceholderViewModel _library = new("Minha Biblioteca", "Seus wallpapers baixados aparecerão aqui.");
    private readonly PlaceholderViewModel _favorites = new("Favoritos", "Marque wallpapers como favoritos para vê-los aqui.");
    private readonly PlaceholderViewModel _downloads = new("Downloads", "Acompanhe seus downloads em andamento.");
    private readonly PlaceholderViewModel _active = new("Wallpapers Ativos", "Gerencie o que está aplicado em cada monitor.");
    private readonly PlaceholderViewModel _settings = new("Configurações", "Desempenho, inicialização, ajuste por monitor e mais.");

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
        CurrentViewModel = section switch
        {
            "discover" => _discover,
            "library" => _library,
            "favorites" => _favorites,
            "downloads" => _downloads,
            "active" => _active,
            "settings" => _settings,
            _ => _home,
        };
    }
}
