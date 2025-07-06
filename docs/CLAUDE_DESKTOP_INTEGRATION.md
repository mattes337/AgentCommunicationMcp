# Claude Desktop Integration Guide

This guide shows how to integrate the Agent Communication MCP server with Claude Desktop for seamless AI agent collaboration.

## Quick Setup

### 1. Install the MCP Server Globally

```bash
# Install from npm (when published)
npm install -g agent-communication-mcp

# OR install from source
git clone https://github.com/your-org/agent-communication-mcp.git
cd agent-communication-mcp
npm install
npm link
```

### 2. Configure Claude Desktop

Add this configuration to your Claude Desktop config file:

**Configuration File Location:**
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

**Configuration:**
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

Completely quit and restart Claude Desktop for the changes to take effect.

## Using with Claude Desktop

### Basic Agent Management

**Register a new agent:**
```
Please register a new agent with the following details:
- Agent ID: "frontend-dev"
- Type: "frontend"
- Technologies: React, TypeScript, Tailwind CSS
- Capabilities: UI development, component creation, responsive design
```

**Check agent status:**
```
What's the current status of the frontend-dev agent?
```

**Get system overview:**
```
Show me the status of all agents in the system.
```

### Task Management

**Create a task:**
```
Create a task for the frontend-dev agent:
- Title: "Build user authentication UI"
- Description: "Create login and registration forms with validation"
- Priority: high
- Deliverables: login-form.tsx, register-form.tsx, auth-styles.css
- Tags: authentication, forms, ui
```

**Update task status:**
```
Update the task with ID [task-id] to "in_progress" status and add these deliverables:
- login-form.tsx (completed)
- validation-utils.ts (in progress)
```

### Agent Relationships

**Establish relationships:**
```
Set up the following agent relationships:
- frontend-dev should be a consumer of api-dev (frontend depends on API)
- api-dev should be a consumer of database-dev (API depends on database)
```

**Send task requests between agents:**
```
Have the frontend-dev agent request the following from api-dev:
- Title: "Create user authentication API endpoints"
- Description: "Need REST endpoints for login, logout, and registration"
- Priority: high
- Required endpoints: /api/auth/login, /api/auth/logout, /api/auth/register
```

### Inter-Agent Communication

**Send status updates:**
```
Send a status update from frontend-dev to api-dev:
- Message: "Login form UI is 75% complete"
- Progress: 75
- Blockers: "Waiting for API specification document"
```

**Send dependency notifications:**
```
Have api-dev notify database-dev about a dependency:
- Message: "Need user schema finalized before API implementation"
- Urgency: high
- Deadline: end of week
```

## Advanced Usage Examples

### Multi-Agent Project Setup

```
Set up a complete web application project with these agents:

1. Frontend Agent (frontend-dev):
   - Technologies: React, TypeScript, Tailwind
   - Responsibilities: UI components, user experience

2. API Agent (api-dev):
   - Technologies: Node.js, Express, JWT
   - Responsibilities: REST API, authentication, business logic

3. Database Agent (db-dev):
   - Technologies: PostgreSQL, Prisma
   - Responsibilities: Schema design, migrations, queries

4. DevOps Agent (devops-dev):
   - Technologies: Docker, AWS, CI/CD
   - Responsibilities: Deployment, infrastructure, monitoring

Please establish the appropriate relationships and create initial tasks for each agent.
```

### Project Coordination

```
Coordinate the following development workflow:

1. Have db-dev create the user management database schema
2. Once complete, have api-dev create authentication endpoints
3. When API is ready, have frontend-dev build the login interface
4. Finally, have devops-dev set up deployment pipeline

Create the tasks and dependencies to ensure proper sequencing.
```

### Context Management

**Update agent context:**
```
Update the frontend-dev agent's context with the following information:

## Current Sprint Goals
- Complete user authentication flow
- Implement responsive design for mobile
- Add form validation and error handling

## Technical Decisions
- Using React Hook Form for form management
- Implementing custom validation with Zod
- Following atomic design principles

## Blockers
- Waiting for API specification from backend team
- Need design system tokens from design team
```

## Monitoring and Reporting

**Get detailed status:**
```
Generate a comprehensive project status report showing:
- All agents and their current tasks
- Task completion rates
- Inter-agent dependencies
- Any blocked tasks or issues
```

**Health check:**
```
Perform a health check on all agents and report any issues.
```

## Troubleshooting

### Common Issues

**1. MCP Server Not Found**
```
Error: Command "agent-mcp" not found
```
**Solution:** Ensure the package is installed globally:
```bash
npm install -g agent-communication-mcp
# OR
npm link  # if installed from source
```

**2. Claude Desktop Not Connecting**
```
MCP server not appearing in Claude Desktop
```
**Solutions:**
- Verify the config file path and JSON syntax
- Restart Claude Desktop completely
- Check that the `agent-mcp` command works in terminal
- Enable debug mode: `"args": ["server", "--debug"]`

**3. Permission Errors**
```
Error: EACCES: permission denied
```
**Solution:** Fix npm permissions:
```bash
# macOS/Linux
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or use a Node version manager like nvm
```

### Debug Mode

Enable debug logging in Claude Desktop config:

```json
{
  "mcpServers": {
    "agent-communication-mcp": {
      "command": "agent-mcp",
      "args": ["server", "--debug"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Verify Installation

Test the CLI directly:

```bash
# Check version
agent-mcp version

# Test server startup
agent-mcp server --debug
```

## Best Practices

### 1. Agent Naming
- Use descriptive, consistent naming: `frontend-dev`, `api-dev`, `db-dev`
- Include team or project prefixes: `webapp-frontend`, `mobile-api`

### 2. Task Organization
- Use clear, actionable task titles
- Include specific deliverables
- Set appropriate priorities
- Add relevant tags for filtering

### 3. Context Management
- Keep agent contexts updated with current state
- Document technical decisions and constraints
- Track dependencies and blockers

### 4. Communication Patterns
- Use status updates for progress reporting
- Send dependency notifications for blockers
- Request integration tests before major releases

## Example Workflows

### Daily Standup Automation
```
Generate a daily standup report showing:
- What each agent completed yesterday
- What each agent is working on today
- Any blockers or dependencies between agents
```

### Sprint Planning
```
Help plan the next sprint by:
1. Reviewing completed tasks from all agents
2. Identifying dependencies for upcoming features
3. Creating and prioritizing new tasks
4. Assigning tasks to appropriate agents
```

### Release Coordination
```
Coordinate a release by:
1. Checking all agents have completed their release tasks
2. Running integration tests between components
3. Updating documentation and deployment configs
4. Creating release notes from completed deliverables
```

This integration enables powerful multi-agent collaboration workflows directly within Claude Desktop, making it easy to manage complex software development projects with multiple AI agents working together.
