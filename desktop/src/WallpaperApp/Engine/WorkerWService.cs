using System.Diagnostics;

namespace WallpaperApp.Engine;

// Localiza o WorkerW — a janela do Explorer que fica ATRÁS dos ícones da área
// de trabalho. É nela que "grudamos" a janela de vídeo, como o Lively/Wallpaper
// Engine fazem. Trata as duas topologias conhecidas do Windows 10/11.
internal static class WorkerWService
{
    // Pede ao Progman para gerar o WorkerW e retorna o handle correto.
    public static IntPtr GetWorkerW()
    {
        var progman = NativeMethods.FindWindow("Progman", null);
        if (progman == IntPtr.Zero) return IntPtr.Zero;

        // 0x052C faz o Progman criar a camada WorkerW (mensagem não documentada).
        NativeMethods.SendMessageTimeout(progman, NativeMethods.WM_SPAWN_WORKERW,
            IntPtr.Zero, IntPtr.Zero, NativeMethods.SMTO_NORMAL, 1000, out _);

        IntPtr workerw = IntPtr.Zero;

        // Topologia A (Win10): existe um WorkerW irmão, logo após o que contém
        // SHELLDLL_DefView (o container dos ícones).
        NativeMethods.EnumWindows((hwnd, _) =>
        {
            var defView = NativeMethods.FindWindowEx(hwnd, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (defView != IntPtr.Zero)
            {
                workerw = NativeMethods.FindWindowEx(IntPtr.Zero, hwnd, "WorkerW", null);
                return false; // achou, para a enumeração
            }
            return true;
        }, IntPtr.Zero);

        // Topologia B (algumas builds do Win11): o WorkerW/DefView é filho do Progman.
        if (workerw == IntPtr.Zero)
        {
            var defViewUnderProgman = NativeMethods.FindWindowEx(progman, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (defViewUnderProgman != IntPtr.Zero)
            {
                // nesse caso usamos o próprio Progman como pai da camada de wallpaper
                workerw = progman;
            }
            else
            {
                // fallback: primeiro WorkerW filho do Progman
                workerw = NativeMethods.FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);
                if (workerw == IntPtr.Zero) workerw = progman;
            }
        }

        return workerw;
    }

    // Retângulo que cobre todos os monitores (coordenadas da virtual screen).
    public static (int X, int Y, int W, int H) GetVirtualScreen() => (
        NativeMethods.GetSystemMetrics(NativeMethods.SM_XVIRTUALSCREEN),
        NativeMethods.GetSystemMetrics(NativeMethods.SM_YVIRTUALSCREEN),
        NativeMethods.GetSystemMetrics(NativeMethods.SM_CXVIRTUALSCREEN),
        NativeMethods.GetSystemMetrics(NativeMethods.SM_CYVIRTUALSCREEN));

    // Garante que o Explorer está vivo (após um crash/reinício do Explorer).
    public static bool IsExplorerRunning() =>
        Process.GetProcessesByName("explorer").Length > 0;
}
