/**
 * SystemMonitor for monitoring agent health, performance, and system status
 * Implements basic monitoring via file system watchers and status reporting
 */

const fs = require('fs').promises;
const path = require('path');

class SystemMonitor {
    constructor(agentCommunicationSystem) {
        this.system = agentCommunicationSystem;
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.monitorIntervalMs = 5000; // Monitor every 5 seconds
        this.metrics = {
            systemStartTime: null,
            totalMessages: 0,
            totalTasks: 0,
            agentMetrics: new Map()
        };
    }

    /**
     * Start monitoring the system
     */
    async start() {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.metrics.systemStartTime = new Date().toISOString();
        
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, this.monitorIntervalMs);

        console.log('System monitoring started');
    }

    /**
     * Stop monitoring the system
     */
    async stop() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('System monitoring stopped');
    }

    /**
     * Collect metrics from all agents
     */
    async collectMetrics() {
        try {
            const agents = this.system.getAllAgents();
            
            for (const agent of agents) {
                await this.collectAgentMetrics(agent);
            }

            await this.updateSystemMetrics();
        } catch (error) {
            console.error('Error collecting metrics:', error);
        }
    }

    /**
     * Collect metrics for a specific agent
     */
    async collectAgentMetrics(agent) {
        try {
            const agentId = agent.agentId;
            const taskStats = await agent.taskQueue.getTaskStats();
            const relationshipStats = await agent.relationshipManager.getRelationshipStats();
            
            // Check agent health
            const health = await this.checkAgentHealth(agent);
            
            // Count messages in incoming/outgoing directories
            const messageStats = await this.getMessageStats(agent);

            const metrics = {
                agentId,
                timestamp: new Date().toISOString(),
                health,
                tasks: taskStats,
                relationships: relationshipStats,
                messages: messageStats,
                uptime: this.calculateUptime()
            };

            this.metrics.agentMetrics.set(agentId, metrics);
        } catch (error) {
            console.error(`Error collecting metrics for agent ${agent.agentId}:`, error);
        }
    }

    /**
     * Check agent health status
     */
    async checkAgentHealth(agent) {
        const health = {
            status: 'healthy',
            issues: [],
            lastCheck: new Date().toISOString()
        };

        try {
            // Check if agent files exist and are accessible
            await fs.access(agent.contextPath);
            await fs.access(agent.activeTasksPath);
            await fs.access(agent.pendingTasksPath);
            await fs.access(agent.completedTasksPath);
            await fs.access(agent.relationshipsPath);
            await fs.access(agent.mcpConfigPath);

            // Check if directories exist
            await fs.access(agent.incomingRequestsPath);
            await fs.access(agent.outgoingRequestsPath);

        } catch (error) {
            health.status = 'unhealthy';
            health.issues.push(`File system access error: ${error.message}`);
        }

        // Check for blocked tasks
        try {
            const activeTasks = await agent.taskQueue.getActiveTasks();
            const blockedTasks = activeTasks.filter(task => task.status === 'blocked');
            
            if (blockedTasks.length > 0) {
                health.issues.push(`${blockedTasks.length} blocked tasks`);
                if (health.status === 'healthy') {
                    health.status = 'warning';
                }
            }
        } catch (error) {
            health.status = 'unhealthy';
            health.issues.push(`Task queue access error: ${error.message}`);
        }

        return health;
    }

    /**
     * Get message statistics for an agent
     */
    async getMessageStats(agent) {
        const stats = {
            incoming: 0,
            outgoing: 0,
            processed: 0
        };

        try {
            // Count incoming messages
            const incomingFiles = await fs.readdir(agent.incomingRequestsPath);
            stats.incoming = incomingFiles.filter(file => file.endsWith('.json')).length;

            // Count processed messages
            const processedDir = path.join(agent.incomingRequestsPath, 'processed');
            try {
                const processedFiles = await fs.readdir(processedDir);
                stats.processed = processedFiles.filter(file => file.endsWith('.json')).length;
            } catch (error) {
                // Processed directory might not exist yet
                stats.processed = 0;
            }

            // Count outgoing messages
            const outgoingFiles = await fs.readdir(agent.outgoingRequestsPath);
            stats.outgoing = outgoingFiles.filter(file => file.endsWith('.json')).length;

        } catch (error) {
            console.error(`Error getting message stats for agent ${agent.agentId}:`, error);
        }

        return stats;
    }

    /**
     * Update system-wide metrics
     */
    async updateSystemMetrics() {
        let totalTasks = 0;
        let totalMessages = 0;

        for (const [agentId, metrics] of this.metrics.agentMetrics) {
            totalTasks += metrics.tasks.total;
            totalMessages += metrics.messages.incoming + metrics.messages.outgoing;
        }

        this.metrics.totalTasks = totalTasks;
        this.metrics.totalMessages = totalMessages;
    }

    /**
     * Calculate system uptime
     */
    calculateUptime() {
        if (!this.metrics.systemStartTime) {
            return 0;
        }

        const startTime = new Date(this.metrics.systemStartTime);
        const currentTime = new Date();
        return Math.floor((currentTime - startTime) / 1000); // Uptime in seconds
    }

    /**
     * Get current system status
     */
    async getSystemStatus() {
        await this.collectMetrics();

        const agents = Array.from(this.metrics.agentMetrics.values());
        const healthyAgents = agents.filter(a => a.health.status === 'healthy').length;
        const warningAgents = agents.filter(a => a.health.status === 'warning').length;
        const unhealthyAgents = agents.filter(a => a.health.status === 'unhealthy').length;

        return {
            timestamp: new Date().toISOString(),
            uptime: this.calculateUptime(),
            totalAgents: agents.length,
            agentHealth: {
                healthy: healthyAgents,
                warning: warningAgents,
                unhealthy: unhealthyAgents
            },
            totalTasks: this.metrics.totalTasks,
            totalMessages: this.metrics.totalMessages,
            agents: agents
        };
    }

    /**
     * Get agent-specific status
     */
    async getAgentStatus(agentId) {
        const agent = this.system.getAgent(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        await this.collectAgentMetrics(agent);
        return this.metrics.agentMetrics.get(agentId);
    }

    /**
     * Get performance metrics
     */
    async getPerformanceMetrics() {
        const status = await this.getSystemStatus();
        
        return {
            timestamp: status.timestamp,
            uptime: status.uptime,
            averageTasksPerAgent: status.totalAgents > 0 ? status.totalTasks / status.totalAgents : 0,
            averageMessagesPerAgent: status.totalAgents > 0 ? status.totalMessages / status.totalAgents : 0,
            systemHealth: {
                healthyPercentage: status.totalAgents > 0 ? (status.agentHealth.healthy / status.totalAgents) * 100 : 0,
                warningPercentage: status.totalAgents > 0 ? (status.agentHealth.warning / status.totalAgents) * 100 : 0,
                unhealthyPercentage: status.totalAgents > 0 ? (status.agentHealth.unhealthy / status.totalAgents) * 100 : 0
            }
        };
    }

    /**
     * Generate health report
     */
    async generateHealthReport() {
        const status = await this.getSystemStatus();
        const performance = await this.getPerformanceMetrics();

        const report = {
            reportTimestamp: new Date().toISOString(),
            systemOverview: {
                uptime: status.uptime,
                totalAgents: status.totalAgents,
                totalTasks: status.totalTasks,
                totalMessages: status.totalMessages
            },
            healthSummary: status.agentHealth,
            performance: performance,
            agentDetails: status.agents.map(agent => ({
                agentId: agent.agentId,
                health: agent.health.status,
                issues: agent.health.issues,
                taskCount: agent.tasks.total,
                activeRelationships: agent.relationships.activeRelationships
            })),
            recommendations: this.generateRecommendations(status)
        };

        return report;
    }

    /**
     * Generate recommendations based on system status
     */
    generateRecommendations(status) {
        const recommendations = [];

        // Check for unhealthy agents
        const unhealthyAgents = status.agents.filter(a => a.health.status === 'unhealthy');
        if (unhealthyAgents.length > 0) {
            recommendations.push({
                type: 'critical',
                message: `${unhealthyAgents.length} agents are unhealthy and need immediate attention`,
                agents: unhealthyAgents.map(a => a.agentId)
            });
        }

        // Check for agents with many blocked tasks
        const agentsWithBlockedTasks = status.agents.filter(a => 
            a.health.issues.some(issue => issue.includes('blocked tasks'))
        );
        if (agentsWithBlockedTasks.length > 0) {
            recommendations.push({
                type: 'warning',
                message: 'Some agents have blocked tasks that may need resolution',
                agents: agentsWithBlockedTasks.map(a => a.agentId)
            });
        }

        // Check for agents with no relationships
        const isolatedAgents = status.agents.filter(a => a.relationships.totalRelationships === 0);
        if (isolatedAgents.length > 0) {
            recommendations.push({
                type: 'info',
                message: 'Some agents have no relationships and may be isolated',
                agents: isolatedAgents.map(a => a.agentId)
            });
        }

        return recommendations;
    }

    /**
     * Save monitoring report to file
     */
    async saveReport(report, filename = null) {
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `monitoring-report-${timestamp}.json`;
        }

        const reportsDir = './reports';
        await fs.mkdir(reportsDir, { recursive: true });
        
        const reportPath = path.join(reportsDir, filename);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
        
        console.log(`Monitoring report saved to ${reportPath}`);
        return reportPath;
    }
}

module.exports = SystemMonitor;
