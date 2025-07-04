/**
 * Comprehensive Demo for Agent Communication MCP System
 * Showcases the multi-agent communication capabilities
 */

const { AgentCommunicationSystem, Task } = require('../src/index');
const SystemMonitor = require('../src/monitoring/SystemMonitor');

class MCPDemo {
    constructor() {
        this.system = new AgentCommunicationSystem();
        this.monitor = new SystemMonitor(this.system);
    }

    /**
     * Run the complete demo
     */
    async run() {
        console.log('🚀 Starting Agent Communication MCP Demo...\n');

        try {
            // Start the system
            await this.system.start();
            await this.monitor.start();

            // Phase 1: Setup agents
            console.log('📋 Phase 1: Setting up agents...');
            await this.setupAgents();

            // Phase 2: Establish relationships
            console.log('\n🔗 Phase 2: Establishing agent relationships...');
            await this.establishRelationships();

            // Phase 3: Create and execute tasks
            console.log('\n📝 Phase 3: Creating and executing tasks...');
            await this.createTasks();

            // Phase 4: Simulate task execution
            console.log('\n⚡ Phase 4: Simulating task execution...');
            await this.simulateTaskExecution();

            // Phase 5: Monitor system
            console.log('\n📊 Phase 5: Monitoring system status...');
            await this.monitorSystem();

            // Phase 6: Generate reports
            console.log('\n📈 Phase 6: Generating reports...');
            await this.generateReports();

            console.log('\n✅ Demo completed successfully!');

        } catch (error) {
            console.error('❌ Demo failed:', error);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Setup demo agents
     */
    async setupAgents() {
        // Frontend Agent
        const frontendAgent = await this.system.registerAgent('frontend-agent');
        await frontendAgent.updateContext(`
# Frontend Agent

## Role
Responsible for developing user interface components and managing client-side functionality.

## Capabilities
- React/Vue.js component development
- CSS/SCSS styling
- Client-side state management
- API integration
- User experience optimization

## Current Projects
- User authentication interface
- Dashboard components
- Mobile responsive design
        `);

        // API Agent
        const apiAgent = await this.system.registerAgent('api-agent');
        await apiAgent.updateContext(`
# API Agent

## Role
Develops and maintains REST API endpoints and backend services.

## Capabilities
- RESTful API design
- Authentication and authorization
- Data validation
- Error handling
- API documentation

## Current Projects
- User management API
- Authentication endpoints
- Data processing services
        `);

        // Database Agent
        const dbAgent = await this.system.registerAgent('database-agent');
        await dbAgent.updateContext(`
# Database Agent

## Role
Manages database schema, queries, and data persistence layer.

## Capabilities
- Database schema design
- Query optimization
- Data migration
- Backup and recovery
- Performance tuning

## Current Projects
- User database schema
- Authentication tables
- Data indexing optimization
        `);

        console.log('   ✓ Frontend Agent registered');
        console.log('   ✓ API Agent registered');
        console.log('   ✓ Database Agent registered');
    }

    /**
     * Establish relationships between agents
     */
    async establishRelationships() {
        const frontendAgent = this.system.getAgent('frontend-agent');
        const apiAgent = this.system.getAgent('api-agent');
        const dbAgent = this.system.getAgent('database-agent');

        // Frontend consumes API services
        await frontendAgent.relationshipManager.addProducer('api-agent', 'direct');
        await apiAgent.relationshipManager.addConsumer('frontend-agent', 'direct');

        // API consumes Database services
        await apiAgent.relationshipManager.addProducer('database-agent', 'direct');
        await dbAgent.relationshipManager.addConsumer('api-agent', 'direct');

        console.log('   ✓ Frontend → API relationship established');
        console.log('   ✓ API → Database relationship established');
    }

    /**
     * Create demo tasks
     */
    async createTasks() {
        // Task 1: Frontend requests authentication API
        await this.system.createTaskRequest('frontend-agent', 'api-agent', {
            title: 'Create User Authentication API',
            description: 'Need REST endpoints for user login, logout, registration, and password reset functionality',
            priority: 'high',
            deliverables: [
                '/api/auth/login',
                '/api/auth/logout', 
                '/api/auth/register',
                '/api/auth/reset-password',
                'API documentation'
            ],
            metadata: {
                estimated_effort: '12 hours',
                tags: ['authentication', 'api', 'security', 'rest'],
                communication_thread: 'auth-api-thread'
            }
        });

        // Task 2: API requests database schema
        await this.system.createTaskRequest('api-agent', 'database-agent', {
            title: 'Create User Management Database Schema',
            description: 'Need database tables and schema for user management with proper indexing and constraints',
            priority: 'high',
            deliverables: [
                'users table schema',
                'user_sessions table schema',
                'password_resets table schema',
                'database migration scripts',
                'indexing strategy'
            ],
            metadata: {
                estimated_effort: '8 hours',
                tags: ['database', 'schema', 'users', 'migration'],
                communication_thread: 'user-db-thread'
            }
        });

        // Task 3: Frontend requests dashboard components
        await this.system.createTaskRequest('frontend-agent', 'api-agent', {
            title: 'Create Dashboard Data API',
            description: 'Need API endpoints to provide dashboard data and analytics',
            priority: 'medium',
            deliverables: [
                '/api/dashboard/stats',
                '/api/dashboard/analytics',
                '/api/dashboard/recent-activity'
            ],
            metadata: {
                estimated_effort: '6 hours',
                tags: ['dashboard', 'analytics', 'api'],
                communication_thread: 'dashboard-api-thread'
            }
        });

        console.log('   ✓ Authentication API task created');
        console.log('   ✓ Database schema task created');
        console.log('   ✓ Dashboard API task created');
    }

    /**
     * Simulate task execution
     */
    async simulateTaskExecution() {
        const apiAgent = this.system.getAgent('api-agent');
        const dbAgent = this.system.getAgent('database-agent');

        // Simulate database agent completing schema task
        const dbTasks = await dbAgent.taskQueue.getPendingTasks();
        if (dbTasks.length > 0) {
            const schemaTask = dbTasks[0];
            await dbAgent.taskQueue.activateTask(schemaTask.id);
            
            // Simulate work being done
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await dbAgent.taskQueue.completeTask(schemaTask.id, [
                'users_table_created.sql',
                'user_sessions_table_created.sql', 
                'migration_001_initial_schema.sql'
            ]);

            await dbAgent.appendToContext('Completed user management database schema with proper indexing and constraints');
            console.log('   ✓ Database schema task completed');
        }

        // Simulate API agent working on authentication
        const apiTasks = await apiAgent.taskQueue.getPendingTasks();
        if (apiTasks.length > 0) {
            const authTask = apiTasks.find(task => task.title.includes('Authentication'));
            if (authTask) {
                await apiAgent.taskQueue.activateTask(authTask.id);
                await apiAgent.appendToContext('Started working on authentication API endpoints');
                console.log('   ✓ Authentication API task activated');
            }
        }
    }

    /**
     * Monitor system status
     */
    async monitorSystem() {
        const status = await this.system.getSystemStatus();
        
        console.log('   📊 System Status:');
        console.log(`      Total Agents: ${status.totalAgents}`);
        console.log(`      Total Tasks: ${status.agents.reduce((sum, agent) => sum + agent.total, 0)}`);
        console.log(`      Active Tasks: ${status.agents.reduce((sum, agent) => sum + agent.active, 0)}`);
        console.log(`      Completed Tasks: ${status.agents.reduce((sum, agent) => sum + agent.completed, 0)}`);

        // Show agent details
        for (const agent of status.agents) {
            console.log(`      ${agent.agentId}: ${agent.active} active, ${agent.pending} pending, ${agent.completed} completed`);
        }
    }

    /**
     * Generate reports
     */
    async generateReports() {
        const healthReport = await this.monitor.generateHealthReport();
        const reportPath = await this.monitor.saveReport(healthReport, 'demo-health-report.json');
        
        console.log(`   ✓ Health report generated: ${reportPath}`);
        
        // Show summary
        console.log('   📋 Health Summary:');
        console.log(`      Healthy Agents: ${healthReport.healthSummary.healthy}`);
        console.log(`      Warning Agents: ${healthReport.healthSummary.warning}`);
        console.log(`      Unhealthy Agents: ${healthReport.healthSummary.unhealthy}`);
        
        if (healthReport.recommendations.length > 0) {
            console.log('   💡 Recommendations:');
            healthReport.recommendations.forEach(rec => {
                console.log(`      ${rec.type.toUpperCase()}: ${rec.message}`);
            });
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        await this.monitor.stop();
        await this.system.stop();
        console.log('   ✓ System stopped');
    }
}

// Run demo if this file is executed directly
if (require.main === module) {
    const demo = new MCPDemo();
    demo.run().catch(error => {
        console.error('Demo error:', error);
        process.exit(1);
    });
}

module.exports = MCPDemo;
