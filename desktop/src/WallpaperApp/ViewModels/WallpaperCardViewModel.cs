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
    public string? PreviewUrl => Model.Kind == WallpaperKind.Image ? Model.FileUrl : (Model.ThumbnailUrl ?? Model.FileUrl);
    public string TypeLabel => Model.Kind == WallpaperKind.Video ? "VÍDEO" : "IMAGEM";
    public string ResolutionLabel => Model.ResolutionLabel;
    public bool IsVideo => Model.Kind == WallpaperKind.Video;

    // Dados para o painel de detalhes
    public string? Description => string.IsNullOrWhiteSpace(Model.Description) ? null : Model.Description;
    public string DownloadsLabel => $"{Model.DownloadCount} download" + (Model.DownloadCount == 1 ? "" : "s");
    public string SizeLabel => Model.FileSize is long b && b > 0
        ? (b >= 1_048_576 ? $"{b / 1_048_576.0:0.0} MB" : $"{b / 1024.0:0} KB")
        : "—";
    public bool HasTags => Model.Tags.Count > 0;
    public System.Collections.Generic.List<string> Tags => Model.Tags;

    private bool _isFavorite;
    public bool IsFavorite { get => _isFavorite; set { if (Set(ref _isFavorite, value)) OnPropertyChanged(nameof(FavoriteLabel)); } }
    public string FavoriteLabel => IsFavorite ? "★ Favoritado" : "☆ Favoritar";
    public RelayCommand ToggleFavoriteCommand { get; }

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
        IsFavorite = App.Library.IsFavorite(model.Id);
        ApplyCommand = new AsyncRelayCommand(_ => _apply(this), _ => !Busy);
        ToggleFavoriteCommand = new RelayCommand(_ => IsFavorite = App.Library.ToggleFavorite(Model));
    }
}
