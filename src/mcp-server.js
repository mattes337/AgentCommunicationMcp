/**
 * MCP Server for Agent Communication System
 * Implements a proper Model Context Protocol server that agents can connect to
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load package.json to get project name and version
const packageJson = require('../package.json');

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
    constructor(basePath = './agents', reportsPath = './reports') {
        this.connectedAgents = new Map();
        this.agentTasks = new Map();
        this.agentRelationships = new Map();
        this.basePath = basePath;
        this.reportsPath = reportsPath;
        this.messageHandlers = new Map();

        this.setupHandlers();
    }

    /**
     * Setup MCP request handlers
     */
    setupHandlers() {
        // Handle MCP initialization
        this.messageHandlers.set('initialize', async (params) => {
            return {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {},
                    resources: {},
                    prompts: {},
                    logging: {}
                },
                serverInfo: {
                    name: packageJson.name,
                    version: packageJson.version
                }
            };
        });

        // Handle MCP initialized notification
        this.messageHandlers.set('initialized', async (params) => {
            // No response needed for notification
            return null;
        });

        // Handle agent registration
        this.messageHandlers.set('agent/register', async (params) => {
            const { agentId, capabilities = {}, forceUpdate = false } = params;

            if (!agentId) {
                throw new Error('Agent ID is required');
            }

            const result = await this.registerAgent(agentId, capabilities, forceUpdate);

            return {
                success: true,
                agentId,
                message: result.message,
                wasUpdated: result.wasUpdated
            };
        });

        // Handle task creation
        this.messageHandlers.set('task/create', async (params) => {
            const { agentId, task, createdBy } = params;

            if (!agentId || !task) {
                throw new Error('Agent ID and task are required');
            }

            const taskId = await this.createTask(agentId, task, createdBy);

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

            const task = await this.updateTaskStatus(agentId, taskId, status, deliverables);

            const response = {
                success: true,
                message: `Task ${taskId} status updated to ${status}`,
                task: task
            };

            // If task is completed and was created by a different agent, provide incorporation guidance
            if (status === 'completed' && task.created_by && task.created_by !== agentId) {
                response.incorporation_needed = true;
                response.incorporation_guidance = {
                    message: `This task was created by ${task.created_by}. Consider creating an incorporation task for them to review and integrate your changes.`,
                    creator_agent: task.created_by,
                    completed_by: agentId,
                    original_task: {
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        priority: task.priority,
                        deliverables: task.deliverables || [],
                        metadata: task.metadata || {}
                    },
                    suggested_incorporation_task: {
                        title: `Incorporate changes from: ${task.title}`,
                        description: `Task "${task.title}" has been completed by ${agentId}. Please review and incorporate the following deliverables:\n\n${(task.deliverables || []).map(d => `- ${d}`).join('\n')}\n\nOriginal task description: ${task.description}`,
                        priority: task.priority,
                        agent_id: task.created_by,
                        created_by: agentId,
                        target_agent_id: task.created_by,
                        reference_task_id: task.id,
                        deliverables: task.deliverables || [],
                        metadata: {
                            ...(task.metadata || {}),
                            incorporation_task: true,
                            original_task_id: task.id,
                            completed_by: agentId,
                            tags: [...((task.metadata && task.metadata.tags) || []), 'incorporation', 'review']
                        }
                    },
                    implementation_steps: [
                        `1. Create a new task for agent "${task.created_by}" using the suggested_incorporation_task data`,
                        `2. Use the task/create method with agentId="${task.created_by}"`,
                        `3. The incorporation task will help ${task.created_by} review and integrate the deliverables: ${(task.deliverables || []).join(', ')}`
                    ]
                };
            }

            return response;
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

        // Handle task retrieval
        this.messageHandlers.set('task/get', async (params) => {
            const { agentId, state } = params;

            if (!agentId) {
                throw new Error('Agent ID is required');
            }

            const tasks = await this.getTasks(agentId, state);

            return {
                success: true,
                tasks,
                message: `Tasks retrieved for agent ${agentId}${state ? ` with state ${state}` : ''}`
            };
        });

        // Handle tools/list request
        this.messageHandlers.set('tools/list', async () => {
            return {
                tools: [
                    {
                        name: 'agent-register',
                        description: 'Register a new agent',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentId: { type: 'string' },
                                capabilities: { type: 'object' },
                                forceUpdate: { type: 'boolean' }
                            },
                            required: ['agentId']
                        }
                    },
                    {
                        name: 'agent-status',
                        description: 'Get agent or system status',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentId: { type: 'string' }
                            }
                        }
                    },
                    {
                        name: 'task-create',
                        description: 'Create a new task',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentId: { type: 'string' },
                                task: { type: 'object' },
                                createdBy: { type: 'string' }
                            },
                            required: ['agentId', 'task']
                        }
                    },
                    {
                        name: 'task-get',
                        description: 'Get tasks for an agent, optionally filtered by state',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentId: { type: 'string' },
                                state: {
                                    type: 'string',
                                    enum: ['pending', 'active', 'completed'],
                                    description: 'Filter tasks by state (optional)'
                                }
                            },
                            required: ['agentId']
                        }
                    },
                    {
                        name: 'task-request',
                        description: 'Send task request between agents',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                fromAgentId: { type: 'string' },
                                toAgentId: { type: 'string' },
                                taskRequest: { type: 'object' }
                            },
                            required: ['fromAgentId', 'toAgentId', 'taskRequest']
                        }
                    },
                    {
                        name: 'task-update',
                        description: 'Update task status',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentId: { type: 'string' },
                                taskId: { type: 'string' },
                                status: { type: 'string' },
                                deliverables: { type: 'array', items: { type: 'object' } }
                            },
                            required: ['agentId', 'taskId', 'status']
                        }
                    },
                    {
                        name: 'relationship-add',
                        description: 'Add agent relationship',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentId: { type: 'string' },
                                targetAgentId: { type: 'string' },
                                relationshipType: { type: 'string' }
                            },
                            required: ['agentId', 'targetAgentId', 'relationshipType']
                        }
                    },
                    {
                        name: 'context-update',
                        description: 'Update agent context',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentId: { type: 'string' },
                                context: { type: 'string' }
                            },
                            required: ['agentId', 'context']
                        }
                    },
                    {
                        name: 'message-send',
                        description: 'Send message between agents',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                fromAgentId: { type: 'string' },
                                toAgentId: { type: 'string' },
                                messageType: { type: 'string' },
                                messageData: { type: 'object' }
                            },
                            required: ['fromAgentId', 'toAgentId', 'messageType']
                        }
                    }
                ]
            };
        });

        // Add MCP-compliant tool name handlers (without slashes)
        // These map to the existing handlers for backward compatibility
        this.messageHandlers.set('agent-register', this.messageHandlers.get('agent/register'));
        this.messageHandlers.set('agent-status', this.messageHandlers.get('agent/status'));
        this.messageHandlers.set('task-create', this.messageHandlers.get('task/create'));
        this.messageHandlers.set('task-get', this.messageHandlers.get('task/get'));
        this.messageHandlers.set('task-request', this.messageHandlers.get('task/request'));
        this.messageHandlers.set('task-update', this.messageHandlers.get('task/update'));
        this.messageHandlers.set('relationship-add', this.messageHandlers.get('relationship/add'));
        this.messageHandlers.set('context-update', this.messageHandlers.get('context/update'));
        this.messageHandlers.set('message-send', this.messageHandlers.get('message/send'));
    }

    /**
     * Register a new agent or update existing one
     */
    async registerAgent(agentId, capabilities, forceUpdate = false) {
        const isExisting = this.connectedAgents.has(agentId);

        if (isExisting && !forceUpdate) {
            console.log(`Agent ${agentId} already registered, skipping re-registration`);
            return {
                message: `Agent ${agentId} already registered`,
                wasUpdated: false
            };
        }

        console.log(`${isExisting ? 'Updating' : 'Registering'} agent: ${agentId}`);

        // Create agent directory structure (safe to call even if exists)
        const agentPath = path.join(this.basePath, agentId);
        await fs.mkdir(agentPath, { recursive: true });
        await fs.mkdir(path.join(agentPath, 'tasks'), { recursive: true });
        await fs.mkdir(path.join(agentPath, 'tasks', 'requests', 'incoming'), { recursive: true });
        await fs.mkdir(path.join(agentPath, 'tasks', 'requests', 'outgoing'), { recursive: true });

        // Initialize agent files (only if they don't exist)
        const contextPath = path.join(agentPath, 'context.md');
        try {
            await fs.access(contextPath);
            // File exists, skip initialization
        } catch {
            // File doesn't exist, create it
            const defaultContext = `# Agent ${agentId} Context\n\n## Current State\n- Status: Connected to MCP Server\n- Registered: ${new Date().toISOString()}\n\n## Capabilities\n${JSON.stringify(capabilities, null, 2)}\n\n## Knowledge Base\n\n## Recent Activities\n\n## Notes\n`;
            await fs.writeFile(contextPath, defaultContext, 'utf8');
        }

        // Initialize task files (only if they don't exist)
        const taskFiles = [
            { path: path.join(agentPath, 'tasks', 'active.json'), content: [] },
            { path: path.join(agentPath, 'tasks', 'pending.json'), content: [] },
            { path: path.join(agentPath, 'tasks', 'completed.json'), content: [] }
        ];

        for (const file of taskFiles) {
            try {
                await fs.access(file.path);
                // File exists, skip initialization
            } catch {
                // File doesn't exist, create it
                await fs.writeFile(file.path, JSON.stringify(file.content, null, 2), 'utf8');
            }
        }

        // Initialize relationships (only if file doesn't exist)
        const relationshipsPath = path.join(agentPath, 'relationships.json');
        try {
            await fs.access(relationshipsPath);
            // File exists, skip initialization
        } catch {
            // File doesn't exist, create it
            const defaultRelationships = {
                consumers: [],
                producers: [],
                bidirectional: [],
                optional: []
            };
            await fs.writeFile(relationshipsPath, JSON.stringify(defaultRelationships, null, 2), 'utf8');
        }

        // Update MCP config
        const mcpConfigPath = path.join(agentPath, 'mcp_config.json');
        let mcpConfig;

        if (isExisting) {
            // For existing agents, read current config and update capabilities
            try {
                const existingConfig = await fs.readFile(mcpConfigPath, 'utf8');
                mcpConfig = JSON.parse(existingConfig);
                mcpConfig.capabilities = capabilities;
                mcpConfig.lastUpdated = new Date().toISOString();
            } catch {
                // If config file is corrupted or missing, create new one
                mcpConfig = {
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
            }
        } else {
            // For new agents, create fresh config
            mcpConfig = {
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
        }

        await fs.writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf8');

        // Update agent connection info
        const existingAgent = this.connectedAgents.get(agentId);
        this.connectedAgents.set(agentId, {
            agentId,
            capabilities,
            connectedAt: existingAgent ? existingAgent.connectedAt : new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            registrationCount: existingAgent ? (existingAgent.registrationCount || 1) + 1 : 1
        });

        console.log(`Agent ${agentId} ${isExisting ? 'updated' : 'registered'} successfully`);

        return {
            message: `Agent ${agentId} ${isExisting ? 'updated' : 'registered'} successfully`,
            wasUpdated: isExisting
        };
    }

    /**
     * Create a task for an agent
     */
    async createTask(agentId, taskData, createdBy = null) {
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
            created_by: createdBy || taskData.created_by || agentId,
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
                agent_id: toAgentId,
                created_by: fromAgentId,
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
        return task; // Return the task for use in the handler
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
     * Get tasks for an agent, optionally filtered by state
     */
    async getTasks(agentId, state = null) {
        const agentPath = path.join(this.basePath, agentId);
        const validStates = ['pending', 'active', 'completed'];

        if (state && !validStates.includes(state)) {
            throw new Error(`Invalid state: ${state}. Must be one of: ${validStates.join(', ')}`);
        }

        const results = {};
        const statesToLoad = state ? [state] : validStates;

        for (const stateToLoad of statesToLoad) {
            const fileName = stateToLoad === 'active' ? 'active.json' :
                           stateToLoad === 'pending' ? 'pending.json' : 'completed.json';
            const filePath = path.join(agentPath, 'tasks', fileName);

            try {
                const content = await fs.readFile(filePath, 'utf8');
                const tasks = JSON.parse(content);
                results[stateToLoad] = tasks;
            } catch (error) {
                // File might not exist, return empty array
                results[stateToLoad] = [];
            }
        }

        // If a specific state was requested, return just that array
        if (state) {
            return results[state];
        }

        // Otherwise return all states
        return results;
    }

    /**
     * Get agent status
     */
    async getAgentStatus(agentId) {
        const agentPath = path.join(this.basePath, agentId);

        // Get task counts and pending tasks
        const taskCounts = { active: 0, pending: 0, completed: 0 };
        const taskFiles = ['active.json', 'pending.json', 'completed.json'];
        let pendingTasks = [];

        for (let i = 0; i < taskFiles.length; i++) {
            const filePath = path.join(agentPath, 'tasks', taskFiles[i]);
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const tasks = JSON.parse(content);
                const key = ['active', 'pending', 'completed'][i];
                taskCounts[key] = tasks.length;

                // Store pending tasks for inclusion in status
                if (key === 'pending') {
                    pendingTasks = tasks;
                }
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
            pendingTasks: pendingTasks,
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
        console.log('Available MCP tools (MCP-compliant names):');
        console.log('  - agent-register: Register a new agent');
        console.log('  - task-create: Create a new task');
        console.log('  - task-get: Get tasks for an agent, optionally filtered by state');
        console.log('  - task-request: Send task request between agents');
        console.log('  - task-update: Update task status');
        console.log('  - relationship-add: Add agent relationship');
        console.log('  - agent-status: Get agent or system status (now includes pending tasks)');
        console.log('  - context-update: Update agent context');
        console.log('  - message-send: Send message between agents');
        console.log('');
        console.log('Legacy method names (still supported):');
        console.log('  - agent/register, task/create, task/request, task/update');
        console.log('  - relationship/add, agent/status, context/update, message/send');
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
