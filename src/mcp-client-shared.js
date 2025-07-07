/**
 * Shared MCP Client for connecting to the shared MCP server
 * This client connects via WebSocket to a shared server instance
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class SharedMCPClient {
    constructor(serverUrl = 'ws://localhost:8080/mcp') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.isConnected = false;
        this.pendingRequests = new Map();
        this.messageId = 1;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    /**
     * Connect to the shared MCP server
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.on('open', () => {
                    console.log('✅ Connected to shared MCP server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                });

                this.ws.on('message', (data) => {
                    this.handleMessage(data.toString());
                });

                this.ws.on('close', () => {
                    console.log('🔌 Disconnected from shared MCP server');
                    this.isConnected = false;
                    this.attemptReconnect();
                });

                this.ws.on('error', (error) => {
                    console.error('❌ WebSocket error:', error);
                    if (!this.isConnected) {
                        reject(error);
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle incoming messages from server
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);

            // Handle responses to our requests
            if (message.id && this.pendingRequests.has(message.id)) {
                const { resolve, reject } = this.pendingRequests.get(message.id);
                this.pendingRequests.delete(message.id);

                if (message.error) {
                    reject(new Error(message.error.message));
                } else {
                    resolve(message.result);
                }
            }
            // Handle server notifications
            else if (message.method) {
                this.handleNotification(message);
            }

        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    /**
     * Handle server notifications
     */
    handleNotification(message) {
        switch (message.method) {
            case 'server/welcome':
                console.log('🎉 Server welcome:', message.params);
                break;
            case 'agent/registered':
                console.log('📝 Agent registered:', message.params);
                break;
            case 'task/created':
                console.log('📋 Task created:', message.params);
                break;
            default:
                console.log('📢 Server notification:', message);
        }
    }

    /**
     * Attempt to reconnect to server
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            this.connect().catch(error => {
                console.error('Reconnection failed:', error);
            });
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    /**
     * Send a request to the server
     */
    async request(method, params = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const id = this.messageId++;
        const message = {
            jsonrpc: '2.0',
            id: id,
            method: method,
            params: params
        };

        return new Promise((resolve, reject) => {
            // Store the promise resolvers
            this.pendingRequests.set(id, { resolve, reject });

            // Send the message
            this.ws.send(JSON.stringify(message));

            // Set timeout for the request
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 30000); // 30 second timeout
        });
    }

    /**
     * Register an agent
     */
    async registerAgent(agentId, capabilities = {}, forceUpdate = false) {
        return this.request('agent/register', { agentId, capabilities, forceUpdate });
    }

    /**
     * Create a task
     */
    async createTask(agentId, task) {
        return this.request('task/create', { agentId, task });
    }

    /**
     * Update task status
     */
    async updateTaskStatus(agentId, taskId, status, deliverables = []) {
        return this.request('task/update', { agentId, taskId, status, deliverables });
    }

    /**
     * Send task request between agents
     */
    async sendTaskRequest(fromAgentId, toAgentId, taskRequest) {
        return this.request('task/request', { fromAgentId, toAgentId, taskRequest });
    }

    /**
     * Add agent relationship
     */
    async addRelationship(agentId, targetAgentId, relationshipType) {
        return this.request('relationship/add', { agentId, targetAgentId, relationshipType });
    }

    /**
     * Get agent status
     */
    async getAgentStatus(agentId = null) {
        return this.request('agent/status', { agentId });
    }

    /**
     * Update agent context
     */
    async updateAgentContext(agentId, context) {
        return this.request('context/update', { agentId, context });
    }

    /**
     * Send message between agents
     */
    async sendMessage(fromAgentId, toAgentId, messageType, messageData = {}) {
        return this.request('message/send', { fromAgentId, toAgentId, messageType, messageData });
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.ws) {
            this.isConnected = false;
            this.ws.close();
        }
    }
}

module.exports = SharedMCPClient;
