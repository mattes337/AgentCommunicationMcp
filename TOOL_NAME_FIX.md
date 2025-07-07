# MCP Tool Name Compliance Fix

## Issue Description

The MCP (Model Context Protocol) specification requires tool names to follow the pattern `^[a-zA-Z0-9_-]{1,64}$`, which means tool names can only contain:
- Alphanumeric characters (a-z, A-Z, 0-9)
- Underscores (_)
- Hyphens (-)
- Length between 1 and 64 characters

**No forward slashes (/) are allowed in tool names.**

The original implementation used tool names like `agent/register`, `task/create`, etc., which violated this specification and caused the error:

```
Invalid tool definition Tool name does not match the required pattern ^[a-zA-Z0-9_-]{1,64}$
```

## Solution

### New MCP-Compliant Tool Names

All tool names have been updated to use hyphens instead of slashes:

| Legacy Name (Invalid) | New MCP-Compliant Name | Description |
|----------------------|------------------------|-------------|
| `agent/register`     | `agent-register`       | Register a new agent |
| `agent/status`       | `agent-status`         | Get agent or system status |
| `task/create`        | `task-create`          | Create a new task |
| `task/request`       | `task-request`         | Send task request between agents |
| `task/update`        | `task-update`          | Update task status |
| `relationship/add`   | `relationship-add`     | Add agent relationship |
| `context/update`     | `context-update`       | Update agent context |
| `message/send`       | `message-send`         | Send message between agents |

### Backward Compatibility

The server maintains backward compatibility by supporting both naming conventions:
- **New MCP-compliant tool names** (recommended for new integrations)
- **Legacy method names** (for existing integrations)

Both naming conventions map to the same underlying functionality.

## Files Modified

### Core Server Files
- `src/mcp-server.js` - Added MCP-compliant tool name handlers
- `src/mcp-proxy.js` - Updated tool definitions and method mapping
- `src/mcp-server-shared.js` - Updated console output

### Documentation
- `docs/QUICK_REFERENCE.md` - Updated tool name references
- `docs/GLOBAL_INSTALLATION.md` - Updated examples
- `docs/SHARED_SERVER_SETUP.md` - Updated tool listings

### Examples and Tests
- `examples/test-mcp-server.js` - Updated to use new tool names
- `examples/test-tool-names.js` - New test to verify MCP compliance

## Testing

### Verification Test

Run the tool name compliance test:

```bash
node examples/test-tool-names.js
```

This test verifies:
- ✅ New tool names match the MCP pattern `^[a-zA-Z0-9_-]{1,64}$`
- ✅ Legacy names with slashes are correctly identified as invalid
- ✅ Server functionality works with new tool names

### Full Integration Test

Run the complete MCP server test:

```bash
node examples/test-mcp-server.js
```

This test verifies all functionality works with the new tool names.

## Usage Examples

### Claude Desktop Integration

Use the new MCP-compliant tool names in Claude Desktop:

```
Please use the agent-register tool to register a new agent with ID "frontend-dev".

Create a task using task-create for the frontend-dev agent.

Check the status using agent-status.
```

### Direct API Calls

```javascript
// MCP tools/call request with new compliant name
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "agent-register",
    "arguments": {
      "agentId": "my-agent",
      "capabilities": {
        "type": "frontend",
        "technologies": ["React", "TypeScript"]
      }
    }
  }
}
```

## Migration Guide

### For New Integrations
Use the new MCP-compliant tool names:
- `agent-register` instead of `agent/register`
- `task-create` instead of `task/create`
- etc.

### For Existing Integrations
No immediate changes required - legacy method names continue to work. However, we recommend migrating to the new tool names for better MCP compliance.

## Benefits

1. **MCP Specification Compliance** - Tool names now follow the official MCP specification
2. **Better Compatibility** - Works with all MCP-compliant clients and tools
3. **Future-Proof** - Ensures compatibility with future MCP implementations
4. **Backward Compatibility** - Existing integrations continue to work
5. **Clear Naming Convention** - Consistent use of hyphens for better readability

## References

- [MCP Specification](https://github.com/modelcontextprotocol/specification)
- [Tool Name Pattern Requirements](https://github.com/modelcontextprotocol/specification/blob/main/docs/specification/draft/server/tools.mdx)
- [AWS Nova Models Tool Naming Issue](https://repost.aws/questions/QUAye7aPrtTGuQ0an81n2WTQ/aws-nova-models-tools-naming-convention-issue)
