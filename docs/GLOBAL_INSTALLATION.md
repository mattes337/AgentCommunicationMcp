# Global Installation Guide

This guide explains how to install the Agent Communication MCP server globally and use it with Claude Desktop and other MCP clients.

## Prerequisites

- Node.js 16.0.0 or higher
- npm (comes with Node.js)
- Claude Desktop (for Claude integration)

## Global Installation

### Option 1: Install from npm (Recommended)

```bash
# Install globally from npm
npm install -g agent-communication-mcp

# Verify installation
agent-mcp --version
```

### Option 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/your-org/agent-communication-mcp.git
cd agent-communication-mcp

# Install dependencies
npm install

# Create global symlink
npm link

# Verify installation
agent-mcp --version
```

## Configuration for Claude Desktop

### 1. Locate Claude Desktop Configuration

The Claude Desktop configuration file is located at:

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### 2. Add MCP Server Configuration

Edit the Claude Desktop configuration file and add the Agent Communication MCP server:

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

### 3. Alternative Configuration (if installed from source)

If you installed from source, use the full path:

```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "node",
      "args": ["/path/to/agent-communication-mcp/src/mcp-server.js"],
      "cwd": "/path/to/agent-communication-mcp",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

After updating the configuration:
1. Quit Claude Desktop completely
2. Restart Claude Desktop
3. The MCP server should now be available

## Using with Claude Desktop

### 1. Verify Connection

In Claude Desktop, you should see the Agent Communication MCP server listed in the available tools. You can verify by asking Claude:

```
Can you see the agent-communication-mcp server? What tools are available?
```

### 2. Register an Agent

```
Please register a new agent with ID "my-frontend-agent" and capabilities for React development.
```

### 3. Create Tasks

```
Create a task for my-frontend-agent to build a login form with the following requirements:
- Title: "Build responsive login form"
- Priority: high
- Deliverables: login-form.tsx, validation.ts
```

### 4. Manage Agent Relationships

```
Add a producer relationship between my-frontend-agent and api-agent.
```

## Configuration Options

### Environment Variables

You can configure the MCP server behavior using environment variables:

```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp",
      "args": ["server"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "MCP_AGENTS_PATH": "/custom/path/to/agents",
        "MCP_REPORTS_PATH": "/custom/path/to/reports",
        "MCP_MAX_AGENTS": "100"
      }
    }
  }
}
```

### Available Environment Variables

- `NODE_ENV`: Environment mode (development/production)
- `MCP_LOG_LEVEL`: Logging level (debug/info/warn/error)
- `MCP_AGENTS_PATH`: Custom path for agent data storage
- `MCP_REPORTS_PATH`: Custom path for reports storage
- `MCP_MAX_AGENTS`: Maximum number of agents (default: 50)

## Using with Other MCP Clients

### Generic MCP Client Configuration

For other MCP clients that support the Model Context Protocol:

```json
{
  "name": "agent-communication-mcp",
  "command": "agent-mcp",
  "args": ["server"],
  "transport": "stdio"
}
```

### Python MCP Client Example

```python
from mcp import ClientSession, StdioServerParameters
import asyncio

async def main():
    server_params = StdioServerParameters(
        command="agent-mcp",
        args=["server"]
    )
    
    async with ClientSession(server_params) as session:
        # Register an agent
        result = await session.call_tool(
            "agent-register",
            {
                "agentId": "python-agent",
                "capabilities": {
                    "type": "backend",
                    "technologies": ["Python", "FastAPI"]
                }
            }
        )
        print(f"Agent registered: {result}")

asyncio.run(main())
```

## Troubleshooting

### Common Issues

1. **Command not found: agent-mcp**
   ```bash
   # Check if globally installed
   npm list -g agent-communication-mcp
   
   # Reinstall if needed
   npm install -g agent-communication-mcp
   ```

2. **Claude Desktop not connecting**
   - Verify the configuration file path
   - Check that the JSON syntax is valid
   - Restart Claude Desktop completely
   - Check Claude Desktop logs for errors

3. **Permission errors**
   ```bash
   # Fix npm permissions (macOS/Linux)
   sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
   ```

4. **Path issues on Windows**
   - Use forward slashes in paths
   - Escape backslashes if needed: `"C:\\path\\to\\agent-mcp"`

### Debug Mode

Enable debug logging to troubleshoot issues:

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

### Logs Location

Check logs for debugging:

**macOS/Linux:**
```bash
tail -f ~/.local/share/agent-mcp/logs/mcp-server.log
```

**Windows:**
```cmd
type %LOCALAPPDATA%\agent-mcp\logs\mcp-server.log
```

## Advanced Configuration

### Custom Data Directory

```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp",
      "args": ["server"],
      "env": {
        "MCP_AGENTS_PATH": "~/Documents/mcp-agents",
        "MCP_REPORTS_PATH": "~/Documents/mcp-reports"
      }
    }
  }
}
```

### Multiple Server Instances

You can run multiple instances with different configurations:

```json
{
  "mcpServers": {
    "agent-mcp-dev": {
      "command": "agent-mcp",
      "args": ["server"],
      "env": {
        "NODE_ENV": "development",
        "MCP_AGENTS_PATH": "~/dev/agents"
      }
    },
    "agent-mcp-prod": {
      "command": "agent-mcp",
      "args": ["server"],
      "env": {
        "NODE_ENV": "production",
        "MCP_AGENTS_PATH": "~/prod/agents"
      }
    }
  }
}
```

## Security Considerations

### File Permissions

Ensure proper file permissions for agent data:

```bash
# Set secure permissions for agent data
chmod 700 ~/Documents/mcp-agents
chmod 600 ~/Documents/mcp-agents/*
```

### Network Security

The MCP server uses stdio transport and doesn't open network ports, making it secure by default. However, ensure:

- Agent data directories have proper permissions
- Sensitive information in agent contexts is protected
- Regular backups of agent data

## Support

For issues and support:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the [GitHub issues](https://github.com/your-org/agent-communication-mcp/issues)
3. Create a new issue with:
   - Your operating system
   - Node.js version
   - Installation method
   - Error messages or logs
   - Configuration file content (redacted)
