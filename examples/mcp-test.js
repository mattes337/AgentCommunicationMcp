/**
 * MCP Connection Test
 * Demonstrates real agents connecting to the MCP server
 */

const MCPAgentClient = require('../src/mcp-client');

class MCPConnectionTest {
    constructor() {
        this.agents = [];
    }

    /**
     * Run the MCP connection test
     */
    async run() {
        console.log('🧪 Starting MCP Connection Test...\n');

        try {
            // Create test agents
            console.log('👥 Creating test agents...');
            const frontendAgent = new MCPAgentClient('frontend-agent', {
                type: 'frontend',
                technologies: ['React', 'TypeScript', 'CSS'],
                capabilities: ['ui-development', 'api-integration', 'responsive-design']
            });

            const apiAgent = new MCPAgentClient('api-agent', {
                type: 'backend',
                technologies: ['Node.js', 'Express', 'REST'],
                capabilities: ['api-development', 'authentication', 'data-processing']
            });

            const dbAgent = new MCPAgentClient('database-agent', {
                type: 'database',
                technologies: ['PostgreSQL', 'MongoDB', 'Redis'],
                capabilities: ['schema-design', 'query-optimization', 'data-migration']
            });

            this.agents = [frontendAgent, apiAgent, dbAgent];

            // Connect agents to MCP server
            console.log('\n🔌 Connecting agents to MCP server...');
            for (const agent of this.agents) {
                const connected = await agent.connect();
                if (!connected) {
                    throw new Error(`Failed to connect agent ${agent.agentId}`);
                }
                // Small delay between connections
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Establish relationships
            console.log('\n🔗 Establishing agent relationships...');
            await frontendAgent.addRelationship('api-agent', 'producer');
            await apiAgent.addRelationship('frontend-agent', 'consumer');
            await apiAgent.addRelationship('database-agent', 'producer');
            await dbAgent.addRelationship('api-agent', 'consumer');

            // Create tasks
            console.log('\n📋 Creating tasks...');
            
            // Frontend creates a task
            await frontendAgent.createTask({
                title: 'Build user authentication UI',
                description: 'Create login and registration forms with validation',
                priority: 'high',
                type: 'implementation',
                deliverables: ['login-form.tsx', 'register-form.tsx', 'auth-styles.css'],
                metadata: {
                    estimated_effort: '6 hours',
                    tags: ['ui', 'authentication', 'forms']
                }
            });

            // API creates a task
            await apiAgent.createTask({
                title: 'Implement authentication endpoints',
                description: 'Create REST API endpoints for user authentication',
                priority: 'high',
                type: 'implementation',
                deliverables: ['/api/auth/login', '/api/auth/register', '/api/auth/logout'],
                metadata: {
                    estimated_effort: '8 hours',
                    tags: ['api', 'authentication', 'security']
                }
            });

            // Send task requests between agents
            console.log('\n📤 Sending task requests...');
            
            await frontendAgent.sendTaskRequest('api-agent', {
                title: 'Create user authentication API',
                description: 'Need REST endpoints for user login, logout, and registration',
                priority: 'high',
                deliverables: ['/api/auth/login', '/api/auth/logout', '/api/auth/register'],
                metadata: {
                    estimated_effort: '8 hours',
                    tags: ['authentication', 'api', 'security']
                }
            });

            await apiAgent.sendTaskRequest('database-agent', {
                title: 'Create user database schema',
                description: 'Need database tables for user management with proper indexing',
                priority: 'high',
                deliverables: ['users table', 'user_sessions table', 'migration scripts'],
                metadata: {
                    estimated_effort: '4 hours',
                    tags: ['database', 'schema', 'users']
                }
            });

            // Update contexts
            console.log('\n📝 Updating agent contexts...');
            
            await frontendAgent.updateContext(`
# Frontend Agent Context

## Current State
- Connected to MCP server
- Working on user authentication UI
- Waiting for API endpoints from api-agent

## Recent Activities
- Created authentication UI task
- Requested API endpoints from backend team
- Established relationship with API agent

## Next Steps
- Wait for API specification
- Begin UI mockups
- Set up form validation
            `);

            await apiAgent.updateContext(`
# API Agent Context

## Current State
- Connected to MCP server
- Working on authentication endpoints
- Coordinating with frontend and database teams

## Recent Activities
- Created authentication API task
- Received request from frontend agent
- Requested database schema from database team

## Next Steps
- Wait for database schema
- Design API endpoints
- Implement authentication logic
            `);

            // Send messages between agents
            console.log('\n💬 Sending messages between agents...');
            
            await frontendAgent.sendMessage('api-agent', 'STATUS_UPDATE', {
                message: 'Started working on authentication UI',
                progress: 10,
                blockers: ['Waiting for API specification']
            });

            await apiAgent.sendMessage('database-agent', 'DEPENDENCY_NOTIFICATION', {
                message: 'Need user schema before proceeding with API implementation',
                urgency: 'high',
                deadline: '2025-07-05'
            });

            // Get status updates
            console.log('\n📊 Getting status updates...');
            
            for (const agent of this.agents) {
                await agent.getStatus();
            }

            // Get system status
            console.log('\n🌐 Getting system status...');
            await frontendAgent.getSystemStatus();

            console.log('\n✅ MCP Connection Test completed successfully!');
            console.log('\n📁 Check the ./agents/ directory to see the created agent data');
            console.log('📊 Check the ./reports/ directory for any generated reports');

        } catch (error) {
            console.error('❌ MCP Connection Test failed:', error);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Cleanup connections
     */
    async cleanup() {
        console.log('\n🧹 Cleaning up connections...');
        
        for (const agent of this.agents) {
            try {
                await agent.disconnect();
            } catch (error) {
                console.error(`Error disconnecting agent ${agent.agentId}:`, error);
            }
        }
        
        console.log('✅ Cleanup completed');
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    const test = new MCPConnectionTest();
    test.run().catch(error => {
        console.error('Test error:', error);
        process.exit(1);
    });
}

module.exports = MCPConnectionTest;
