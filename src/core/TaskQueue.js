/**
 * TaskQueue class for managing agent task queues with file-based persistence
 */

const fs = require('fs').promises;
const path = require('path');
const Task = require('./Task');

class TaskQueue {
    constructor(agent) {
        this.agent = agent;
        this.activeTasksPath = agent.activeTasksPath;
        this.pendingTasksPath = agent.pendingTasksPath;
        this.completedTasksPath = agent.completedTasksPath;
        this.incomingRequestsPath = agent.incomingRequestsPath;
        this.outgoingRequestsPath = agent.outgoingRequestsPath;
    }

    /**
     * Load tasks from a specific file
     */
    async loadTasks(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const tasksData = JSON.parse(content);
            return tasksData.map(taskData => Task.fromJSON(taskData));
        } catch (error) {
            if (error.code === 'ENOENT') {
                return []; // File doesn't exist, return empty array
            }
            throw error;
        }
    }

    /**
     * Save tasks to a specific file
     */
    async saveTasks(filePath, tasks) {
        try {
            const tasksData = tasks.map(task => task.toJSON());
            await fs.writeFile(filePath, JSON.stringify(tasksData, null, 2), 'utf8');
        } catch (error) {
            console.error(`Failed to save tasks to ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Get all active tasks
     */
    async getActiveTasks() {
        return await this.loadTasks(this.activeTasksPath);
    }

    /**
     * Get all pending tasks
     */
    async getPendingTasks() {
        return await this.loadTasks(this.pendingTasksPath);
    }

    /**
     * Get all completed tasks
     */
    async getCompletedTasks() {
        return await this.loadTasks(this.completedTasksPath);
    }

    /**
     * Add a new task to the pending queue
     */
    async addTask(task) {
        if (!(task instanceof Task)) {
            throw new Error('Task must be an instance of Task class');
        }

        const validation = task.validate();
        if (!validation.isValid) {
            throw new Error(`Invalid task: ${validation.errors.join(', ')}`);
        }

        const pendingTasks = await this.getPendingTasks();
        pendingTasks.push(task);
        await this.saveTasks(this.pendingTasksPath, pendingTasks);

        console.log(`Task ${task.id} added to pending queue for agent ${this.agent.agentId}`);
        return task;
    }

    /**
     * Move a task from pending to active
     */
    async activateTask(taskId) {
        const pendingTasks = await this.getPendingTasks();
        const taskIndex = pendingTasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            throw new Error(`Task ${taskId} not found in pending queue`);
        }

        const task = pendingTasks[taskIndex];
        
        // Check if task dependencies are met
        const completedTasks = await this.getCompletedTasks();
        const completedTaskIds = completedTasks.map(t => t.id);
        
        if (!task.isReady(completedTaskIds)) {
            throw new Error(`Task ${taskId} dependencies not met`);
        }

        // Remove from pending
        pendingTasks.splice(taskIndex, 1);
        await this.saveTasks(this.pendingTasksPath, pendingTasks);

        // Add to active
        task.updateStatus('in_progress');
        const activeTasks = await this.getActiveTasks();
        activeTasks.push(task);
        await this.saveTasks(this.activeTasksPath, activeTasks);

        console.log(`Task ${taskId} activated for agent ${this.agent.agentId}`);
        return task;
    }

    /**
     * Complete a task (move from active to completed)
     */
    async completeTask(taskId, deliverables = []) {
        const activeTasks = await this.getActiveTasks();
        const taskIndex = activeTasks.findIndex(task => task.id === taskId);

        if (taskIndex === -1) {
            throw new Error(`Task ${taskId} not found in active queue`);
        }

        const task = activeTasks[taskIndex];

        // Update task with deliverables and completion status
        task.updateStatus('completed');
        deliverables.forEach(deliverable => task.addDeliverable(deliverable));

        // Remove from active
        activeTasks.splice(taskIndex, 1);
        await this.saveTasks(this.activeTasksPath, activeTasks);

        // Add to completed
        const completedTasks = await this.getCompletedTasks();
        completedTasks.push(task);
        await this.saveTasks(this.completedTasksPath, completedTasks);

        console.log(`Task ${taskId} completed for agent ${this.agent.agentId}`);
        return task;
    }

    /**
     * Block a task (set status to blocked)
     */
    async blockTask(taskId, reason = '') {
        const activeTasks = await this.getActiveTasks();
        const task = activeTasks.find(task => task.id === taskId);
        
        if (!task) {
            throw new Error(`Task ${taskId} not found in active queue`);
        }

        task.updateStatus('blocked');
        if (reason) {
            task.metadata.blockReason = reason;
        }

        await this.saveTasks(this.activeTasksPath, activeTasks);
        console.log(`Task ${taskId} blocked for agent ${this.agent.agentId}: ${reason}`);
        return task;
    }

    /**
     * Unblock a task (set status back to in_progress)
     */
    async unblockTask(taskId) {
        const activeTasks = await this.getActiveTasks();
        const task = activeTasks.find(task => task.id === taskId);
        
        if (!task) {
            throw new Error(`Task ${taskId} not found in active queue`);
        }

        task.updateStatus('in_progress');
        delete task.metadata.blockReason;

        await this.saveTasks(this.activeTasksPath, activeTasks);
        console.log(`Task ${taskId} unblocked for agent ${this.agent.agentId}`);
        return task;
    }

    /**
     * Get tasks ready for activation (dependencies met)
     */
    async getReadyTasks() {
        const pendingTasks = await this.getPendingTasks();
        const completedTasks = await this.getCompletedTasks();
        const completedTaskIds = completedTasks.map(t => t.id);

        return pendingTasks.filter(task => task.isReady(completedTaskIds));
    }

    /**
     * Get task by ID from any queue
     */
    async getTaskById(taskId) {
        const allQueues = [
            await this.getActiveTasks(),
            await this.getPendingTasks(),
            await this.getCompletedTasks()
        ];

        for (const queue of allQueues) {
            const task = queue.find(t => t.id === taskId);
            if (task) return task;
        }

        return null;
    }

    /**
     * Get all tasks across all queues
     */
    async getAllTasks() {
        const [active, pending, completed] = await Promise.all([
            this.getActiveTasks(),
            this.getPendingTasks(),
            this.getCompletedTasks()
        ]);

        return {
            active,
            pending,
            completed,
            total: active.length + pending.length + completed.length
        };
    }

    /**
     * Get task statistics
     */
    async getTaskStats() {
        const tasks = await this.getAllTasks();
        
        return {
            active: tasks.active.length,
            pending: tasks.pending.length,
            completed: tasks.completed.length,
            total: tasks.total,
            blocked: tasks.active.filter(t => t.status === 'blocked').length,
            ready: (await this.getReadyTasks()).length
        };
    }

    /**
     * Clean up old completed tasks (keep only recent ones)
     */
    async cleanupCompletedTasks(keepCount = 100) {
        const completedTasks = await this.getCompletedTasks();

        if (completedTasks.length > keepCount) {
            // Sort by completion date (most recent first)
            completedTasks.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

            // Keep only the most recent tasks
            const tasksToKeep = completedTasks.slice(0, keepCount);
            await this.saveTasks(this.completedTasksPath, tasksToKeep);

            console.log(`Cleaned up ${completedTasks.length - keepCount} old completed tasks for agent ${this.agent.agentId}`);
        }
    }
}

module.exports = TaskQueue;
