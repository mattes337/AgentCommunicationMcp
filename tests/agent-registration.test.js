/**
 * Test agent registration update functionality
 */

const fs = require('fs').promises;
const path = require('path');
const { AgentCommunicationSystem } = require('../src/index');
const MCPServer = require('../src/mcp-server');

describe('Agent Registration Updates', () => {
    let system;
    let mcpServer;
    const testBasePath = './test-agents';

    beforeEach(async () => {
        system = new AgentCommunicationSystem();
        mcpServer = new MCPServer(testBasePath);
        
        // Clean up test directory
        try {
            await fs.rm(testBasePath, { recursive: true, force: true });
        } catch (error) {
            // Directory might not exist, ignore
        }
    });

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testBasePath, { recursive: true, force: true });
        } catch (error) {
            // Directory might not exist, ignore
        }
    });

    test('should register new agent successfully', async () => {
        const agentId = 'test-agent-1';
        const agent = await system.registerAgent(agentId, testBasePath);
        
        expect(agent).toBeDefined();
        expect(agent.agentId).toBe(agentId);
        expect(system.getAgent(agentId)).toBe(agent);
    });

    test('should update existing agent instead of throwing error', async () => {
        const agentId = 'test-agent-2';
        
        // Register agent first time
        const agent1 = await system.registerAgent(agentId, testBasePath);
        expect(agent1).toBeDefined();
        
        // Register same agent again - should update, not throw
        const agent2 = await system.registerAgent(agentId, testBasePath);
        expect(agent2).toBeDefined();
        expect(agent2.agentId).toBe(agentId);
        
        // Should be the same agent instance
        expect(system.getAgent(agentId)).toBe(agent1);
    });

    test('should update MCP server agent registration', async () => {
        const agentId = 'test-mcp-agent';
        const capabilities1 = { feature1: true };
        const capabilities2 = { feature1: true, feature2: true };
        
        // Register agent first time
        await mcpServer.registerAgent(agentId, capabilities1);
        expect(mcpServer.connectedAgents.has(agentId)).toBe(true);
        
        const firstRegistration = mcpServer.connectedAgents.get(agentId);
        expect(firstRegistration.capabilities).toEqual(capabilities1);
        expect(firstRegistration.registrationCount).toBe(1);
        
        // Register same agent again with updated capabilities (force update)
        await mcpServer.registerAgent(agentId, capabilities2, true);
        expect(mcpServer.connectedAgents.has(agentId)).toBe(true);

        const secondRegistration = mcpServer.connectedAgents.get(agentId);
        expect(secondRegistration.capabilities).toEqual(capabilities2);
        expect(secondRegistration.registrationCount).toBe(2);
        expect(secondRegistration.connectedAt).toBe(firstRegistration.connectedAt);
    });

    test('should preserve existing agent files during update', async () => {
        const agentId = 'test-file-preservation';
        const agentPath = path.join(testBasePath, agentId);
        const contextPath = path.join(agentPath, 'context.md');

        // Register agent first time
        await mcpServer.registerAgent(agentId, { feature1: true });

        // Verify context file was created
        expect(await fs.access(contextPath).then(() => true).catch(() => false)).toBe(true);

        // Modify context file
        const customContext = '# Custom Context\nThis is custom content.';
        await fs.writeFile(contextPath, customContext, 'utf8');

        // Register agent again
        await mcpServer.registerAgent(agentId, { feature1: true, feature2: true });

        // Context file should be preserved
        const preservedContext = await fs.readFile(contextPath, 'utf8');
        expect(preservedContext).toBe(customContext);
    });

    test('should update MCP config capabilities on re-registration', async () => {
        const agentId = 'test-config-update';
        const agentPath = path.join(testBasePath, agentId);
        const mcpConfigPath = path.join(agentPath, 'mcp_config.json');

        const capabilities1 = { feature1: true };
        const capabilities2 = { feature1: true, feature2: true };

        // Register agent first time
        await mcpServer.registerAgent(agentId, capabilities1);

        // Verify config file was created
        expect(await fs.access(mcpConfigPath).then(() => true).catch(() => false)).toBe(true);

        let config = JSON.parse(await fs.readFile(mcpConfigPath, 'utf8'));
        expect(config.capabilities).toEqual(capabilities1);
        expect(config.lastUpdated).toBeUndefined();

        // Register agent again with updated capabilities (force update)
        await mcpServer.registerAgent(agentId, capabilities2, true);

        config = JSON.parse(await fs.readFile(mcpConfigPath, 'utf8'));
        expect(config.capabilities).toEqual(capabilities2);
        expect(config.lastUpdated).toBeDefined();
    });
});
