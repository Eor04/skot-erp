@echo off
chcp 65001 >nul
title Instalar Acceso Directo - SKOT Balanza
color 0A

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   Crear acceso directo en el Escritorio      ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: Crear el acceso directo con VBScript (funciona en todas las versiones de Windows)
set "SCRIPT=%TEMP%\create_shortcut.vbs"
set "TARGET=%~dp0Conectar Balanza.bat"
set "SHORTCUT=%USERPROFILE%\Desktop\Balanza SKOT.lnk"
set "ICON=%SystemRoot%\System32\shell32.dll"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SCRIPT%"
echo Set oLink = oWS.CreateShortcut("%SHORTCUT%") >> "%SCRIPT%"
echo oLink.TargetPath = "%TARGET%" >> "%SCRIPT%"
echo oLink.WorkingDirectory = "%~dp0" >> "%SCRIPT%"
echo oLink.Description = "Conecta la balanza Toledo Prix 4 Uno al sistema SKOT" >> "%SCRIPT%"
echo oLink.IconLocation = "%ICON%,13" >> "%SCRIPT%"
echo oLink.Save >> "%SCRIPT%"

cscript //nologo "%SCRIPT%"
del "%SCRIPT%"

if exist "%SHORTCUT%" (
    echo  ✅ Acceso directo creado en el Escritorio: "Balanza SKOT"
    echo.
    echo  Tu cliente solo tiene que hacer doble click ahí
    echo  para conectar la balanza cada vez que encienda la PC.
) else (
    echo  ❌ No se pudo crear el acceso directo.
    echo  Usá directamente "Conectar Balanza.bat" en esta carpeta.
)

echo.
pause
