/**
 * Test script for the MCP server
 * Demonstrates how to interact with the MCP server using JSON-RPC
 */

const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

class MCPServerTest {
    constructor() {
        this.serverProcess = null;
        this.messageId = 1;
    }

    /**
     * Start the MCP server
     */
    async startServer() {
        return new Promise((resolve, reject) => {
            this.serverProcess = spawn('node', ['src/mcp-server.js'], {
                stdio: ['pipe', 'pipe', 'inherit']
            });

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('Server ready for connections')) {
                    resolve();
                }
            });

            this.serverProcess.on('error', reject);
            
            setTimeout(() => reject(new Error('Server startup timeout')), 5000);
        });
    }

    /**
     * Send a JSON-RPC message to the server
     */
    async sendMessage(method, params = {}) {
        return new Promise((resolve, reject) => {
            const message = {
                jsonrpc: '2.0',
                id: this.messageId++,
                method,
                params
            };

            let responseData = '';
            
            const onData = (data) => {
                responseData += data.toString();
                const lines = responseData.split('\n');
                
                for (const line of lines) {
                    if (line.trim() && line.includes('"jsonrpc"')) {
                        try {
                            const response = JSON.parse(line);
                            if (response.id === message.id) {
                                this.serverProcess.stdout.removeListener('data', onData);
                                resolve(response);
                                return;
                            }
                        } catch (error) {
                            // Continue parsing
                        }
                    }
                }
            };

            this.serverProcess.stdout.on('data', onData);
            
            this.serverProcess.stdin.write(JSON.stringify(message) + '\n');
            
            setTimeout(() => {
                this.serverProcess.stdout.removeListener('data', onData);
                reject(new Error('Response timeout'));
            }, 5000);
        });
    }

    /**
     * Run the test suite
     */
    async run() {
        console.log('🧪 Starting MCP Server Test...\n');

        try {
            // Start the server
            console.log('🚀 Starting MCP server...');
            await this.startServer();
            console.log('✅ MCP server started successfully\n');

            // Test 1: Register an agent
            console.log('📝 Test 1: Registering an agent...');
            const registerResponse = await this.sendMessage('agent/register', {
                agentId: 'test-frontend-agent',
                capabilities: {
                    type: 'frontend',
                    technologies: ['React', 'TypeScript'],
                    capabilities: ['ui-development', 'api-integration']
                }
            });
            console.log('Response:', registerResponse);
            console.log('✅ Agent registration test passed\n');

            // Test 2: Create a task
            console.log('📋 Test 2: Creating a task...');
            const taskResponse = await this.sendMessage('task/create', {
                agentId: 'test-frontend-agent',
                task: {
                    title: 'Build login form',
                    description: 'Create a responsive login form with validation',
                    priority: 'high',
                    type: 'implementation',
                    deliverables: ['login-form.tsx', 'validation.ts'],
                    metadata: {
                        estimated_effort: '4 hours',
                        tags: ['ui', 'authentication']
                    }
                }
            });
            console.log('Response:', taskResponse);
            console.log('✅ Task creation test passed\n');

            // Test 3: Register another agent
            console.log('👥 Test 3: Registering second agent...');
            const registerResponse2 = await this.sendMessage('agent/register', {
                agentId: 'test-api-agent',
                capabilities: {
                    type: 'backend',
                    technologies: ['Node.js', 'Express'],
                    capabilities: ['api-development', 'authentication']
                }
            });
            console.log('Response:', registerResponse2);
            console.log('✅ Second agent registration test passed\n');

            // Test 4: Add relationship
            console.log('🔗 Test 4: Adding agent relationship...');
            const relationshipResponse = await this.sendMessage('relationship/add', {
                agentId: 'test-frontend-agent',
                targetAgentId: 'test-api-agent',
                relationshipType: 'producer'
            });
            console.log('Response:', relationshipResponse);
            console.log('✅ Relationship test passed\n');

            // Test 5: Send task request
            console.log('📤 Test 5: Sending task request...');
            const taskRequestResponse = await this.sendMessage('task/request', {
                fromAgentId: 'test-frontend-agent',
                toAgentId: 'test-api-agent',
                taskRequest: {
                    title: 'Create authentication API',
                    description: 'Need login and registration endpoints',
                    priority: 'high',
                    deliverables: ['/api/auth/login', '/api/auth/register'],
                    metadata: {
                        estimated_effort: '6 hours',
                        tags: ['api', 'authentication']
                    }
                }
            });
            console.log('Response:', taskRequestResponse);
            console.log('✅ Task request test passed\n');

            // Test 6: Update context
            console.log('📝 Test 6: Updating agent context...');
            const contextResponse = await this.sendMessage('context/update', {
                agentId: 'test-frontend-agent',
                context: `# Frontend Agent Context\n\n## Current State\n- Working on login form\n- Requested API endpoints from backend team\n\n## Progress\n- UI mockups completed\n- Validation logic in progress`
            });
            console.log('Response:', contextResponse);
            console.log('✅ Context update test passed\n');

            // Test 7: Send message
            console.log('💬 Test 7: Sending inter-agent message...');
            const messageResponse = await this.sendMessage('message/send', {
                fromAgentId: 'test-frontend-agent',
                toAgentId: 'test-api-agent',
                messageType: 'STATUS_UPDATE',
                messageData: {
                    message: 'Login form UI is 50% complete',
                    progress: 50,
                    blockers: ['Waiting for API specification']
                }
            });
            console.log('Response:', messageResponse);
            console.log('✅ Message sending test passed\n');

            // Test 8: Get agent status
            console.log('📊 Test 8: Getting agent status...');
            const statusResponse = await this.sendMessage('agent/status', {
                agentId: 'test-frontend-agent'
            });
            console.log('Response:', statusResponse);
            console.log('✅ Agent status test passed\n');

            // Test 9: Get system status
            console.log('🌐 Test 9: Getting system status...');
            const systemStatusResponse = await this.sendMessage('agent/status', {});
            console.log('Response:', systemStatusResponse);
            console.log('✅ System status test passed\n');

            console.log('🎉 All MCP server tests passed successfully!');
            console.log('\n📁 Check the ./agents/ directory to see the created agent data');

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        if (this.serverProcess) {
            this.serverProcess.kill();
            console.log('✅ Server process terminated');
        }
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    const test = new MCPServerTest();
    test.run().catch(error => {
        console.error('Test error:', error);
        process.exit(1);
    });
}

module.exports = MCPServerTest;
