/**
 * Main entry point for the Multi-Agent Communication System
 */

const Agent = require('./core/Agent');
const Task = require('./core/Task');
const TaskQueue = require('./core/TaskQueue');
const CommunicationProtocol = require('./communication/CommunicationProtocol');

class AgentCommunicationSystem {
    constructor() {
        this.agents = new Map();
        this.communicationProtocol = new CommunicationProtocol();
    }

    /**
     * Register a new agent in the system
     */
    async registerAgent(agentId, basePath = './agents') {
        if (this.agents.has(agentId)) {
            throw new Error(`Agent ${agentId} is already registered`);
        }

        const agent = new Agent(agentId, basePath);
        await agent.initialize();
        
        const taskQueue = new TaskQueue(agent);
        agent.taskQueue = taskQueue;

        this.agents.set(agentId, agent);
        
        // Register agent with communication protocol
        await this.communicationProtocol.registerAgent(agent);

        console.log(`Agent ${agentId} registered successfully`);
        return agent;
    }

    /**
     * Get an agent by ID
     */
    getAgent(agentId) {
        return this.agents.get(agentId);
    }

    /**
     * Get all registered agents
     */
    getAllAgents() {
        return Array.from(this.agents.values());
    }

    /**
     * Remove an agent from the system
     */
    async unregisterAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        // Unregister from communication protocol
        await this.communicationProtocol.unregisterAgent(agent);

        this.agents.delete(agentId);
        console.log(`Agent ${agentId} unregistered successfully`);
    }

    /**
     * Create a task request from one agent to another
     */
    async createTaskRequest(fromAgentId, toAgentId, taskData) {
        const fromAgent = this.getAgent(fromAgentId);
        const toAgent = this.getAgent(toAgentId);

        if (!fromAgent) {
            throw new Error(`Source agent ${fromAgentId} not found`);
        }
        if (!toAgent) {
            throw new Error(`Target agent ${toAgentId} not found`);
        }

        // Create request task
        const requestTask = new Task({
            type: 'request',
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority || 'medium',
            agent_id: fromAgentId,
            target_agent_id: toAgentId,
            deliverables: taskData.deliverables || [],
            metadata: taskData.metadata || {}
        });

        // Add to requesting agent's outgoing queue
        await fromAgent.taskQueue.addTask(requestTask);

        // Send via communication protocol
        await this.communicationProtocol.sendTaskRequest(fromAgent, toAgent, requestTask);

        console.log(`Task request ${requestTask.id} sent from ${fromAgentId} to ${toAgentId}`);
        return requestTask;
    }

    /**
     * Get system status
     */
    async getSystemStatus() {
        const agentStatuses = [];
        
        for (const [agentId, agent] of this.agents) {
            const stats = await agent.taskQueue.getTaskStats();
            agentStatuses.push({
                agentId,
                ...stats
            });
        }

        return {
            totalAgents: this.agents.size,
            agents: agentStatuses,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Start the system (initialize communication protocol)
     */
    async start() {
        await this.communicationProtocol.start();
        console.log('Agent Communication System started');
    }

    /**
     * Stop the system
     */
    async stop() {
        await this.communicationProtocol.stop();
        console.log('Agent Communication System stopped');
    }
}

// Export classes for use in other modules
module.exports = {
    AgentCommunicationSystem,
    Agent,
    Task,
    TaskQueue
};

// If this file is run directly, start a demo
if (require.main === module) {
    async function demo() {
        const system = new AgentCommunicationSystem();
        
        try {
            await system.start();
            
            // Register some demo agents
            const frontendAgent = await system.registerAgent('frontend-agent');
            const apiAgent = await system.registerAgent('api-agent');
            const dbAgent = await system.registerAgent('database-agent');

            // Create some demo tasks
            await system.createTaskRequest('frontend-agent', 'api-agent', {
                title: 'Create user authentication API',
                description: 'Need REST endpoints for user login, logout, and registration',
                priority: 'high',
                deliverables: ['/api/auth/login', '/api/auth/logout', '/api/auth/register'],
                metadata: {
                    estimated_effort: '8 hours',
                    tags: ['authentication', 'api', 'security']
                }
            });

            await system.createTaskRequest('api-agent', 'database-agent', {
                title: 'Create user database schema',
                description: 'Need database tables for user management with proper indexing',
                priority: 'high',
                deliverables: ['users table', 'user_sessions table', 'migration scripts'],
                metadata: {
                    estimated_effort: '4 hours',
                    tags: ['database', 'schema', 'users']
                }
            });

            // Show system status
            const status = await system.getSystemStatus();
            console.log('\nSystem Status:', JSON.stringify(status, null, 2));

        } catch (error) {
            console.error('Demo error:', error);
        } finally {
            await system.stop();
        }
    }

    demo().catch(console.error);
}
