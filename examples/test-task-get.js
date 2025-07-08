/**
 * Test script for the new task-get tool
 * Tests both the new task-get tool and the updated agent-status with pending tasks
 */

const MCPAgentClient = require('../src/mcp-client');

class TaskGetTester {
    constructor() {
        this.client = null;
    }

    async start() {
        console.log('🧪 Testing task-get tool and updated agent-status...\n');

        try {
            // Create test client
            this.client = new MCPAgentClient('test-agent', {
                type: 'test',
                capabilities: ['testing', 'task-management']
            });

            await this.client.connect();
            console.log('✅ Connected to MCP server\n');

            // Test 1: Create some test tasks
            console.log('📝 Creating test tasks...');
            
            const task1 = await this.client.createTask({
                title: 'Test Task 1',
                description: 'First test task',
                priority: 'high',
                type: 'implementation'
            });
            console.log(`✅ Created task: ${task1.taskId}`);

            const task2 = await this.client.createTask({
                title: 'Test Task 2', 
                description: 'Second test task',
                priority: 'medium',
                type: 'request'
            });
            console.log(`✅ Created task: ${task2.taskId}`);

            const task3 = await this.client.createTask({
                title: 'Test Task 3',
                description: 'Third test task',
                priority: 'low',
                type: 'implementation'
            });
            console.log(`✅ Created task: ${task3.taskId}\n`);

            // Test 2: Get all tasks (no filter)
            console.log('📋 Testing task-get without filter...');
            const allTasks = await this.client.callTool('task-get', {
                agentId: 'test-agent'
            });
            console.log('All tasks result:', JSON.stringify(allTasks, null, 2));

            // Test 3: Get pending tasks only
            console.log('\n📋 Testing task-get with pending filter...');
            const pendingTasks = await this.client.callTool('task-get', {
                agentId: 'test-agent',
                state: 'pending'
            });
            console.log('Pending tasks result:', JSON.stringify(pendingTasks, null, 2));

            // Test 4: Get active tasks (should be empty)
            console.log('\n📋 Testing task-get with active filter...');
            const activeTasks = await this.client.callTool('task-get', {
                agentId: 'test-agent',
                state: 'active'
            });
            console.log('Active tasks result:', JSON.stringify(activeTasks, null, 2));

            // Test 5: Get completed tasks (should be empty)
            console.log('\n📋 Testing task-get with completed filter...');
            const completedTasks = await this.client.callTool('task-get', {
                agentId: 'test-agent',
                state: 'completed'
            });
            console.log('Completed tasks result:', JSON.stringify(completedTasks, null, 2));

            // Test 6: Test updated agent-status (should include pending tasks)
            console.log('\n📊 Testing updated agent-status...');
            const agentStatus = await this.client.getStatus();
            console.log('Agent status result:', JSON.stringify(agentStatus, null, 2));

            // Test 7: Test invalid state
            console.log('\n❌ Testing invalid state (should fail)...');
            try {
                await this.client.callTool('task-get', {
                    agentId: 'test-agent',
                    state: 'invalid-state'
                });
                console.log('❌ ERROR: Invalid state should have failed!');
            } catch (error) {
                console.log('✅ Correctly rejected invalid state:', error.message);
            }

            console.log('\n🎉 All tests completed successfully!');

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            if (this.client) {
                await this.client.disconnect();
            }
        }
    }
}

// Run the test
if (require.main === module) {
    const tester = new TaskGetTester();
    tester.start().catch(console.error);
}

module.exports = TaskGetTester;
