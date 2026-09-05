@echo off
setlocal EnableDelayedExpansion
title Easy Test - parar
cd /d "%~dp0"

REM ============================================================================
REM  Para lo que arranco arrancar.bat, en cualquiera de sus dos modos.
REM
REM  Los contenedores se PARAN, no se borran: dentro esta tu base de datos. Para
REM  borrarla de verdad hay que pedirlo aparte, y este script no lo hace por ti
REM  bajo ningun argumento.
REM
REM  CRLF obligatorio: con LF, cmd no encuentra sus propias etiquetas.
REM ============================================================================

powershell -NoProfile -Command "[System.IO.File]::WriteAllBytes('%TEMP%\esc_pt.tmp',[byte[]]@(27))" 2>nul
if exist "%TEMP%\esc_pt.tmp" (
    set /p ESC=<"%TEMP%\esc_pt.tmp"
    del "%TEMP%\esc_pt.tmp" 2>nul
)
set "C_NC=%ESC%[0m"
set "C_G=%ESC%[92m"
set "C_Y=%ESC%[93m"
set "C_C=%ESC%[96m"
set "C_B=%ESC%[1m"
set "C_D=%ESC%[2m"
if "%ESC%"=="" for %%v in (NC G Y C B D) do set "C_%%v="

echo.
echo  %C_C%%C_B%+==============================================================+%C_NC%
echo  %C_C%%C_B%^|                 Parando Easy Test                            ^|%C_NC%
echo  %C_C%%C_B%+==============================================================+%C_NC%
echo.

REM --- 1. Los procesos de Node del modo desarrollo ---------------------------
REM     Por puerto y no por "taskkill node.exe": eso mataria cualquier otro Node
REM     que tengas abierto, incluido el de otro proyecto.

set "HUBO_NODE=0"
for %%P in (3000 5173) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:"LISTENING" ^| findstr /C:":%%P "') do (
        call :parar_si_es_node %%A %%P
    )
)
if "!HUBO_NODE!"=="0" echo   %C_D%[-] no habia procesos de Node sueltos en los puertos 3000 ni 5173%C_NC%

REM --- 2. Todo el stack de Docker --------------------------------------------
REM     `stop` y no `down`: down borraria la red y, con -v, los volumenes. Aqui
REM     solo se para. La base de datos, los artefactos y las trazas siguen donde
REM     estaban y el proximo arranque los encuentra.

docker compose stop >nul 2>&1
if errorlevel 1 (
    echo   %C_Y%[-]%C_NC% Docker no respondio - puede que ya estuviera parado
) else (
    echo   %C_G%[OK]%C_NC% contenedores parados
)

echo.
echo   %C_B%Lo que NO se ha tocado:%C_NC%
echo     %C_D%- la base de datos (volumen easytest_postgres_data)%C_NC%
echo     %C_D%- los videos, capturas y trazas (volumen artifacts)%C_NC%
echo     %C_D%- Backend\.env con tus secretos%C_NC%
echo.
echo   Para volver a arrancar:  %C_C%arrancar.bat%C_NC%
echo.
pause
exit /b 0

REM ---------------------------------------------------------------------------
REM  Matar "lo que escuche en el puerto 3000" es una bomba: en el arranque
REM  unificado ese puerto NO lo tiene Node, lo publica DOCKER. La primera version
REM  de este script mato Docker Desktop entero el 2026-09-05 - el motor, no un
REM  contenedor - y dejo la maquina sin Docker sin decir una palabra.
REM
REM  Asi que se mira QUE proceso es antes de tocarlo. Si no es node.exe, no se
REM  toca y se dice de quien era.
REM ---------------------------------------------------------------------------
:parar_si_es_node
tasklist /FI "PID eq %~1" /NH 2>nul | findstr /I /C:"node.exe" >nul 2>&1
if errorlevel 1 (
    for /f "tokens=1" %%N in ('tasklist /FI "PID eq %~1" /NH 2^>nul') do (
        echo   %C_D%[-] el puerto %~2 lo tiene %%N, que no es Node: NO se toca%C_NC%
    )
    exit /b 0
)
echo   %C_Y%[-]%C_NC% parando Node - PID %~1, puerto %~2
taskkill /F /PID %~1 >nul 2>&1
set "HUBO_NODE=1"
exit /b 0
