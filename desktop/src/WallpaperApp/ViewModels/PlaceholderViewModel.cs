using WallpaperApp.Mvvm;

namespace WallpaperApp.ViewModels;

// Seção ainda em construção (Fase 4 segue: Biblioteca, Favoritos, Downloads, Ativos, Config).
public sealed class PlaceholderViewModel : ObservableObject
{
    public string Title { get; }
    public string Message { get; }
    public PlaceholderViewModel(string title, string message) { Title = title; Message = message; }
}
