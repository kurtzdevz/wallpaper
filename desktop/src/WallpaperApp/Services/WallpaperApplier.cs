using System.IO;
using WallpaperApp.Models;

namespace WallpaperApp.Services;

// Ponto único para aplicar um wallpaper já baixado (usado por biblioteca,
// playlist e bandeja). Mantém o estado "ativo" consistente.
public static class WallpaperApplier
{
    public static bool Apply(LibraryEntry e)
    {
        if (e == null || !File.Exists(e.LocalPath)) return false;
        if (e.Kind == WallpaperKind.Video)
            App.Engine.ApplyVideo(e.LocalPath, App.Settings.Current);
        else
            App.Engine.ApplyImage(e.LocalPath, App.Settings.Current.ImageFit);

        App.Settings.Current.ActiveWallpaperId = e.Id;
        App.Settings.Save();
        App.Library.MarkApplied(e.Id);
        return true;
    }
}
