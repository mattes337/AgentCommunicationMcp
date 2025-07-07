# Agent Communication MCP - Quick Reference

## 🚀 Commands

### Standard MCP Server (stdio mode)
```bash
agent-mcp server                    # Start MCP server (stdio mode)
agent-mcp server --debug            # Start with debug logging
```

### Shared MCP Server (WebSocket mode)
```bash
agent-mcp shared-server             # Start shared server on port 8080
agent-mcp shared-server --port 9000 # Start on custom port
agent-mcp shared-server --debug     # Start with debug logging
```

### MCP Proxy (for Claude Desktop)
```bash
agent-mcp proxy                     # Connect to shared server at localhost:8080
agent-mcp proxy --shared-url ws://localhost:9000/mcp  # Custom server URL
```

### Other Commands
```bash
agent-mcp version                   # Show version information
agent-mcp help                      # Show help message
```

## 📋 Claude Desktop Configuration

### Standard Setup (Each Claude instance has its own server)
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

### Shared Setup (Multiple Claude instances share one server)

**Claude Desktop:**
```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp",
      "args": ["proxy"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "MCP_SHARED_SERVER_URL": "ws://localhost:8080/mcp"
      }
    }
  }
}
```

**VS Code or other MCP clients:**
```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp proxy",
      "env": {
        "NODE_ENV": "production",
        "MCP_SHARED_SERVER_URL": "ws://localhost:8080/mcp"
      }
    }
  }
}
```

## 🔧 Environment Variables

```bash
NODE_ENV=production                 # Environment mode
MCP_LOG_LEVEL=info                  # Log level (debug/info/warn/error)
MCP_AGENTS_PATH=./agents            # Agents data directory
MCP_REPORTS_PATH=./reports          # Reports directory
MCP_MAX_AGENTS=50                   # Maximum number of agents
MCP_PORT=8080                       # Shared server port
MCP_SHARED_SERVER_URL=ws://localhost:8080/mcp  # Proxy target URL
```

## 📊 Monitoring

### Server Status
- **Shared Server:** `http://localhost:8080/status`
- **Shared Server UI:** `http://localhost:8080/`

### Log Locations
- **Windows:** `%LOCALAPPDATA%\agent-mcp\logs\`
- **macOS/Linux:** `~/.local/share/agent-mcp/logs/`

## 🧪 Testing

### Test Standard Server
```bash
agent-mcp server --debug
# In another terminal:
node examples/test-mcp-server.js
```

### Test Shared Server
```bash
agent-mcp shared-server --debug
# In another terminal:
node examples/test-shared-server.js
```

### Test Proxy
```bash
# Terminal 1: Start shared server
agent-mcp shared-server

# Terminal 2: Start proxy
agent-mcp proxy

# Terminal 3: Send test message
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"agent-status","arguments":{}}}' | agent-mcp proxy
```

## 🔄 Migration Guide

### From Standard to Shared Setup

1. **Start shared server:**
   ```bash
   agent-mcp shared-server
   ```

2. **Update Claude Desktop config:**
   ```json
   {
     "mcpServers": {
       "agent-communication-mcp": {
         "command": "agent-mcp",
         "args": ["proxy"]
       }
     }
   }
   ```

3. **Restart Claude Desktop**

## 🛠️ Troubleshooting

### Common Issues

**Command not found:**
```bash
npm link  # Reinstall global command
```

**Connection refused:**
```bash
agent-mcp shared-server  # Make sure shared server is running
```

**Port already in use:**
```bash
agent-mcp shared-server --port 9000  # Use different port
```

**Claude Desktop not connecting:**
- Check config file syntax
- Restart Claude Desktop completely
- Verify `agent-mcp proxy` works in terminal

**VS Code MCP timeout:**
- Ensure shared server is running: `agent-mcp shared-server`
- Use command format: `"command": "agent-mcp proxy"`
- Set environment variable: `"MCP_SHARED_SERVER_URL": "ws://localhost:8080/mcp"`

### Debug Mode

**Enable debug logging:**
```bash
agent-mcp shared-server --debug
agent-mcp proxy --debug
```

**Claude Desktop debug config:**
```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp",
      "args": ["proxy"],
      "env": {
        "MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

## 📚 MCP Tools

All tools work with both standard and shared servers:

**MCP-Compliant Tool Names:**
- `agent-register` - Register a new agent
- `task-create` - Create a new task
- `task-request` - Send task request between agents
- `task-update` - Update task status
- `relationship-add` - Add agent relationship
- `agent-status` - Get agent or system status
- `context-update` - Update agent context
- `message-send` - Send message between agents

**Legacy Method Names (still supported):**
- `agent/register`, `task/create`, `task/request`, `task/update`
- `relationship/add`, `agent/status`, `context/update`, `message/send`

## 🎯 Use Cases

### Standard Server
- Single Claude Desktop instance
- Local development
- Simple agent testing

### Shared Server
- Multiple Claude Desktop instances
- Team collaboration
- Persistent agent state
- Production deployments

## 📁 File Structure

```
agents/
├── agent-id/
│   ├── context.md
│   ├── relationships.json
│   ├── mcp_config.json
│   └── tasks/
│       ├── active.json
│       ├── pending.json
│       ├── completed.json
│       └── requests/
│           ├── incoming/
│           └── outgoing/
└── ...

reports/
├── system-status.json
└── ...
```

## 🔗 Configuration File Locations

### Claude Desktop
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Agent Data
- **Default:** `./agents` (relative to server start location)
- **Custom:** Set `MCP_AGENTS_PATH` environment variable
