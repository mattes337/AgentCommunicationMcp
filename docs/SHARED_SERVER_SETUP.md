# Shared MCP Server Setup Guide

This guide explains how to set up a shared MCP server that multiple Claude Desktop instances (or other MCP clients) can connect to, allowing them to share the same agent data instead of each spinning up their own isolated server.

## 🎯 Problem Solved

**Before:** Each Claude Desktop instance spawns its own MCP server process
- ❌ Isolated agent data per client
- ❌ No shared state between different Claude instances
- ❌ Duplicate server processes

**After:** Multiple clients connect to one shared server
- ✅ Shared agent data across all clients
- ✅ Single source of truth for agent state
- ✅ Efficient resource usage

## 🚀 Quick Setup

### 1. Start the Shared Server

```bash
# Start shared server on default port (8080)
agent-mcp shared-server

# Or specify a custom port
agent-mcp shared-server --port 9000

# With debug logging
agent-mcp shared-server --debug
```

The server will start and show:
```
🚀 Shared MCP Agent Communication Server started
📡 WebSocket server listening on ws://localhost:8080/mcp
🌐 HTTP status available at http://localhost:8080/status
```

### 2. Configure Claude Desktop to Use Proxy

Update your Claude Desktop configuration to use the proxy instead of direct server:

**Configuration File Location:**
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

**New Configuration:**
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

**For VS Code or other MCP clients:**
If you're using VS Code or another MCP client that expects a single command string, use:
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

### 3. Restart Claude Desktop

Completely quit and restart Claude Desktop for the changes to take effect.

## 🔧 Advanced Configuration

### Custom Server URL

If your shared server runs on a different port or host:

```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp",
      "args": ["proxy"],
      "env": {
        "NODE_ENV": "production",
        "MCP_SHARED_SERVER_URL": "ws://localhost:9000/mcp"
      }
    }
  }
}
```

### Multiple Environments

You can run different shared servers for different environments:

```json
{
  "mcpServers": {
    "agent-mcp-dev": {
      "command": "agent-mcp",
      "args": ["proxy"],
      "env": {
        "NODE_ENV": "development",
        "MCP_SHARED_SERVER_URL": "ws://localhost:8080/mcp"
      }
    },
    "agent-mcp-prod": {
      "command": "agent-mcp",
      "args": ["proxy"],
      "env": {
        "NODE_ENV": "production",
        "MCP_SHARED_SERVER_URL": "ws://production-server:8080/mcp"
      }
    }
  }
}
```

## 🧪 Testing the Setup

### 1. Test Server Status

Visit `http://localhost:8080/status` in your browser to see:
- Connected clients count
- Connected agents count
- Server uptime

### 2. Test Multiple Clients

Run the test script:
```bash
# Make sure shared server is running first
agent-mcp shared-server

# In another terminal, run the test
node examples/test-shared-server.js
```

### 3. Test with Multiple Claude Desktop Instances

1. Start the shared server
2. Open multiple Claude Desktop windows
3. In each window, register different agents
4. Verify that all agents are visible from any Claude instance

## 📊 Monitoring

### Server Status Endpoint

GET `http://localhost:8080/status` returns:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "port": 8080,
  "connectedClients": 2,
  "connectedAgents": 3,
  "uptime": 3600,
  "clients": [
    {
      "id": "client-uuid-1",
      "connectedAt": "2024-01-15T10:00:00.000Z",
      "lastActivity": "2024-01-15T10:29:45.000Z"
    }
  ]
}
```

### Server Logs

The shared server provides detailed logging:
```
🔗 New client connected: client-uuid-1
📝 Agent registered: frontend-agent
📋 Task created: task-uuid-1
🔌 Client disconnected: client-uuid-1
```

## 🔄 Migration from Standard Setup

### From Standard MCP Server

**Old Configuration:**
```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp",
      "args": ["server"]
    }
  }
}
```

**New Configuration:**
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

### Data Migration

Agent data is stored in the same format, so you can:
1. Stop the old server
2. Start the shared server with the same `--agents-path`
3. All existing agent data will be available

## 🛠️ Troubleshooting

### Common Issues

**1. Connection Refused**
```
Error: connect ECONNREFUSED 127.0.0.1:8080
```
**Solution:** Make sure the shared server is running:
```bash
agent-mcp shared-server
```

**2. Proxy Not Found**
```
Error: MCP proxy file not found
```
**Solution:** Reinstall the package:
```bash
npm link  # if installed from source
# or
npm install -g agent-communication-mcp
```

**3. Multiple Servers Running**
```
Error: EADDRINUSE: address already in use :::8080
```
**Solution:** Stop other servers or use a different port:
```bash
agent-mcp shared-server --port 9000
```

**4. VS Code MCP Timeout Error**
```
MCP error -32001: Request timed out
```
**Solution:** This happens when VS Code can't complete the MCP initialization. Ensure:
1. The shared server is running: `agent-mcp shared-server`
2. Use the correct configuration format for VS Code:
```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp proxy",
      "env": {
        "MCP_SHARED_SERVER_URL": "ws://localhost:8080/mcp"
      }
    }
  }
}
```
3. If using a custom port, update the URL: `"ws://localhost:9000/mcp"`

### Debug Mode

Enable debug logging for troubleshooting:

**Server:**
```bash
agent-mcp shared-server --debug
```

**Client (Claude Desktop config):**
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

## 🔒 Security Considerations

### Network Security

- The shared server only accepts WebSocket connections
- No authentication is implemented (suitable for local development)
- For production use, consider adding authentication

### Data Isolation

- All clients share the same agent data
- Consider using different shared servers for different projects
- Use environment-specific configurations

## 🚀 Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start shared server with PM2
pm2 start "agent-mcp shared-server" --name "mcp-shared-server"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 8080
CMD ["agent-mcp", "shared-server"]
```

### Environment Variables

```bash
export MCP_PORT=8080
export MCP_AGENTS_PATH=/data/agents
export MCP_REPORTS_PATH=/data/reports
export MCP_LOG_LEVEL=info
```

## 📚 API Reference

### WebSocket Connection

Connect to: `ws://localhost:8080/mcp`

### JSON-RPC Tools

All standard MCP tools are supported:

**MCP-Compliant Tool Names:**
- `agent-register`
- `task-create`
- `task-update`
- `task-request`
- `relationship-add`
- `agent-status`
- `context-update`
- `message-send`

**Legacy Method Names (still supported):**
- `agent/register`, `task/create`, `task/update`, `task/request`
- `relationship/add`, `agent/status`, `context/update`, `message/send`

### Example Client Code

```javascript
const SharedMCPClient = require('./src/mcp-client-shared.js');

const client = new SharedMCPClient('ws://localhost:8080/mcp');
await client.connect();

const result = await client.registerAgent('my-agent', {
  type: 'frontend',
  technologies: ['React', 'TypeScript']
});

console.log('Agent registered:', result);
```

This shared server architecture allows you to have a single MCP server instance that multiple Claude Desktop windows can connect to, sharing all agent data and state between them.
