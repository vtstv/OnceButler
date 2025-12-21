@echo off
REM OnceButler Rebuild Script for Windows CMD
REM Usage: rebuild.bat [register]

echo === OnceButler Rebuild Script ===
echo.

echo [1/4] Stopping existing container...
docker-compose down 2>nul

echo [2/4] Building Docker image...
docker-compose build --no-cache
if errorlevel 1 (
    echo ERROR: Build failed!
    exit /b 1
)

echo [3/4] Starting container...
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start container!
    exit /b 1
)

echo [4/4] Waiting for bot to start...
timeout /t 3 /nobreak >nul

if "%1"=="register" (
    echo.
    echo Registering slash commands...
    docker exec once-butler node dist/registerCommands.js
    if errorlevel 1 (
        echo ERROR: Failed to register commands!
        exit /b 1
    )
)

echo.
echo === Container Logs ===
docker logs once-butler

echo.
echo === Rebuild Complete ===
echo Bot is running. Use 'docker logs once-butler -f' to follow logs.
