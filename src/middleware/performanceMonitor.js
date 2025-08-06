const os = require('os');
const cluster = require('cluster');

/**
 * Performance monitoring and resource management system
 * Tracks system metrics, memory usage, and automatically optimizes performance
 */
class PerformanceMonitor {
    constructor(options = {}) {
        this.config = {
            memoryThresholdMB: options.memoryThresholdMB || 512,
            cpuThresholdPercent: options.cpuThresholdPercent || 80,
            monitorInterval: options.monitorInterval || 30000, // 30 seconds
            alertThreshold: options.alertThreshold || 3, // Alert after 3 consecutive high readings
            gcInterval: options.gcInterval || 5 * 60 * 1000, // 5 minutes
            maxCacheSize: options.maxCacheSize || 1000,
            operationTimeout: options.operationTimeout || 30000 // 30 seconds
        };

        this.metrics = {
            cpu: [],
            memory: [],
            operations: new Map(),
            cacheHits: 0,
            cacheMisses: 0,
            totalRequests: 0,
            errorRate: 0
        };

        this.alerts = {
            consecutiveHighCpu: 0,
            consecutiveHighMemory: 0,
            lastGc: Date.now()
        };

        this.cache = new Map();
        this.operationTimeouts = new Map();
        
        this.startMonitoring();
        this.startOptimizations();
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        setInterval(() => {
            this.collectMetrics();
            this.checkThresholds();
            this.cleanupOldMetrics();
        }, this.config.monitorInterval);

        // Log performance summary every 5 minutes
        setInterval(() => {
            this.logPerformanceSummary();
        }, 5 * 60 * 1000);
    }

    /**
     * Start optimization tasks
     */
    startOptimizations() {
        // Garbage collection hint
        setInterval(() => {
            this.performGarbageCollection();
        }, this.config.gcInterval);

        // Cache cleanup
        setInterval(() => {
            this.cleanupCache();
        }, 2 * 60 * 1000); // Every 2 minutes

        // Operation timeout cleanup
        setInterval(() => {
            this.cleanupTimeouts();
        }, 60 * 1000); // Every minute
    }

    /**
     * Collect system metrics
     */
    collectMetrics() {
        try {
            // CPU usage
            const cpuUsage = process.cpuUsage();
            const cpuPercent = this.calculateCpuPercent(cpuUsage);
            this.metrics.cpu.push({
                timestamp: Date.now(),
                percent: cpuPercent,
                usage: cpuUsage
            });

            // Memory usage
            const memoryUsage = process.memoryUsage();
            const memoryMB = {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024)
            };

            this.metrics.memory.push({
                timestamp: Date.now(),
                ...memoryMB
            });

            // System information
            const systemMetrics = {
                loadAverage: os.loadavg(),
                freeMemory: Math.round(os.freemem() / 1024 / 1024),
                totalMemory: Math.round(os.totalmem() / 1024 / 1024),
                uptime: os.uptime()
            };

            return {
                cpu: cpuPercent,
                memory: memoryMB,
                system: systemMetrics,
                cache: {
                    size: this.cache.size,
                    hitRate: this.calculateCacheHitRate()
                }
            };

        } catch (error) {
            console.error('Error collecting metrics:', error);
            return null;
        }
    }

    /**
     * Calculate CPU percentage
     */
    calculateCpuPercent(cpuUsage) {
        if (!this.lastCpuUsage) {
            this.lastCpuUsage = cpuUsage;
            return 0;
        }

        const userDiff = cpuUsage.user - this.lastCpuUsage.user;
        const systemDiff = cpuUsage.system - this.lastCpuUsage.system;
        const totalDiff = userDiff + systemDiff;

        this.lastCpuUsage = cpuUsage;
        
        // Convert microseconds to percentage
        return Math.round((totalDiff / 1000 / this.config.monitorInterval) * 100);
    }

    /**
     * Check performance thresholds and trigger alerts
     */
    checkThresholds() {
        const currentCpu = this.metrics.cpu[this.metrics.cpu.length - 1];
        const currentMemory = this.metrics.memory[this.metrics.memory.length - 1];

        if (!currentCpu || !currentMemory) return;

        // CPU threshold check
        if (currentCpu.percent > this.config.cpuThresholdPercent) {
            this.alerts.consecutiveHighCpu++;
            if (this.alerts.consecutiveHighCpu >= this.config.alertThreshold) {
                this.handleHighCpuAlert(currentCpu.percent);
            }
        } else {
            this.alerts.consecutiveHighCpu = 0;
        }

        // Memory threshold check
        if (currentMemory.heapUsed > this.config.memoryThresholdMB) {
            this.alerts.consecutiveHighMemory++;
            if (this.alerts.consecutiveHighMemory >= this.config.alertThreshold) {
                this.handleHighMemoryAlert(currentMemory.heapUsed);
            }
        } else {
            this.alerts.consecutiveHighMemory = 0;
        }
    }

    /**
     * Handle high CPU alert
     */
    handleHighCpuAlert(cpuPercent) {
        console.warn(`🚨 High CPU usage detected: ${cpuPercent}%`);
        
        // Trigger optimizations
        this.optimizeForHighCpu();
        
        // Reset alert counter
        this.alerts.consecutiveHighCpu = 0;
    }

    /**
     * Handle high memory alert
     */
    handleHighMemoryAlert(memoryMB) {
        console.warn(`🚨 High memory usage detected: ${memoryMB}MB`);
        
        // Trigger optimizations
        this.optimizeForHighMemory();
        
        // Reset alert counter
        this.alerts.consecutiveHighMemory = 0;
    }

    /**
     * Optimize for high CPU usage
     */
    optimizeForHighCpu() {
        // Reduce operation concurrency
        console.log('🔧 Optimizing for high CPU usage');
        
        // Clear non-essential caches
        this.cache.clear();
        
        // Suggest garbage collection
        this.performGarbageCollection();
        
        // Log optimization action
        console.log('✅ CPU optimization completed');
    }

    /**
     * Optimize for high memory usage
     */
    optimizeForHighMemory() {
        console.log('🔧 Optimizing for high memory usage');
        
        // Aggressive cache cleanup
        this.cache.clear();
        
        // Clear old metrics
        this.metrics.cpu = this.metrics.cpu.slice(-10);
        this.metrics.memory = this.metrics.memory.slice(-10);
        
        // Force garbage collection
        this.performGarbageCollection();
        
        // Clear completed operations
        this.cleanupOperations();
        
        console.log('✅ Memory optimization completed');
    }

    /**
     * Perform garbage collection
     */
    performGarbageCollection() {
        try {
            if (global.gc) {
                global.gc();
                this.alerts.lastGc = Date.now();
                console.log('🗑️ Garbage collection performed');
            } else {
                console.log('⚠️ Garbage collection not available (start with --expose-gc)');
            }
        } catch (error) {
            console.error('Error performing garbage collection:', error);
        }
    }

    /**
     * Track operation performance
     */
    startOperation(operationId, operationName, timeout = null) {
        const operation = {
            id: operationId,
            name: operationName,
            startTime: Date.now(),
            timeout: timeout || this.config.operationTimeout
        };

        this.metrics.operations.set(operationId, operation);

        // Set timeout
        const timeoutId = setTimeout(() => {
            this.handleOperationTimeout(operationId);
        }, operation.timeout);

        this.operationTimeouts.set(operationId, timeoutId);

        return operation;
    }

    /**
     * End operation tracking
     */
    endOperation(operationId, success = true, details = {}) {
        const operation = this.metrics.operations.get(operationId);
        if (!operation) return null;

        const endTime = Date.now();
        const duration = endTime - operation.startTime;

        // Clear timeout
        const timeoutId = this.operationTimeouts.get(operationId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.operationTimeouts.delete(operationId);
        }

        // Update operation
        operation.endTime = endTime;
        operation.duration = duration;
        operation.success = success;
        operation.details = details;

        // Remove from active operations
        this.metrics.operations.delete(operationId);

        // Log slow operations
        if (duration > 5000) { // 5 seconds
            console.warn(`🐌 Slow operation detected: ${operation.name} took ${duration}ms`);
        }

        return operation;
    }

    /**
     * Handle operation timeout
     */
    handleOperationTimeout(operationId) {
        const operation = this.metrics.operations.get(operationId);
        if (operation) {
            console.warn(`⏰ Operation timeout: ${operation.name} (${operationId})`);
            
            operation.timedOut = true;
            operation.endTime = Date.now();
            operation.duration = operation.endTime - operation.startTime;
            
            this.metrics.operations.delete(operationId);
        }
    }

    /**
     * Cache management
     */
    setCache(key, value, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
        if (this.cache.size >= this.config.maxCacheSize) {
            // Remove oldest entries
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl,
            hits: 0
        });
    }

    getCache(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.metrics.cacheMisses++;
            return null;
        }

        // Check TTL
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            this.metrics.cacheMisses++;
            return null;
        }

        item.hits++;
        this.metrics.cacheHits++;
        return item.value;
    }

    /**
     * Calculate cache hit rate
     */
    calculateCacheHitRate() {
        const total = this.metrics.cacheHits + this.metrics.cacheMisses;
        return total > 0 ? Math.round((this.metrics.cacheHits / total) * 100) : 0;
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
        }
    }

    /**
     * Clean up operation timeouts
     */
    cleanupTimeouts() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [operationId, operation] of this.metrics.operations.entries()) {
            if (now - operation.startTime > operation.timeout) {
                this.handleOperationTimeout(operationId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} timed out operations`);
        }
    }

    /**
     * Clean up completed operations
     */
    cleanupOperations() {
        this.metrics.operations.clear();
        this.operationTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.operationTimeouts.clear();
    }

    /**
     * Clean up old metrics
     */
    cleanupOldMetrics() {
        const maxMetrics = 100; // Keep last 100 readings
        
        if (this.metrics.cpu.length > maxMetrics) {
            this.metrics.cpu = this.metrics.cpu.slice(-maxMetrics);
        }
        
        if (this.metrics.memory.length > maxMetrics) {
            this.metrics.memory = this.metrics.memory.slice(-maxMetrics);
        }
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const recentCpu = this.metrics.cpu.slice(-10);
        const recentMemory = this.metrics.memory.slice(-10);

        const avgCpu = recentCpu.length > 0 
            ? Math.round(recentCpu.reduce((sum, m) => sum + m.percent, 0) / recentCpu.length)
            : 0;

        const avgMemory = recentMemory.length > 0
            ? Math.round(recentMemory.reduce((sum, m) => sum + m.heapUsed, 0) / recentMemory.length)
            : 0;

        return {
            timestamp: Date.now(),
            cpu: {
                average: avgCpu,
                current: recentCpu[recentCpu.length - 1]?.percent || 0,
                peak: Math.max(...recentCpu.map(m => m.percent))
            },
            memory: {
                average: avgMemory,
                current: recentMemory[recentMemory.length - 1]?.heapUsed || 0,
                peak: Math.max(...recentMemory.map(m => m.heapUsed))
            },
            cache: {
                size: this.cache.size,
                hitRate: this.calculateCacheHitRate(),
                hits: this.metrics.cacheHits,
                misses: this.metrics.cacheMisses
            },
            operations: {
                active: this.metrics.operations.size,
                timeouts: this.operationTimeouts.size
            },
            system: {
                uptime: process.uptime(),
                nodeVersion: process.version,
                platform: process.platform
            }
        };
    }

    /**
     * Log performance summary
     */
    logPerformanceSummary() {
        const summary = this.getPerformanceSummary();
        console.log('📊 Performance Summary:', {
            cpu: `${summary.cpu.current}% (avg: ${summary.cpu.average}%)`,
            memory: `${summary.memory.current}MB (avg: ${summary.memory.average}MB)`,
            cache: `${summary.cache.size} items (${summary.cache.hitRate}% hit rate)`,
            operations: `${summary.operations.active} active`
        });
    }

    /**
     * Get recommendations for optimization
     */
    getOptimizationRecommendations() {
        const summary = this.getPerformanceSummary();
        const recommendations = [];

        if (summary.cpu.average > this.config.cpuThresholdPercent) {
            recommendations.push({
                type: 'cpu',
                severity: 'high',
                message: 'High CPU usage detected. Consider optimizing algorithms or scaling horizontally.',
                action: 'optimize_cpu'
            });
        }

        if (summary.memory.average > this.config.memoryThresholdMB) {
            recommendations.push({
                type: 'memory',
                severity: 'high', 
                message: 'High memory usage detected. Consider implementing memory cleanup or increasing limits.',
                action: 'optimize_memory'
            });
        }

        if (summary.cache.hitRate < 50) {
            recommendations.push({
                type: 'cache',
                severity: 'medium',
                message: 'Low cache hit rate. Consider adjusting cache TTL or cache key strategy.',
                action: 'optimize_cache'
            });
        }

        if (summary.operations.active > 50) {
            recommendations.push({
                type: 'operations',
                severity: 'medium',
                message: 'High number of active operations. Consider implementing operation queuing.',
                action: 'implement_queuing'
            });
        }

        return recommendations;
    }

    /**
     * Health check for performance monitor
     */
    healthCheck() {
        const summary = this.getPerformanceSummary();
        const recommendations = this.getOptimizationRecommendations();
        
        const isHealthy = summary.cpu.current < this.config.cpuThresholdPercent &&
                         summary.memory.current < this.config.memoryThresholdMB &&
                         recommendations.filter(r => r.severity === 'high').length === 0;

        return {
            status: isHealthy ? 'healthy' : 'degraded',
            summary,
            recommendations,
            alerts: this.alerts
        };
    }
}

module.exports = PerformanceMonitor;