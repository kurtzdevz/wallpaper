using WForms = System.Windows.Forms;

namespace WallpaperApp.Services;

// Ícone na bandeja do sistema. Mantém o app vivo em segundo plano e dá
// acesso rápido a abrir / pausar / próximo / sair.
public sealed class TrayService : IDisposable
{
    private WForms.NotifyIcon? _icon;
    private WForms.ToolStripMenuItem? _pauseItem;
    private bool _paused;

    public void Initialize()
    {
        _icon = new WForms.NotifyIcon
        {
            Text = "WlpBrasil",
            Visible = true,
            Icon = LoadIcon(),
        };
        _icon.DoubleClick += (_, _) => App.ShowMainWindow();

        var menu = new WForms.ContextMenuStrip();
        menu.Items.Add("Abrir WlpBrasil", null, (_, _) => App.ShowMainWindow());
        _pauseItem = new WForms.ToolStripMenuItem("Pausar wallpaper", null, (_, _) => TogglePause());
        menu.Items.Add(_pauseItem);
        menu.Items.Add("Próximo wallpaper", null, (_, _) => App.Playlist.Next());
        menu.Items.Add(new WForms.ToolStripSeparator());
        menu.Items.Add("Sair", null, (_, _) => App.ExitApp());
        _icon.ContextMenuStrip = menu;
    }

    private void TogglePause()
    {
        _paused = !_paused;
        if (_paused) App.Engine.PauseVideo(); else App.Engine.ResumeVideo();
        if (_pauseItem != null) _pauseItem.Text = _paused ? "Continuar wallpaper" : "Pausar wallpaper";
    }

    private static System.Drawing.Icon LoadIcon()
    {
        try
        {
            var exe = Environment.ProcessPath;
            if (!string.IsNullOrEmpty(exe))
            {
                var ico = System.Drawing.Icon.ExtractAssociatedIcon(exe);
                if (ico != null) return ico;
            }
        }
        catch { }
        return System.Drawing.SystemIcons.Application;
    }

    public void Notify(string message)
    {
        try { _icon?.ShowBalloonTip(2500, "WlpBrasil", message, WForms.ToolTipIcon.Info); } catch { }
    }

    public void Dispose()
    {
        if (_icon != null) { _icon.Visible = false; _icon.Dispose(); _icon = null; }
    }
}
