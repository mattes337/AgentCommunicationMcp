/**
 * RelationshipManager for managing agent relationships and dependencies
 * Implements consumer-producer relationships and dependency tracking
 */

const fs = require('fs').promises;

class RelationshipManager {
    constructor(agent) {
        this.agent = agent;
    }

    /**
     * Add a consumer relationship (this agent produces for the consumer)
     */
    async addConsumer(consumerAgentId, relationshipType = 'direct') {
        const relationships = await this.agent.getRelationships();
        
        const existingConsumer = relationships.consumers.find(c => c.agentId === consumerAgentId);
        if (existingConsumer) {
            console.log(`Consumer relationship with ${consumerAgentId} already exists`);
            return;
        }

        relationships.consumers.push({
            agentId: consumerAgentId,
            type: relationshipType,
            established: new Date().toISOString(),
            status: 'active'
        });

        await this.agent.updateRelationships(relationships);
        await this.agent.appendToContext(`Added consumer relationship with ${consumerAgentId} (${relationshipType})`);
        
        console.log(`Agent ${this.agent.agentId} added consumer: ${consumerAgentId}`);
    }

    /**
     * Add a producer relationship (this agent consumes from the producer)
     */
    async addProducer(producerAgentId, relationshipType = 'direct') {
        const relationships = await this.agent.getRelationships();
        
        const existingProducer = relationships.producers.find(p => p.agentId === producerAgentId);
        if (existingProducer) {
            console.log(`Producer relationship with ${producerAgentId} already exists`);
            return;
        }

        relationships.producers.push({
            agentId: producerAgentId,
            type: relationshipType,
            established: new Date().toISOString(),
            status: 'active'
        });

        await this.agent.updateRelationships(relationships);
        await this.agent.appendToContext(`Added producer relationship with ${producerAgentId} (${relationshipType})`);
        
        console.log(`Agent ${this.agent.agentId} added producer: ${producerAgentId}`);
    }

    /**
     * Add a bidirectional relationship
     */
    async addBidirectionalRelationship(otherAgentId, relationshipType = 'bidirectional') {
        const relationships = await this.agent.getRelationships();
        
        const existingBidirectional = relationships.bidirectional.find(b => b.agentId === otherAgentId);
        if (existingBidirectional) {
            console.log(`Bidirectional relationship with ${otherAgentId} already exists`);
            return;
        }

        relationships.bidirectional.push({
            agentId: otherAgentId,
            type: relationshipType,
            established: new Date().toISOString(),
            status: 'active'
        });

        await this.agent.updateRelationships(relationships);
        await this.agent.appendToContext(`Added bidirectional relationship with ${otherAgentId}`);
        
        console.log(`Agent ${this.agent.agentId} added bidirectional relationship: ${otherAgentId}`);
    }

    /**
     * Add an optional relationship
     */
    async addOptionalRelationship(otherAgentId, relationshipType = 'optional') {
        const relationships = await this.agent.getRelationships();
        
        const existingOptional = relationships.optional.find(o => o.agentId === otherAgentId);
        if (existingOptional) {
            console.log(`Optional relationship with ${otherAgentId} already exists`);
            return;
        }

        relationships.optional.push({
            agentId: otherAgentId,
            type: relationshipType,
            established: new Date().toISOString(),
            status: 'active'
        });

        await this.agent.updateRelationships(relationships);
        await this.agent.appendToContext(`Added optional relationship with ${otherAgentId}`);
        
        console.log(`Agent ${this.agent.agentId} added optional relationship: ${otherAgentId}`);
    }

    /**
     * Remove a relationship
     */
    async removeRelationship(otherAgentId) {
        const relationships = await this.agent.getRelationships();
        let removed = false;

        // Remove from consumers
        const consumerIndex = relationships.consumers.findIndex(c => c.agentId === otherAgentId);
        if (consumerIndex > -1) {
            relationships.consumers.splice(consumerIndex, 1);
            removed = true;
        }

        // Remove from producers
        const producerIndex = relationships.producers.findIndex(p => p.agentId === otherAgentId);
        if (producerIndex > -1) {
            relationships.producers.splice(producerIndex, 1);
            removed = true;
        }

        // Remove from bidirectional
        const bidirectionalIndex = relationships.bidirectional.findIndex(b => b.agentId === otherAgentId);
        if (bidirectionalIndex > -1) {
            relationships.bidirectional.splice(bidirectionalIndex, 1);
            removed = true;
        }

        // Remove from optional
        const optionalIndex = relationships.optional.findIndex(o => o.agentId === otherAgentId);
        if (optionalIndex > -1) {
            relationships.optional.splice(optionalIndex, 1);
            removed = true;
        }

        if (removed) {
            await this.agent.updateRelationships(relationships);
            await this.agent.appendToContext(`Removed relationship with ${otherAgentId}`);
            console.log(`Agent ${this.agent.agentId} removed relationship with: ${otherAgentId}`);
        } else {
            console.log(`No relationship found with ${otherAgentId} to remove`);
        }

        return removed;
    }

    /**
     * Get all related agents
     */
    async getAllRelatedAgents() {
        const relationships = await this.agent.getRelationships();
        const relatedAgents = new Set();

        relationships.consumers.forEach(c => relatedAgents.add(c.agentId));
        relationships.producers.forEach(p => relatedAgents.add(p.agentId));
        relationships.bidirectional.forEach(b => relatedAgents.add(b.agentId));
        relationships.optional.forEach(o => relatedAgents.add(o.agentId));

        return Array.from(relatedAgents);
    }

    /**
     * Get consumers (agents that depend on this agent)
     */
    async getConsumers() {
        const relationships = await this.agent.getRelationships();
        return relationships.consumers;
    }

    /**
     * Get producers (agents this agent depends on)
     */
    async getProducers() {
        const relationships = await this.agent.getRelationships();
        return relationships.producers;
    }

    /**
     * Get bidirectional relationships
     */
    async getBidirectionalRelationships() {
        const relationships = await this.agent.getRelationships();
        return relationships.bidirectional;
    }

    /**
     * Get optional relationships
     */
    async getOptionalRelationships() {
        const relationships = await this.agent.getRelationships();
        return relationships.optional;
    }

    /**
     * Check if agent has a relationship with another agent
     */
    async hasRelationshipWith(otherAgentId) {
        const relatedAgents = await this.getAllRelatedAgents();
        return relatedAgents.includes(otherAgentId);
    }

    /**
     * Get relationship type with another agent
     */
    async getRelationshipType(otherAgentId) {
        const relationships = await this.agent.getRelationships();

        // Check consumers
        const consumer = relationships.consumers.find(c => c.agentId === otherAgentId);
        if (consumer) return { category: 'consumer', type: consumer.type };

        // Check producers
        const producer = relationships.producers.find(p => p.agentId === otherAgentId);
        if (producer) return { category: 'producer', type: producer.type };

        // Check bidirectional
        const bidirectional = relationships.bidirectional.find(b => b.agentId === otherAgentId);
        if (bidirectional) return { category: 'bidirectional', type: bidirectional.type };

        // Check optional
        const optional = relationships.optional.find(o => o.agentId === otherAgentId);
        if (optional) return { category: 'optional', type: optional.type };

        return null;
    }

    /**
     * Update relationship status
     */
    async updateRelationshipStatus(otherAgentId, newStatus) {
        const relationships = await this.agent.getRelationships();
        let updated = false;

        // Update in all relationship categories
        const categories = ['consumers', 'producers', 'bidirectional', 'optional'];
        
        for (const category of categories) {
            const relationship = relationships[category].find(r => r.agentId === otherAgentId);
            if (relationship) {
                relationship.status = newStatus;
                relationship.lastUpdated = new Date().toISOString();
                updated = true;
            }
        }

        if (updated) {
            await this.agent.updateRelationships(relationships);
            await this.agent.appendToContext(`Updated relationship status with ${otherAgentId} to ${newStatus}`);
            console.log(`Agent ${this.agent.agentId} updated relationship status with ${otherAgentId} to ${newStatus}`);
        }

        return updated;
    }

    /**
     * Get dependency chain (agents this agent depends on, recursively)
     */
    async getDependencyChain(visited = new Set()) {
        if (visited.has(this.agent.agentId)) {
            return []; // Avoid circular dependencies
        }

        visited.add(this.agent.agentId);
        const producers = await this.getProducers();
        const dependencyChain = [];

        for (const producer of producers) {
            dependencyChain.push(producer.agentId);
            // Note: For a full recursive implementation, we'd need access to other agents
            // This is a simplified version that shows direct dependencies
        }

        return dependencyChain;
    }

    /**
     * Get relationship statistics
     */
    async getRelationshipStats() {
        const relationships = await this.agent.getRelationships();
        
        return {
            totalRelationships: relationships.consumers.length + 
                              relationships.producers.length + 
                              relationships.bidirectional.length + 
                              relationships.optional.length,
            consumers: relationships.consumers.length,
            producers: relationships.producers.length,
            bidirectional: relationships.bidirectional.length,
            optional: relationships.optional.length,
            activeRelationships: this.countActiveRelationships(relationships),
            inactiveRelationships: this.countInactiveRelationships(relationships)
        };
    }

    /**
     * Count active relationships
     */
    countActiveRelationships(relationships) {
        let count = 0;
        const categories = ['consumers', 'producers', 'bidirectional', 'optional'];
        
        for (const category of categories) {
            count += relationships[category].filter(r => r.status === 'active').length;
        }
        
        return count;
    }

    /**
     * Count inactive relationships
     */
    countInactiveRelationships(relationships) {
        let count = 0;
        const categories = ['consumers', 'producers', 'bidirectional', 'optional'];
        
        for (const category of categories) {
            count += relationships[category].filter(r => r.status !== 'active').length;
        }
        
        return count;
    }
}

module.exports = RelationshipManager;
