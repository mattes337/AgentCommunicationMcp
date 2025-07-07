/**
 * Shared MCP Server for Agent Communication System
 * Implements a network-based MCP server that multiple clients can connect to
 * This allows sharing agent data across multiple Claude Desktop instances
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');

class SharedMCPServer {
    constructor(port = 8080) {
        this.port = port;
        this.connectedAgents = new Map();
        this.connectedClients = new Map();
        this.agentTasks = new Map();
        this.agentRelationships = new Map();
        this.basePath = process.env.MCP_AGENTS_PATH || './agents';
        this.reportsPath = process.env.MCP_REPORTS_PATH || './reports';
        this.messageHandlers = new Map();
        this.server = null;
        this.wss = null;

        this.setupHandlers();
    }

    /**
     * Setup MCP request handlers (reusing existing logic)
     */
    setupHandlers() {
        // Import handlers from the original MCP server
        const MCPAgentServer = require('./mcp-server.js');
        const originalServer = new MCPAgentServer();
        
        // Copy all handlers from the original server
        this.messageHandlers = originalServer.messageHandlers;
        
        // Override the base paths
        originalServer.basePath = this.basePath;
        originalServer.reportsPath = this.reportsPath;
        
        // Bind the handlers to use our shared state
        for (const [method, handler] of this.messageHandlers) {
            this.messageHandlers.set(method, handler.bind(originalServer));
        }
    }

    /**
     * Handle incoming WebSocket connection
     */
    handleConnection(ws, req) {
        const clientId = uuidv4();
        console.log(`🔗 New client connected: ${clientId}`);
        
        this.connectedClients.set(clientId, {
            id: clientId,
            ws: ws,
            connectedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        });

        // Handle messages from client
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                const response = await this.handleMessage(message);
                ws.send(JSON.stringify(response));
                
                // Update last activity
                const client = this.connectedClients.get(clientId);
                if (client) {
                    client.lastActivity = new Date().toISOString();
                }
            } catch (error) {
                console.error('Error handling message:', error);
                const errorResponse = {
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32603,
                        message: error.message
                    }
                };
                ws.send(JSON.stringify(errorResponse));
            }
        });

        // Handle client disconnect
        ws.on('close', () => {
            console.log(`🔌 Client disconnected: ${clientId}`);
            this.connectedClients.delete(clientId);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`❌ Client error ${clientId}:`, error);
            this.connectedClients.delete(clientId);
        });

        // Send welcome message
        const welcomeMessage = {
            jsonrpc: '2.0',
            method: 'server/welcome',
            params: {
                clientId: clientId,
                serverVersion: '1.0.0',
                availableMethods: Array.from(this.messageHandlers.keys())
            }
        };
        ws.send(JSON.stringify(welcomeMessage));
    }

    /**
     * Handle incoming JSON-RPC message (reusing original logic)
     */
    async handleMessage(message) {
        try {
            const request = message;

            if (!request.method || !this.messageHandlers.has(request.method)) {
                return {
                    jsonrpc: '2.0',
                    id: request.id,
                    error: {
                        code: -32601,
                        message: `Method not found: ${request.method}`
                    }
                };
            }

            const handler = this.messageHandlers.get(request.method);
            const result = await handler(request.params || {});

            return {
                jsonrpc: '2.0',
                id: request.id,
                result: result
            };

        } catch (error) {
            return {
                jsonrpc: '2.0',
                id: message.id || null,
                error: {
                    code: -32603,
                    message: error.message
                }
            };
        }
    }

    /**
     * Broadcast message to all connected clients
     */
    broadcast(message) {
        const messageStr = JSON.stringify(message);
        for (const client of this.connectedClients.values()) {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(messageStr);
            }
        }
    }

    /**
     * Get server status
     */
    getServerStatus() {
        return {
            timestamp: new Date().toISOString(),
            port: this.port,
            connectedClients: this.connectedClients.size,
            connectedAgents: this.connectedAgents.size,
            uptime: process.uptime(),
            clients: Array.from(this.connectedClients.values()).map(client => ({
                id: client.id,
                connectedAt: client.connectedAt,
                lastActivity: client.lastActivity
            }))
        };
    }

    /**
     * Start the shared MCP server
     */
    async start() {
        // Ensure directories exist
        await fs.mkdir(this.basePath, { recursive: true });
        await fs.mkdir(this.reportsPath, { recursive: true });

        // Create HTTP server
        this.server = http.createServer();
        
        // Create WebSocket server
        this.wss = new WebSocket.Server({ 
            server: this.server,
            path: '/mcp'
        });

        // Handle WebSocket connections
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });

        // Add HTTP endpoint for status
        this.server.on('request', (req, res) => {
            if (req.url === '/status' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.getServerStatus(), null, 2));
            } else if (req.url === '/' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>Agent Communication MCP Server</h1>
                    <p>WebSocket endpoint: ws://localhost:${this.port}/mcp</p>
                    <p>Status endpoint: <a href="/status">/status</a></p>
                    <p>Connected clients: ${this.connectedClients.size}</p>
                    <p>Connected agents: ${this.connectedAgents.size}</p>
                `);
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        // Start listening
        this.server.listen(this.port, () => {
            console.log('🚀 Shared MCP Agent Communication Server started');
            console.log(`📡 WebSocket server listening on ws://localhost:${this.port}/mcp`);
            console.log(`🌐 HTTP status available at http://localhost:${this.port}/status`);
            console.log('📁 Agent data will be stored in:', path.resolve(this.basePath));
            console.log('📊 Reports will be stored in:', path.resolve(this.reportsPath));
            console.log('');
            console.log('Available MCP tools (MCP-compliant names):');
            console.log('  - agent-register: Register a new agent');
            console.log('  - task-create: Create a new task');
            console.log('  - task-request: Send task request between agents');
            console.log('  - task-update: Update task status');
            console.log('  - relationship-add: Add agent relationship');
            console.log('  - agent-status: Get agent or system status');
            console.log('  - context-update: Update agent context');
            console.log('  - message-send: Send message between agents');
            console.log('');
            console.log('Legacy method names (still supported):');
            console.log('  - agent/register, task/create, task/request, task/update');
            console.log('  - relationship/add, agent/status, context/update, message/send');
            console.log('');
            console.log('🔗 Waiting for client connections...');
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down shared MCP server...');
            this.wss.close();
            this.server.close();
            process.exit(0);
        });
    }
}

// Start the server if run directly
if (require.main === module) {
    const port = process.env.MCP_PORT || 8080;
    const server = new SharedMCPServer(port);
    server.start().catch(error => {
        console.error('Failed to start shared MCP server:', error);
        process.exit(1);
    });
}

module.exports = SharedMCPServer;
