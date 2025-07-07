# Windows Docker Setup Guide

This guide provides step-by-step instructions for setting up and running the Agent Communication MCP system using Docker on Windows.

## Prerequisites

### 1. Install Docker Desktop

1. **Download Docker Desktop for Windows**:
   - Visit [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - Download the installer for Windows

2. **Install Docker Desktop**:
   - Run the installer as Administrator
   - Follow the installation wizard
   - Enable WSL 2 integration if prompted (recommended)

3. **Start Docker Desktop**:
   - Launch Docker Desktop from the Start menu
   - Wait for the Docker engine to start (green status indicator)
   - Ensure Docker is running before proceeding

### 2. Verify Installation

Open PowerShell or Command Prompt and verify Docker is working:

```powershell
docker --version
docker compose version
```

You should see version information for both commands.

## Quick Start

### 1. Setup the Environment

```bash
npm run docker:setup
```

This command will:
- Automatically detect Windows platform
- Create necessary directories (`docker-data/agents`, `docker-data/reports`, `docker-data/logs`)
- Generate a `.env` file with default configuration
- Use PowerShell scripts for Windows compatibility

### 2. Build and Run

```bash
npm run docker:run
```

This command will:
- Check Docker availability
- Build the Docker images
- Start all services in the background
- Display service status and useful commands

### 3. Monitor the System

```bash
# View all logs
npm run docker:logs

# View specific service logs
docker compose logs -f agent-communication-mcp
docker compose logs -f mcp-monitor
```

### 4. Stop the System

```bash
npm run docker:down
```

## Manual Docker Commands

If you prefer to use Docker commands directly:

```powershell
# Build images
docker compose build

# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down

# Clean up everything
docker compose down -v
docker system prune -f
```

## Troubleshooting

### Common Issues

#### "Docker is not running"
- **Solution**: Start Docker Desktop and wait for it to fully initialize
- Check the Docker Desktop system tray icon - it should be green

#### "Permission denied" or "Access denied"
- **Solution**: Run your terminal (PowerShell/Command Prompt) as Administrator
- Ensure your user account has Docker permissions

#### "Port 3000 is already in use"
- **Solution**: Stop any applications using port 3000
- Or modify the port in `docker-compose.yml`

#### Build failures due to disk space
- **Solution**: Clean up Docker resources:
  ```powershell
  docker system prune -f
  docker volume prune -f
  ```

#### WSL 2 integration issues
- **Solution**: In Docker Desktop settings:
  - Go to Settings > Resources > WSL Integration
  - Enable integration with your WSL distributions
  - Restart Docker Desktop

### PowerShell Execution Policy

If you encounter PowerShell execution policy errors:

```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy to allow local scripts (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Firewall and Antivirus

- Ensure Docker Desktop is allowed through Windows Firewall
- Add Docker directories to antivirus exclusions if needed
- Some corporate antivirus software may interfere with Docker

## File Locations

### Data Persistence
All agent data is stored in:
- `.\docker-data\agents\` - Agent configurations and state
- `.\docker-data\reports\` - System reports and monitoring data
- `.\docker-data\logs\` - Application logs

### Configuration
- `.env` - Environment variables
- `docker-compose.yml` - Docker service configuration

## Advanced Configuration

### Environment Variables

Edit the `.env` file to customize:

```env
NODE_ENV=production
MCP_LOG_LEVEL=info
MCP_POLL_INTERVAL=1000
MCP_MAX_AGENTS=50
MCP_MONITOR_INTERVAL=5000
```

### Custom Ports

To change the default port (3000), edit `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Change 8080 to your preferred port
```

## Testing the Setup

Run the cross-platform compatibility test:

```bash
npm run test:docker
```

This verifies that:
- Platform detection works correctly
- All required scripts are available
- File paths are resolved properly

## Support

If you encounter issues:

1. Check the [main README.md](../README.md) for general troubleshooting
2. Review Docker Desktop logs in the application
3. Ensure all prerequisites are met
4. Try the manual Docker commands to isolate issues

For additional help, please open an issue on the GitHub repository with:
- Your Windows version
- Docker Desktop version
- Complete error messages
- Steps to reproduce the issue
