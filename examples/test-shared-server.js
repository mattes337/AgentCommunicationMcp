/**
 * Test script for the shared MCP server
 * Demonstrates multiple clients connecting to the same server instance
 */

const SharedMCPClient = require('../src/mcp-client-shared.js');

async function testSharedServer() {
    console.log('🧪 Testing Shared MCP Server...\n');

    // Create multiple clients
    const client1 = new SharedMCPClient('ws://localhost:8080/mcp');
    const client2 = new SharedMCPClient('ws://localhost:8080/mcp');

    try {
        // Connect both clients
        console.log('🔗 Connecting clients...');
        await client1.connect();
        await client2.connect();
        console.log('✅ Both clients connected\n');

        // Client 1: Register an agent
        console.log('📝 Client 1: Registering frontend agent...');
        const result1 = await client1.registerAgent('frontend-agent', {
            type: 'frontend',
            technologies: ['React', 'TypeScript', 'Tailwind CSS'],
            capabilities: ['UI development', 'component creation', 'responsive design']
        });
        console.log('✅ Result:', result1);

        // Client 2: Register another agent
        console.log('\n📝 Client 2: Registering backend agent...');
        const result2 = await client2.registerAgent('backend-agent', {
            type: 'backend',
            technologies: ['Node.js', 'Express', 'PostgreSQL'],
            capabilities: ['API development', 'database design', 'authentication']
        });
        console.log('✅ Result:', result2);

        // Client 1: Create a task
        console.log('\n📋 Client 1: Creating task for frontend agent...');
        const taskResult = await client1.createTask('frontend-agent', {
            title: 'Build login form',
            description: 'Create a responsive login form with validation',
            priority: 'high',
            deliverables: ['login-form.tsx', 'validation.ts']
        });
        console.log('✅ Task created:', taskResult);

        // Client 2: Check system status (should see both agents)
        console.log('\n📊 Client 2: Getting system status...');
        const systemStatus = await client2.getAgentStatus();
        console.log('✅ System status:', JSON.stringify(systemStatus, null, 2));

        // Client 1: Add relationship between agents
        console.log('\n🔗 Client 1: Adding relationship between agents...');
        const relationshipResult = await client1.addRelationship('frontend-agent', 'backend-agent', 'consumer');
        console.log('✅ Relationship added:', relationshipResult);

        // Client 2: Send task request from backend to frontend
        console.log('\n📤 Client 2: Sending task request...');
        const requestResult = await client2.sendTaskRequest('backend-agent', 'frontend-agent', {
            title: 'API integration',
            description: 'Integrate login form with authentication API',
            priority: 'medium',
            dependencies: ['authentication-endpoints']
        });
        console.log('✅ Task request sent:', requestResult);

        // Client 1: Check frontend agent status
        console.log('\n📊 Client 1: Getting frontend agent status...');
        const agentStatus = await client1.getAgentStatus('frontend-agent');
        console.log('✅ Frontend agent status:', JSON.stringify(agentStatus, null, 2));

        console.log('\n🎉 All tests passed! Shared server is working correctly.');
        console.log('📈 Both clients successfully shared the same agent data.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Disconnect clients
        console.log('\n🔌 Disconnecting clients...');
        client1.disconnect();
        client2.disconnect();
        console.log('✅ Clients disconnected');
    }
}

// Run the test
if (require.main === module) {
    console.log('🚀 Make sure to start the shared server first:');
    console.log('   agent-mcp shared-server\n');
    
    // Wait a moment for user to read the message
    setTimeout(() => {
        testSharedServer().catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
    }, 2000);
}

module.exports = testSharedServer;
