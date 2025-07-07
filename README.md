# Agent Communication MCP

A Multi-Agent Communication System using Model Context Protocol (MCP) with file-based storage for autonomous AI agent collaboration.

## Overview

This system enables autonomous AI agents/LLMs to collaborate on software development projects while maintaining independence over their respective codebases. Each agent manages its own development context, memory, and task queue through file-based storage, while communicating and coordinating with other agents via MCP services.

## Features

- **Real MCP Server**: Implements proper Model Context Protocol server that agents connect to
- **File-Based Agent Memory**: Each agent maintains context and tasks as simple files for immediate productivity
- **JSON-RPC Communication**: Standard JSON-RPC over stdio for MCP protocol compliance
- **Autonomous Agent Operation**: Real agents connect and communicate via MCP protocol
- **Dependency Management**: Clear consumer-producer relationships between agents
- **Task Coordination**: File-based request-response mechanism for cross-agent collaboration
- **HTTP API Wrapper**: REST API for easier testing and integration
- **Docker Support**: Containerized deployment with monitoring capabilities

## Quick Start

### Global Installation (Recommended)

1. **Install globally:**
   ```bash
   npm install -g agent-communication-mcp
   ```

2. **Start the MCP server:**
   ```bash
   agent-mcp server
   ```

3. **Configure Claude Desktop:**
   Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "agent-communication-mcp": {
         "command": "agent-mcp",
         "args": ["server"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

4. **Restart Claude Desktop** and start using AI agents!

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the MCP server:**
   ```bash
   npm start
   ```

3. **Test MCP connections:**
   ```bash
   npm run test:mcp
   ```

4. **Run the HTTP API (for easier testing):**
   ```bash
   npm run api
   ```

### Using Docker

#### Prerequisites
- **Docker Desktop**: Download and install from [docker.com](https://www.docker.com/products/docker-desktop)
- **Ensure Docker Desktop is running** before executing any Docker commands

#### Setup and Run

1. **Setup Docker environment:**
   ```bash
   npm run docker:setup
   ```

   > **Windows Users**: This command automatically detects your platform and uses PowerShell scripts for Windows compatibility.

2. **Build and run with Docker:**
   ```bash
   npm run docker:run
   ```

   > **Note**: If you get connection errors, ensure Docker Desktop is running and try again.

3. **View logs:**
   ```bash
   npm run docker:logs
   ```

4. **Stop the system:**
   ```bash
   npm run docker:down
   ```

#### Troubleshooting Docker on Windows

If you encounter issues:

- **"Docker is not running"**: Start Docker Desktop and wait for it to fully initialize
- **Permission errors**: Run your terminal as Administrator
- **Build failures**: Try `docker system prune` to clean up disk space
- **Port conflicts**: Ensure port 3000 is not in use by other applications

For detailed Windows setup instructions, see the [Windows Docker Setup Guide](docs/WINDOWS_DOCKER_SETUP.md).

## Architecture

### Agent Structure
Each AI agent consists of:
- **Agent ID**: Unique identifier for the LLM agent
- **Context Memory**: Markdown file containing agent's knowledge and state
- **Task Queue**: File-based ordered list of tasks with priorities and dependencies
- **Codebase**: The software project the AI agent is responsible for developing
- **Relationships**: Consumer/producer mappings with other agents
- **MCP Service**: Model Context Protocol service for communication

### File Structure
```
agents/
├── agent-id/
│   ├── context.md          # Agent's knowledge base and current state
│   ├── tasks/
│   │   ├── active.json     # Current active tasks
│   │   ├── pending.json    # Queued tasks
│   │   ├── completed.json  # Historical completed tasks
│   │   └── requests/       # Inter-agent communication
│   │       ├── incoming/   # Tasks received from other agents
│   │       └── outgoing/   # Tasks sent to other agents
│   ├── relationships.json  # Consumer/producer mappings
│   └── mcp_config.json    # MCP service configuration
```

## Usage Examples

### Creating Agents

```javascript
const { AgentCommunicationSystem } = require('./src/index');

const system = new AgentCommunicationSystem();
await system.start();

// Register agents
const frontendAgent = await system.registerAgent('frontend-agent');
const apiAgent = await system.registerAgent('api-agent');
const dbAgent = await system.registerAgent('database-agent');
```

### Establishing Relationships

```javascript
// Frontend consumes API services
await frontendAgent.relationshipManager.addProducer('api-agent');
await apiAgent.relationshipManager.addConsumer('frontend-agent');
```

### Creating Task Requests

```javascript
await system.createTaskRequest('frontend-agent', 'api-agent', {
    title: 'Create User Authentication API',
    description: 'Need REST endpoints for user login, logout, and registration',
    priority: 'high',
    deliverables: ['/api/auth/login', '/api/auth/logout', '/api/auth/register'],
    metadata: {
        estimated_effort: '8 hours',
        tags: ['authentication', 'api', 'security']
    }
});
```

### Managing Tasks

```javascript
// Get agent's task queue
const taskQueue = agent.taskQueue;

// Add a task
const task = new Task({
    title: 'Implement user registration',
    description: 'Create user registration endpoint with validation',
    priority: 'high',
    agent_id: 'api-agent'
});
await taskQueue.addTask(task);

// Activate a task
await taskQueue.activateTask(task.id);

// Complete a task
await taskQueue.completeTask(task.id, ['user-registration.js', 'validation-schema.js']);
```

## Claude Desktop Integration

### Setup with Claude Desktop

1. **Install globally:**
   ```bash
   npm install -g agent-communication-mcp
   ```

2. **Add to Claude Desktop config:**
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

3. **Use with Claude:**
   ```
   Please register a new agent with ID "frontend-dev" for React development.

   Create a task for frontend-dev to build a login form with validation.

   Show me the status of all agents in the system.
   ```

See [Claude Desktop Integration Guide](docs/CLAUDE_DESKTOP_INTEGRATION.md) for detailed instructions.

## MCP Communication

The system uses Model Context Protocol for inter-agent communication with these message types:

- **TASK_REQUEST**: Request for implementation or assistance
- **TASK_RESPONSE**: Response to a previous request
- **STATUS_UPDATE**: Progress updates on tasks
- **DEPENDENCY_NOTIFICATION**: Dependency changes
- **INTEGRATION_TEST**: Integration test requests
- **COMPLETION_NOTIFICATION**: Task completion notifications
- **CONTEXT_SYNC**: Context synchronization between agents

## Monitoring

The system includes comprehensive monitoring capabilities:

```javascript
const SystemMonitor = require('./src/monitoring/SystemMonitor');

const monitor = new SystemMonitor(system);
await monitor.start();

// Get system status
const status = await monitor.getSystemStatus();

// Generate health report
const report = await monitor.generateHealthReport();
```

## Docker Deployment

### Environment Variables

- `NODE_ENV`: Environment (development/production)
- `MCP_LOG_LEVEL`: Logging level (debug/info/warn/error)
- `MCP_POLL_INTERVAL`: Message polling interval in ms
- `MCP_MAX_AGENTS`: Maximum number of agents
- `MCP_MONITOR_INTERVAL`: Monitoring interval in ms

### Docker Commands

```bash
# Setup environment (cross-platform)
npm run docker:setup

# Build and run (cross-platform)
npm run docker:run

# Build images only
npm run docker:build

# Start services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down

# Clean up
npm run docker:clean
```

#### Windows-Specific Notes

- All Docker commands are **cross-platform compatible** and automatically detect Windows
- PowerShell scripts are used on Windows for better compatibility
- Ensure **Docker Desktop is running** before executing any commands
- If using WSL2, ensure proper integration is enabled in Docker Desktop settings

## Development

### Project Structure

```
src/
├── core/
│   ├── Agent.js              # Core agent class
│   ├── Task.js               # Task management
│   ├── TaskQueue.js          # Task queue operations
│   └── RelationshipManager.js # Agent relationships
├── communication/
│   └── CommunicationProtocol.js # MCP communication
├── monitoring/
│   ├── SystemMonitor.js      # System monitoring
│   └── monitor-daemon.js     # Docker monitoring daemon
└── index.js                  # Main entry point
```

### Running Tests

```bash
npm test
npm run test:watch
```

### Development Mode

```bash
npm run dev  # Runs with --watch flag for auto-restart
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions and support, please open an issue on the GitHub repository.
