#!/bin/bash

# Docker Run Script for Agent Communication MCP
# Convenience script to build and run the system

set -e

echo "Building and running Agent Communication MCP in Docker..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed or not in PATH"
    exit 1
fi

# Run setup if docker-data doesn't exist
if [ ! -d "docker-data" ]; then
    echo "Running initial setup..."
    ./scripts/docker-setup.sh
fi

# Build and start the services
echo "Building Docker images..."
docker-compose build

echo "Starting services..."
docker-compose up -d

echo "Waiting for services to start..."
sleep 5

# Check service status
echo "Service status:"
docker-compose ps

echo ""
echo "Agent Communication MCP is now running!"
echo ""
echo "Useful commands:"
echo "  View logs:           docker-compose logs -f"
echo "  View agent logs:     docker-compose logs -f agent-communication-mcp"
echo "  View monitor logs:   docker-compose logs -f mcp-monitor"
echo "  Stop services:       docker-compose down"
echo "  Restart services:    docker-compose restart"
echo ""
echo "Data directories:"
echo "  Agents:   ./docker-data/agents/"
echo "  Reports:  ./docker-data/reports/"
echo "  Logs:     ./docker-data/logs/"
