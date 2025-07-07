/**
 * Task class for the Multi-Agent Communication System
 * Represents individual tasks with the structure defined in the PRD
 */

const { v4: uuidv4 } = require('uuid');

class Task {
    constructor(options = {}) {
        this.id = options.id || uuidv4();
        this.type = options.type || 'implementation'; // implementation|request|response
        this.title = options.title || '';
        this.description = options.description || '';
        this.priority = options.priority || 'medium'; // high|medium|low
        this.status = options.status || 'pending'; // pending|in_progress|completed|blocked
        this.created_at = options.created_at || new Date().toISOString();
        this.updated_at = options.updated_at || new Date().toISOString();
        this.agent_id = options.agent_id || ''; // Agent responsible for the task
        this.created_by = options.created_by || options.agent_id || ''; // Agent who created the task
        this.target_agent_id = options.target_agent_id || null;
        this.reference_task_id = options.reference_task_id || null;
        this.dependencies = options.dependencies || [];
        this.deliverables = options.deliverables || [];
        this.metadata = {
            estimated_effort: options.metadata?.estimated_effort || null,
            tags: options.metadata?.tags || [],
            communication_thread: options.metadata?.communication_thread || null,
            ...options.metadata
        };
    }

    /**
     * Update task status and timestamp
     */
    updateStatus(newStatus) {
        this.status = newStatus;
        this.updated_at = new Date().toISOString();
    }

    /**
     * Add a dependency to this task
     */
    addDependency(taskId) {
        if (!this.dependencies.includes(taskId)) {
            this.dependencies.push(taskId);
            this.updated_at = new Date().toISOString();
        }
    }

    /**
     * Remove a dependency from this task
     */
    removeDependency(taskId) {
        const index = this.dependencies.indexOf(taskId);
        if (index > -1) {
            this.dependencies.splice(index, 1);
            this.updated_at = new Date().toISOString();
        }
    }

    /**
     * Add a deliverable to this task
     */
    addDeliverable(deliverable) {
        if (!this.deliverables.includes(deliverable)) {
            this.deliverables.push(deliverable);
            this.updated_at = new Date().toISOString();
        }
    }

    /**
     * Add a tag to this task
     */
    addTag(tag) {
        if (!this.metadata.tags.includes(tag)) {
            this.metadata.tags.push(tag);
            this.updated_at = new Date().toISOString();
        }
    }

    /**
     * Check if task is ready to be executed (all dependencies met)
     */
    isReady(completedTaskIds = []) {
        return this.dependencies.every(depId => completedTaskIds.includes(depId));
    }

    /**
     * Check if task is a request type
     */
    isRequest() {
        return this.type === 'request';
    }

    /**
     * Check if task is a response type
     */
    isResponse() {
        return this.type === 'response';
    }

    /**
     * Check if task is an implementation type
     */
    isImplementation() {
        return this.type === 'implementation';
    }

    /**
     * Create a response task for this request
     */
    createResponse(respondingAgentId, responseData = {}) {
        if (!this.isRequest()) {
            throw new Error('Can only create responses for request tasks');
        }

        return new Task({
            type: 'response',
            title: `Response to: ${this.title}`,
            description: responseData.description || `Response to request: ${this.description}`,
            priority: this.priority,
            agent_id: respondingAgentId,
            created_by: respondingAgentId,
            target_agent_id: this.agent_id,
            reference_task_id: this.id,
            deliverables: responseData.deliverables || [],
            metadata: {
                ...responseData.metadata,
                communication_thread: this.metadata.communication_thread || this.id
            }
        });
    }

    /**
     * Convert task to JSON for file storage
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            title: this.title,
            description: this.description,
            priority: this.priority,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at,
            agent_id: this.agent_id,
            created_by: this.created_by,
            target_agent_id: this.target_agent_id,
            reference_task_id: this.reference_task_id,
            dependencies: this.dependencies,
            deliverables: this.deliverables,
            metadata: this.metadata
        };
    }

    /**
     * Create Task instance from JSON data
     */
    static fromJSON(data) {
        return new Task(data);
    }

    /**
     * Validate task data structure
     */
    validate() {
        const errors = [];

        if (!this.id) errors.push('Task ID is required');
        if (!this.title) errors.push('Task title is required');
        if (!this.agent_id) errors.push('Agent ID is required');
        if (!this.created_by) errors.push('Task creator (created_by) is required');
        if (!['implementation', 'request', 'response'].includes(this.type)) {
            errors.push('Task type must be implementation, request, or response');
        }
        if (!['high', 'medium', 'low'].includes(this.priority)) {
            errors.push('Task priority must be high, medium, or low');
        }
        if (!['pending', 'in_progress', 'completed', 'blocked'].includes(this.status)) {
            errors.push('Task status must be pending, in_progress, completed, or blocked');
        }

        // Validate request/response specific fields
        if (this.type === 'request' && !this.target_agent_id) {
            errors.push('Request tasks must have a target_agent_id');
        }
        if (this.type === 'response' && !this.reference_task_id) {
            errors.push('Response tasks must have a reference_task_id');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = Task;
