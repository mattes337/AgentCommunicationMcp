/**
 * MCP Client for connecting agents to the MCP server
 * This demonstrates how agents can connect and interact with the MCP server
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

class MCPAgentClient {
    constructor(agentId, capabilities = {}) {
        this.agentId = agentId;
        this.capabilities = capabilities;
        this.client = null;
        this.isConnected = false;
    }

    /**
     * Connect to the MCP server
     */
    async connect() {
        try {
            // Spawn the MCP server process
            const serverProcess = spawn('node', ['src/mcp-server.js'], {
                stdio: ['pipe', 'pipe', 'inherit']
            });

            // Create transport using the server process
            const transport = new StdioClientTransport({
                stdin: serverProcess.stdin,
                stdout: serverProcess.stdout
            });

            // Create and connect client
            this.client = new Client(
                {
                    name: `agent-${this.agentId}`,
                    version: '1.0.0',
                },
                {
                    capabilities: {
                        resources: {},
                        tools: {},
                        prompts: {},
                    },
                }
            );

            await this.client.connect(transport);
            this.isConnected = true;

            // Register with the server
            await this.register();

            console.log(`✅ Agent ${this.agentId} connected to MCP server`);
            return true;

        } catch (error) {
            console.error(`❌ Failed to connect agent ${this.agentId}:`, error);
            return false;
        }
    }

    /**
     * Register the agent with the server
     */
    async register(forceUpdate = false) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await this.client.request(
            {
                method: 'agent/register',
                params: {
                    agentId: this.agentId,
                    capabilities: this.capabilities,
                    forceUpdate: forceUpdate
                }
            },
            {}
        );

        console.log(`📝 Agent registration response:`, response);
        return response;
    }

    /**
     * Create a task
     */
    async createTask(taskData) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await this.client.request(
            {
                method: 'task/create',
                params: {
                    agentId: this.agentId,
                    task: taskData
                }
            },
            {}
        );

        console.log(`📋 Task created:`, response);
        return response;
    }

    /**
     * Send a task request to another agent
     */
    async sendTaskRequest(toAgentId, taskRequest) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await this.client.request(
            {
                method: 'task/request',
                params: {
                    fromAgentId: this.agentId,
                    toAgentId: toAgentId,
                    taskRequest: taskRequest
                }
            },
            {}
        );

        console.log(`📤 Task request sent:`, response);
        return response;
    }

    /**
     * Update task status
     */
    async updateTaskStatus(taskId, status, deliverables = []) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await this.client.request(
            {
                method: 'task/update',
                params: {
                    agentId: this.agentId,
                    taskId: taskId,
                    status: status,
                    deliverables: deliverables
                }
            },
            {}
        );

        console.log(`🔄 Task status updated:`, response);
        return response;
    }

    /**
     * Add a relationship with another agent
     */
    async addRelationship(targetAgentId, relationshipType) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await this.client.request(
            {
                method: 'relationship/add',
                params: {
                    agentId: this.agentId,
                    targetAgentId: targetAgentId,
                    relationshipType: relationshipType
                }
            },
            {}
        );

        console.log(`🔗 Relationship added:`, response);
        return response;
    }

    /**
     * Get agent status
     */
    async getStatus() {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await this.client.request(
            {
                method: 'agent/status',
                params: {
                    agentId: this.agentId
                }
            },
            {}
        );

        console.log(`📊 Agent status:`, response);
        return response;
    }

    /**
     * Get system status
     */
    async getSystemStatus() {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await this.client.request(
            {
                method: 'agent/status',
                params: {}
            },
            {}
        );

        console.log(`🌐 System status:`, response);
        return response;
    }

    /**
     * Update agent context
     */
    async updateContext(context) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await this.client.request(
            {
                method: 'context/update',
                params: {
                    agentId: this.agentId,
                    context: context
                }
            },
            {}
        );

        console.log(`📝 Context updated:`, response);
        return response;
    }

    /**
     * Send a message to another agent
     */
    async sendMessage(toAgentId, messageType, messageData = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await this.client.request(
            {
                method: 'message/send',
                params: {
                    fromAgentId: this.agentId,
                    toAgentId: toAgentId,
                    messageType: messageType,
                    messageData: messageData
                }
            },
            {}
        );

        console.log(`💬 Message sent:`, response);
        return response;
    }

    /**
     * Disconnect from the server
     */
    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.close();
            this.isConnected = false;
            console.log(`👋 Agent ${this.agentId} disconnected from MCP server`);
        }
    }
}

module.exports = MCPAgentClient;
