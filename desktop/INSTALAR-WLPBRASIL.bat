@echo off
title Instalar WlpBrasil
cd /d "%~dp0"
echo ============================================
echo    WlpBrasil - instalando
echo ============================================
echo.
where dotnet >nul 2>nul
if errorlevel 1 (
  echo [ERRO] .NET SDK nao encontrado. Baixe o .NET 8 SDK em
  echo https://dotnet.microsoft.com/download  e rode de novo.
  pause & exit /b 1
)

set "APPDIR=%LOCALAPPDATA%\WlpBrasil\app"
echo Compilando e instalando em:
echo   %APPDIR%
echo (pode demorar 1-2 minutos)
echo.
dotnet publish "src\WallpaperApp" -c Release -o "%APPDIR%"
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao compilar. Me mande o texto acima.
  pause & exit /b 1
)

set "EXE=%APPDIR%\WlpBrasil.exe"

REM Atalho na Area de Trabalho
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\WlpBrasil.lnk'); $s.TargetPath='%EXE%'; $s.IconLocation='%EXE%,0'; $s.WorkingDirectory='%APPDIR%'; $s.Save()"
REM Atalho no Menu Iniciar
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('StartMenu')+'\Programs\WlpBrasil.lnk'); $s.TargetPath='%EXE%'; $s.IconLocation='%EXE%,0'; $s.WorkingDirectory='%APPDIR%'; $s.Save()"

echo.
echo ============================================
echo  Pronto! Criei o atalho "WlpBrasil" na Area
echo  de Trabalho e no Menu Iniciar.
echo  Abra pelo atalho (sem terminal). Dá pra
echo  fixar na barra de tarefas tambem.
echo ============================================
echo.
echo Abrindo o WlpBrasil...
start "" "%EXE%"
