@echo off
chcp 65001 >nul
title 🔌 SKOT - Balanza Toledo Prix 4 Uno
color 0B

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║        SKOT - Conectar Balanza               ║
echo  ║        Toledo Prix 4 Uno                      ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ─── Verificar que Node.js está instalado ────────────────────────────────
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  ❌ ERROR: Node.js no está instalado en esta computadora.
    echo.
    echo  Descargalo de: https://nodejs.org
    echo  Instalalo y luego volvé a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)

:: ─── Ir a la carpeta del bridge ──────────────────────────────────────────
cd /d "%~dp0"

:: ─── Instalar dependencias si no existen ─────────────────────────────────
if not exist "node_modules\ws" (
    echo  📦 Instalando dependencias por primera vez...
    echo.
    call npm install --silent
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo.
        echo  ❌ ERROR al instalar dependencias.
        pause
        exit /b 1
    )
    echo.
    echo  ✅ Dependencias instaladas correctamente
    echo.
)

:: ─── Leer IP guardada o pedir una nueva ──────────────────────────────────
set "CONFIG_FILE=%~dp0.scale-ip"
set "SCALE_IP=192.168.1.100"

if exist "%CONFIG_FILE%" (
    set /p SCALE_IP=<"%CONFIG_FILE%"
)

echo  ────────────────────────────────────────────────
echo   IP actual de la balanza: %SCALE_IP%
echo  ────────────────────────────────────────────────
echo.
echo   Presioná ENTER para usar esta IP,
echo   o escribí una nueva IP y presioná ENTER:
echo.
set /p "NEW_IP=  Nueva IP (o ENTER para mantener): "

if not "%NEW_IP%"=="" (
    set "SCALE_IP=%NEW_IP%"
    echo %NEW_IP%> "%CONFIG_FILE%"
    echo.
    echo  ✅ IP guardada: %NEW_IP%
)

echo.
echo  ════════════════════════════════════════════════
echo   🟢 Iniciando puente...
echo   Balanza: %SCALE_IP%:9000
echo   WebSocket: localhost:8765
echo  ════════════════════════════════════════════════
echo.
echo   💡 NO CERRES ESTA VENTANA mientras uses el POS
echo   Para detener, presioná Ctrl+C o cerrá la ventana
echo.
echo  ────────────────────────────────────────────────
echo.

:: ─── Ejecutar el bridge ──────────────────────────────────────────────────
set "SCALE_IP=%SCALE_IP%"
node bridge.js

:: ─── Si se cierra inesperadamente ────────────────────────────────────────
echo.
echo  ⚠️  El puente se detuvo.
echo.
echo  Presioná cualquier tecla para reiniciar, o cerrá la ventana.
pause >nul
goto :eof
