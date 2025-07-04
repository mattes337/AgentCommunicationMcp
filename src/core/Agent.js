/**
 * Core Agent class for the Multi-Agent Communication System
 * Manages file-based memory, task queues, and MCP communication
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const RelationshipManager = require('./RelationshipManager');

class Agent {
    constructor(agentId, basePath = './agents') {
        this.agentId = agentId;
        this.basePath = basePath;
        this.agentPath = path.join(basePath, agentId);
        this.contextPath = path.join(this.agentPath, 'context.md');
        this.tasksPath = path.join(this.agentPath, 'tasks');
        this.relationshipsPath = path.join(this.agentPath, 'relationships.json');
        this.mcpConfigPath = path.join(this.agentPath, 'mcp_config.json');
        
        // Task file paths
        this.activeTasksPath = path.join(this.tasksPath, 'active.json');
        this.pendingTasksPath = path.join(this.tasksPath, 'pending.json');
        this.completedTasksPath = path.join(this.tasksPath, 'completed.json');
        this.incomingRequestsPath = path.join(this.tasksPath, 'requests', 'incoming');
        this.outgoingRequestsPath = path.join(this.tasksPath, 'requests', 'outgoing');
        
        this.isInitialized = false;
        this.relationshipManager = new RelationshipManager(this);
    }

    /**
     * Initialize the agent's file structure
     */
    async initialize() {
        try {
            // Create directory structure
            await this.createDirectoryStructure();
            
            // Initialize files if they don't exist
            await this.initializeFiles();
            
            this.isInitialized = true;
            console.log(`Agent ${this.agentId} initialized successfully`);
        } catch (error) {
            console.error(`Failed to initialize agent ${this.agentId}:`, error);
            throw error;
        }
    }

    /**
     * Create the agent's directory structure
     */
    async createDirectoryStructure() {
        const directories = [
            this.agentPath,
            this.tasksPath,
            this.incomingRequestsPath,
            this.outgoingRequestsPath
        ];

        for (const dir of directories) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    /**
     * Initialize default files
     */
    async initializeFiles() {
        // Initialize context.md
        if (!await this.fileExists(this.contextPath)) {
            const defaultContext = `# Agent ${this.agentId} Context\n\n## Current State\n- Status: Initialized\n- Created: ${new Date().toISOString()}\n\n## Knowledge Base\n\n## Recent Activities\n\n## Notes\n`;
            await fs.writeFile(this.contextPath, defaultContext, 'utf8');
        }

        // Initialize task files
        const taskFiles = [
            { path: this.activeTasksPath, content: [] },
            { path: this.pendingTasksPath, content: [] },
            { path: this.completedTasksPath, content: [] }
        ];

        for (const file of taskFiles) {
            if (!await this.fileExists(file.path)) {
                await fs.writeFile(file.path, JSON.stringify(file.content, null, 2), 'utf8');
            }
        }

        // Initialize relationships.json
        if (!await this.fileExists(this.relationshipsPath)) {
            const defaultRelationships = {
                consumers: [],
                producers: [],
                bidirectional: [],
                optional: []
            };
            await fs.writeFile(this.relationshipsPath, JSON.stringify(defaultRelationships, null, 2), 'utf8');
        }

        // Initialize mcp_config.json
        if (!await this.fileExists(this.mcpConfigPath)) {
            const defaultMcpConfig = {
                agentId: this.agentId,
                mcpEndpoint: null,
                messageTypes: [
                    "TASK_REQUEST",
                    "TASK_RESPONSE", 
                    "STATUS_UPDATE",
                    "DEPENDENCY_NOTIFICATION",
                    "INTEGRATION_TEST",
                    "COMPLETION_NOTIFICATION",
                    "CONTEXT_SYNC"
                ],
                settings: {
                    messageRetryAttempts: 3,
                    messageTimeout: 30000,
                    heartbeatInterval: 60000
                }
            };
            await fs.writeFile(this.mcpConfigPath, JSON.stringify(defaultMcpConfig, null, 2), 'utf8');
        }
    }

    /**
     * Check if a file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Read the agent's context
     */
    async readContext() {
        try {
            return await fs.readFile(this.contextPath, 'utf8');
        } catch (error) {
            console.error(`Failed to read context for agent ${this.agentId}:`, error);
            throw error;
        }
    }

    /**
     * Update the agent's context
     */
    async updateContext(newContent) {
        try {
            const timestamp = new Date().toISOString();
            const updatedContent = newContent + `\n\n_Last updated: ${timestamp}_\n`;
            await fs.writeFile(this.contextPath, updatedContent, 'utf8');
        } catch (error) {
            console.error(`Failed to update context for agent ${this.agentId}:`, error);
            throw error;
        }
    }

    /**
     * Append to the agent's context
     */
    async appendToContext(content) {
        try {
            const currentContext = await this.readContext();
            const timestamp = new Date().toISOString();
            const newContent = `${currentContext}\n\n## ${timestamp}\n${content}`;
            await this.updateContext(newContent);
        } catch (error) {
            console.error(`Failed to append to context for agent ${this.agentId}:`, error);
            throw error;
        }
    }

    /**
     * Get agent relationships
     */
    async getRelationships() {
        try {
            const content = await fs.readFile(this.relationshipsPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`Failed to read relationships for agent ${this.agentId}:`, error);
            throw error;
        }
    }

    /**
     * Update agent relationships
     */
    async updateRelationships(relationships) {
        try {
            await fs.writeFile(this.relationshipsPath, JSON.stringify(relationships, null, 2), 'utf8');
        } catch (error) {
            console.error(`Failed to update relationships for agent ${this.agentId}:`, error);
            throw error;
        }
    }

    /**
     * Get MCP configuration
     */
    async getMcpConfig() {
        try {
            const content = await fs.readFile(this.mcpConfigPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`Failed to read MCP config for agent ${this.agentId}:`, error);
            throw error;
        }
    }

    /**
     * Update MCP configuration
     */
    async updateMcpConfig(config) {
        try {
            await fs.writeFile(this.mcpConfigPath, JSON.stringify(config, null, 2), 'utf8');
        } catch (error) {
            console.error(`Failed to update MCP config for agent ${this.agentId}:`, error);
            throw error;
        }
    }
}

module.exports = Agent;
