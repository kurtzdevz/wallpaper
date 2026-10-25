using System.Windows.Threading;
using WallpaperApp.Models;

namespace WallpaperApp.Services;

// Troca automática entre os wallpapers baixados, no intervalo configurado.
public sealed class PlaylistService
{
    private readonly DispatcherTimer _timer;
    private int _index = -1;

    public PlaylistService()
    {
        _timer = new DispatcherTimer();
        _timer.Tick += (_, _) => Next();
    }

    // (re)aplica as configurações atuais (liga/desliga + intervalo).
    public void Apply()
    {
        _timer.Stop();
        var s = App.Settings.Current;
        if (!s.AutoSwitchEnabled) return;
        _timer.Interval = TimeSpan.FromMinutes(Math.Max(1, s.AutoSwitchMinutes));
        _timer.Start();
    }

    private List<LibraryEntry> Pool()
    {
        var all = App.Library.Entries.ToList();
        if (App.Settings.Current.AutoSwitchFavoritesOnly)
            all = all.Where(e => e.Favorite).ToList();
        return all;
    }

    public void Next()
    {
        var pool = Pool();
        if (pool.Count == 0) return;
        _index = (_index + 1) % pool.Count;
        WallpaperApplier.Apply(pool[_index]);
    }

    public void Previous()
    {
        var pool = Pool();
        if (pool.Count == 0) return;
        _index = (_index - 1 + pool.Count) % pool.Count;
        WallpaperApplier.Apply(pool[_index]);
    }
}
