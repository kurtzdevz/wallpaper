using System.Collections.ObjectModel;
using System.IO;
using Microsoft.Win32;
using WallpaperApp.Models;
using WallpaperApp.Mvvm;
using WallpaperApp.Services;

namespace WallpaperApp.ViewModels;

// Lista da Biblioteca ou dos Favoritos (mesma tela, filtro diferente).
public sealed class LibraryListViewModel : ObservableObject
{
    private readonly bool _favoritesOnly;
    public ObservableCollection<LibraryItemViewModel> Items { get; } = new();

    public string Title { get; }
    public string Sub { get; }
    public bool ShowImport => !_favoritesOnly;

    private bool _empty;
    public bool Empty { get => _empty; set => Set(ref _empty, value); }

    public string EmptyText => _favoritesOnly
        ? "Nenhum favorito ainda. Marque a estrela nos wallpapers."
        : "Nada aqui ainda. Baixe em Descobrir ou importe do seu PC.";

    public RelayCommand ImportCommand { get; }

    public LibraryListViewModel(bool favoritesOnly)
    {
        _favoritesOnly = favoritesOnly;
        Title = favoritesOnly ? "Favoritos" : "Minha Biblioteca";
        Sub = favoritesOnly ? "Seus marcados" : "Baixados e importados — funcionam offline";
        ImportCommand = new RelayCommand(_ => Import());
        Refresh();
    }

    public void Refresh()
    {
        Items.Clear();
        foreach (var e in App.Library.Entries)
        {
            if (_favoritesOnly && !e.Favorite) continue;
            Items.Add(new LibraryItemViewModel(e, Refresh));
        }
        Empty = Items.Count == 0;
    }

    // Importa arquivos locais (imagem/vídeo) para a biblioteca.
    private void Import()
    {
        var dlg = new OpenFileDialog
        {
            Title = "Importar wallpapers",
            Filter = "Wallpapers|*.jpg;*.jpeg;*.png;*.webp;*.bmp;*.mp4;*.webm",
            Multiselect = true,
        };
        if (dlg.ShowDialog() != true) return;

        foreach (var path in dlg.FileNames)
        {
            try
            {
                var ext = Path.GetExtension(path).ToLowerInvariant();
                var id = "local-" + Guid.NewGuid().ToString("N").Substring(0, 10);
                var dest = Path.Combine(AppConfig.WallpapersDir, id + ext);
                File.Copy(path, dest, overwrite: true);
                var isVideo = ext is ".mp4" or ".webm";
                App.Library.Upsert(new LibraryEntry
                {
                    Id = id,
                    Title = Path.GetFileNameWithoutExtension(path),
                    Type = isVideo ? "video" : "image",
                    LocalPath = dest,
                    AddedAt = DateTimeOffset.Now,
                });
            }
            catch { /* ignora arquivo problemático */ }
        }
        Refresh();
    }
}
