# OnceButler Rebuild Script
# Usage: .\rebuild.ps1 [-register]

param(
    [switch]$register  # Also register slash commands after rebuild
)

Write-Host "=== OnceButler Rebuild Script ===" -ForegroundColor Cyan
Write-Host ""

# Stop existing container
Write-Host "[1/4] Stopping existing container..." -ForegroundColor Yellow
docker-compose down 2>$null

# Build new image
Write-Host "[2/4] Building Docker image..." -ForegroundColor Yellow
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

# Start container
Write-Host "[3/4] Starting container..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start container!" -ForegroundColor Red
    exit 1
}

# Wait for bot to start
Write-Host "[4/4] Waiting for bot to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Register commands if requested
if ($register) {
    Write-Host ""
    Write-Host "Registering slash commands..." -ForegroundColor Yellow
    docker exec once-butler node dist/registerCommands.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to register commands!" -ForegroundColor Red
        exit 1
    }
}

# Show logs
Write-Host ""
Write-Host "=== Container Logs ===" -ForegroundColor Cyan
docker logs once-butler

Write-Host ""
Write-Host "=== Rebuild Complete ===" -ForegroundColor Green
Write-Host "Bot is running. Use 'docker logs once-butler -f' to follow logs."
