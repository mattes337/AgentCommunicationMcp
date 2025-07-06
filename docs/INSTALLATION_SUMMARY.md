# Installation Summary

Complete guide for installing and using Agent Communication MCP with Claude Desktop and other MCP clients.

## 🚀 Quick Installation

### Option 1: Global Installation (Recommended)

```bash
# Install globally from npm (when published)
npm install -g agent-communication-mcp

# OR install from source
git clone https://github.com/your-org/agent-communication-mcp.git
cd agent-communication-mcp
npm run install:global
```

### Option 2: Local Development

```bash
git clone https://github.com/your-org/agent-communication-mcp.git
cd agent-communication-mcp
npm install
npm start
```

## 🔧 Claude Desktop Configuration

### 1. Locate Configuration File

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

### 2. Add MCP Server Configuration

```json
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
```

### 3. Restart Claude Desktop

Completely quit and restart Claude Desktop for changes to take effect.

## 🧪 Testing the Installation

### CLI Commands

```bash
# Check version
agent-mcp version

# Start server
agent-mcp server

# Start with debug logging
agent-mcp server --debug

# Show help
agent-mcp help
```

### Test with Claude Desktop

Once configured, try these commands in Claude Desktop:

```
Register a new agent with ID "test-agent" for frontend development.

Create a task for test-agent to build a login form.

Show me the status of all agents in the system.
```

## 📁 File Structure

After installation, the system creates:

```
~/Documents/agent-mcp/          # Default data directory
├── agents/                     # Agent data
│   ├── agent-id/
│   │   ├── context.md         # Agent knowledge base
│   │   ├── tasks/             # Task management
│   │   │   ├── active.json
│   │   │   ├── pending.json
│   │   │   └── completed.json
│   │   ├── relationships.json  # Agent relationships
│   │   └── mcp_config.json    # MCP configuration
└── reports/                    # System reports
```

## 🔧 Configuration Options

### Environment Variables

```bash
export NODE_ENV=production
export MCP_LOG_LEVEL=info
export MCP_AGENTS_PATH=/custom/path/agents
export MCP_REPORTS_PATH=/custom/path/reports
export MCP_MAX_AGENTS=100
```

### Claude Desktop Advanced Configuration

```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp",
      "args": ["server", "--debug"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "MCP_AGENTS_PATH": "/custom/agents/path",
        "MCP_MAX_AGENTS": "50"
      }
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**1. Command not found: agent-mcp**
```bash
# Check global installation
npm list -g agent-communication-mcp

# Reinstall if needed
npm install -g agent-communication-mcp
```

**2. Claude Desktop not connecting**
- Verify config file path and JSON syntax
- Restart Claude Desktop completely
- Check terminal: `agent-mcp version`
- Enable debug mode in config

**3. Permission errors**
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### Debug Mode

Enable detailed logging:

```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp",
      "args": ["server", "--debug"],
      "env": {
        "MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

## 📚 Documentation

- **[Global Installation Guide](GLOBAL_INSTALLATION.md)** - Detailed installation instructions
- **[Claude Desktop Integration](CLAUDE_DESKTOP_INTEGRATION.md)** - Complete Claude Desktop setup
- **[Main README](../README.md)** - Project overview and API documentation

## 🎯 Usage Examples

### Basic Agent Management

```
# Register agents
Register a frontend agent with React and TypeScript capabilities.
Register an API agent with Node.js and Express capabilities.

# Create relationships
Set up frontend-agent as a consumer of api-agent.

# Create tasks
Create a task for frontend-agent to build a user dashboard.
Have frontend-agent request authentication endpoints from api-agent.

# Monitor progress
Show me the status of all agents and their current tasks.
```

### Project Coordination

```
Set up a complete web application project with:
- Frontend agent (React/TypeScript)
- Backend agent (Node.js/Express) 
- Database agent (PostgreSQL)
- DevOps agent (Docker/AWS)

Create the initial tasks and relationships for a user authentication feature.
```

## ✅ Verification Checklist

- [ ] Node.js 16+ installed
- [ ] Package installed globally (`agent-mcp version` works)
- [ ] Claude Desktop config file updated
- [ ] Claude Desktop restarted
- [ ] Test agent registration works in Claude
- [ ] Agent data directory created
- [ ] MCP server responds to commands

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your Node.js version: `node --version`
3. Test CLI directly: `agent-mcp version`
4. Enable debug mode in Claude Desktop config
5. Check GitHub issues for similar problems
6. Create a new issue with:
   - Operating system and version
   - Node.js version
   - Installation method used
   - Error messages or logs
   - Claude Desktop config (redacted)

## 🎉 Success!

Once everything is working, you'll be able to:

- Register and manage AI agents through Claude Desktop
- Create and coordinate tasks between agents
- Monitor agent progress and relationships
- Build complex multi-agent workflows
- Maintain persistent agent memory and context

The system provides a powerful foundation for AI agent collaboration using the Model Context Protocol standard.
