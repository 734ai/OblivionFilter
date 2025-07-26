/*******************************************************************************

    OblivionFilter - Streaming Data Processing Engine v2.0.0
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

// Streaming Data Processing Engine for OblivionFilter
// Real-time filter processing and continuous data stream optimization
const StreamingDataProcessor = (function() {

    /******************************************************************************/

    // Configuration
    const config = {
        enabled: true,
        
        // Stream processing settings
        streaming: {
            maxConcurrentStreams: 8,
            bufferSize: 64 * 1024, // 64KB
            chunkSize: 8 * 1024, // 8KB
            flushInterval: 100, // ms
            timeoutThreshold: 5000, // 5 seconds
            backpressureThreshold: 0.8, // 80% buffer capacity
            priorityLevels: 5
        },
        
        // Performance optimization
        performance: {
            useWebStreams: true,
            enableCompression: true,
            parallelProcessing: true,
            adaptiveBuffering: true,
            batchProcessing: true,
            lazyEvaluation: true
        },
        
        // Filter processing
        filtering: {
            realTimeProcessing: true,
            incrementalUpdates: true,
            deferredExecution: false,
            priorityBasedScheduling: true,
            contextAwareProcessing: true,
            predictiveLoading: true
        },
        
        // Error handling and recovery
        errorHandling: {
            retryAttempts: 3,
            retryDelay: 1000,
            fallbackEnabled: true,
            gracefulDegradation: true,
            circuitBreakerEnabled: true,
            deadLetterQueue: true
        }
    };

    /******************************************************************************/

    // State management
    const state = {
        initialized: false,
        activeStreams: new Map(),
        streamRegistry: new Map(),
        processingQueue: [],
        bufferPools: new Map(),
        metrics: {
            totalStreams: 0,
            processedBytes: 0,
            avgThroughput: 0,
            errorCount: 0,
            lastReset: Date.now()
        },
        circuitBreakers: new Map(),
        deadLetterQueue: []
    };

    /******************************************************************************/

    // Stream Manager
    const StreamManager = {
        
        // Initialize stream manager
        initialize() {
            console.log('[Stream] Initializing stream manager...');
            
            // Setup buffer pools
            this.initializeBufferPools();
            
            // Setup monitoring
            this.setupMonitoring();
            
            // Setup cleanup
            this.setupCleanup();
            
            console.log('[Stream] Stream manager initialized');
        },
        
        // Initialize buffer pools
        initializeBufferPools() {
            const bufferSizes = [1024, 4096, 8192, 16384, 32768, 65536];
            
            bufferSizes.forEach(size => {
                state.bufferPools.set(size, {
                    available: [],
                    inUse: new Set(),
                    maxSize: 50,
                    size: size
                });
            });
        },
        
        // Create new stream
        createStream(source, options = {}) {
            const streamId = this.generateStreamId();
            
            const streamConfig = {
                id: streamId,
                source: source,
                type: options.type || 'generic',
                priority: options.priority || 1,
                bufferSize: options.bufferSize || config.streaming.bufferSize,
                chunkSize: options.chunkSize || config.streaming.chunkSize,
                transforms: options.transforms || [],
                filters: options.filters || [],
                onData: options.onData,
                onError: options.onError,
                onEnd: options.onEnd,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                bytesProcessed: 0,
                status: 'created'
            };
            
            // Create stream processor
            const processor = this.createStreamProcessor(streamConfig);
            
            // Register stream
            state.streamRegistry.set(streamId, streamConfig);
            state.activeStreams.set(streamId, processor);
            state.metrics.totalStreams++;
            
            console.log(`[Stream] Created stream ${streamId} with type ${streamConfig.type}`);
            
            return {
                id: streamId,
                processor: processor,
                config: streamConfig
            };
        },
        
        // Create stream processor
        createStreamProcessor(streamConfig) {
            let processor;
            
            if (config.performance.useWebStreams && typeof ReadableStream !== 'undefined') {
                processor = this.createWebStreamProcessor(streamConfig);
            } else {
                processor = this.createLegacyStreamProcessor(streamConfig);
            }
            
            return processor;
        },
        
        // Create Web Streams API processor
        createWebStreamProcessor(streamConfig) {
            const controller = {
                abort: false,
                pause: false,
                buffer: []
            };
            
            const readable = new ReadableStream({
                start(streamController) {
                    controller.streamController = streamController;
                    streamConfig.status = 'started';
                },
                
                pull(streamController) {
                    if (controller.buffer.length > 0) {
                        const chunk = controller.buffer.shift();
                        streamController.enqueue(chunk);
                    }
                },
                
                cancel() {
                    controller.abort = true;
                    streamConfig.status = 'cancelled';
                }
            });
            
            const writable = new WritableStream({
                write(chunk) {
                    if (!controller.abort && !controller.pause) {
                        return StreamProcessor.processChunk(streamConfig, chunk, controller);
                    }
                },
                
                close() {
                    streamConfig.status = 'completed';
                    if (streamConfig.onEnd) {
                        streamConfig.onEnd();
                    }
                },
                
                abort(reason) {
                    streamConfig.status = 'aborted';
                    if (streamConfig.onError) {
                        streamConfig.onError(new Error(`Stream aborted: ${reason}`));
                    }
                }
            });
            
            return {
                readable: readable,
                writable: writable,
                controller: controller,
                pipe: (destination) => readable.pipeTo(destination),
                abort: () => { controller.abort = true; },
                pause: () => { controller.pause = true; },
                resume: () => { controller.pause = false; }
            };
        },
        
        // Create legacy stream processor
        createLegacyStreamProcessor(streamConfig) {
            const processor = {
                buffer: [],
                paused: false,
                ended: false,
                
                write(chunk) {
                    if (!this.paused && !this.ended) {
                        return StreamProcessor.processChunk(streamConfig, chunk, this);
                    }
                },
                
                pause() {
                    this.paused = true;
                },
                
                resume() {
                    this.paused = false;
                    this.flush();
                },
                
                end() {
                    this.ended = true;
                    streamConfig.status = 'completed';
                    if (streamConfig.onEnd) {
                        streamConfig.onEnd();
                    }
                },
                
                abort() {
                    this.ended = true;
                    streamConfig.status = 'aborted';
                },
                
                flush() {
                    while (this.buffer.length > 0 && !this.paused) {
                        const chunk = this.buffer.shift();
                        StreamProcessor.processChunk(streamConfig, chunk, this);
                    }
                }
            };
            
            streamConfig.status = 'started';
            return processor;
        },
        
        // Setup monitoring
        setupMonitoring() {
            setInterval(() => {
                this.updateMetrics();
                this.checkStreamHealth();
                this.performMaintenance();
            }, 1000); // Every second
        },
        
        // Setup cleanup
        setupCleanup() {
            setInterval(() => {
                this.cleanupInactiveStreams();
                this.cleanupBufferPools();
            }, 30000); // Every 30 seconds
        },
        
        // Update metrics
        updateMetrics() {
            let totalBytesProcessed = 0;
            let activeStreamCount = 0;
            
            for (const config of state.streamRegistry.values()) {
                totalBytesProcessed += config.bytesProcessed;
                if (config.status === 'started' || config.status === 'processing') {
                    activeStreamCount++;
                }
            }
            
            const timeDelta = Date.now() - state.metrics.lastReset;
            const bytesDelta = totalBytesProcessed - state.metrics.processedBytes;
            
            state.metrics.processedBytes = totalBytesProcessed;
            state.metrics.avgThroughput = timeDelta > 0 ? (bytesDelta / timeDelta) * 1000 : 0; // bytes/sec
            
            // Reset metrics periodically
            if (timeDelta > 60000) { // Every minute
                state.metrics.lastReset = Date.now();
            }
        },
        
        // Check stream health
        checkStreamHealth() {
            const now = Date.now();
            
            for (const [streamId, config] of state.streamRegistry.entries()) {
                const timeSinceActivity = now - config.lastActivity;
                
                // Check for timeout
                if (timeSinceActivity > config.streaming?.timeoutThreshold || config.streaming.timeoutThreshold) {
                    console.warn(`[Stream] Stream ${streamId} timed out, terminating`);
                    this.terminateStream(streamId);
                }
                
                // Check for backpressure
                const processor = state.activeStreams.get(streamId);
                if (processor && this.checkBackpressure(processor)) {
                    console.warn(`[Stream] Backpressure detected in stream ${streamId}`);
                    this.handleBackpressure(streamId, processor);
                }
            }
        },
        
        // Check backpressure
        checkBackpressure(processor) {
            if (processor.buffer && processor.buffer.length > 0) {
                const bufferUsage = processor.buffer.length / config.streaming.bufferSize;
                return bufferUsage > config.streaming.backpressureThreshold;
            }
            return false;
        },
        
        // Handle backpressure
        handleBackpressure(streamId, processor) {
            // Pause the stream temporarily
            if (processor.pause) {
                processor.pause();
            }
            
            // Schedule resume after buffer drains
            setTimeout(() => {
                if (processor.resume && !this.checkBackpressure(processor)) {
                    processor.resume();
                }
            }, config.streaming.flushInterval * 2);
        },
        
        // Cleanup inactive streams
        cleanupInactiveStreams() {
            const now = Date.now();
            const streamsToCleanup = [];
            
            for (const [streamId, config] of state.streamRegistry.entries()) {
                if (config.status === 'completed' || config.status === 'aborted' || config.status === 'cancelled') {
                    const timeSinceEnd = now - config.lastActivity;
                    if (timeSinceEnd > 60000) { // 1 minute after completion
                        streamsToCleanup.push(streamId);
                    }
                }
            }
            
            streamsToCleanup.forEach(streamId => {
                this.removeStream(streamId);
            });
            
            if (streamsToCleanup.length > 0) {
                console.log(`[Stream] Cleaned up ${streamsToCleanup.length} inactive streams`);
            }
        },
        
        // Cleanup buffer pools
        cleanupBufferPools() {
            for (const [size, pool] of state.bufferPools.entries()) {
                // Reduce available buffers if pool is over-provisioned
                const targetSize = Math.max(5, Math.min(pool.maxSize, pool.inUse.size * 2));
                
                while (pool.available.length > targetSize) {
                    pool.available.pop();
                }
            }
        },
        
        // Terminate stream
        terminateStream(streamId) {
            const processor = state.activeStreams.get(streamId);
            const config = state.streamRegistry.get(streamId);
            
            if (processor && processor.abort) {
                processor.abort();
            }
            
            if (config) {
                config.status = 'terminated';
                config.lastActivity = Date.now();
            }
        },
        
        // Remove stream
        removeStream(streamId) {
            state.activeStreams.delete(streamId);
            state.streamRegistry.delete(streamId);
        },
        
        // Perform maintenance
        performMaintenance() {
            // Circuit breaker maintenance
            for (const [key, breaker] of state.circuitBreakers.entries()) {
                if (breaker.state === 'open' && Date.now() - breaker.lastFailure > breaker.timeout) {
                    breaker.state = 'half-open';
                    breaker.failures = 0;
                }
            }
            
            // Dead letter queue cleanup
            if (state.deadLetterQueue.length > 1000) {
                state.deadLetterQueue.splice(0, 500); // Remove oldest half
            }
        },
        
        // Generate stream ID
        generateStreamId() {
            return 'stream_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    };

    /******************************************************************************/

    // Stream Processor
    const StreamProcessor = {
        
        // Process chunk of data
        async processChunk(streamConfig, chunk, controller) {
            try {
                streamConfig.status = 'processing';
                streamConfig.lastActivity = Date.now();
                
                // Apply transforms
                let processedChunk = chunk;
                
                for (const transform of streamConfig.transforms) {
                    processedChunk = await this.applyTransform(transform, processedChunk, streamConfig);
                }
                
                // Apply filters
                for (const filter of streamConfig.filters) {
                    const shouldContinue = await this.applyFilter(filter, processedChunk, streamConfig);
                    if (!shouldContinue) {
                        return; // Chunk filtered out
                    }
                }
                
                // Update metrics
                streamConfig.bytesProcessed += this.getChunkSize(processedChunk);
                
                // Emit data
                if (streamConfig.onData) {
                    await streamConfig.onData(processedChunk);
                }
                
                // Buffer if needed
                if (controller.buffer) {
                    controller.buffer.push(processedChunk);
                }
                
            } catch (error) {
                console.error(`[Stream] Error processing chunk in stream ${streamConfig.id}:`, error);
                state.metrics.errorCount++;
                
                if (streamConfig.onError) {
                    streamConfig.onError(error);
                }
                
                // Circuit breaker logic
                this.handleCircuitBreaker(streamConfig.id, error);
            }
        },
        
        // Apply transform
        async applyTransform(transform, chunk, streamConfig) {
            if (typeof transform === 'function') {
                return await transform(chunk, streamConfig);
            } else if (transform.type) {
                return await TransformPipeline.applyTransform(transform, chunk, streamConfig);
            }
            return chunk;
        },
        
        // Apply filter
        async applyFilter(filter, chunk, streamConfig) {
            if (typeof filter === 'function') {
                return await filter(chunk, streamConfig);
            } else if (filter.type) {
                return await FilterPipeline.applyFilter(filter, chunk, streamConfig);
            }
            return true;
        },
        
        // Handle circuit breaker
        handleCircuitBreaker(streamId, error) {
            const key = `stream_${streamId}`;
            let breaker = state.circuitBreakers.get(key);
            
            if (!breaker) {
                breaker = {
                    failures: 0,
                    state: 'closed',
                    lastFailure: 0,
                    threshold: 5,
                    timeout: 30000
                };
                state.circuitBreakers.set(key, breaker);
            }
            
            breaker.failures++;
            breaker.lastFailure = Date.now();
            
            if (breaker.failures >= breaker.threshold && breaker.state === 'closed') {
                breaker.state = 'open';
                console.warn(`[Stream] Circuit breaker opened for stream ${streamId}`);
                
                // Add to dead letter queue
                state.deadLetterQueue.push({
                    streamId: streamId,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        },
        
        // Get chunk size
        getChunkSize(chunk) {
            if (chunk instanceof ArrayBuffer) {
                return chunk.byteLength;
            } else if (chunk instanceof Uint8Array) {
                return chunk.length;
            } else if (typeof chunk === 'string') {
                return new Blob([chunk]).size;
            } else if (chunk && typeof chunk === 'object') {
                return JSON.stringify(chunk).length;
            }
            return 0;
        }
    };

    /******************************************************************************/

    // Transform Pipeline
    const TransformPipeline = {
        
        // Apply transform based on type
        async applyTransform(transform, chunk, streamConfig) {
            switch (transform.type) {
                case 'compression':
                    return this.compressChunk(chunk, transform.options);
                    
                case 'decompression':
                    return this.decompressChunk(chunk, transform.options);
                    
                case 'encoding':
                    return this.encodeChunk(chunk, transform.options);
                    
                case 'decoding':
                    return this.decodeChunk(chunk, transform.options);
                    
                case 'batch':
                    return this.batchChunk(chunk, transform.options, streamConfig);
                    
                case 'split':
                    return this.splitChunk(chunk, transform.options);
                    
                case 'filter':
                    return this.filterChunk(chunk, transform.options);
                    
                case 'map':
                    return this.mapChunk(chunk, transform.options);
                    
                case 'reduce':
                    return this.reduceChunk(chunk, transform.options, streamConfig);
                    
                default:
                    return chunk;
            }
        },
        
        // Compress chunk
        async compressChunk(chunk, options = {}) {
            if (typeof CompressionStream !== 'undefined') {
                const stream = new CompressionStream(options.format || 'gzip');
                const writer = stream.writable.getWriter();
                
                await writer.write(chunk);
                await writer.close();
                
                const reader = stream.readable.getReader();
                const compressed = await reader.read();
                
                return compressed.value;
            }
            return chunk; // Fallback if compression not available
        },
        
        // Decompress chunk
        async decompressChunk(chunk, options = {}) {
            if (typeof DecompressionStream !== 'undefined') {
                const stream = new DecompressionStream(options.format || 'gzip');
                const writer = stream.writable.getWriter();
                
                await writer.write(chunk);
                await writer.close();
                
                const reader = stream.readable.getReader();
                const decompressed = await reader.read();
                
                return decompressed.value;
            }
            return chunk; // Fallback if decompression not available
        },
        
        // Encode chunk
        encodeChunk(chunk, options = {}) {
            const encoding = options.encoding || 'utf-8';
            
            if (typeof chunk === 'string') {
                return new TextEncoder().encode(chunk);
            } else if (chunk instanceof ArrayBuffer || chunk instanceof Uint8Array) {
                return chunk;
            }
            
            return new TextEncoder().encode(JSON.stringify(chunk));
        },
        
        // Decode chunk
        decodeChunk(chunk, options = {}) {
            const encoding = options.encoding || 'utf-8';
            
            if (chunk instanceof ArrayBuffer || chunk instanceof Uint8Array) {
                return new TextDecoder(encoding).decode(chunk);
            }
            
            return chunk;
        },
        
        // Batch chunks
        batchChunk(chunk, options, streamConfig) {
            if (!streamConfig.batchBuffer) {
                streamConfig.batchBuffer = [];
            }
            
            streamConfig.batchBuffer.push(chunk);
            
            const batchSize = options.size || 10;
            
            if (streamConfig.batchBuffer.length >= batchSize) {
                const batch = streamConfig.batchBuffer.splice(0, batchSize);
                return batch;
            }
            
            return null; // Not ready for batch yet
        },
        
        // Split chunk
        splitChunk(chunk, options = {}) {
            const delimiter = options.delimiter || '\n';
            
            if (typeof chunk === 'string') {
                return chunk.split(delimiter);
            } else if (chunk instanceof Uint8Array) {
                // Split binary data (simplified implementation)
                const delimiterBytes = new TextEncoder().encode(delimiter);
                const result = [];
                let start = 0;
                
                for (let i = 0; i <= chunk.length - delimiterBytes.length; i++) {
                    let match = true;
                    for (let j = 0; j < delimiterBytes.length; j++) {
                        if (chunk[i + j] !== delimiterBytes[j]) {
                            match = false;
                            break;
                        }
                    }
                    
                    if (match) {
                        result.push(chunk.slice(start, i));
                        start = i + delimiterBytes.length;
                        i += delimiterBytes.length - 1;
                    }
                }
                
                if (start < chunk.length) {
                    result.push(chunk.slice(start));
                }
                
                return result;
            }
            
            return [chunk];
        },
        
        // Filter chunk
        filterChunk(chunk, options = {}) {
            const predicate = options.predicate;
            
            if (typeof predicate === 'function') {
                return predicate(chunk) ? chunk : null;
            }
            
            return chunk;
        },
        
        // Map chunk
        mapChunk(chunk, options = {}) {
            const mapper = options.mapper;
            
            if (typeof mapper === 'function') {
                return mapper(chunk);
            }
            
            return chunk;
        },
        
        // Reduce chunk
        reduceChunk(chunk, options, streamConfig) {
            const reducer = options.reducer;
            const initialValue = options.initialValue;
            
            if (!streamConfig.reduceAccumulator) {
                streamConfig.reduceAccumulator = initialValue;
            }
            
            if (typeof reducer === 'function') {
                streamConfig.reduceAccumulator = reducer(streamConfig.reduceAccumulator, chunk);
                return streamConfig.reduceAccumulator;
            }
            
            return chunk;
        }
    };

    /******************************************************************************/

    // Filter Pipeline
    const FilterPipeline = {
        
        // Apply filter based on type
        async applyFilter(filter, chunk, streamConfig) {
            switch (filter.type) {
                case 'size':
                    return this.filterBySize(chunk, filter.options);
                    
                case 'content':
                    return this.filterByContent(chunk, filter.options);
                    
                case 'pattern':
                    return this.filterByPattern(chunk, filter.options);
                    
                case 'time':
                    return this.filterByTime(chunk, filter.options, streamConfig);
                    
                case 'rate':
                    return this.filterByRate(chunk, filter.options, streamConfig);
                    
                case 'duplicate':
                    return this.filterDuplicates(chunk, filter.options, streamConfig);
                    
                case 'priority':
                    return this.filterByPriority(chunk, filter.options, streamConfig);
                    
                default:
                    return true;
            }
        },
        
        // Filter by size
        filterBySize(chunk, options = {}) {
            const size = StreamProcessor.getChunkSize(chunk);
            const minSize = options.minSize || 0;
            const maxSize = options.maxSize || Infinity;
            
            return size >= minSize && size <= maxSize;
        },
        
        // Filter by content
        filterByContent(chunk, options = {}) {
            const patterns = options.patterns || [];
            const exclude = options.exclude || false;
            
            let content = chunk;
            if (chunk instanceof ArrayBuffer || chunk instanceof Uint8Array) {
                content = new TextDecoder().decode(chunk);
            } else if (typeof chunk === 'object') {
                content = JSON.stringify(chunk);
            }
            
            const matches = patterns.some(pattern => {
                if (pattern instanceof RegExp) {
                    return pattern.test(content);
                }
                return content.includes(pattern);
            });
            
            return exclude ? !matches : matches;
        },
        
        // Filter by pattern
        filterByPattern(chunk, options = {}) {
            const pattern = options.pattern;
            
            if (!pattern) return true;
            
            let content = chunk;
            if (chunk instanceof ArrayBuffer || chunk instanceof Uint8Array) {
                content = new TextDecoder().decode(chunk);
            } else if (typeof chunk === 'object') {
                content = JSON.stringify(chunk);
            }
            
            if (pattern instanceof RegExp) {
                return pattern.test(content);
            }
            
            return content.includes(pattern);
        },
        
        // Filter by time
        filterByTime(chunk, options, streamConfig) {
            const now = Date.now();
            const timeWindow = options.timeWindow || 1000; // 1 second
            const startTime = streamConfig.createdAt;
            
            return (now - startTime) <= timeWindow;
        },
        
        // Filter by rate
        filterByRate(chunk, options, streamConfig) {
            const maxRate = options.maxRate || 100; // chunks per second
            const timeWindow = options.timeWindow || 1000; // 1 second
            
            if (!streamConfig.rateCounter) {
                streamConfig.rateCounter = {
                    count: 0,
                    windowStart: Date.now()
                };
            }
            
            const now = Date.now();
            const counter = streamConfig.rateCounter;
            
            // Reset counter if window expired
            if (now - counter.windowStart > timeWindow) {
                counter.count = 0;
                counter.windowStart = now;
            }
            
            counter.count++;
            
            return counter.count <= maxRate;
        },
        
        // Filter duplicates
        filterDuplicates(chunk, options, streamConfig) {
            if (!streamConfig.seenChunks) {
                streamConfig.seenChunks = new Set();
            }
            
            const key = this.generateChunkKey(chunk, options);
            
            if (streamConfig.seenChunks.has(key)) {
                return false; // Duplicate
            }
            
            streamConfig.seenChunks.add(key);
            
            // Limit memory usage
            if (streamConfig.seenChunks.size > 10000) {
                streamConfig.seenChunks.clear();
            }
            
            return true;
        },
        
        // Filter by priority
        filterByPriority(chunk, options, streamConfig) {
            const priority = options.priority || 1;
            const streamPriority = streamConfig.priority || 1;
            
            return streamPriority >= priority;
        },
        
        // Generate chunk key for duplicate detection
        generateChunkKey(chunk, options = {}) {
            const keyFields = options.keyFields || ['content'];
            
            let content = chunk;
            if (chunk instanceof ArrayBuffer || chunk instanceof Uint8Array) {
                content = new TextDecoder().decode(chunk);
            } else if (typeof chunk === 'object') {
                content = JSON.stringify(chunk);
            }
            
            // Simple hash function for content
            let hash = 0;
            for (let i = 0; i < content.length; i++) {
                const char = content.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            return hash.toString();
        }
    };

    /******************************************************************************/

    // Buffer Manager
    const BufferManager = {
        
        // Acquire buffer
        acquireBuffer(size) {
            // Find appropriate buffer pool
            const poolSize = this.findOptimalPoolSize(size);
            const pool = state.bufferPools.get(poolSize);
            
            if (!pool) {
                return new ArrayBuffer(size);
            }
            
            let buffer;
            
            if (pool.available.length > 0) {
                buffer = pool.available.pop();
            } else {
                buffer = new ArrayBuffer(poolSize);
            }
            
            pool.inUse.add(buffer);
            return buffer;
        },
        
        // Release buffer
        releaseBuffer(buffer) {
            const size = buffer.byteLength;
            const pool = state.bufferPools.get(size);
            
            if (pool && pool.inUse.has(buffer)) {
                pool.inUse.delete(buffer);
                
                if (pool.available.length < pool.maxSize) {
                    pool.available.push(buffer);
                }
            }
        },
        
        // Find optimal pool size
        findOptimalPoolSize(requestedSize) {
            const sizes = Array.from(state.bufferPools.keys()).sort((a, b) => a - b);
            
            for (const size of sizes) {
                if (size >= requestedSize) {
                    return size;
                }
            }
            
            return Math.max(...sizes);
        }
    };

    /******************************************************************************/

    // Main Streaming Data Processor Interface
    let initialized = false;

    // Initialize Streaming Data Processor
    const initialize = async function() {
        if (initialized) return;
        
        console.log('[Stream] Streaming Data Processor v2.0.0 initializing...');
        
        try {
            // Initialize components
            StreamManager.initialize();
            
            initialized = true;
            state.initialized = true;
            
            console.log('[Stream] Streaming Data Processor v2.0.0 initialized successfully');
            console.log(`[Stream] Buffer pools: ${state.bufferPools.size}, Max concurrent streams: ${config.streaming.maxConcurrentStreams}`);
            
        } catch (error) {
            console.error('[Stream] Streaming Data Processor initialization failed:', error);
            throw error;
        }
    };

    // Create stream
    const createStream = function(source, options) {
        return StreamManager.createStream(source, options);
    };

    // Get stream statistics
    const getStats = function() {
        return {
            ...state.metrics,
            activeStreams: state.activeStreams.size,
            registeredStreams: state.streamRegistry.size,
            bufferPools: Array.from(state.bufferPools.entries()).map(([size, pool]) => ({
                size: size,
                available: pool.available.length,
                inUse: pool.inUse.size
            })),
            circuitBreakers: state.circuitBreakers.size,
            deadLetterQueue: state.deadLetterQueue.length
        };
    };

    // Update configuration
    const updateConfig = function(newConfig) {
        Object.assign(config, newConfig);
        console.log('[Stream] Configuration updated');
    };

    // Terminate stream
    const terminateStream = function(streamId) {
        return StreamManager.terminateStream(streamId);
    };

    // Acquire buffer
    const acquireBuffer = function(size) {
        return BufferManager.acquireBuffer(size);
    };

    // Release buffer
    const releaseBuffer = function(buffer) {
        return BufferManager.releaseBuffer(buffer);
    };

    /******************************************************************************/

    // Public API
    return {
        initialize,
        createStream,
        getStats,
        updateConfig,
        terminateStream,
        acquireBuffer,
        releaseBuffer,
        
        // Sub-modules for direct access
        StreamManager,
        StreamProcessor,
        TransformPipeline,
        FilterPipeline,
        BufferManager,
        
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
            StreamingDataProcessor.initialize().catch(console.error);
        });
    } else {
        StreamingDataProcessor.initialize().catch(console.error);
    }
}

/******************************************************************************/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StreamingDataProcessor;
}
