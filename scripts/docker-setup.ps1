# Docker Setup Script for Agent Communication MCP (Windows PowerShell)
# This script sets up the Docker environment and creates necessary directories

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "Setting up Docker environment for Agent Communication MCP..." -ForegroundColor Green

try {
    # Create docker data directories
    Write-Host "Creating Docker data directories..." -ForegroundColor Yellow
    
    $directories = @(
        "docker-data",
        "docker-data\agents",
        "docker-data\reports", 
        "docker-data\logs"
    )
    
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "Created directory: $dir" -ForegroundColor Gray
        } else {
            Write-Host "Directory already exists: $dir" -ForegroundColor Gray
        }
    }

    # Create .env file if it doesn't exist
    if (!(Test-Path ".env")) {
        Write-Host "Creating .env file..." -ForegroundColor Yellow
        
        $envContent = @"
# Agent Communication MCP Environment Variables
NODE_ENV=production
MCP_LOG_LEVEL=info
MCP_POLL_INTERVAL=1000
MCP_MAX_AGENTS=50
MCP_MONITOR_INTERVAL=5000
"@
        
        $envContent | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "Created .env file" -ForegroundColor Gray
    } else {
        Write-Host ".env file already exists" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Docker environment setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Build the Docker image: docker-compose build" -ForegroundColor White
    Write-Host "2. Start the system: docker-compose up -d" -ForegroundColor White
    Write-Host "3. View logs: docker-compose logs -f" -ForegroundColor White
    Write-Host "4. Stop the system: docker-compose down" -ForegroundColor White
    Write-Host ""
    Write-Host "Data will be persisted in .\docker-data\" -ForegroundColor Cyan

} catch {
    Write-Host "Error during setup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
