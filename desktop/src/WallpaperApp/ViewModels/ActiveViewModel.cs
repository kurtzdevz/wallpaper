using System.Collections.ObjectModel;
using WallpaperApp.Engine;
using WallpaperApp.Mvvm;

namespace WallpaperApp.ViewModels;

public sealed class MonitorRow
{
    public string Label { get; init; } = "";
    public string Active { get; init; } = "Nenhum";
}

// Mostra os monitores detectados e o wallpaper ativo.
public sealed class ActiveViewModel : ObservableObject
{
    public ObservableCollection<MonitorRow> Monitors { get; } = new();

    public ActiveViewModel()
    {
        var activeId = App.Settings.Current.ActiveWallpaperId;
        var activeTitle = activeId != null ? App.Library.Get(activeId)?.Title ?? "Nenhum" : "Nenhum";
        foreach (var m in DisplayService.GetMonitors())
            Monitors.Add(new MonitorRow { Label = m.Label, Active = activeTitle });
        if (Monitors.Count == 0)
            Monitors.Add(new MonitorRow { Label = "Monitor principal", Active = activeTitle });
    }
}
