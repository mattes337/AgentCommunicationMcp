/**
 * HTTP API wrapper for the MCP server
 * Provides REST endpoints for easier testing and integration
 */

const express = require('express');
const { spawn } = require('child_process');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

class MCPHttpAPI {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.mcpClient = null;
        this.serverProcess = null;
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static('public'));
        
        // CORS middleware
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // Logging middleware
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
            next();
        });
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                mcpConnected: this.mcpClient !== null
            });
        });

        // Register agent
        this.app.post('/api/agents/register', async (req, res) => {
            try {
                const { agentId, capabilities } = req.body;
                
                if (!agentId) {
                    return res.status(400).json({ error: 'Agent ID is required' });
                }

                const response = await this.callMCP('agent/register', { agentId, capabilities });
                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Create task
        this.app.post('/api/agents/:agentId/tasks', async (req, res) => {
            try {
                const { agentId } = req.params;
                const task = req.body;

                const response = await this.callMCP('task/create', { agentId, task });
                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Send task request
        this.app.post('/api/agents/:fromAgentId/requests/:toAgentId', async (req, res) => {
            try {
                const { fromAgentId, toAgentId } = req.params;
                const taskRequest = req.body;

                const response = await this.callMCP('task/request', { fromAgentId, toAgentId, taskRequest });
                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Update task status
        this.app.put('/api/agents/:agentId/tasks/:taskId', async (req, res) => {
            try {
                const { agentId, taskId } = req.params;
                const { status, deliverables } = req.body;

                const response = await this.callMCP('task/update', { agentId, taskId, status, deliverables });
                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Add relationship
        this.app.post('/api/agents/:agentId/relationships', async (req, res) => {
            try {
                const { agentId } = req.params;
                const { targetAgentId, relationshipType } = req.body;

                const response = await this.callMCP('relationship/add', { agentId, targetAgentId, relationshipType });
                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get agent status
        this.app.get('/api/agents/:agentId/status', async (req, res) => {
            try {
                const { agentId } = req.params;

                const response = await this.callMCP('agent/status', { agentId });
                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get system status
        this.app.get('/api/system/status', async (req, res) => {
            try {
                const response = await this.callMCP('agent/status', {});
                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Update agent context
        this.app.put('/api/agents/:agentId/context', async (req, res) => {
            try {
                const { agentId } = req.params;
                const { context } = req.body;

                const response = await this.callMCP('context/update', { agentId, context });
                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Send message
        this.app.post('/api/agents/:fromAgentId/messages/:toAgentId', async (req, res) => {
            try {
                const { fromAgentId, toAgentId } = req.params;
                const { messageType, messageData } = req.body;

                const response = await this.callMCP('message/send', { fromAgentId, toAgentId, messageType, messageData });
                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API documentation
        this.app.get('/api/docs', (req, res) => {
            res.json({
                title: 'Agent Communication MCP API',
                version: '1.0.0',
                endpoints: {
                    'POST /api/agents/register': 'Register a new agent',
                    'POST /api/agents/:agentId/tasks': 'Create a task for an agent',
                    'POST /api/agents/:fromAgentId/requests/:toAgentId': 'Send task request between agents',
                    'PUT /api/agents/:agentId/tasks/:taskId': 'Update task status',
                    'POST /api/agents/:agentId/relationships': 'Add agent relationship',
                    'GET /api/agents/:agentId/status': 'Get agent status',
                    'GET /api/system/status': 'Get system status',
                    'PUT /api/agents/:agentId/context': 'Update agent context',
                    'POST /api/agents/:fromAgentId/messages/:toAgentId': 'Send message between agents'
                }
            });
        });

        // Serve API documentation at root
        this.app.get('/', (req, res) => {
            res.redirect('/api/docs');
        });
    }

    /**
     * Call MCP method
     */
    async callMCP(method, params) {
        if (!this.mcpClient) {
            throw new Error('MCP client not connected');
        }

        const response = await this.mcpClient.request({ method, params }, {});
        return response;
    }

    /**
     * Connect to MCP server
     */
    async connectToMCP() {
        try {
            // Spawn the MCP server process
            this.serverProcess = spawn('node', ['src/mcp-server.js'], {
                stdio: ['pipe', 'pipe', 'inherit']
            });

            // Create transport using the server process
            const transport = new StdioClientTransport({
                stdin: this.serverProcess.stdin,
                stdout: this.serverProcess.stdout
            });

            // Create and connect client
            this.mcpClient = new Client(
                {
                    name: 'http-api-client',
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

            await this.mcpClient.connect(transport);
            console.log('✅ Connected to MCP server');

        } catch (error) {
            console.error('❌ Failed to connect to MCP server:', error);
            throw error;
        }
    }

    /**
     * Start the HTTP API server
     */
    async start() {
        try {
            // Connect to MCP server first
            await this.connectToMCP();

            // Start HTTP server
            this.app.listen(this.port, () => {
                console.log(`🚀 HTTP API server started on port ${this.port}`);
                console.log(`📖 API documentation: http://localhost:${this.port}/api/docs`);
                console.log(`🏥 Health check: http://localhost:${this.port}/health`);
                console.log('');
                console.log('Example usage:');
                console.log(`curl -X POST http://localhost:${this.port}/api/agents/register \\`);
                console.log(`  -H "Content-Type: application/json" \\`);
                console.log(`  -d '{"agentId": "test-agent", "capabilities": {"type": "test"}}'`);
            });

        } catch (error) {
            console.error('Failed to start HTTP API server:', error);
            process.exit(1);
        }
    }

    /**
     * Stop the server
     */
    async stop() {
        if (this.mcpClient) {
            await this.mcpClient.close();
        }
        if (this.serverProcess) {
            this.serverProcess.kill();
        }
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const api = new MCPHttpAPI();
    api.start();

    // Handle graceful shutdown
    process.on('SIGTERM', () => api.stop());
    process.on('SIGINT', () => api.stop());
}

module.exports = MCPHttpAPI;
