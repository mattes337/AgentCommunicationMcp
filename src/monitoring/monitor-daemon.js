/**
 * Monitoring Daemon for Docker deployment
 * Runs as a separate container to monitor the MCP system
 */

const fs = require('fs').promises;
const path = require('path');

class MonitorDaemon {
    constructor() {
        this.isRunning = false;
        this.monitorInterval = null;
        this.intervalMs = parseInt(process.env.MCP_MONITOR_INTERVAL) || 5000;
        this.agentsPath = './agents';
        this.reportsPath = './reports';
        this.logsPath = './logs';
    }

    /**
     * Start the monitoring daemon
     */
    async start() {
        console.log('Starting MCP Monitor Daemon...');
        
        this.isRunning = true;
        
        // Ensure directories exist
        await this.ensureDirectories();
        
        // Start monitoring loop
        this.monitorInterval = setInterval(() => {
            this.monitorSystem();
        }, this.intervalMs);

        console.log(`Monitor daemon started with ${this.intervalMs}ms interval`);
        
        // Handle graceful shutdown
        process.on('SIGTERM', () => this.stop());
        process.on('SIGINT', () => this.stop());
    }

    /**
     * Stop the monitoring daemon
     */
    async stop() {
        console.log('Stopping MCP Monitor Daemon...');
        
        this.isRunning = false;
        
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        
        console.log('Monitor daemon stopped');
        process.exit(0);
    }

    /**
     * Ensure required directories exist
     */
    async ensureDirectories() {
        const directories = [this.agentsPath, this.reportsPath, this.logsPath];
        
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.error(`Error creating directory ${dir}:`, error);
            }
        }
    }

    /**
     * Monitor the system
     */
    async monitorSystem() {
        try {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Running system monitor check...`);
            
            const report = await this.generateMonitoringReport();
            await this.saveMonitoringReport(report);
            
            // Log summary
            console.log(`[${timestamp}] Monitored ${report.totalAgents} agents, ${report.totalTasks} tasks, ${report.totalMessages} messages`);
            
            // Check for issues
            if (report.issues.length > 0) {
                console.warn(`[${timestamp}] Found ${report.issues.length} issues:`);
                report.issues.forEach(issue => console.warn(`  - ${issue}`));
            }
            
        } catch (error) {
            console.error('Error during monitoring:', error);
        }
    }

    /**
     * Generate monitoring report
     */
    async generateMonitoringReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalAgents: 0,
            totalTasks: 0,
            totalMessages: 0,
            agents: [],
            issues: []
        };

        try {
            // Scan for agent directories
            const agentDirs = await this.getAgentDirectories();
            report.totalAgents = agentDirs.length;

            for (const agentDir of agentDirs) {
                const agentReport = await this.monitorAgent(agentDir);
                report.agents.push(agentReport);
                report.totalTasks += agentReport.totalTasks;
                report.totalMessages += agentReport.totalMessages;
                report.issues.push(...agentReport.issues);
            }

        } catch (error) {
            report.issues.push(`Error scanning agents: ${error.message}`);
        }

        return report;
    }

    /**
     * Get list of agent directories
     */
    async getAgentDirectories() {
        try {
            const entries = await fs.readdir(this.agentsPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Monitor a specific agent
     */
    async monitorAgent(agentId) {
        const agentPath = path.join(this.agentsPath, agentId);
        const agentReport = {
            agentId,
            timestamp: new Date().toISOString(),
            totalTasks: 0,
            totalMessages: 0,
            health: 'unknown',
            issues: []
        };

        try {
            // Check agent files
            const requiredFiles = [
                'context.md',
                'relationships.json',
                'mcp_config.json',
                'tasks/active.json',
                'tasks/pending.json',
                'tasks/completed.json'
            ];

            for (const file of requiredFiles) {
                const filePath = path.join(agentPath, file);
                try {
                    await fs.access(filePath);
                } catch (error) {
                    agentReport.issues.push(`Missing file: ${file}`);
                }
            }

            // Count tasks
            try {
                const taskFiles = ['tasks/active.json', 'tasks/pending.json', 'tasks/completed.json'];
                for (const taskFile of taskFiles) {
                    const filePath = path.join(agentPath, taskFile);
                    try {
                        const content = await fs.readFile(filePath, 'utf8');
                        const tasks = JSON.parse(content);
                        agentReport.totalTasks += Array.isArray(tasks) ? tasks.length : 0;
                    } catch (error) {
                        // File might not exist or be invalid JSON
                    }
                }
            } catch (error) {
                agentReport.issues.push(`Error counting tasks: ${error.message}`);
            }

            // Count messages
            try {
                const messagesDirs = ['tasks/requests/incoming', 'tasks/requests/outgoing'];
                for (const messagesDir of messagesDirs) {
                    const dirPath = path.join(agentPath, messagesDir);
                    try {
                        const files = await fs.readdir(dirPath);
                        const jsonFiles = files.filter(file => file.endsWith('.json'));
                        agentReport.totalMessages += jsonFiles.length;
                    } catch (error) {
                        // Directory might not exist
                    }
                }
            } catch (error) {
                agentReport.issues.push(`Error counting messages: ${error.message}`);
            }

            // Determine health
            agentReport.health = agentReport.issues.length === 0 ? 'healthy' : 'issues';

        } catch (error) {
            agentReport.issues.push(`Error monitoring agent: ${error.message}`);
            agentReport.health = 'error';
        }

        return agentReport;
    }

    /**
     * Save monitoring report
     */
    async saveMonitoringReport(report) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `monitor-report-${timestamp}.json`;
            const reportPath = path.join(this.reportsPath, filename);
            
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
            
            // Also save as latest report
            const latestPath = path.join(this.reportsPath, 'latest-monitor-report.json');
            await fs.writeFile(latestPath, JSON.stringify(report, null, 2), 'utf8');
            
        } catch (error) {
            console.error('Error saving monitoring report:', error);
        }
    }
}

// Start the daemon if this file is run directly
if (require.main === module) {
    const daemon = new MonitorDaemon();
    daemon.start().catch(error => {
        console.error('Failed to start monitor daemon:', error);
        process.exit(1);
    });
}

module.exports = MonitorDaemon;
