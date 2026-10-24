using System.Windows;
using WallpaperApp.Models;
using WallpaperApp.Mvvm;

namespace WallpaperApp.ViewModels;

// Um card no catálogo. Encapsula o estado (baixado/ativo/progresso) e a ação
// principal "Baixar e Aplicar", que executa todo o fluxo com um clique.
public sealed class WallpaperCardViewModel : ObservableObject
{
    public WallpaperDto Model { get; }

    public string Title => Model.Title;
    public string? ThumbnailUrl => Model.ThumbnailUrl ?? (Model.Kind == WallpaperKind.Image ? Model.FileUrl : null);
    public string TypeLabel => Model.Kind == WallpaperKind.Video ? "VÍDEO" : "IMAGEM";
    public string ResolutionLabel => Model.ResolutionLabel;
    public bool IsVideo => Model.Kind == WallpaperKind.Video;

    private bool _isDownloaded;
    public bool IsDownloaded { get => _isDownloaded; set { if (Set(ref _isDownloaded, value)) OnPropertyChanged(nameof(ActionLabel)); } }

    private bool _isActive;
    public bool IsActive { get => _isActive; set { if (Set(ref _isActive, value)) OnPropertyChanged(nameof(ActionLabel)); } }

    private bool _busy;
    public bool Busy { get => _busy; set => Set(ref _busy, value); }

    private double _progress;
    public double Progress { get => _progress; set => Set(ref _progress, value); }

    public string ActionLabel => IsActive ? "✓ No desktop" : IsDownloaded ? "Aplicar" : "+ Adicionar ao Desktop";

    public AsyncRelayCommand ApplyCommand { get; }

    private readonly Func<WallpaperCardViewModel, Task> _apply;

    public WallpaperCardViewModel(WallpaperDto model, Func<WallpaperCardViewModel, Task> apply)
    {
        Model = model;
        _apply = apply;
        IsDownloaded = App.Library.IsDownloaded(model.Id);
        IsActive = App.Settings.Current.ActiveWallpaperId == model.Id;
        ApplyCommand = new AsyncRelayCommand(_ => _apply(this), _ => !Busy);
    }
}
