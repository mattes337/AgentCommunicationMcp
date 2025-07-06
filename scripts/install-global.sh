#!/bin/bash

# Global Installation Script for Agent Communication MCP
# This script installs the MCP server globally and sets up Claude Desktop integration

set -e

echo "🚀 Installing Agent Communication MCP globally..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Install globally
echo "📦 Installing package globally..."
if [ -f "package.json" ]; then
    # Install from source
    echo "   Installing from source..."
    npm install
    npm link
else
    # Install from npm
    echo "   Installing from npm..."
    npm install -g agent-communication-mcp
fi

# Verify installation
echo "🔍 Verifying installation..."
if command -v agent-mcp &> /dev/null; then
    echo "✅ Installation successful!"
    agent-mcp version
else
    echo "❌ Installation failed. The 'agent-mcp' command is not available."
    exit 1
fi

# Detect operating system and show Claude Desktop config path
echo ""
echo "📋 Claude Desktop Configuration:"

case "$(uname -s)" in
    Darwin*)
        CONFIG_PATH="~/Library/Application Support/Claude/claude_desktop_config.json"
        echo "   Config file location (macOS): $CONFIG_PATH"
        ;;
    Linux*)
        CONFIG_PATH="~/.config/Claude/claude_desktop_config.json"
        echo "   Config file location (Linux): $CONFIG_PATH"
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*)
        CONFIG_PATH="%APPDATA%\\Claude\\claude_desktop_config.json"
        echo "   Config file location (Windows): $CONFIG_PATH"
        ;;
    *)
        echo "   Please check the Claude Desktop documentation for your OS"
        ;;
esac

echo ""
echo "📝 Add this configuration to your Claude Desktop config file:"
echo ""
cat << 'EOF'
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp",
      "args": ["server"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info"
      }
    }
  }
}
EOF

echo ""
echo "🔄 After updating the config file:"
echo "   1. Quit Claude Desktop completely"
echo "   2. Restart Claude Desktop"
echo "   3. The MCP server will be available for use"

echo ""
echo "🧪 Test the installation:"
echo "   agent-mcp server --debug    # Start server in debug mode"
echo "   agent-mcp version           # Show version info"

echo ""
echo "📚 Documentation:"
echo "   Global Installation: docs/GLOBAL_INSTALLATION.md"
echo "   Claude Integration:  docs/CLAUDE_DESKTOP_INTEGRATION.md"

echo ""
echo "✅ Installation complete! You can now use Agent Communication MCP with Claude Desktop."
