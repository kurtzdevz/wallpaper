# App Desktop — MeuWallpaper (.NET / WPF)

App Windows que descobre, baixa e aplica wallpapers (imagem e **vídeo animado atrás dos ícones**),
consumindo a API `/api/v1`. Motor inspirado tecnicamente no Lively Wallpaper (WorkerW).

## Pré-requisitos (no seu PC Windows)

- **.NET SDK 8** (ou troque o target para `net10.0-windows` no `.csproj` se tiver o 10).
- Windows 10 ou 11 (x64).

## Rodar em desenvolvimento

```powershell
cd desktop
dotnet restore
dotnet run --project src/WallpaperApp
```

Na primeira vez o NuGet baixa o LibVLC (pacote `VideoLAN.LibVLC.Windows`, ~40 MB) — é ele que
toca mp4 **e** webm.

Aponte o app para a API editando `src/WallpaperApp/appsettings.json` (ou a variável
`WP_API_BASE_URL`). Enquanto o backend roda local, use `http://localhost:3001`.

## Gerar o executável

```powershell
dotnet publish src/WallpaperApp -c Release -r win-x64 --self-contained false -o publish
```
O `.exe` sai em `publish/MeuWallpaper.exe`. Para um pacote que roda sem instalar o .NET,
use `--self-contained true` (fica maior).

## O que já está implementado

- Casca completa: tema dark premium (grafite + vermelho), barra lateral com as 7 seções.
- **Descobrir**: catálogo da API com busca, filtros (tipo, categoria), ordenação e paginação.
- **Baixar e Aplicar** com um clique: download real com progresso → aplica no desktop.
- Biblioteca local (offline), downloads com dedupe, configurações persistidas.
- **Motor**: imagem via `IDesktopWallpaper` (COM, por monitor + modo de ajuste);
  vídeo via janelas LibVLC grudadas no **WorkerW**; multi-monitor; recuperação em
  troca de resolução / reinício do Explorer; pausa/retomada.

## Pontos que precisam de ajuste fino NA MÁQUINA (esperado)

A integração com o desktop é a parte historicamente mais sensível (o Lively tem anos de
tratamento de casos). Ao testar no seu PC, estes são os pontos a validar/afinar:

1. **Topologia do WorkerW** varia por build do Windows 11. `WorkerWService` trata as duas
   conhecidas; se o vídeo não aparecer atrás dos ícones, é aqui que se ajusta.
2. **Airspace/DPI do VideoView**: em multi-monitor com escalas diferentes, pode ser
   necessário ajustar o posicionamento em `VideoWallpaperWindow`.
3. **Pausa automática** em jogo/tela cheia/bateria: os ganchos existem em `AppSettings`,
   a detecção em si entra na próxima etapa (serviço de foreground/power).

## Seções ainda em construção (próxima etapa da Fase 4)

Biblioteca, Favoritos, Downloads (tela), Wallpapers Ativos e Configurações têm a navegação
pronta com placeholder — a lógica/telas entram na sequência. O núcleo (descobrir → aplicar)
já está completo.
