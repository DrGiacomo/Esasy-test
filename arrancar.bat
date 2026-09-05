@echo off
setlocal EnableDelayedExpansion
title Easy Test - arranque
cd /d "%~dp0"

REM ============================================================================
REM  Easy Test - arranque unificado.
REM
REM  Sin argumentos levanta TODO dentro de Docker -base de datos, cola, backend,
REM  worker y la pantalla- y abre el navegador. No hace falta Node instalado, ni
REM  npm install, ni dejar ventanas abiertas.
REM
REM  Uso:  arrancar.bat             todo en Docker  -^> http://localhost:8080
REM        arrancar.bat /dev        modo desarrollo -^> http://localhost:5173
REM                                 (infraestructura en Docker; backend, worker
REM                                  y pantalla con npm y recarga en caliente)
REM        arrancar.bat /imagenes   ademas reconstruye executor y recorder
REM
REM  Este archivo se guarda con saltos de linea CRLF a proposito: con LF, cmd
REM  pierde las etiquetas y falla diciendo que no las encuentra aunque esten.
REM ============================================================================

REM ---- Colores. El byte ESC se escribe a un temporal y se lee con set /p:
REM      for /f lo corrompe. Si PowerShell no esta, quedan vacios y sale texto
REM      plano - nunca marcas raras.
powershell -NoProfile -Command "[System.IO.File]::WriteAllBytes('%TEMP%\esc_et.tmp',[byte[]]@(27))" 2>nul
if exist "%TEMP%\esc_et.tmp" (
    set /p ESC=<"%TEMP%\esc_et.tmp"
    del "%TEMP%\esc_et.tmp" 2>nul
)
set "C_NC=%ESC%[0m"
set "C_R=%ESC%[91m"
set "C_G=%ESC%[92m"
set "C_Y=%ESC%[93m"
set "C_C=%ESC%[96m"
set "C_B=%ESC%[1m"
set "C_D=%ESC%[2m"
if "%ESC%"=="" for %%v in (NC R G Y C B D) do set "C_%%v="

set "MODO=docker"
set "IMAGENES=0"
:leer_args
if "%~1"=="" goto :args_listos
if /I "%~1"=="/dev"      set "MODO=dev"
if /I "%~1"=="/imagenes" set "IMAGENES=1"
shift
goto :leer_args
:args_listos

cls
echo.
echo  %C_C%%C_B%+==============================================================+%C_NC%
echo  %C_C%%C_B%^|                    E A S Y   T E S T                         ^|%C_NC%
if "%MODO%"=="docker" echo  %C_C%%C_B%^|            arrancando todo dentro de Docker                  ^|%C_NC%
if "%MODO%"=="dev"    echo  %C_C%%C_B%^|          modo desarrollo - recarga en caliente               ^|%C_NC%
echo  %C_C%%C_B%+==============================================================+%C_NC%
echo.

REM ==========================================================================
REM  1. Docker
REM     Todo lo comprobable sin efectos secundarios va primero: si algo falta,
REM     la maquina se queda como estaba y no a medias.
REM ==========================================================================
call :paso 1 "Comprobando Docker"

where docker >nul 2>&1
if errorlevel 1 (
    call :mal "No encuentro Docker."
    echo      Instala Docker Desktop desde https://docker.com y vuelve a ejecutar esto.
    goto :fin_error
)

docker info >nul 2>&1
if not errorlevel 1 goto :docker_listo

call :aviso "Docker esta instalado pero no arrancado. Lo abro y espero."
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
)
set /a ESPERA=0
:esperar_docker
docker info >nul 2>&1
if not errorlevel 1 goto :docker_listo
set /a ESPERA+=3
if !ESPERA! GEQ 120 (
    call :mal "Docker no ha arrancado en dos minutos."
    echo      Abrelo a mano, espera a que diga "Engine running" y reintenta.
    goto :fin_error
)
REM ping como reloj: timeout falla cuando la entrada esta redirigida.
ping -n 4 127.0.0.1 >nul
echo     %C_D%esperando a Docker... !ESPERA!s%C_NC%
goto :esperar_docker

:docker_listo
call :bien "Docker respondiendo"

REM ==========================================================================
REM  2. Configuracion
REM     Se prepara sola. Y se prepara DENTRO de un contenedor para no exigir
REM     Node instalado: es justo lo que separa "se lo enseno a alguien" de
REM     "alguien se lo lleva".
REM ==========================================================================
call :paso 2 "Configuracion"

if exist "Backend\.env" goto :env_listo

call :aviso "No hay Backend\.env todavia. Preparandolo..."
where node >nul 2>&1
if errorlevel 1 (
    docker run --rm -v "%CD%":/proyecto -w /proyecto/Backend node:20-alpine node scripts/preparar-entorno.mjs
) else (
    pushd Backend
    call node scripts\preparar-entorno.mjs
    popd
)
if not exist "Backend\.env" (
    call :mal "No se pudo crear Backend\.env"
    goto :fin_error
)

:env_listo
call :bien "Backend\.env listo"

REM ==========================================================================
REM  3. Puerto de Postgres
REM     Si hay un PostgreSQL nativo escuchando en el 5432, el contenedor no
REM     puede publicar ahi y localhost:5432 responderia desde OTRA base. El
REM     sintoma es un "Authentication failed" con las credenciales correctas,
REM     y cuesta media hora entenderlo. Se detecta aqui, no se sufre despues.
REM ==========================================================================
call :paso 3 "Puertos"

REM  Los TRES puertos que esto publica pueden estar cogidos, no solo el de Postgres.
REM  La primera version solo miraba el 5432 - porque fue el que dio guerra - y el
REM  arranque murio con "port is already allocated" en el 8080, que lo tenia un
REM  contenedor de otro proyecto con restart=always. El arreglo va en los tres.
if "%POSTGRES_PORT%"=="" set "POSTGRES_PORT=5432"
if "%BACKEND_PORT%"==""  set "BACKEND_PORT=3000"
if "%FRONTEND_PORT%"=="" set "FRONTEND_PORT=8080"

call :buscar_libre "%POSTGRES_PORT%" "la base de datos"
set "POSTGRES_PORT=!LIBRE!"
call :buscar_libre "%BACKEND_PORT%" "la API"
set "BACKEND_PORT=!LIBRE!"
call :buscar_libre "%FRONTEND_PORT%" "la pantalla"
set "FRONTEND_PORT=!LIBRE!"

call :bien "base de datos !POSTGRES_PORT!  -  API !BACKEND_PORT!  -  pantalla !FRONTEND_PORT!"

REM ==========================================================================
REM  4. Imagenes
REM ==========================================================================
call :paso 4 "Imagenes de grabacion y ejecucion"

if "%IMAGENES%"=="1" (
    echo     %C_D%reconstruyendo executor y recorder - 2,9 GB cada una, tarda%C_NC%
    docker compose --profile build-images build executor recorder
    if errorlevel 1 (
        call :mal "Fallo al construir las imagenes de executor/recorder."
        goto :fin_error
    )
    call :bien "executor y recorder reconstruidas"
) else (
    call :bien "se reutilizan las que hay  -  usa /imagenes para reconstruirlas"
)

if "%MODO%"=="dev" goto :arranque_dev

REM ==========================================================================
REM  5. Arranque unificado - todo en Docker
REM ==========================================================================
call :paso 5 "Levantando la plataforma"
echo     %C_D%la primera vez construye backend, worker y pantalla: varios minutos%C_NC%
echo     %C_D%no cierres esta ventana mientras tanto%C_NC%
echo.

docker compose up -d --build
if errorlevel 1 (
    call :mal "No se pudo levantar la plataforma."
    echo      Mira que ha pasado con:  docker compose logs
    goto :fin_error
)
call :bien "contenedores arriba"

REM ==========================================================================
REM  6. Esperar a que responda de verdad
REM     Un contenedor "arriba" no es una plataforma lista: el backend aplica
REM     las migraciones al arrancar. Se espera a que la pantalla conteste, no
REM     a que Docker diga que si.
REM ==========================================================================
call :paso 6 "Esperando a que la pantalla responda"

set /a INTENTOS=0
:esperar_web
curl -s -o nul --max-time 3 http://localhost:!FRONTEND_PORT! >nul 2>&1
if not errorlevel 1 goto :web_lista
set /a INTENTOS+=3
if !INTENTOS! GEQ 120 (
    call :aviso "La pantalla no contesta todavia. Puede seguir arrancando."
    goto :web_lista
)
ping -n 4 127.0.0.1 >nul
echo     %C_D%esperando... !INTENTOS!s%C_NC%
goto :esperar_web

:web_lista
call :bien "la pantalla responde"
echo.
call :estado
echo.
echo  %C_G%%C_B%+==============================================================+%C_NC%
echo  %C_G%%C_B%^|   LISTO.  Abre:  http://localhost:!FRONTEND_PORT!                       ^|%C_NC%
echo  %C_G%%C_B%+==============================================================+%C_NC%
echo.
echo   %C_D%La API responde en http://localhost:!BACKEND_PORT!/api/v1%C_NC%
echo   %C_D%Para parar todo:  parar.bat%C_NC%
echo.
echo   Si es la primera vez y quieres datos de ejemplo dentro:
echo       %C_C%docker compose exec backend npx prisma db seed%C_NC%
echo   Deja dos cuentas: ana@demo.local y dani@demo.local, clave demo1234
echo.
start "" http://localhost:!FRONTEND_PORT!
goto :fin

REM ==========================================================================
REM  Modo desarrollo - lo de siempre, para trabajar en el codigo
REM ==========================================================================
:arranque_dev
call :paso 5 "Infraestructura - modo desarrollo"

docker compose -f docker-compose.yml -f docker-compose.dev.yml up postgres redis -d
if errorlevel 1 (
    call :mal "No se pudo levantar Postgres/Redis."
    goto :fin_error
)
call :bien "Postgres y Redis arriba"

where node >nul 2>&1
if errorlevel 1 (
    call :mal "El modo desarrollo necesita Node.js 20 o superior."
    echo      Sin Node, usa el arranque normal:  arrancar.bat
    goto :fin_error
)

if not exist "Backend\node_modules" (
    call :aviso "Faltan las dependencias del backend. Instalando..."
    pushd Backend
    call npm install
    popd
)
if not exist "Frontend\node_modules" (
    call :aviso "Faltan las dependencias de la pantalla. Instalando..."
    pushd Frontend
    call npm install
    popd
)

call :paso 6 "Arrancando los tres procesos"

set DATABASE_URL=postgresql://e2e_user:e2e_pass@localhost:!POSTGRES_PORT!/e2e_platform
set CONTAINER_DATABASE_URL=postgresql://e2e_user:e2e_pass@e2e_postgres:5432/e2e_platform
set CONTAINER_REDIS_URL=redis://e2e_redis:6379

pushd Backend
call npx prisma migrate deploy >nul 2>&1
call npx prisma generate >nul 2>&1
popd

start "Easy Test - BACKEND"  cmd /k "cd /d "%~dp0Backend" && set DATABASE_URL=!DATABASE_URL!&& npm run start:dev"
start "Easy Test - WORKER"   cmd /k "cd /d "%~dp0Backend" && set DATABASE_URL=!DATABASE_URL!&& set CONTAINER_DATABASE_URL=!CONTAINER_DATABASE_URL!&& set CONTAINER_REDIS_URL=!CONTAINER_REDIS_URL!&& npm run start:worker:dev"
start "Easy Test - FRONTEND" cmd /k "cd /d "%~dp0Frontend" && npm run dev"

call :bien "backend, worker y pantalla arrancando en sus ventanas"
echo.
echo  %C_G%%C_B%+==============================================================+%C_NC%
echo  %C_G%%C_B%^|   LISTO.  Abre:  http://localhost:5173                       ^|%C_NC%
echo  %C_G%%C_B%+==============================================================+%C_NC%
echo.
echo   %C_D%Para parar: cierra las tres ventanas y ejecuta parar.bat%C_NC%
echo.
goto :fin

REM ==========================================================================
REM  Subrutinas de pintado. Van aparte porque una linea con color, variable
REM  retrasada y parentesis a la vez confunde al parser de cmd.
REM ==========================================================================
REM  Busca el primer puerto libre a partir de uno dado y lo deja en LIBRE.
REM  "Ocupado por un contenedor nuestro" no cuenta: ese es el caso de volver a
REM  arrancar algo que ya estaba arriba, y ahi hay que reutilizar el mismo puerto.
:buscar_libre
set "LIBRE=%~1"
set /a VUELTAS=0
:bl_loop
netstat -ano | findstr /R /C:"LISTENING" | findstr /C:":!LIBRE! " >nul 2>&1
if errorlevel 1 exit /b 0
docker ps --filter "name=e2e_" --format "{{.Ports}}" | findstr /C:":!LIBRE!-" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a VUELTAS+=1
if !VUELTAS! GEQ 20 (
    call :aviso "No encuentro puerto libre cerca del !LIBRE! para %~2. Sigo y que falle claro."
    exit /b 0
)
set /a LIBRE+=1
call :aviso "El puerto para %~2 esta cogido por otro programa. Pruebo el !LIBRE!."
goto :bl_loop

:paso
echo.
echo  %C_C%%C_B%[%~1/6]%C_NC% %C_B%%~2%C_NC%
exit /b 0

:bien
echo     %C_G%[OK]%C_NC% %~1
exit /b 0

:aviso
echo     %C_Y%[*]%C_NC% %~1
exit /b 0

:mal
echo.
echo     %C_R%%C_B%[X] %~1%C_NC%
exit /b 0

:estado
echo   %C_B%Que hay corriendo ahora:%C_NC%
docker compose ps --format "table {{.Service}}	{{.Status}}" 2>nul
exit /b 0

:fin_error
echo.
echo  %C_R%Arranque abortado. No se ha dejado nada a medias.%C_NC%
echo.
pause
exit /b 1

:fin
pause
exit /b 0
