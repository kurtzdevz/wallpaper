namespace WallpaperApp.Engine;

public sealed record MonitorInfo(int Index, int X, int Y, int Width, int Height)
{
    public string Label => $"Monitor {Index + 1} ({Width}x{Height})";
}

// Enumera os monitores conectados via Win32 (sem depender de WinForms).
public static class DisplayService
{
    public static List<MonitorInfo> GetMonitors()
    {
        var list = new List<MonitorInfo>();
        int i = 0;
        NativeMethods.EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero,
            (IntPtr _, IntPtr _, ref NativeMethods.RECT r, IntPtr _) =>
            {
                list.Add(new MonitorInfo(i++, r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top));
                return true;
            }, IntPtr.Zero);

        if (list.Count == 0)
        {
            var (x, y, w, h) = WorkerWService.GetVirtualScreen();
            list.Add(new MonitorInfo(0, x, y, w, h));
        }
        return list;
    }
}
