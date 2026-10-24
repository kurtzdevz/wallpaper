using System.Collections.ObjectModel;
using WallpaperApp.Mvvm;
using WallpaperApp.Services;

namespace WallpaperApp.ViewModels;

public sealed class DownloadsViewModel : ObservableObject
{
    public ObservableCollection<ActiveDownload> Items => App.DownloadTracker.Items;
}
