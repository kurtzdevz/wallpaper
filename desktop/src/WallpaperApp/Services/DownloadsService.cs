using System.Collections.ObjectModel;
using WallpaperApp.Mvvm;

namespace WallpaperApp.Services;

// Um download em andamento/concluído, exibido na aba Downloads.
public sealed class ActiveDownload : ObservableObject
{
    public string Title { get; }
    public ActiveDownload(string title) { Title = title; }

    private double _progress;
    public double Progress { get => _progress; set => Set(ref _progress, value); }

    private bool _done;
    public bool Done { get => _done; set { if (Set(ref _done, value)) OnPropertyChanged(nameof(StatusLabel)); } }

    private bool _failed;
    public bool Failed { get => _failed; set { if (Set(ref _failed, value)) OnPropertyChanged(nameof(StatusLabel)); } }

    public string StatusLabel => Failed ? "Falhou" : Done ? "Concluído" : "Baixando...";
}

// Mantém a lista de downloads da sessão (para a aba Downloads).
public sealed class DownloadsService
{
    public ObservableCollection<ActiveDownload> Items { get; } = new();

    public ActiveDownload Begin(string title)
    {
        var d = new ActiveDownload(title);
        Items.Insert(0, d);
        return d;
    }
}
