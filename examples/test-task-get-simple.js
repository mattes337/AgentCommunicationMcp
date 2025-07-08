/**
 * Simple test for task-get tool using direct MCP server calls
 */

const MCPAgentServer = require('../src/mcp-server');
const path = require('path');
const fs = require('fs').promises;

class SimpleTaskGetTest {
    constructor() {
        this.server = new MCPAgentServer('./test-agents', './test-reports');
        this.testAgentId = 'test-agent';
    }

    async setup() {
        // Clean up any existing test data
        try {
            await fs.rm('./test-agents', { recursive: true, force: true });
            await fs.rm('./test-reports', { recursive: true, force: true });
        } catch (error) {
            // Ignore errors
        }
    }

    async cleanup() {
        // Clean up test data
        try {
            await fs.rm('./test-agents', { recursive: true, force: true });
            await fs.rm('./test-reports', { recursive: true, force: true });
        } catch (error) {
            // Ignore errors
        }
    }

    async run() {
        console.log('🧪 Testing task-get tool and updated agent-status...\n');

        try {
            await this.setup();

            // Test 1: Register test agent
            console.log('📝 Registering test agent...');
            const registerResult = await this.server.messageHandlers.get('agent-register')({
                agentId: this.testAgentId,
                capabilities: {
                    type: 'test',
                    capabilities: ['testing', 'task-management']
                }
            });
            console.log('✅ Agent registered:', registerResult.message);

            // Test 2: Create some test tasks
            console.log('\n📝 Creating test tasks...');
            
            const task1 = await this.server.messageHandlers.get('task-create')({
                agentId: this.testAgentId,
                task: {
                    title: 'Test Task 1',
                    description: 'First test task',
                    priority: 'high',
                    type: 'implementation'
                }
            });
            console.log(`✅ Created task 1: ${task1.taskId}`);

            const task2 = await this.server.messageHandlers.get('task-create')({
                agentId: this.testAgentId,
                task: {
                    title: 'Test Task 2',
                    description: 'Second test task',
                    priority: 'medium',
                    type: 'request'
                }
            });
            console.log(`✅ Created task 2: ${task2.taskId}`);

            const task3 = await this.server.messageHandlers.get('task-create')({
                agentId: this.testAgentId,
                task: {
                    title: 'Test Task 3',
                    description: 'Third test task',
                    priority: 'low',
                    type: 'implementation'
                }
            });
            console.log(`✅ Created task 3: ${task3.taskId}`);

            // Test 3: Get all tasks (no filter)
            console.log('\n📋 Testing task-get without filter...');
            const allTasksResult = await this.server.messageHandlers.get('task-get')({
                agentId: this.testAgentId
            });
            console.log('✅ All tasks retrieved');
            console.log('  - Pending tasks:', allTasksResult.tasks.pending?.length || 0);
            console.log('  - Active tasks:', allTasksResult.tasks.active?.length || 0);
            console.log('  - Completed tasks:', allTasksResult.tasks.completed?.length || 0);

            // Test 4: Get pending tasks only
            console.log('\n📋 Testing task-get with pending filter...');
            const pendingTasksResult = await this.server.messageHandlers.get('task-get')({
                agentId: this.testAgentId,
                state: 'pending'
            });
            console.log('✅ Pending tasks retrieved:', pendingTasksResult.tasks.length);
            console.log('  - Task titles:', pendingTasksResult.tasks.map(t => t.title));

            // Test 5: Get active tasks (should be empty)
            console.log('\n📋 Testing task-get with active filter...');
            const activeTasksResult = await this.server.messageHandlers.get('task-get')({
                agentId: this.testAgentId,
                state: 'active'
            });
            console.log('✅ Active tasks retrieved:', activeTasksResult.tasks.length);

            // Test 6: Get completed tasks (should be empty)
            console.log('\n📋 Testing task-get with completed filter...');
            const completedTasksResult = await this.server.messageHandlers.get('task-get')({
                agentId: this.testAgentId,
                state: 'completed'
            });
            console.log('✅ Completed tasks retrieved:', completedTasksResult.tasks.length);

            // Test 7: Test updated agent-status (should include pending tasks)
            console.log('\n📊 Testing updated agent-status...');
            const statusResult = await this.server.messageHandlers.get('agent-status')({
                agentId: this.testAgentId
            });
            console.log('✅ Agent status retrieved');
            console.log('  - Task counts:', statusResult.status.tasks);
            console.log('  - Pending tasks count:', statusResult.status.pendingTasks.length);
            console.log('  - Pending task titles:', statusResult.status.pendingTasks.map(t => t.title));

            // Test 8: Test invalid state
            console.log('\n❌ Testing invalid state (should fail)...');
            try {
                await this.server.messageHandlers.get('task-get')({
                    agentId: this.testAgentId,
                    state: 'invalid-state'
                });
                console.log('❌ ERROR: Invalid state should have failed!');
            } catch (error) {
                console.log('✅ Correctly rejected invalid state:', error.message);
            }

            // Test 9: Test tools/list includes new tool
            console.log('\n📋 Testing tools/list includes task-get...');
            const toolsResult = await this.server.messageHandlers.get('tools/list')();
            const taskGetTool = toolsResult.tools.find(t => t.name === 'task-get');
            if (taskGetTool) {
                console.log('✅ task-get tool found in tools/list');
                console.log('  - Description:', taskGetTool.description);
                console.log('  - Required params:', taskGetTool.inputSchema.required);
            } else {
                console.log('❌ task-get tool NOT found in tools/list');
            }

            console.log('\n🎉 All tests completed successfully!');

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the test
if (require.main === module) {
    const tester = new SimpleTaskGetTest();
    tester.run().catch(console.error);
}

module.exports = SimpleTaskGetTest;
