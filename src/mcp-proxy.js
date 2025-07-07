/**
 * MCP Proxy for Claude Desktop
 * This proxy connects to the shared MCP server and provides stdio interface
 * that Claude Desktop expects, while sharing data with other clients
 */

const SharedMCPClient = require('./mcp-client-shared.js');

class MCPProxy {
    constructor(serverUrl = 'ws://localhost:8080/mcp') {
        this.client = new SharedMCPClient(serverUrl);
        this.messageId = 1;
        this.initialized = false;
    }

    /**
     * Start the proxy
     */
    async start() {
        try {
            // Connect to shared server
            await this.client.connect();

            // Handle stdin from Claude Desktop
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', async (data) => {
                const lines = data.trim().split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        await this.handleStdinMessage(line);
                    }
                }
            });

            // Keep process alive
            process.stdin.resume();

        } catch (error) {
            console.error('❌ Failed to start MCP proxy:', error);
            process.exit(1);
        }
    }

    /**
     * Handle message from Claude Desktop (via stdin)
     */
    async handleStdinMessage(message) {
        let request = null;
        try {
            request = JSON.parse(message);

            // Handle MCP initialization sequence
            if (request.method === 'initialize') {
                // Respond with server capabilities
                const response = {
                    jsonrpc: '2.0',
                    id: request.id,
                    result: {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {},
                            resources: {},
                            prompts: {},
                            logging: {}
                        },
                        serverInfo: {
                            name: 'agent-communication-mcp-proxy',
                            version: '1.0.0'
                        }
                    }
                };
                process.stdout.write(JSON.stringify(response) + '\n');
                return;
            }

            // Handle initialized notification
            if (request.method === 'initialized') {
                this.initialized = true;
                console.error('✅ MCP initialization complete');
                return;
            }

            // Handle common MCP discovery methods locally
            if (request.method === 'tools/list') {
                const response = {
                    jsonrpc: '2.0',
                    id: request.id,
                    result: {
                        tools: [
                            {
                                name: 'agent-register',
                                description: 'Register a new agent',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        agentId: { type: 'string' },
                                        capabilities: { type: 'object' }
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
                                        task: { type: 'object' }
                                    },
                                    required: ['agentId', 'task']
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
                    }
                };
                process.stdout.write(JSON.stringify(response) + '\n');
                return;
            }

            if (request.method === 'resources/list') {
                const response = {
                    jsonrpc: '2.0',
                    id: request.id,
                    result: { resources: [] }
                };
                process.stdout.write(JSON.stringify(response) + '\n');
                return;
            }

            if (request.method === 'prompts/list') {
                const response = {
                    jsonrpc: '2.0',
                    id: request.id,
                    result: { prompts: [] }
                };
                process.stdout.write(JSON.stringify(response) + '\n');
                return;
            }

            // Handle tool calls
            if (request.method === 'tools/call') {
                const toolName = request.params.name;
                const toolArgs = request.params.arguments || {};

                // Map new tool names to old method names for backward compatibility
                const methodMap = {
                    'agent-register': 'agent/register',
                    'agent-status': 'agent/status',
                    'task-create': 'task/create',
                    'task-request': 'task/request',
                    'task-update': 'task/update',
                    'relationship-add': 'relationship/add',
                    'context-update': 'context/update',
                    'message-send': 'message/send'
                };

                // Map tool calls to shared server methods
                let serverMethod = methodMap[toolName] || toolName;
                let serverParams = toolArgs;

                // Forward to shared server
                const result = await this.client.request(serverMethod, serverParams);

                const response = {
                    jsonrpc: '2.0',
                    id: request.id,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result, null, 2)
                            }
                        ]
                    }
                };
                process.stdout.write(JSON.stringify(response) + '\n');
                return;
            }

            // Allow certain methods before initialization is complete
            const allowedBeforeInit = ['initialize', 'initialized', 'ping'];
            if (!this.initialized && !allowedBeforeInit.includes(request.method)) {
                throw new Error('MCP not initialized');
            }

            // Forward other requests to shared server
            const result = await this.client.request(request.method, request.params);

            // Send response back to Claude Desktop (via stdout)
            const response = {
                jsonrpc: '2.0',
                id: request.id,
                result: result
            };

            process.stdout.write(JSON.stringify(response) + '\n');

        } catch (error) {
            // Send error response back to Claude Desktop
            const errorResponse = {
                jsonrpc: '2.0',
                id: request && request.id ? request.id : null,
                error: {
                    code: -32603,
                    message: error.message
                }
            };

            process.stdout.write(JSON.stringify(errorResponse) + '\n');
        }
    }
}

// Start the proxy if run directly
if (require.main === module) {
    const serverUrl = process.env.MCP_SHARED_SERVER_URL || 'ws://localhost:8080/mcp';
    const proxy = new MCPProxy(serverUrl);
    proxy.start();
}

module.exports = MCPProxy;
