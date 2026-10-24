using System.Collections.ObjectModel;
using WallpaperApp.Mvvm;

namespace WallpaperApp.ViewModels;

// Lista da Biblioteca ou dos Favoritos (mesma tela, filtro diferente).
public sealed class LibraryListViewModel : ObservableObject
{
    private readonly bool _favoritesOnly;
    public ObservableCollection<LibraryItemViewModel> Items { get; } = new();

    public string Title { get; }
    public string Sub { get; }

    private bool _empty;
    public bool Empty { get => _empty; set => Set(ref _empty, value); }

    public string EmptyText => _favoritesOnly
        ? "Nenhum favorito ainda. Marque a estrela nos wallpapers."
        : "Nada baixado ainda. Vá em Descobrir e adicione ao desktop.";

    public LibraryListViewModel(bool favoritesOnly)
    {
        _favoritesOnly = favoritesOnly;
        Title = favoritesOnly ? "Favoritos" : "Minha Biblioteca";
        Sub = favoritesOnly ? "Seus marcados" : "Baixados — funcionam offline";
        Refresh();
    }

    public void Refresh()
    {
        Items.Clear();
        var entries = App.Library.Entries;
        foreach (var e in entries)
        {
            if (_favoritesOnly && !e.Favorite) continue;
            Items.Add(new LibraryItemViewModel(e, Refresh));
        }
        Empty = Items.Count == 0;
    }
}
