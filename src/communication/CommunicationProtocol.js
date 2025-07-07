/**
 * File-based Communication Protocol for inter-agent messaging
 * Implements the local file system communication using requests/incoming and requests/outgoing directories
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CommunicationProtocol {
    constructor() {
        this.registeredAgents = new Map();
        this.messageHandlers = new Map();
        this.isRunning = false;
        this.watchInterval = null;
        this.pollIntervalMs = 1000; // Check for new messages every second
    }

    /**
     * Register an agent with the communication protocol
     */
    async registerAgent(agent) {
        const isExisting = this.registeredAgents.has(agent.agentId);
        this.registeredAgents.set(agent.agentId, agent);

        // Set up default message handlers (safe to call multiple times)
        this.setupDefaultMessageHandlers(agent);

        console.log(`Agent ${agent.agentId} ${isExisting ? 'updated in' : 'registered with'} communication protocol`);
    }

    /**
     * Unregister an agent from the communication protocol
     */
    async unregisterAgent(agent) {
        this.registeredAgents.delete(agent.agentId);
        this.messageHandlers.delete(agent.agentId);
        
        console.log(`Agent ${agent.agentId} unregistered from communication protocol`);
    }

    /**
     * Set up default message handlers for an agent
     */
    setupDefaultMessageHandlers(agent) {
        const handlers = {
            'TASK_REQUEST': this.handleTaskRequest.bind(this),
            'TASK_RESPONSE': this.handleTaskResponse.bind(this),
            'STATUS_UPDATE': this.handleStatusUpdate.bind(this),
            'DEPENDENCY_NOTIFICATION': this.handleDependencyNotification.bind(this),
            'INTEGRATION_TEST': this.handleIntegrationTest.bind(this),
            'COMPLETION_NOTIFICATION': this.handleCompletionNotification.bind(this),
            'CONTEXT_SYNC': this.handleContextSync.bind(this)
        };

        this.messageHandlers.set(agent.agentId, handlers);
    }

    /**
     * Send a task request from one agent to another
     */
    async sendTaskRequest(fromAgent, toAgent, task) {
        const message = {
            id: uuidv4(),
            type: 'TASK_REQUEST',
            timestamp: new Date().toISOString(),
            from_agent_id: fromAgent.agentId,
            to_agent_id: toAgent.agentId,
            task_id: task.id,
            task_data: task.toJSON()
        };

        await this.sendMessage(fromAgent, toAgent, message);
    }

    /**
     * Send a task response from one agent to another
     */
    async sendTaskResponse(fromAgent, toAgent, responseTask, originalTaskId) {
        const message = {
            id: uuidv4(),
            type: 'TASK_RESPONSE',
            timestamp: new Date().toISOString(),
            from_agent_id: fromAgent.agentId,
            to_agent_id: toAgent.agentId,
            original_task_id: originalTaskId,
            response_task_id: responseTask.id,
            response_data: responseTask.toJSON()
        };

        await this.sendMessage(fromAgent, toAgent, message);
    }

    /**
     * Send a status update message
     */
    async sendStatusUpdate(fromAgent, toAgent, taskId, status, details = {}) {
        const message = {
            id: uuidv4(),
            type: 'STATUS_UPDATE',
            timestamp: new Date().toISOString(),
            from_agent_id: fromAgent.agentId,
            to_agent_id: toAgent.agentId,
            task_id: taskId,
            status: status,
            details: details
        };

        await this.sendMessage(fromAgent, toAgent, message);
    }

    /**
     * Core message sending function
     */
    async sendMessage(fromAgent, toAgent, message) {
        try {
            // Write to sender's outgoing directory
            const outgoingPath = path.join(fromAgent.outgoingRequestsPath, `${message.id}.json`);
            await fs.writeFile(outgoingPath, JSON.stringify(message, null, 2), 'utf8');

            // Write to receiver's incoming directory
            const incomingPath = path.join(toAgent.incomingRequestsPath, `${message.id}.json`);
            await fs.writeFile(incomingPath, JSON.stringify(message, null, 2), 'utf8');

            console.log(`Message ${message.id} sent from ${fromAgent.agentId} to ${toAgent.agentId}`);
        } catch (error) {
            console.error(`Failed to send message from ${fromAgent.agentId} to ${toAgent.agentId}:`, error);
            throw error;
        }
    }

    /**
     * Start the communication protocol (begin polling for messages)
     */
    async start() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        this.watchInterval = setInterval(() => {
            this.pollForMessages();
        }, this.pollIntervalMs);

        console.log('Communication protocol started');
    }

    /**
     * Stop the communication protocol
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
            this.watchInterval = null;
        }

        console.log('Communication protocol stopped');
    }

    /**
     * Poll all agents for new incoming messages
     */
    async pollForMessages() {
        for (const [agentId, agent] of this.registeredAgents) {
            try {
                await this.processIncomingMessages(agent);
            } catch (error) {
                console.error(`Error processing messages for agent ${agentId}:`, error);
            }
        }
    }

    /**
     * Process incoming messages for a specific agent
     */
    async processIncomingMessages(agent) {
        try {
            const files = await fs.readdir(agent.incomingRequestsPath);
            const messageFiles = files.filter(file => file.endsWith('.json'));

            for (const messageFile of messageFiles) {
                const messagePath = path.join(agent.incomingRequestsPath, messageFile);
                
                try {
                    const messageContent = await fs.readFile(messagePath, 'utf8');
                    const message = JSON.parse(messageContent);

                    // Process the message
                    await this.handleMessage(agent, message);

                    // Move processed message to a processed directory or delete it
                    await this.archiveMessage(agent, messagePath, message);

                } catch (error) {
                    console.error(`Error processing message file ${messageFile} for agent ${agent.agentId}:`, error);
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`Error reading incoming messages for agent ${agent.agentId}:`, error);
            }
        }
    }

    /**
     * Handle a received message
     */
    async handleMessage(agent, message) {
        const handlers = this.messageHandlers.get(agent.agentId);
        if (!handlers) {
            console.error(`No message handlers found for agent ${agent.agentId}`);
            return;
        }

        const handler = handlers[message.type];
        if (!handler) {
            console.error(`No handler found for message type ${message.type} for agent ${agent.agentId}`);
            return;
        }

        try {
            await handler(agent, message);
            console.log(`Message ${message.id} processed by agent ${agent.agentId}`);
        } catch (error) {
            console.error(`Error handling message ${message.id} for agent ${agent.agentId}:`, error);
        }
    }

    /**
     * Archive a processed message
     */
    async archiveMessage(agent, messagePath, message) {
        try {
            // Create processed directory if it doesn't exist
            const processedDir = path.join(agent.incomingRequestsPath, 'processed');
            await fs.mkdir(processedDir, { recursive: true });

            // Move message to processed directory
            const processedPath = path.join(processedDir, path.basename(messagePath));
            await fs.rename(messagePath, processedPath);

        } catch (error) {
            console.error(`Error archiving message ${message.id}:`, error);
            // If archiving fails, just delete the original file
            try {
                await fs.unlink(messagePath);
            } catch (deleteError) {
                console.error(`Error deleting message file:`, deleteError);
            }
        }
    }

    // Message Handlers

    /**
     * Handle incoming task request
     */
    async handleTaskRequest(agent, message) {
        const Task = require('../core/Task');
        
        // Create task from message data
        const task = Task.fromJSON(message.task_data);
        
        // Add to agent's pending queue
        await agent.taskQueue.addTask(task);
        
        // Update agent context
        await agent.appendToContext(`Received task request: ${task.title} from ${message.from_agent_id}`);
        
        console.log(`Agent ${agent.agentId} received task request: ${task.title}`);
    }

    /**
     * Handle incoming task response
     */
    async handleTaskResponse(agent, message) {
        // Update agent context with response
        await agent.appendToContext(`Received task response for task ${message.original_task_id} from ${message.from_agent_id}`);
        
        console.log(`Agent ${agent.agentId} received task response for task ${message.original_task_id}`);
    }

    /**
     * Handle status update
     */
    async handleStatusUpdate(agent, message) {
        await agent.appendToContext(`Status update for task ${message.task_id}: ${message.status} from ${message.from_agent_id}`);
        
        console.log(`Agent ${agent.agentId} received status update for task ${message.task_id}: ${message.status}`);
    }

    /**
     * Handle dependency notification
     */
    async handleDependencyNotification(agent, message) {
        await agent.appendToContext(`Dependency notification from ${message.from_agent_id}: ${JSON.stringify(message.details)}`);
        
        console.log(`Agent ${agent.agentId} received dependency notification from ${message.from_agent_id}`);
    }

    /**
     * Handle integration test request
     */
    async handleIntegrationTest(agent, message) {
        await agent.appendToContext(`Integration test request from ${message.from_agent_id}: ${JSON.stringify(message.details)}`);
        
        console.log(`Agent ${agent.agentId} received integration test request from ${message.from_agent_id}`);
    }

    /**
     * Handle completion notification
     */
    async handleCompletionNotification(agent, message) {
        await agent.appendToContext(`Task completion notification from ${message.from_agent_id}: ${JSON.stringify(message.details)}`);
        
        console.log(`Agent ${agent.agentId} received completion notification from ${message.from_agent_id}`);
    }

    /**
     * Handle context sync
     */
    async handleContextSync(agent, message) {
        await agent.appendToContext(`Context sync from ${message.from_agent_id}: ${JSON.stringify(message.details)}`);
        
        console.log(`Agent ${agent.agentId} received context sync from ${message.from_agent_id}`);
    }
}

module.exports = CommunicationProtocol;
