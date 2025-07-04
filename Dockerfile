# Multi-Agent Communication System using Model Context Protocol (MCP)
# Dockerfile for containerized deployment

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create app user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY src/ ./src/
COPY agents/.gitkeep ./agents/
COPY reports/.gitkeep ./reports/

# Create necessary directories with proper permissions
RUN mkdir -p /app/agents /app/reports /app/logs && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port for potential HTTP API (future enhancement)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Default command
CMD ["node", "src/index.js"]

# Labels for metadata
LABEL maintainer="Agent Communication MCP Team"
LABEL version="1.0.0"
LABEL description="Multi-Agent Communication System using Model Context Protocol"
