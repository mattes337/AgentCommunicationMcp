#!/bin/bash

# Docker Setup Script for Agent Communication MCP
# This script sets up the Docker environment and creates necessary directories

set -e

echo "Setting up Docker environment for Agent Communication MCP..."

# Create docker data directories
echo "Creating Docker data directories..."
mkdir -p docker-data/agents
mkdir -p docker-data/reports
mkdir -p docker-data/logs

# Set proper permissions
echo "Setting permissions..."
chmod 755 docker-data
chmod 755 docker-data/agents
chmod 755 docker-data/reports
chmod 755 docker-data/logs

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Agent Communication MCP Environment Variables
NODE_ENV=production
MCP_LOG_LEVEL=info
MCP_POLL_INTERVAL=1000
MCP_MAX_AGENTS=50
MCP_MONITOR_INTERVAL=5000
EOF
fi

echo "Docker environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Build the Docker image: docker-compose build"
echo "2. Start the system: docker-compose up -d"
echo "3. View logs: docker-compose logs -f"
echo "4. Stop the system: docker-compose down"
echo ""
echo "Data will be persisted in ./docker-data/"
