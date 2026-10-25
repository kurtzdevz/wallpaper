using System.Runtime.InteropServices;

namespace WallpaperApp.Services;

// Amostra uso de CPU e RAM do sistema via WinAPI (sem PerformanceCounter,
// que costuma ser lento/instável). Chame Sample() periodicamente.
public sealed class ResourceMonitor
{
    [StructLayout(LayoutKind.Sequential)]
    private struct MEMORYSTATUSEX
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys, ullAvailPhys, ullTotalPageFile, ullAvailPageFile,
                     ullTotalVirtual, ullAvailVirtual, ullAvailExtendedVirtual;
    }

    [DllImport("kernel32.dll")]
    private static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

    [DllImport("kernel32.dll")]
    private static extern bool GetSystemTimes(out long idle, out long kernel, out long user);

    private long _pIdle, _pKernel, _pUser;
    private bool _have;

    public int Cpu { get; private set; }
    public int Ram { get; private set; }

    public void Sample()
    {
        var m = new MEMORYSTATUSEX { dwLength = (uint)Marshal.SizeOf<MEMORYSTATUSEX>() };
        if (GlobalMemoryStatusEx(ref m)) Ram = (int)m.dwMemoryLoad;

        if (GetSystemTimes(out var idle, out var kernel, out var user))
        {
            if (_have)
            {
                var dIdle = idle - _pIdle;
                var total = (kernel - _pKernel) + (user - _pUser); // kernel já inclui idle
                if (total > 0)
                {
                    var busy = (int)(100.0 * (total - dIdle) / total);
                    Cpu = busy < 0 ? 0 : busy > 100 ? 100 : busy;
                }
            }
            _pIdle = idle; _pKernel = kernel; _pUser = user; _have = true;
        }
    }
}
