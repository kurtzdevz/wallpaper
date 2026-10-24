using WallpaperApp.Mvvm;

namespace WallpaperApp.ViewModels;

public sealed class ActivationViewModel : ObservableObject
{
    private string _key = "";
    public string Key { get => _key; set => Set(ref _key, value); }

    private string? _error;
    public string? Error { get => _error; set => Set(ref _error, value); }

    private bool _busy;
    public bool Busy { get => _busy; set => Set(ref _busy, value); }

    public AsyncRelayCommand ActivateCommand { get; }

    // disparado quando a ativação dá certo (App fecha esta janela e abre a principal)
    public event Action? Activated;

    public ActivationViewModel()
    {
        ActivateCommand = new AsyncRelayCommand(_ => DoActivateAsync(), _ => !Busy);
    }

    private async Task DoActivateAsync()
    {
        Error = null;
        if (string.IsNullOrWhiteSpace(Key)) { Error = "Informe sua chave."; return; }
        Busy = true;
        try
        {
            var (ok, message) = await App.License.ActivateAsync(Key);
            if (ok) Activated?.Invoke();
            else Error = message;
        }
        finally { Busy = false; }
    }
}
