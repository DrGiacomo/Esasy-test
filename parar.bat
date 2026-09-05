@echo off
setlocal
title Easy Test - parar

REM ============================================================================
REM  Para lo que arranco arrancar.bat.
REM
REM  Los contenedores de Postgres y Redis se PARAN, no se borran: dentro esta tu
REM  base de datos. Para borrarla de verdad hay que pedirlo aparte, y este script
REM  no lo hace por ti bajo ningun argumento.
REM ============================================================================

cd /d "%~dp0"

echo.
echo  Parando Easy Test...
echo.

REM --- Los tres procesos de Node, por el puerto que ocupan --------------------
REM     Por puerto y no por "taskkill node.exe": eso mataria cualquier otro Node
REM     que tengas abierto, incluido el de otro proyecto.

for %%P in (3000 5173) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:"LISTENING" ^| findstr /C:":%%P "') do (
    echo   - parando el proceso %%A ^(puerto %%P^)
    taskkill /F /PID %%A >nul 2>&1
  )
)

REM El worker no escucha en ningun puerto: se cierra con su ventana.
echo   - el worker no ocupa puerto: cierra su ventana a mano si sigue abierta

REM --- Infraestructura --------------------------------------------------------
docker compose -f docker-compose.yml -f docker-compose.dev.yml stop postgres redis >nul 2>&1
if errorlevel 1 (
  echo   - Docker no respondio ^(quiza ya estaba parado^)
) else (
  echo   - Postgres y Redis: parados ^(los datos siguen ahi^)
)

echo.
echo  Listo. Para volver a arrancar:  arrancar.bat
echo.
pause
exit /b 0
