using System.ComponentModel;
using System.Windows;

namespace WallpaperApp.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Closing += OnClosing;
    }

    // Fechar no X esconde pra bandeja (segundo plano), a menos que seja saída real.
    private void OnClosing(object? sender, CancelEventArgs e)
    {
        if (App.ExitRequested) return;
        if (App.Settings.Current.MinimizeToTray)
        {
            e.Cancel = true;
            Hide();
            App.Tray.Notify("WlpBrasil continua rodando na bandeja.");
        }
    }
}
