/*******************************************************************************

    OblivionFilter - Garbage Collection Optimization Engine v2.0.0
    Copyright (C) 2025 OblivionFilter Contributors

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    Home: https://github.com/734ai/OblivionFilter

*******************************************************************************/

'use strict';

/******************************************************************************/

// Garbage Collection Optimization Engine for OblivionFilter
// Intelligent memory management and automatic cleanup systems
const GarbageCollectionOptimizer = (function() {

    /******************************************************************************/

    // Configuration
    const config = {
        enabled: true,
        
        // Memory management settings
        memory: {
            maxHeapSize: 256 * 1024 * 1024, // 256MB
            gcThreshold: 0.8, // Trigger GC at 80% memory usage
            forceGcThreshold: 0.95, // Force GC at 95% memory usage
            cleanupInterval: 30000, // 30 seconds
            deepCleanupInterval: 300000, // 5 minutes
            memoryPressureThreshold: 0.7
        },
        
        // Object lifecycle management
        lifecycle: {
            maxObjectAge: 300000, // 5 minutes
            maxCacheSize: 10000,
            maxStringPoolSize: 5000,
            maxEventListeners: 1000,
            weakRefEnabled: true,
            finalizationEnabled: true
        },
        
        // Performance optimization
        performance: {
            batchProcessing: true,
            lazyCleanup: true,
            incrementalGc: true,
            generationalGc: true,
            compactionEnabled: true,
            priorityLevels: 5
        },
        
        // Monitoring and analytics
        monitoring: {
            trackMemoryUsage: true,
            trackObjectLifecycles: true,
            trackGcEvents: true,
            reportingEnabled: true,
            metricsRetention: 3600000 // 1 hour
        }
    };

    /******************************************************************************/

    // State management
    const state = {
        initialized: false,
        memoryUsage: {
            current: 0,
            peak: 0,
            baseline: 0,
            lastMeasurement: 0
        },
        gcStats: {
            totalCollections: 0,
            totalCleanedObjects: 0,
            totalReclaimedMemory: 0,
            lastCollection: 0,
            averageCollectionTime: 0,
            collectionsPerHour: 0
        },
        objectRegistry: new Map(),
        weakRefRegistry: new Set(),
        finalizationRegistry: null,
        activeTimers: new Set(),
        cleanupQueue: [],
        metricHistory: []
    };

    /******************************************************************************/

    // Memory Monitoring System
    const MemoryMonitor = {
        
        // Initialize memory monitoring
        initialize() {
            console.log('[GC] Initializing memory monitoring system...');
            
            // Setup FinalizationRegistry if available
            if (typeof FinalizationRegistry !== 'undefined') {
                state.finalizationRegistry = new FinalizationRegistry(this.handleFinalization.bind(this));
                console.log('[GC] FinalizationRegistry enabled');
            }
            
            // Start memory monitoring
            this.startMonitoring();
            
            console.log('[GC] Memory monitoring system initialized');
        },
        
        // Start continuous monitoring
        startMonitoring() {
            // Regular memory checks
            const monitoringTimer = setInterval(() => {
                this.measureMemoryUsage();
                this.checkMemoryPressure();
            }, 5000); // Every 5 seconds
            
            state.activeTimers.add(monitoringTimer);
            
            // Performance observer for memory
            if (typeof PerformanceObserver !== 'undefined') {
                try {
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (entry.name === 'measure') {
                                this.recordMetric('performance', entry.duration);
                            }
                        }
                    });
                    
                    observer.observe({ entryTypes: ['measure'] });
                } catch (error) {
                    console.warn('[GC] Performance monitoring not available:', error.message);
                }
            }
        },
        
        // Measure current memory usage
        measureMemoryUsage() {
            let memoryInfo = null;
            
            // Try different memory measurement APIs
            if (performance.memory) {
                memoryInfo = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            } else if (navigator.deviceMemory) {
                // Estimate based on device memory
                const estimatedUsage = this.estimateMemoryUsage();
                memoryInfo = {
                    used: estimatedUsage,
                    total: navigator.deviceMemory * 1024 * 1024 * 1024 / 10, // 10% of device memory
                    limit: navigator.deviceMemory * 1024 * 1024 * 1024
                };
            } else {
                // Fallback estimation
                const estimatedUsage = this.estimateMemoryUsage();
                memoryInfo = {
                    used: estimatedUsage,
                    total: config.memory.maxHeapSize,
                    limit: config.memory.maxHeapSize
                };
            }
            
            // Update state
            state.memoryUsage.current = memoryInfo.used;
            state.memoryUsage.peak = Math.max(state.memoryUsage.peak, memoryInfo.used);
            state.memoryUsage.lastMeasurement = Date.now();
            
            // Record metric
            this.recordMetric('memory', {
                used: memoryInfo.used,
                total: memoryInfo.total,
                ratio: memoryInfo.used / memoryInfo.total,
                timestamp: Date.now()
            });
            
            return memoryInfo;
        },
        
        // Estimate memory usage
        estimateMemoryUsage() {
            let estimatedSize = 0;
            
            // Count objects in registry
            estimatedSize += state.objectRegistry.size * 100; // Average 100 bytes per object
            
            // Estimate based on DOM elements
            if (typeof document !== 'undefined') {
                const elementCount = document.querySelectorAll('*').length;
                estimatedSize += elementCount * 200; // Average 200 bytes per element
            }
            
            // Estimate based on active timers and listeners
            estimatedSize += state.activeTimers.size * 50;
            
            return estimatedSize;
        },
        
        // Check for memory pressure
        checkMemoryPressure() {
            const memoryInfo = this.measureMemoryUsage();
            const pressureRatio = memoryInfo.used / memoryInfo.total;
            
            if (pressureRatio > config.memory.forceGcThreshold) {
                console.warn('[GC] Critical memory pressure detected, forcing garbage collection');
                GarbageCollector.forceCollection();
                
            } else if (pressureRatio > config.memory.gcThreshold) {
                console.log('[GC] Memory pressure detected, triggering garbage collection');
                GarbageCollector.triggerCollection();
                
            } else if (pressureRatio > config.memory.memoryPressureThreshold) {
                console.log('[GC] Moderate memory pressure, starting proactive cleanup');
                ObjectLifecycleManager.performProactiveCleanup();
            }
        },
        
        // Handle object finalization
        handleFinalization(objectId) {
            console.log(`[GC] Object finalized: ${objectId}`);
            
            // Remove from registry
            state.objectRegistry.delete(objectId);
            
            // Update statistics
            state.gcStats.totalCleanedObjects++;
            
            // Record metric
            this.recordMetric('finalization', {
                objectId: objectId,
                timestamp: Date.now()
            });
        },
        
        // Record metric
        recordMetric(type, data) {
            if (!config.monitoring.trackMemoryUsage) return;
            
            const metric = {
                type: type,
                data: data,
                timestamp: Date.now()
            };
            
            state.metricHistory.push(metric);
            
            // Cleanup old metrics
            const retentionCutoff = Date.now() - config.monitoring.metricsRetention;
            state.metricHistory = state.metricHistory.filter(m => m.timestamp > retentionCutoff);
        }
    };

    /******************************************************************************/

    // Object Lifecycle Manager
    const ObjectLifecycleManager = {
        
        // Register object for lifecycle management
        registerObject(object, metadata = {}) {
            const objectId = this.generateObjectId();
            
            const registration = {
                id: objectId,
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                accessCount: 0,
                type: metadata.type || 'unknown',
                priority: metadata.priority || 1,
                persistent: metadata.persistent || false,
                cleanupCallback: metadata.cleanupCallback
            };
            
            state.objectRegistry.set(objectId, registration);
            
            // Register with FinalizationRegistry if available
            if (state.finalizationRegistry && config.lifecycle.finalizationEnabled) {
                state.finalizationRegistry.register(object, objectId);
            }
            
            // Create WeakRef if enabled
            if (config.lifecycle.weakRefEnabled && typeof WeakRef !== 'undefined') {
                const weakRef = new WeakRef(object);
                state.weakRefRegistry.add({
                    ref: weakRef,
                    objectId: objectId,
                    registration: registration
                });
            }
            
            return objectId;
        },
        
        // Update object access
        updateObjectAccess(objectId) {
            const registration = state.objectRegistry.get(objectId);
            if (registration) {
                registration.lastAccessed = Date.now();
                registration.accessCount++;
            }
        },
        
        // Check if object is eligible for cleanup
        isEligibleForCleanup(registration) {
            const now = Date.now();
            const age = now - registration.createdAt;
            const timeSinceAccess = now - registration.lastAccessed;
            
            // Skip persistent objects
            if (registration.persistent) return false;
            
            // Check age-based cleanup
            if (age > config.lifecycle.maxObjectAge) return true;
            
            // Check access-based cleanup
            if (timeSinceAccess > config.lifecycle.maxObjectAge / 2 && registration.accessCount < 5) {
                return true;
            }
            
            return false;
        },
        
        // Perform proactive cleanup
        performProactiveCleanup() {
            console.log('[GC] Starting proactive object cleanup...');
            
            const startTime = performance.now();
            let cleanedObjects = 0;
            
            // Cleanup objects in registry
            for (const [objectId, registration] of state.objectRegistry.entries()) {
                if (this.isEligibleForCleanup(registration)) {
                    this.cleanupObject(objectId, registration);
                    cleanedObjects++;
                }
            }
            
            // Cleanup WeakRefs
            cleanedObjects += this.cleanupWeakRefs();
            
            // Cleanup timers
            cleanedObjects += this.cleanupTimers();
            
            const endTime = performance.now();
            console.log(`[GC] Proactive cleanup completed: ${cleanedObjects} objects cleaned in ${(endTime - startTime).toFixed(2)}ms`);
            
            // Update statistics
            state.gcStats.totalCleanedObjects += cleanedObjects;
            
            return cleanedObjects;
        },
        
        // Cleanup specific object
        cleanupObject(objectId, registration) {
            // Call cleanup callback if provided
            if (registration.cleanupCallback) {
                try {
                    registration.cleanupCallback();
                } catch (error) {
                    console.warn(`[GC] Cleanup callback error for object ${objectId}:`, error);
                }
            }
            
            // Remove from registry
            state.objectRegistry.delete(objectId);
            
            // Record cleanup
            MemoryMonitor.recordMetric('cleanup', {
                objectId: objectId,
                type: registration.type,
                age: Date.now() - registration.createdAt,
                accessCount: registration.accessCount
            });
        },
        
        // Cleanup WeakRefs
        cleanupWeakRefs() {
            let cleanedCount = 0;
            
            const deadRefs = [];
            for (const weakRefEntry of state.weakRefRegistry) {
                if (weakRefEntry.ref.deref() === undefined) {
                    deadRefs.push(weakRefEntry);
                    cleanedCount++;
                }
            }
            
            // Remove dead references
            deadRefs.forEach(deadRef => {
                state.weakRefRegistry.delete(deadRef);
                state.objectRegistry.delete(deadRef.objectId);
            });
            
            return cleanedCount;
        },
        
        // Cleanup timers
        cleanupTimers() {
            let cleanedCount = 0;
            
            // Check and cleanup inactive timers
            const currentTimers = new Set();
            for (const timer of state.activeTimers) {
                // Timer cleanup would be implementation specific
                // For now, just track active timers
                if (typeof timer === 'number') {
                    currentTimers.add(timer);
                }
            }
            
            cleanedCount = state.activeTimers.size - currentTimers.size;
            state.activeTimers = currentTimers;
            
            return cleanedCount;
        },
        
        // Generate unique object ID
        generateObjectId() {
            return 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    };

    /******************************************************************************/

    // Garbage Collector
    const GarbageCollector = {
        
        // Initialize garbage collector
        initialize() {
            console.log('[GC] Initializing garbage collector...');
            
            // Setup regular cleanup intervals
            this.setupCleanupIntervals();
            
            // Setup garbage collection triggers
            this.setupGcTriggers();
            
            console.log('[GC] Garbage collector initialized');
        },
        
        // Setup cleanup intervals
        setupCleanupIntervals() {
            // Regular cleanup
            const regularCleanup = setInterval(() => {
                this.performRegularCollection();
            }, config.memory.cleanupInterval);
            
            state.activeTimers.add(regularCleanup);
            
            // Deep cleanup
            const deepCleanup = setInterval(() => {
                this.performDeepCollection();
            }, config.memory.deepCleanupInterval);
            
            state.activeTimers.add(deepCleanup);
        },
        
        // Setup GC triggers
        setupGcTriggers() {
            // Browser native GC triggers
            if (typeof window !== 'undefined') {
                // Page visibility change
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        this.triggerCollection();
                    }
                });
                
                // Before unload
                window.addEventListener('beforeunload', () => {
                    this.performFinalCleanup();
                });
                
                // Low memory warning (if available)
                if ('onmemorywarning' in window) {
                    window.addEventListener('memorywarning', () => {
                        this.forceCollection();
                    });
                }
            }
        },
        
        // Trigger garbage collection
        triggerCollection() {
            if (!config.enabled) return;
            
            console.log('[GC] Triggering garbage collection...');
            const startTime = performance.now();
            
            // Perform object cleanup
            const cleanedObjects = ObjectLifecycleManager.performProactiveCleanup();
            
            // Force browser GC if available
            this.requestBrowserGc();
            
            const endTime = performance.now();
            const collectionTime = endTime - startTime;
            
            // Update statistics
            state.gcStats.totalCollections++;
            state.gcStats.lastCollection = Date.now();
            state.gcStats.averageCollectionTime = 
                (state.gcStats.averageCollectionTime + collectionTime) / 2;
            
            console.log(`[GC] Garbage collection completed: ${cleanedObjects} objects cleaned in ${collectionTime.toFixed(2)}ms`);
            
            return {
                cleanedObjects: cleanedObjects,
                collectionTime: collectionTime
            };
        },
        
        // Force immediate garbage collection
        forceCollection() {
            console.log('[GC] Forcing immediate garbage collection...');
            
            const result = this.triggerCollection();
            
            // Additional aggressive cleanup
            this.performAggressiveCleanup();
            
            return result;
        },
        
        // Perform regular collection
        performRegularCollection() {
            // Check if collection is needed
            const memoryInfo = MemoryMonitor.measureMemoryUsage();
            const memoryRatio = memoryInfo.used / memoryInfo.total;
            
            if (memoryRatio > config.memory.gcThreshold) {
                this.triggerCollection();
            }
        },
        
        // Perform deep collection
        performDeepCollection() {
            console.log('[GC] Performing deep garbage collection...');
            
            const startTime = performance.now();
            
            // Aggressive object cleanup
            let totalCleaned = 0;
            
            // Clean all eligible objects
            for (const [objectId, registration] of state.objectRegistry.entries()) {
                if (ObjectLifecycleManager.isEligibleForCleanup(registration)) {
                    ObjectLifecycleManager.cleanupObject(objectId, registration);
                    totalCleaned++;
                }
            }
            
            // Cleanup WeakRefs
            totalCleaned += ObjectLifecycleManager.cleanupWeakRefs();
            
            // Cleanup timers
            totalCleaned += ObjectLifecycleManager.cleanupTimers();
            
            // Compact object registry
            this.compactRegistry();
            
            // Force browser GC
            this.requestBrowserGc();
            
            const endTime = performance.now();
            console.log(`[GC] Deep collection completed: ${totalCleaned} objects cleaned in ${(endTime - startTime).toFixed(2)}ms`);
            
            return totalCleaned;
        },
        
        // Perform aggressive cleanup
        performAggressiveCleanup() {
            console.log('[GC] Performing aggressive cleanup...');
            
            // Lower priority cleanup
            for (const [objectId, registration] of state.objectRegistry.entries()) {
                if (registration.priority <= 2 && !registration.persistent) {
                    ObjectLifecycleManager.cleanupObject(objectId, registration);
                }
            }
            
            // Clear metrics history (keep only recent)
            const recentCutoff = Date.now() - (config.monitoring.metricsRetention / 2);
            state.metricHistory = state.metricHistory.filter(m => m.timestamp > recentCutoff);
            
            // Clear cleanup queue
            state.cleanupQueue = [];
        },
        
        // Perform final cleanup
        performFinalCleanup() {
            console.log('[GC] Performing final cleanup...');
            
            // Clear all timers
            for (const timer of state.activeTimers) {
                clearInterval(timer);
                clearTimeout(timer);
            }
            state.activeTimers.clear();
            
            // Clear all registrations
            state.objectRegistry.clear();
            state.weakRefRegistry.clear();
            
            // Clear metrics
            state.metricHistory = [];
            
            console.log('[GC] Final cleanup completed');
        },
        
        // Request browser garbage collection
        requestBrowserGc() {
            // Try different methods to trigger browser GC
            if (typeof window !== 'undefined') {
                // Chrome/Blink
                if (window.gc) {
                    window.gc();
                }
                
                // Force memory reclamation
                if (window.webkitRequestMemoryInfo) {
                    window.webkitRequestMemoryInfo();
                }
            }
            
            // Node.js
            if (typeof global !== 'undefined' && global.gc) {
                global.gc();
            }
        },
        
        // Compact object registry
        compactRegistry() {
            const compactedRegistry = new Map();
            
            // Copy non-deleted entries
            for (const [objectId, registration] of state.objectRegistry.entries()) {
                if (registration && !ObjectLifecycleManager.isEligibleForCleanup(registration)) {
                    compactedRegistry.set(objectId, registration);
                }
            }
            
            state.objectRegistry = compactedRegistry;
        }
    };

    /******************************************************************************/

    // Memory Pool Manager
    const MemoryPoolManager = {
        
        // Object pools for reuse
        objectPools: new Map(),
        
        // Initialize memory pools
        initialize() {
            console.log('[GC] Initializing memory pools...');
            
            // Common object pools
            this.createPool('array', () => [], (arr) => { arr.length = 0; });
            this.createPool('object', () => ({}), (obj) => { 
                for (const key in obj) delete obj[key]; 
            });
            this.createPool('set', () => new Set(), (set) => set.clear());
            this.createPool('map', () => new Map(), (map) => map.clear());
            
            console.log('[GC] Memory pools initialized');
        },
        
        // Create object pool
        createPool(type, factory, reset, maxSize = 100) {
            const pool = {
                type: type,
                factory: factory,
                reset: reset,
                maxSize: maxSize,
                available: [],
                inUse: new Set()
            };
            
            this.objectPools.set(type, pool);
            return pool;
        },
        
        // Get object from pool
        acquire(type) {
            const pool = this.objectPools.get(type);
            if (!pool) return null;
            
            let object;
            
            if (pool.available.length > 0) {
                object = pool.available.pop();
            } else {
                object = pool.factory();
            }
            
            pool.inUse.add(object);
            return object;
        },
        
        // Return object to pool
        release(type, object) {
            const pool = this.objectPools.get(type);
            if (!pool || !pool.inUse.has(object)) return false;
            
            // Reset object state
            if (pool.reset) {
                pool.reset(object);
            }
            
            // Return to pool if under max size
            pool.inUse.delete(object);
            
            if (pool.available.length < pool.maxSize) {
                pool.available.push(object);
                return true;
            }
            
            return false;
        },
        
        // Clean pools
        cleanPools() {
            let totalCleaned = 0;
            
            for (const [type, pool] of this.objectPools.entries()) {
                const cleaned = Math.floor(pool.available.length / 2);
                pool.available.splice(0, cleaned);
                totalCleaned += cleaned;
            }
            
            return totalCleaned;
        }
    };

    /******************************************************************************/

    // Performance Analytics
    const PerformanceAnalytics = {
        
        // Generate memory report
        generateMemoryReport() {
            const report = {
                timestamp: Date.now(),
                memory: {
                    current: state.memoryUsage.current,
                    peak: state.memoryUsage.peak,
                    baseline: state.memoryUsage.baseline,
                    efficiency: this.calculateMemoryEfficiency()
                },
                gc: {
                    totalCollections: state.gcStats.totalCollections,
                    totalCleanedObjects: state.gcStats.totalCleanedObjects,
                    averageCollectionTime: state.gcStats.averageCollectionTime,
                    collectionsPerHour: this.calculateCollectionsPerHour(),
                    efficiency: this.calculateGcEfficiency()
                },
                objects: {
                    registered: state.objectRegistry.size,
                    weakRefs: state.weakRefRegistry.size,
                    averageAge: this.calculateAverageObjectAge(),
                    typeDistribution: this.getObjectTypeDistribution()
                },
                recommendations: this.generateRecommendations()
            };
            
            return report;
        },
        
        // Calculate memory efficiency
        calculateMemoryEfficiency() {
            if (state.memoryUsage.peak === 0) return 1;
            return 1 - (state.memoryUsage.current / state.memoryUsage.peak);
        },
        
        // Calculate GC efficiency
        calculateGcEfficiency() {
            const recentMetrics = state.metricHistory
                .filter(m => m.type === 'memory' && m.timestamp > Date.now() - 3600000)
                .map(m => m.data.used);
            
            if (recentMetrics.length < 2) return 1;
            
            const start = recentMetrics[0];
            const end = recentMetrics[recentMetrics.length - 1];
            
            return start > 0 ? Math.max(0, 1 - (end / start)) : 1;
        },
        
        // Calculate collections per hour
        calculateCollectionsPerHour() {
            const hourAgo = Date.now() - 3600000;
            const recentCollections = state.metricHistory
                .filter(m => m.type === 'cleanup' && m.timestamp > hourAgo)
                .length;
            
            return recentCollections;
        },
        
        // Calculate average object age
        calculateAverageObjectAge() {
            if (state.objectRegistry.size === 0) return 0;
            
            const now = Date.now();
            const totalAge = Array.from(state.objectRegistry.values())
                .reduce((sum, reg) => sum + (now - reg.createdAt), 0);
            
            return totalAge / state.objectRegistry.size;
        },
        
        // Get object type distribution
        getObjectTypeDistribution() {
            const distribution = {};
            
            for (const registration of state.objectRegistry.values()) {
                distribution[registration.type] = (distribution[registration.type] || 0) + 1;
            }
            
            return distribution;
        },
        
        // Generate recommendations
        generateRecommendations() {
            const recommendations = [];
            
            // Memory recommendations
            const memoryRatio = state.memoryUsage.current / config.memory.maxHeapSize;
            if (memoryRatio > 0.8) {
                recommendations.push({
                    type: 'memory',
                    priority: 'high',
                    message: 'Memory usage is high. Consider reducing object lifetime or increasing cleanup frequency.'
                });
            }
            
            // GC frequency recommendations
            if (state.gcStats.averageCollectionTime > 100) {
                recommendations.push({
                    type: 'performance',
                    priority: 'medium',
                    message: 'Garbage collection is taking too long. Consider incremental cleanup strategies.'
                });
            }
            
            // Object count recommendations
            if (state.objectRegistry.size > config.lifecycle.maxCacheSize) {
                recommendations.push({
                    type: 'objects',
                    priority: 'medium',
                    message: 'Too many objects in registry. Consider more aggressive cleanup policies.'
                });
            }
            
            return recommendations;
        }
    };

    /******************************************************************************/

    // Main Garbage Collection Optimizer Interface
    let initialized = false;

    // Initialize Garbage Collection Optimizer
    const initialize = async function() {
        if (initialized) return;
        
        console.log('[GC] Garbage Collection Optimizer v2.0.0 initializing...');
        
        try {
            // Initialize components
            MemoryMonitor.initialize();
            ObjectLifecycleManager.initialize?.();
            GarbageCollector.initialize();
            MemoryPoolManager.initialize();
            
            // Set baseline memory usage
            const memoryInfo = MemoryMonitor.measureMemoryUsage();
            state.memoryUsage.baseline = memoryInfo.used;
            
            initialized = true;
            state.initialized = true;
            
            console.log('[GC] Garbage Collection Optimizer v2.0.0 initialized successfully');
            console.log(`[GC] Baseline memory usage: ${(memoryInfo.used / 1024 / 1024).toFixed(2)}MB`);
            
        } catch (error) {
            console.error('[GC] Garbage Collection Optimizer initialization failed:', error);
            throw error;
        }
    };

    // Register object for management
    const registerObject = function(object, metadata) {
        return ObjectLifecycleManager.registerObject(object, metadata);
    };

    // Update object access
    const touchObject = function(objectId) {
        ObjectLifecycleManager.updateObjectAccess(objectId);
    };

    // Force garbage collection
    const forceGC = function() {
        return GarbageCollector.forceCollection();
    };

    // Get memory statistics
    const getStats = function() {
        return {
            memory: { ...state.memoryUsage },
            gc: { ...state.gcStats },
            objects: state.objectRegistry.size,
            weakRefs: state.weakRefRegistry.size,
            timers: state.activeTimers.size
        };
    };

    // Generate performance report
    const generateReport = function() {
        return PerformanceAnalytics.generateMemoryReport();
    };

    // Update configuration
    const updateConfig = function(newConfig) {
        Object.assign(config, newConfig);
        console.log('[GC] Configuration updated');
    };

    // Acquire pooled object
    const acquirePooledObject = function(type) {
        return MemoryPoolManager.acquire(type);
    };

    // Release pooled object
    const releasePooledObject = function(type, object) {
        return MemoryPoolManager.release(type, object);
    };

    /******************************************************************************/

    // Public API
    return {
        initialize,
        registerObject,
        touchObject,
        forceGC,
        getStats,
        generateReport,
        updateConfig,
        acquirePooledObject,
        releasePooledObject,
        
        // Sub-modules for direct access
        MemoryMonitor,
        ObjectLifecycleManager,
        GarbageCollector,
        MemoryPoolManager,
        PerformanceAnalytics,
        
        // Configuration access
        get config() { return { ...config }; },
        get initialized() { return initialized; }
    };

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            GarbageCollectionOptimizer.initialize().catch(console.error);
        });
    } else {
        GarbageCollectionOptimizer.initialize().catch(console.error);
    }
}

/******************************************************************************/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GarbageCollectionOptimizer;
}
