using System.IO;
using System.Windows;
using WallpaperApp.Models;
using WallpaperApp.Mvvm;

namespace WallpaperApp.ViewModels;

// Um wallpaper já baixado (biblioteca local). Aplica direto do arquivo local.
public sealed class LibraryItemViewModel : ObservableObject
{
    public LibraryEntry Entry { get; }
    private readonly Action _changed;

    public string Title => Entry.Title;
    public bool IsVideo => Entry.Kind == WallpaperKind.Video;
    // imagem: usa o próprio arquivo local; vídeo: miniatura remota se houver
    public string? Thumb => Entry.Kind == WallpaperKind.Image && File.Exists(Entry.LocalPath)
        ? Entry.LocalPath : Entry.ThumbnailUrl;

    public bool Favorite { get => Entry.Favorite; }

    public bool IsActive => App.Settings.Current.ActiveWallpaperId == Entry.Id;
    public string ActionLabel => IsActive ? "✓ No desktop" : "Aplicar";

    public RelayCommand ApplyCommand { get; }
    public RelayCommand RemoveCommand { get; }
    public RelayCommand FavCommand { get; }

    public LibraryItemViewModel(LibraryEntry entry, Action changed)
    {
        Entry = entry;
        _changed = changed;
        ApplyCommand = new RelayCommand(_ => Apply());
        RemoveCommand = new RelayCommand(_ => Remove());
        FavCommand = new RelayCommand(_ => ToggleFav());
    }

    private void Apply()
    {
        if (!File.Exists(Entry.LocalPath))
        {
            MessageBox.Show("O arquivo não está mais no disco.", "WlpBrasil");
            return;
        }
        try
        {
            if (Entry.Kind == WallpaperKind.Video)
                App.Engine.ApplyVideo(Entry.LocalPath, App.Settings.Current);
            else
                App.Engine.ApplyImage(Entry.LocalPath, App.Settings.Current.ImageFit);

            App.Settings.Current.ActiveWallpaperId = Entry.Id;
            App.Settings.Save();
            App.Library.MarkApplied(Entry.Id);
            _changed();
        }
        catch (Exception ex)
        {
            MessageBox.Show("Não consegui aplicar: " + ex.Message, "WlpBrasil");
        }
    }

    private void Remove()
    {
        App.Library.Remove(Entry.Id);
        _changed();
    }

    private void ToggleFav()
    {
        App.Library.ToggleFavorite(Entry.Id);
        OnPropertyChanged(nameof(Favorite));
        _changed();
    }
}
