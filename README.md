# Agent Communication MCP

A Multi-Agent Communication System using Model Context Protocol (MCP) with file-based storage for autonomous AI agent collaboration.

## Overview

This system enables autonomous AI agents/LLMs to collaborate on software development projects while maintaining independence over their respective codebases. Each agent manages its own development context, memory, and task queue through file-based storage, while communicating and coordinating with other agents via MCP services.

## Features

- **File-Based Agent Memory**: Each agent maintains context and tasks as simple files for immediate productivity
- **MCP Service Integration**: Leverages Model Context Protocol for LLM agent communication
- **Autonomous LLM Operation**: AI agents work independently on their codebases with persistent context
- **Dependency Management**: Clear consumer-producer relationships between AI agents
- **Task Coordination**: File-based request-response mechanism for cross-agent collaboration
- **Rapid Deployment**: Simple file storage enables immediate system deployment and testing
- **Docker Support**: Containerized deployment with monitoring capabilities

## Quick Start

### Using npm

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the demo:**
   ```bash
   npm run demo
   ```

3. **Start the system:**
   ```bash
   npm start
   ```

### Using Docker

1. **Setup Docker environment:**
   ```bash
   npm run docker:setup
   ```

2. **Build and run with Docker:**
   ```bash
   npm run docker:run
   ```

3. **View logs:**
   ```bash
   npm run docker:logs
   ```

4. **Stop the system:**
   ```bash
   npm run docker:down
   ```

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
# Setup environment
npm run docker:setup

# Build images
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
