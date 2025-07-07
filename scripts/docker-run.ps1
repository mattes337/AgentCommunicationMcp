# Docker Run Script for Agent Communication MCP (Windows PowerShell)
# Convenience script to build and run the system

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "Building and running Agent Communication MCP in Docker..." -ForegroundColor Green

try {
    # Check if Docker is running
    Write-Host "Checking Docker availability..." -ForegroundColor Yellow

    try {
        docker version | Out-Null
    } catch {
        Write-Host "Error: Docker is not running or not installed" -ForegroundColor Red
        Write-Host "Please ensure Docker Desktop is installed and running" -ForegroundColor Red
        Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        exit 1
    }

    # Check if docker-compose is available
    Write-Host "Checking Docker Compose availability..." -ForegroundColor Yellow

    $dockerComposeCmd = $null

    # Try docker compose (newer syntax)
    try {
        docker compose version | Out-Null
        $dockerComposeCmd = "docker compose"
        Write-Host "Using 'docker compose' command" -ForegroundColor Gray
    } catch {
        # Try docker-compose (legacy syntax)
        try {
            docker-compose --version | Out-Null
            $dockerComposeCmd = "docker-compose"
            Write-Host "Using 'docker-compose' command" -ForegroundColor Gray
        } catch {
            Write-Host "Error: Neither 'docker compose' nor 'docker-compose' is available" -ForegroundColor Red
            Write-Host "Please install Docker Desktop or Docker Compose" -ForegroundColor Red
            exit 1
        }
    }

    # Run setup if docker-data doesn't exist
    if (!(Test-Path "docker-data")) {
        Write-Host "Running initial setup..." -ForegroundColor Yellow
        & ".\scripts\docker-setup.ps1"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Setup failed" -ForegroundColor Red
            exit 1
        }
    }

    # Build and start the services
    Write-Host "Building Docker images..." -ForegroundColor Yellow
    Invoke-Expression "$dockerComposeCmd build"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker build failed" -ForegroundColor Red
        Write-Host "Common issues:" -ForegroundColor Yellow
        Write-Host "- Ensure Docker Desktop is running" -ForegroundColor White
        Write-Host "- Check if you have sufficient disk space" -ForegroundColor White
        Write-Host "- Try running 'docker system prune' to clean up" -ForegroundColor White
        exit 1
    }

    Write-Host "Starting services..." -ForegroundColor Yellow
    Invoke-Expression "$dockerComposeCmd up -d"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to start services" -ForegroundColor Red
        exit 1
    }

    Write-Host "Waiting for services to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # Check service status
    Write-Host "Service status:" -ForegroundColor Yellow
    Invoke-Expression "$dockerComposeCmd ps"

    Write-Host ""
    Write-Host "Agent Communication MCP is now running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Useful commands:" -ForegroundColor Cyan
    Write-Host "  View logs:           $dockerComposeCmd logs -f" -ForegroundColor White
    Write-Host "  View agent logs:     $dockerComposeCmd logs -f agent-communication-mcp" -ForegroundColor White
    Write-Host "  View monitor logs:   $dockerComposeCmd logs -f mcp-monitor" -ForegroundColor White
    Write-Host "  Stop services:       $dockerComposeCmd down" -ForegroundColor White
    Write-Host "  Restart services:    $dockerComposeCmd restart" -ForegroundColor White
    Write-Host ""
    Write-Host "Data directories:" -ForegroundColor Cyan
    Write-Host "  Agents:   .\docker-data\agents\" -ForegroundColor White
    Write-Host "  Reports:  .\docker-data\reports\" -ForegroundColor White
    Write-Host "  Logs:     .\docker-data\logs\" -ForegroundColor White

} catch {
    Write-Host "Error during Docker run: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
