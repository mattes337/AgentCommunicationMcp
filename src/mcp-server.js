/**
 * MCP Server for Agent Communication System
 * Implements a proper Model Context Protocol server that agents can connect to
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Simple MCP-like server implementation
class MCPMessage {
    constructor(id, method, params = {}) {
        this.jsonrpc = '2.0';
        this.id = id;
        this.method = method;
        this.params = params;
    }
}

class MCPResponse {
    constructor(id, result = null, error = null) {
        this.jsonrpc = '2.0';
        this.id = id;
        if (error) {
            this.error = error;
        } else {
            this.result = result;
        }
    }
}

class MCPAgentServer {
    constructor() {
        this.connectedAgents = new Map();
        this.agentTasks = new Map();
        this.agentRelationships = new Map();
        this.basePath = './agents';
        this.reportsPath = './reports';
        this.messageHandlers = new Map();

        this.setupHandlers();
    }

    /**
     * Setup MCP request handlers
     */
    setupHandlers() {
        // Handle agent registration
        this.messageHandlers.set('agent/register', async (params) => {
            const { agentId, capabilities = {} } = params;

            if (!agentId) {
                throw new Error('Agent ID is required');
            }

            await this.registerAgent(agentId, capabilities);

            return {
                success: true,
                agentId,
                message: `Agent ${agentId} registered successfully`
            };
        });

        // Handle task creation
        this.messageHandlers.set('task/create', async (params) => {
            const { agentId, task } = params;

            if (!agentId || !task) {
                throw new Error('Agent ID and task are required');
            }

            const taskId = await this.createTask(agentId, task);

            return {
                success: true,
                taskId,
                message: `Task created successfully`
            };
        });

        // Handle task requests between agents
        this.messageHandlers.set('task/request', async (params) => {
            const { fromAgentId, toAgentId, taskRequest } = params;

            if (!fromAgentId || !toAgentId || !taskRequest) {
                throw new Error('From agent ID, to agent ID, and task request are required');
            }

            const requestId = await this.createTaskRequest(fromAgentId, toAgentId, taskRequest);

            return {
                success: true,
                requestId,
                message: `Task request sent from ${fromAgentId} to ${toAgentId}`
            };
        });

        // Handle task status updates
        this.messageHandlers.set('task/update', async (params) => {
            const { agentId, taskId, status, deliverables = [] } = params;

            if (!agentId || !taskId || !status) {
                throw new Error('Agent ID, task ID, and status are required');
            }

            await this.updateTaskStatus(agentId, taskId, status, deliverables);

            return {
                success: true,
                message: `Task ${taskId} status updated to ${status}`
            };
        });

        // Handle relationship management
        this.messageHandlers.set('relationship/add', async (params) => {
            const { agentId, targetAgentId, relationshipType } = params;

            if (!agentId || !targetAgentId || !relationshipType) {
                throw new Error('Agent ID, target agent ID, and relationship type are required');
            }

            await this.addRelationship(agentId, targetAgentId, relationshipType);

            return {
                success: true,
                message: `Relationship added between ${agentId} and ${targetAgentId}`
            };
        });

        // Handle agent status queries
        this.messageHandlers.set('agent/status', async (params) => {
            const { agentId } = params;

            if (agentId) {
                const status = await this.getAgentStatus(agentId);
                return { success: true, status };
            } else {
                const systemStatus = await this.getSystemStatus();
                return { success: true, status: systemStatus };
            }
        });

        // Handle context updates
        this.messageHandlers.set('context/update', async (params) => {
            const { agentId, context } = params;

            if (!agentId || !context) {
                throw new Error('Agent ID and context are required');
            }

            await this.updateAgentContext(agentId, context);

            return {
                success: true,
                message: `Context updated for agent ${agentId}`
            };
        });

        // Handle message sending
        this.messageHandlers.set('message/send', async (params) => {
            const { fromAgentId, toAgentId, messageType, messageData } = params;

            if (!fromAgentId || !toAgentId || !messageType) {
                throw new Error('From agent ID, to agent ID, and message type are required');
            }

            const messageId = await this.sendMessage(fromAgentId, toAgentId, messageType, messageData);

            return {
                success: true,
                messageId,
                message: `Message sent from ${fromAgentId} to ${toAgentId}`
            };
        });
    }

    /**
     * Register a new agent
     */
    async registerAgent(agentId, capabilities) {
        console.log(`Registering agent: ${agentId}`);
        
        // Create agent directory structure
        const agentPath = path.join(this.basePath, agentId);
        await fs.mkdir(agentPath, { recursive: true });
        await fs.mkdir(path.join(agentPath, 'tasks'), { recursive: true });
        await fs.mkdir(path.join(agentPath, 'tasks', 'requests', 'incoming'), { recursive: true });
        await fs.mkdir(path.join(agentPath, 'tasks', 'requests', 'outgoing'), { recursive: true });

        // Initialize agent files
        const contextPath = path.join(agentPath, 'context.md');
        const defaultContext = `# Agent ${agentId} Context\n\n## Current State\n- Status: Connected to MCP Server\n- Registered: ${new Date().toISOString()}\n\n## Capabilities\n${JSON.stringify(capabilities, null, 2)}\n\n## Knowledge Base\n\n## Recent Activities\n\n## Notes\n`;
        await fs.writeFile(contextPath, defaultContext, 'utf8');

        // Initialize task files
        const taskFiles = [
            { path: path.join(agentPath, 'tasks', 'active.json'), content: [] },
            { path: path.join(agentPath, 'tasks', 'pending.json'), content: [] },
            { path: path.join(agentPath, 'tasks', 'completed.json'), content: [] }
        ];

        for (const file of taskFiles) {
            await fs.writeFile(file.path, JSON.stringify(file.content, null, 2), 'utf8');
        }

        // Initialize relationships
        const relationshipsPath = path.join(agentPath, 'relationships.json');
        const defaultRelationships = {
            consumers: [],
            producers: [],
            bidirectional: [],
            optional: []
        };
        await fs.writeFile(relationshipsPath, JSON.stringify(defaultRelationships, null, 2), 'utf8');

        // Initialize MCP config
        const mcpConfigPath = path.join(agentPath, 'mcp_config.json');
        const mcpConfig = {
            agentId,
            capabilities,
            connectedAt: new Date().toISOString(),
            messageTypes: [
                "TASK_REQUEST",
                "TASK_RESPONSE", 
                "STATUS_UPDATE",
                "DEPENDENCY_NOTIFICATION",
                "INTEGRATION_TEST",
                "COMPLETION_NOTIFICATION",
                "CONTEXT_SYNC"
            ]
        };
        await fs.writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf8');

        // Store agent connection info
        this.connectedAgents.set(agentId, {
            agentId,
            capabilities,
            connectedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        });

        console.log(`Agent ${agentId} registered successfully`);
    }

    /**
     * Create a task for an agent
     */
    async createTask(agentId, taskData) {
        const taskId = uuidv4();
        const task = {
            id: taskId,
            type: taskData.type || 'implementation',
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority || 'medium',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            agent_id: agentId,
            target_agent_id: taskData.target_agent_id || null,
            reference_task_id: taskData.reference_task_id || null,
            dependencies: taskData.dependencies || [],
            deliverables: taskData.deliverables || [],
            metadata: taskData.metadata || {}
        };

        // Add to pending tasks
        const agentPath = path.join(this.basePath, agentId);
        const pendingTasksPath = path.join(agentPath, 'tasks', 'pending.json');
        
        let pendingTasks = [];
        try {
            const content = await fs.readFile(pendingTasksPath, 'utf8');
            pendingTasks = JSON.parse(content);
        } catch (error) {
            // File might not exist yet
        }

        pendingTasks.push(task);
        await fs.writeFile(pendingTasksPath, JSON.stringify(pendingTasks, null, 2), 'utf8');

        console.log(`Task ${taskId} created for agent ${agentId}`);
        return taskId;
    }

    /**
     * Create a task request between agents
     */
    async createTaskRequest(fromAgentId, toAgentId, taskRequest) {
        const requestId = uuidv4();
        const message = {
            id: requestId,
            type: 'TASK_REQUEST',
            timestamp: new Date().toISOString(),
            from_agent_id: fromAgentId,
            to_agent_id: toAgentId,
            task_data: {
                ...taskRequest,
                id: uuidv4(),
                agent_id: fromAgentId,
                target_agent_id: toAgentId,
                created_at: new Date().toISOString()
            }
        };

        // Save to outgoing for sender
        const fromAgentPath = path.join(this.basePath, fromAgentId);
        const outgoingPath = path.join(fromAgentPath, 'tasks', 'requests', 'outgoing', `${requestId}.json`);
        await fs.writeFile(outgoingPath, JSON.stringify(message, null, 2), 'utf8');

        // Save to incoming for receiver
        const toAgentPath = path.join(this.basePath, toAgentId);
        const incomingPath = path.join(toAgentPath, 'tasks', 'requests', 'incoming', `${requestId}.json`);
        await fs.writeFile(incomingPath, JSON.stringify(message, null, 2), 'utf8');

        console.log(`Task request ${requestId} sent from ${fromAgentId} to ${toAgentId}`);
        return requestId;
    }

    /**
     * Update task status
     */
    async updateTaskStatus(agentId, taskId, status, deliverables) {
        const agentPath = path.join(this.basePath, agentId);
        const taskFiles = ['active.json', 'pending.json', 'completed.json'];
        
        let taskFound = false;
        let task = null;

        // Find the task in any of the task files
        for (const fileName of taskFiles) {
            const filePath = path.join(agentPath, 'tasks', fileName);
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const tasks = JSON.parse(content);
                const taskIndex = tasks.findIndex(t => t.id === taskId);
                
                if (taskIndex !== -1) {
                    task = tasks[taskIndex];
                    task.status = status;
                    task.updated_at = new Date().toISOString();
                    if (deliverables.length > 0) {
                        task.deliverables = [...(task.deliverables || []), ...deliverables];
                    }

                    // If status changed to completed, move to completed.json
                    if (status === 'completed' && fileName !== 'completed.json') {
                        tasks.splice(taskIndex, 1);
                        await fs.writeFile(filePath, JSON.stringify(tasks, null, 2), 'utf8');
                        
                        const completedPath = path.join(agentPath, 'tasks', 'completed.json');
                        let completedTasks = [];
                        try {
                            const completedContent = await fs.readFile(completedPath, 'utf8');
                            completedTasks = JSON.parse(completedContent);
                        } catch (error) {
                            // File might not exist
                        }
                        completedTasks.push(task);
                        await fs.writeFile(completedPath, JSON.stringify(completedTasks, null, 2), 'utf8');
                    } else {
                        await fs.writeFile(filePath, JSON.stringify(tasks, null, 2), 'utf8');
                    }
                    
                    taskFound = true;
                    break;
                }
            } catch (error) {
                // File might not exist
            }
        }

        if (!taskFound) {
            throw new Error(`Task ${taskId} not found for agent ${agentId}`);
        }

        console.log(`Task ${taskId} status updated to ${status} for agent ${agentId}`);
    }

    /**
     * Add relationship between agents
     */
    async addRelationship(agentId, targetAgentId, relationshipType) {
        const agentPath = path.join(this.basePath, agentId);
        const relationshipsPath = path.join(agentPath, 'relationships.json');
        
        let relationships = {
            consumers: [],
            producers: [],
            bidirectional: [],
            optional: []
        };

        try {
            const content = await fs.readFile(relationshipsPath, 'utf8');
            relationships = JSON.parse(content);
        } catch (error) {
            // File might not exist
        }

        const relationship = {
            agentId: targetAgentId,
            type: relationshipType,
            established: new Date().toISOString(),
            status: 'active'
        };

        // Add to appropriate relationship category
        if (relationshipType === 'consumer') {
            relationships.consumers.push(relationship);
        } else if (relationshipType === 'producer') {
            relationships.producers.push(relationship);
        } else if (relationshipType === 'bidirectional') {
            relationships.bidirectional.push(relationship);
        } else if (relationshipType === 'optional') {
            relationships.optional.push(relationship);
        }

        await fs.writeFile(relationshipsPath, JSON.stringify(relationships, null, 2), 'utf8');
        console.log(`Relationship ${relationshipType} added between ${agentId} and ${targetAgentId}`);
    }

    /**
     * Get agent status
     */
    async getAgentStatus(agentId) {
        const agentPath = path.join(this.basePath, agentId);
        
        // Get task counts
        const taskCounts = { active: 0, pending: 0, completed: 0 };
        const taskFiles = ['active.json', 'pending.json', 'completed.json'];
        
        for (let i = 0; i < taskFiles.length; i++) {
            const filePath = path.join(agentPath, 'tasks', taskFiles[i]);
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const tasks = JSON.parse(content);
                const key = ['active', 'pending', 'completed'][i];
                taskCounts[key] = tasks.length;
            } catch (error) {
                // File might not exist
            }
        }

        // Get relationship counts
        let relationshipCounts = { consumers: 0, producers: 0, bidirectional: 0, optional: 0 };
        try {
            const relationshipsPath = path.join(agentPath, 'relationships.json');
            const content = await fs.readFile(relationshipsPath, 'utf8');
            const relationships = JSON.parse(content);
            relationshipCounts = {
                consumers: relationships.consumers?.length || 0,
                producers: relationships.producers?.length || 0,
                bidirectional: relationships.bidirectional?.length || 0,
                optional: relationships.optional?.length || 0
            };
        } catch (error) {
            // File might not exist
        }

        return {
            agentId,
            connected: this.connectedAgents.has(agentId),
            tasks: taskCounts,
            relationships: relationshipCounts,
            lastActivity: this.connectedAgents.get(agentId)?.lastActivity || null
        };
    }

    /**
     * Get system status
     */
    async getSystemStatus() {
        const connectedAgents = Array.from(this.connectedAgents.keys());
        const agentStatuses = [];

        for (const agentId of connectedAgents) {
            const status = await this.getAgentStatus(agentId);
            agentStatuses.push(status);
        }

        return {
            timestamp: new Date().toISOString(),
            totalAgents: connectedAgents.length,
            connectedAgents: connectedAgents,
            agents: agentStatuses
        };
    }

    /**
     * Update agent context
     */
    async updateAgentContext(agentId, context) {
        const agentPath = path.join(this.basePath, agentId);
        const contextPath = path.join(agentPath, 'context.md');
        
        const timestamp = new Date().toISOString();
        const updatedContext = `${context}\n\n_Last updated: ${timestamp}_\n`;
        await fs.writeFile(contextPath, updatedContext, 'utf8');

        // Update last activity
        if (this.connectedAgents.has(agentId)) {
            const agentInfo = this.connectedAgents.get(agentId);
            agentInfo.lastActivity = timestamp;
            this.connectedAgents.set(agentId, agentInfo);
        }

        console.log(`Context updated for agent ${agentId}`);
    }

    /**
     * Send message between agents
     */
    async sendMessage(fromAgentId, toAgentId, messageType, messageData) {
        const messageId = uuidv4();
        const message = {
            id: messageId,
            type: messageType,
            timestamp: new Date().toISOString(),
            from_agent_id: fromAgentId,
            to_agent_id: toAgentId,
            data: messageData || {}
        };

        // Save to outgoing for sender
        const fromAgentPath = path.join(this.basePath, fromAgentId);
        const outgoingPath = path.join(fromAgentPath, 'tasks', 'requests', 'outgoing', `${messageId}.json`);
        await fs.writeFile(outgoingPath, JSON.stringify(message, null, 2), 'utf8');

        // Save to incoming for receiver
        const toAgentPath = path.join(this.basePath, toAgentId);
        const incomingPath = path.join(toAgentPath, 'tasks', 'requests', 'incoming', `${messageId}.json`);
        await fs.writeFile(incomingPath, JSON.stringify(message, null, 2), 'utf8');

        console.log(`Message ${messageId} (${messageType}) sent from ${fromAgentId} to ${toAgentId}`);
        return messageId;
    }

    /**
     * Handle incoming JSON-RPC message
     */
    async handleMessage(message) {
        try {
            const request = JSON.parse(message);

            if (!request.method || !this.messageHandlers.has(request.method)) {
                return new MCPResponse(request.id, null, {
                    code: -32601,
                    message: `Method not found: ${request.method}`
                });
            }

            const handler = this.messageHandlers.get(request.method);
            const result = await handler(request.params || {});

            return new MCPResponse(request.id, result);

        } catch (error) {
            return new MCPResponse(null, null, {
                code: -32603,
                message: error.message
            });
        }
    }

    /**
     * Start the MCP server
     */
    async start() {
        // Ensure directories exist
        await fs.mkdir(this.basePath, { recursive: true });
        await fs.mkdir(this.reportsPath, { recursive: true });

        console.log('🚀 MCP Agent Communication Server started');
        console.log('📡 Listening for agent connections via MCP protocol');
        console.log('📁 Agent data will be stored in:', path.resolve(this.basePath));
        console.log('📊 Reports will be stored in:', path.resolve(this.reportsPath));
        console.log('');
        console.log('Available MCP methods:');
        console.log('  - agent/register: Register a new agent');
        console.log('  - task/create: Create a new task');
        console.log('  - task/request: Send task request between agents');
        console.log('  - task/update: Update task status');
        console.log('  - relationship/add: Add agent relationship');
        console.log('  - agent/status: Get agent or system status');
        console.log('  - context/update: Update agent context');
        console.log('  - message/send: Send message between agents');
        console.log('');
        console.log('Server ready for connections...');

        // Handle stdin for JSON-RPC messages
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', async (data) => {
            const lines = data.trim().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    const response = await this.handleMessage(line);
                    process.stdout.write(JSON.stringify(response) + '\n');
                }
            }
        });

        // Keep the process alive
        process.stdin.resume();
    }
}

// Start the server
if (require.main === module) {
    const server = new MCPAgentServer();
    server.start().catch(error => {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    });
}

module.exports = MCPAgentServer;
