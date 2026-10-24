using Microsoft.Win32;

namespace WallpaperApp.Services;

// Liga/desliga "iniciar com o Windows" via a chave Run do registro (sem admin).
public static class StartupService
{
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string AppName = "MeuWallpaper";

    public static void Set(bool enabled)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey, writable: true);
            if (key == null) return;
            if (enabled)
            {
                var exe = Environment.ProcessPath ?? "";
                if (!string.IsNullOrEmpty(exe)) key.SetValue(AppName, $"\"{exe}\"");
            }
            else
            {
                if (key.GetValue(AppName) != null) key.DeleteValue(AppName, throwOnMissingValue: false);
            }
        }
        catch { /* best-effort */ }
    }

    public static bool IsEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey);
            return key?.GetValue(AppName) != null;
        }
        catch { return false; }
    }
}
