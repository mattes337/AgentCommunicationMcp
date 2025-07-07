/**
 * Test script to demonstrate agent re-registration functionality
 */

const { AgentCommunicationSystem } = require('../src/index');
const MCPServer = require('../src/mcp-server');

async function testAgentReregistration() {
    console.log('🔄 Testing Agent Re-registration Functionality...\n');

    // Test 1: AgentCommunicationSystem re-registration
    console.log('📋 Test 1: AgentCommunicationSystem re-registration');
    const system = new AgentCommunicationSystem();
    
    try {
        // Register agent first time
        console.log('   Registering agent "test-agent" for the first time...');
        const agent1 = await system.registerAgent('test-agent');
        console.log(`   ✓ Agent registered: ${agent1.agentId}`);
        
        // Register same agent again - should update, not throw error
        console.log('   Re-registering agent "test-agent"...');
        const agent2 = await system.registerAgent('test-agent');
        console.log(`   ✓ Agent re-registered: ${agent2.agentId}`);
        
        // Verify it's the same agent instance
        if (system.getAgent('test-agent') === agent1) {
            console.log('   ✓ Same agent instance preserved');
        } else {
            console.log('   ❌ Different agent instance returned');
        }
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n📋 Test 2: MCPServer re-registration');
    const mcpServer = new MCPServer('./test-reregistration');
    
    try {
        // Register agent first time
        console.log('   Registering agent "mcp-test-agent" for the first time...');
        await mcpServer.registerAgent('mcp-test-agent', { feature1: true });
        console.log('   ✓ Agent registered successfully');
        
        const firstRegistration = mcpServer.connectedAgents.get('mcp-test-agent');
        console.log(`   ✓ Registration count: ${firstRegistration.registrationCount}`);
        
        // Register same agent again with updated capabilities
        console.log('   Re-registering agent "mcp-test-agent" with updated capabilities...');
        await mcpServer.registerAgent('mcp-test-agent', { feature1: true, feature2: true });
        console.log('   ✓ Agent re-registered successfully');
        
        const secondRegistration = mcpServer.connectedAgents.get('mcp-test-agent');
        console.log(`   ✓ Registration count: ${secondRegistration.registrationCount}`);
        console.log(`   ✓ Updated capabilities: ${JSON.stringify(secondRegistration.capabilities)}`);
        
        if (secondRegistration.connectedAt === firstRegistration.connectedAt) {
            console.log('   ✓ Original connection time preserved');
        } else {
            console.log('   ❌ Connection time changed unexpectedly');
        }
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n✅ Agent re-registration tests completed!');
    
    // Clean up test directory
    const fs = require('fs').promises;
    try {
        await fs.rm('./test-reregistration', { recursive: true, force: true });
        console.log('🧹 Test directory cleaned up');
    } catch (error) {
        // Ignore cleanup errors
    }
}

// Run the test
testAgentReregistration().catch(console.error);
