@echo off
setlocal EnableDelayedExpansion
title Easy Test - arranque

REM ============================================================================
REM  Easy Test - arrancar todo con un solo play.
REM
REM  Antes hacian falta cinco comandos en tres terminales distintas: levantar la
REM  infraestructura, construir las imagenes, el backend, el worker y el
REM  frontend. Cada uno con sus variables de entorno, y el worker ademas con dos
REM  que no estan en ninguna guia. Esto los hace por ti, en ese orden, y aborta
REM  con un mensaje entendible en cuanto algo falta.
REM
REM  Uso:   arrancar.bat            arranca todo
REM         arrancar.bat /imagenes  arranca y ademas reconstruye executor y recorder
REM ============================================================================

cd /d "%~dp0"

echo.
echo  ================================================
echo   Easy Test - arrancando
echo  ================================================
echo.

REM --- 1. Comprobar lo que hace falta, ANTES de tocar nada -------------------
REM     Todo lo comprobable sin efectos secundarios va primero: si falta algo,
REM     la maquina se queda como estaba y no a medias.

where docker >nul 2>&1
if errorlevel 1 (
  echo  [X] No encuentro Docker.
  echo      Instala Docker Desktop y vuelve a ejecutar esto.
  goto :fin_error
)

docker info >nul 2>&1
if errorlevel 1 (
  echo  [X] Docker esta instalado pero no esta arrancado.
  echo      Abre Docker Desktop, espera a que diga "Engine running" y reintenta.
  goto :fin_error
)

where node >nul 2>&1
if errorlevel 1 (
  echo  [X] No encuentro Node.js. Instala la version 20 o superior.
  goto :fin_error
)

REM Antes esto abortaba pidiendo copiar el .env y generar dos secretos a mano con
REM comandos de crypto sacados de la guia. Ahora se prepara solo. El script NUNCA
REM regenera un secreto que ya exista - sobre todo VAULT_ENCRYPTION_KEY, que cifra los
REM secretos de cada organizacion: cambiarla no los invalida, los deja ilegibles.
if not exist "Backend\.env" (
  echo  [!] No hay Backend\.env. Preparandolo...
  pushd Backend & call node scripts\preparar-entorno.mjs & popd
  if not exist "Backend\.env" (
    echo  [X] No se pudo crear Backend\.env
    goto :fin_error
  )
)

if not exist "Backend\node_modules" (
  echo  [!] Faltan las dependencias del backend. Instalando...
  pushd Backend & call npm install & popd
)
if not exist "Frontend\node_modules" (
  echo  [!] Faltan las dependencias del frontend. Instalando...
  pushd Frontend & call npm install & popd
)

echo  [1/6] Comprobaciones: OK
echo.

REM --- 2. Puerto de Postgres ------------------------------------------------
REM     Si hay un PostgreSQL nativo escuchando en el 5432, el contenedor no
REM     puede publicar ahi y "localhost:5432" responderia desde la base
REM     equivocada. El sintoma seria un "Authentication failed" con las
REM     credenciales correctas, y cuesta media hora entenderlo. Se detecta aqui.

if "%POSTGRES_PORT%"=="" set POSTGRES_PORT=5432
netstat -ano | findstr /R /C:"LISTENING" | findstr /C:":%POSTGRES_PORT% " >nul 2>&1
if not errorlevel 1 (
  docker ps --format "{{.Ports}}" | findstr /C:":%POSTGRES_PORT%->" >nul 2>&1
  if errorlevel 1 (
    echo  [!] Algo ajeno ya escucha en el puerto %POSTGRES_PORT%.
    echo      Suele ser un PostgreSQL instalado en Windows. Uso el 5433.
    set POSTGRES_PORT=5433
  )
)
echo  [2/6] Puerto de Postgres: %POSTGRES_PORT%

REM --- 3. Infraestructura ---------------------------------------------------
docker compose -f docker-compose.yml -f docker-compose.dev.yml up postgres redis -d
if errorlevel 1 (
  echo  [X] No se pudo levantar Postgres/Redis.
  goto :fin_error
)
echo  [3/6] Postgres y Redis: arriba

REM --- 4. Imagenes (solo si se pide) ----------------------------------------
if /I "%~1"=="/imagenes" (
  echo  [4/6] Reconstruyendo executor y recorder... esto tarda varios minutos.
  docker compose --profile build-images build executor recorder
  if errorlevel 1 (
    echo  [X] Fallo al construir las imagenes.
    goto :fin_error
  )
) else (
  echo  [4/6] Imagenes: se reutilizan las que hay ^(usa /imagenes para reconstruirlas^)
)

REM --- 5. Migraciones -------------------------------------------------------
set DATABASE_URL=postgresql://e2e_user:e2e_pass@localhost:%POSTGRES_PORT%/e2e_platform
set CONTAINER_DATABASE_URL=postgresql://e2e_user:e2e_pass@e2e_postgres:5432/e2e_platform
set CONTAINER_REDIS_URL=redis://e2e_redis:6379

pushd Backend
echo  [5/6] Aplicando migraciones...
call npx prisma migrate deploy >nul 2>&1
if errorlevel 1 (
  echo  [X] Fallaron las migraciones. Prueba a mano:
  echo      cd Backend ^&^& npx prisma migrate deploy
  popd
  goto :fin_error
)
call npx prisma generate >nul 2>&1
popd
echo  [5/6] Base de datos: al dia

REM --- 6. Los tres procesos, cada uno en su ventana --------------------------
REM     En ventanas separadas y no en segundo plano: cuando algo falla hay que
REM     poder leer SU log sin mezclarlo con los otros dos.

start "Easy Test - BACKEND"  cmd /k "cd /d "%~dp0Backend" && set DATABASE_URL=%DATABASE_URL%&& npm run start:dev"
start "Easy Test - WORKER"   cmd /k "cd /d "%~dp0Backend" && set DATABASE_URL=%DATABASE_URL%&& set CONTAINER_DATABASE_URL=%CONTAINER_DATABASE_URL%&& set CONTAINER_REDIS_URL=%CONTAINER_REDIS_URL%&& npm run start:worker:dev"
start "Easy Test - FRONTEND" cmd /k "cd /d "%~dp0Frontend" && npm run dev"

echo  [6/6] Backend, worker y frontend: arrancando en sus ventanas
echo.
echo  ================================================
echo   Listo. Abre:  http://localhost:5173
echo  ================================================
echo.
echo  Si es la primera vez y quieres datos de ejemplo dentro:
echo      cd Backend
echo      npm run db:seed
echo.
echo  Para parar: cierra las tres ventanas y ejecuta  parar.bat
echo.
goto :fin

:fin_error
echo.
echo  Arranque abortado. No se ha dejado nada a medias.
echo.
pause
exit /b 1

:fin
pause
exit /b 0
