using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace WallpaperApp;

public sealed class BoolToVisibilityConverter : IValueConverter
{
    public bool Invert { get; set; }
    public object Convert(object value, Type t, object p, CultureInfo c)
    {
        var b = value is bool bb && bb;
        if (Invert) b = !b;
        return b ? Visibility.Visible : Visibility.Collapsed;
    }
    public object ConvertBack(object value, Type t, object p, CultureInfo c) => throw new NotSupportedException();
}

public sealed class NullOrEmptyToVisibilityConverter : IValueConverter
{
    public bool Invert { get; set; }  // Invert=true → visível quando TEM valor
    public object Convert(object value, Type t, object p, CultureInfo c)
    {
        var has = value is string s ? !string.IsNullOrWhiteSpace(s) : value != null;
        var show = Invert ? has : !has;
        return show ? Visibility.Visible : Visibility.Collapsed;
    }
    public object ConvertBack(object value, Type t, object p, CultureInfo c) => throw new NotSupportedException();
}

// Compara o valor atual com o parâmetro (para destacar o filtro/aba selecionada).
public sealed class EqualsToBoolConverter : IValueConverter
{
    public object Convert(object value, Type t, object p, CultureInfo c)
        => string.Equals(value?.ToString(), p?.ToString(), StringComparison.Ordinal);
    public object ConvertBack(object value, Type t, object p, CultureInfo c) => throw new NotSupportedException();
}
