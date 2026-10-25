using System.Windows;
using Microsoft.Win32;

namespace WallpaperApp.Services;

// Troca o tema (claro/escuro/seguir Windows) em runtime, trocando o dicionário
// de cores (índice 1 dos MergedDictionaries). Persiste a escolha.
public static class ThemeService
{
    // tema efetivo atual ("dark"/"light"), já resolvendo "system"
    public static string Effective { get; private set; } = "dark";

    public static void Apply(string theme)
    {
        string effective = theme switch
        {
            "light" => "light",
            "system" => IsWindowsLight() ? "light" : "dark",
            _ => "dark",
        };
        Effective = effective;

        var uri = effective == "light"
            ? new Uri("pack://application:,,,/Themes/Light.xaml")
            : new Uri("pack://application:,,,/Themes/Dark.xaml");
        var dict = new ResourceDictionary { Source = uri };

        var merged = Application.Current.Resources.MergedDictionaries;
        // índice 0 = Styles, índice 1 = tema de cores
        if (merged.Count >= 2) merged[1] = dict;
        else merged.Add(dict);
    }

    // Lê a preferência de tema do Windows (apps claros/escuros).
    public static bool IsWindowsLight()
    {
        try
        {
            using var k = Registry.CurrentUser.OpenSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            return k?.GetValue("AppsUseLightTheme") is int v && v == 1;
        }
        catch { return false; }
    }

    // Alterna rápido entre claro e escuro (botão sol/lua). Retorna o novo valor.
    public static string Toggle()
    {
        var next = Effective == "dark" ? "light" : "dark";
        Apply(next);
        return next;
    }
}
