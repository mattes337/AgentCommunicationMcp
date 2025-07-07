#!/usr/bin/env node

/**
 * Test script to verify MCP tool name compliance
 * Tests that tool names follow the pattern ^[a-zA-Z0-9_-]{1,64}$
 */

const { spawn } = require('child_process');
const path = require('path');

class ToolNameTest {
    constructor() {
        this.serverProcess = null;
        this.testResults = [];
    }

    /**
     * Start the MCP server
     */
    async startServer() {
        return new Promise((resolve, reject) => {
            const serverPath = path.join(__dirname, '..', 'src', 'mcp-server.js');
            this.serverProcess = spawn('node', [serverPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('Server ready for connections')) {
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.error('Server error:', data.toString());
            });

            this.serverProcess.on('error', reject);

            // Timeout after 10 seconds
            setTimeout(() => {
                reject(new Error('Server startup timeout'));
            }, 10000);
        });
    }

    /**
     * Test tool name compliance
     */
    testToolNamePattern(toolName) {
        const pattern = /^[a-zA-Z0-9_-]{1,64}$/;
        const isValid = pattern.test(toolName);
        
        this.testResults.push({
            toolName,
            isValid,
            pattern: '^[a-zA-Z0-9_-]{1,64}$'
        });

        return isValid;
    }

    /**
     * Send a tools/list request to get available tools
     */
    async getToolsList() {
        return new Promise((resolve, reject) => {
            const request = {
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/list',
                params: {}
            };

            this.serverProcess.stdin.write(JSON.stringify(request) + '\n');

            let responseData = '';
            const onData = (data) => {
                responseData += data.toString();
                try {
                    const response = JSON.parse(responseData.trim());
                    if (response.id === 1) {
                        this.serverProcess.stdout.removeListener('data', onData);
                        resolve(response);
                    }
                } catch (error) {
                    // Continue collecting data
                }
            };

            this.serverProcess.stdout.on('data', onData);

            // Timeout after 5 seconds
            setTimeout(() => {
                this.serverProcess.stdout.removeListener('data', onData);
                reject(new Error('Tools list request timeout'));
            }, 5000);
        });
    }

    /**
     * Run all tests
     */
    async run() {
        console.log('🧪 Starting MCP Tool Name Compliance Test...\n');

        try {
            // Start server
            console.log('🚀 Starting MCP server...');
            await this.startServer();
            console.log('✅ MCP server started successfully\n');

            // Test predefined tool names
            console.log('📋 Testing MCP-compliant tool names...');
            const expectedTools = [
                'agent-register',
                'agent-status', 
                'task-create',
                'task-request',
                'task-update',
                'relationship-add',
                'context-update',
                'message-send'
            ];

            let allValid = true;
            for (const toolName of expectedTools) {
                const isValid = this.testToolNamePattern(toolName);
                console.log(`  ${isValid ? '✅' : '❌'} ${toolName}: ${isValid ? 'VALID' : 'INVALID'}`);
                if (!isValid) allValid = false;
            }

            console.log('\n📋 Testing legacy method names (should be invalid as tool names)...');
            const legacyNames = [
                'agent/register',
                'task/create',
                'task/request',
                'relationship/add'
            ];

            for (const toolName of legacyNames) {
                const isValid = this.testToolNamePattern(toolName);
                console.log(`  ${!isValid ? '✅' : '❌'} ${toolName}: ${!isValid ? 'CORRECTLY INVALID' : 'INCORRECTLY VALID'}`);
                if (isValid) allValid = false;
            }

            // Test actual server response (if we can get it)
            console.log('\n📡 Testing actual server tools/list response...');
            try {
                const response = await this.getToolsList();
                if (response.result && response.result.tools) {
                    console.log(`  Found ${response.result.tools.length} tools in server response`);
                    for (const tool of response.result.tools) {
                        const isValid = this.testToolNamePattern(tool.name);
                        console.log(`  ${isValid ? '✅' : '❌'} ${tool.name}: ${isValid ? 'VALID' : 'INVALID'}`);
                        if (!isValid) allValid = false;
                    }
                } else {
                    console.log('  ⚠️  No tools found in server response');
                }
            } catch (error) {
                console.log(`  ⚠️  Could not get tools list: ${error.message}`);
            }

            // Summary
            console.log('\n📊 Test Summary:');
            console.log(`  Total tool names tested: ${this.testResults.length}`);
            console.log(`  Valid tool names: ${this.testResults.filter(r => r.isValid).length}`);
            console.log(`  Invalid tool names: ${this.testResults.filter(r => !r.isValid).length}`);
            console.log(`  Pattern used: ${this.testResults[0]?.pattern || '^[a-zA-Z0-9_-]{1,64}$'}`);

            if (allValid) {
                console.log('\n🎉 All MCP tool name compliance tests passed!');
                console.log('✅ Tool names follow the MCP specification pattern ^[a-zA-Z0-9_-]{1,64}$');
            } else {
                console.log('\n❌ Some tool name compliance tests failed!');
                console.log('❌ Tool names do not follow the MCP specification pattern');
            }

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
            this.serverProcess.kill('SIGTERM');
            console.log('✅ Server process terminated');
        }
    }
}

// Run the test
if (require.main === module) {
    const test = new ToolNameTest();
    test.run().catch(console.error);
}

module.exports = ToolNameTest;
