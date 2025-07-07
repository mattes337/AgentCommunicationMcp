# VS Code MCP Setup Guide

This guide specifically addresses how to set up the Agent Communication MCP server with VS Code and other MCP clients that use single command strings.

## 🎯 Problem Solved

**Issue:** VS Code was showing:
- `"MCP error -32001: Request timed out"`
- `"MCP error -32000: Connection closed"`
- `"MCP error -32603: MCP not initialized"`

**Root Cause:**
1. VS Code uses a different command format than Claude Desktop
2. The MCP proxy wasn't handling the MCP protocol initialization sequence properly
3. JavaScript syntax error with optional chaining in older Node.js versions
4. VS Code sends `tools/list` and other discovery requests before initialization

## ✅ Solution

### 1. Start the Shared Server

```bash
# Start the shared MCP server
agent-mcp shared-server

# Or on a custom port
agent-mcp shared-server --port 9000
```

### 2. Configure VS Code

Use this **exact configuration** in your VS Code MCP settings:

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

**Key differences for VS Code:**
- Use `"command": "agent-mcp proxy"` (single string, not array)
- Set `MCP_SHARED_SERVER_URL` environment variable
- No `"args"` array needed

### 3. Custom Port Configuration

If your shared server runs on a different port:

```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp proxy",
      "env": {
        "NODE_ENV": "production",
        "MCP_SHARED_SERVER_URL": "ws://localhost:9000/mcp"
      }
    }
  }
}
```

## 🔧 Technical Details

### What Was Fixed

1. **MCP Protocol Initialization:**
   - Added proper `initialize` request handling
   - Added `initialized` notification support
   - Added initialization state tracking

2. **MCP Discovery Methods:**
   - Added `tools/list` support with agent communication tools
   - Added `resources/list` and `prompts/list` support
   - Added `tools/call` support for executing agent operations

3. **JavaScript Compatibility:**
   - Fixed optional chaining syntax error
   - Improved variable scoping in error handling

4. **VS Code Command Format:**
   - Support for single command string format
   - Environment variable configuration

### MCP Initialization Sequence

The proxy now properly handles:
1. `initialize` request → responds with capabilities
2. `initialized` notification → marks as ready
3. Regular requests → forwards to shared server

## 🧪 Testing

### Verify Setup

1. **Start shared server:**
   ```bash
   agent-mcp shared-server
   ```

2. **Test proxy manually:**
   ```bash
   # Set environment variable
   $env:MCP_SHARED_SERVER_URL="ws://localhost:8080/mcp"
   
   # Start proxy
   agent-mcp proxy
   
   # Test initialization (in proxy terminal)
   {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}
   ```

3. **Expected output:**
   ```json
   {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{},"resources":{},"prompts":{},"logging":{}},"serverInfo":{"name":"agent-communication-mcp-proxy","version":"1.0.0"}}}
   ```

## 🚨 Troubleshooting

### Common Issues

**1. Connection Refused**
```
Error: connect ECONNREFUSED
```
**Solution:** Make sure shared server is running:
```bash
agent-mcp shared-server
```

**2. Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::8080
```
**Solution:** Use different port:
```bash
agent-mcp shared-server --port 9000
```
Then update VS Code config: `"ws://localhost:9000/mcp"`

**3. Request Timeout**
```
MCP error -32001: Request timed out
```
**Solution:** Check configuration format:
- Use `"command": "agent-mcp proxy"` (not array)
- Set `MCP_SHARED_SERVER_URL` environment variable
- Restart VS Code after config changes

**4. Connection Closed**
```
MCP error -32000: Connection closed
```
**Solution:** This was caused by the JavaScript error, now fixed. Restart VS Code.

**5. MCP Not Initialized**
```
MCP error -32603: MCP not initialized
```
**Solution:** This was caused by VS Code sending requests before initialization. Now fixed with proper discovery method support.

### Debug Mode

Enable debug logging:

**Shared Server:**
```bash
agent-mcp shared-server --debug
```

**VS Code Config:**
```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp proxy",
      "env": {
        "MCP_LOG_LEVEL": "debug",
        "MCP_SHARED_SERVER_URL": "ws://localhost:8080/mcp"
      }
    }
  }
}
```

## 📋 Quick Checklist

- [ ] Shared server is running: `agent-mcp shared-server`
- [ ] VS Code config uses: `"command": "agent-mcp proxy"`
- [ ] Environment variable set: `"MCP_SHARED_SERVER_URL": "ws://localhost:8080/mcp"`
- [ ] Port matches between server and config
- [ ] VS Code restarted after config changes

## 🎉 Success Indicators

When working correctly, you should see:
- Shared server shows: `🔗 New client connected: [client-id]`
- VS Code MCP extension shows the server as connected
- No timeout or connection errors in VS Code

## 📚 Related Documentation

- [Shared Server Setup Guide](./SHARED_SERVER_SETUP.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [Troubleshooting Guide](./SHARED_SERVER_SETUP.md#troubleshooting)

Your VS Code agent should now connect successfully to the shared MCP server!
