/**
 * OblivionFilter Deep Neural Networks Engine
 * Advanced CNNs and RNNs for complex pattern recognition and ad detection
 * Implements state-of-the-art deep learning architectures in browser environment
 */

class DeepNeuralNetworks {
    constructor(config = {}) {
        this.config = {
            maxModelSize: config.maxModelSize || 50 * 1024 * 1024, // 50MB
            useWebGL: config.useWebGL !== false,
            useCPU: config.useCPU || true,
            enableQuantization: config.enableQuantization !== false,
            batchSize: config.batchSize || 32,
            maxSequenceLength: config.maxSequenceLength || 512,
            cacheSize: config.cacheSize || 1000,
            ...config
        };

        this.models = new Map();
        this.modelCache = new Map();
        this.inferenceQueue = [];
        this.isProcessing = false;
        this.performanceMetrics = {
            totalInferences: 0,
            averageLatency: 0,
            accuracyScore: 0,
            memoryUsage: 0
        };

        this.initializeModels();
        this.setupPerformanceMonitoring();
    }

    /**
     * Initialize deep learning models
     */
    async initializeModels() {
        try {
            // Initialize CNN models for image analysis
            await this.initializeCNNModels();
            
            // Initialize RNN models for sequence analysis
            await this.initializeRNNModels();
            
            // Initialize Transformer models for attention-based analysis
            await this.initializeTransformerModels();
            
            // Initialize hybrid models for multimodal analysis
            await this.initializeHybridModels();

            console.log('[DeepNN] All neural network models initialized successfully');
        } catch (error) {
            console.error('[DeepNN] Failed to initialize models:', error);
        }
    }

    /**
     * Initialize Convolutional Neural Network models
     */
    async initializeCNNModels() {
        // ResNet-like architecture for image classification
        const resNetConfig = {
            inputShape: [224, 224, 3],
            numClasses: 10,
            depth: 18,
            useBottleneck: false
        };

        this.models.set('resnet_ad_detector', await this.createResNetModel(resNetConfig));

        // EfficientNet for lightweight mobile inference
        const efficientNetConfig = {
            inputShape: [224, 224, 3],
            scalingFactor: 1.0,
            dropoutRate: 0.2
        };

        this.models.set('efficientnet_mobile', await this.createEfficientNetModel(efficientNetConfig));

        // Custom CNN for banner detection
        const bannerCNNConfig = {
            inputShape: [128, 512, 3], // Typical banner dimensions
            filters: [32, 64, 128, 256],
            kernelSizes: [3, 3, 3, 3]
        };

        this.models.set('banner_cnn', await this.createBannerCNNModel(bannerCNNConfig));
    }

    /**
     * Initialize Recurrent Neural Network models
     */
    async initializeRNNModels() {
        // LSTM for sequential text analysis
        const lstmConfig = {
            vocabSize: 50000,
            embeddingDim: 300,
            hiddenSize: 256,
            numLayers: 2,
            bidirectional: true
        };

        this.models.set('lstm_text_analyzer', await this.createLSTMModel(lstmConfig));

        // GRU for behavioral sequence analysis
        const gruConfig = {
            inputSize: 128,
            hiddenSize: 256,
            numLayers: 3,
            dropoutRate: 0.3
        };

        this.models.set('gru_behavior', await this.createGRUModel(gruConfig));

        // Transformer-based model for attention mechanisms
        const transformerConfig = {
            vocabSize: 50000,
            embedDim: 512,
            numHeads: 8,
            numLayers: 6,
            maxSeqLength: 512
        };

        this.models.set('transformer_attention', await this.createTransformerModel(transformerConfig));
    }

    /**
     * Initialize Transformer models for advanced attention mechanisms
     */
    async initializeTransformerModels() {
        // BERT-like model for contextual understanding
        const bertConfig = {
            vocabSize: 30522,
            hiddenSize: 768,
            numLayers: 12,
            numHeads: 12,
            maxPositionEmbeddings: 512
        };

        this.models.set('bert_context', await this.createBERTModel(bertConfig));

        // Vision Transformer for image analysis
        const vitConfig = {
            imageSize: 224,
            patchSize: 16,
            numClasses: 1000,
            dim: 768,
            depth: 12,
            heads: 12
        };

        this.models.set('vit_image', await this.createViTModel(vitConfig));
    }

    /**
     * Initialize hybrid models for multimodal analysis
     */
    async initializeHybridModels() {
        // Multimodal fusion model
        const fusionConfig = {
            textInputDim: 768,
            imageInputDim: 2048,
            fusionDim: 512,
            numClasses: 2 // ad/not-ad
        };

        this.models.set('multimodal_fusion', await this.createFusionModel(fusionConfig));

        // Graph Neural Network for DOM structure analysis
        const gnnConfig = {
            nodeFeatureDim: 128,
            hiddenDim: 256,
            numLayers: 4,
            numClasses: 2
        };

        this.models.set('gnn_dom', await this.createGNNModel(gnnConfig));
    }

    /**
     * Create ResNet model for image classification
     */
    async createResNetModel(config) {
        const model = {
            type: 'ResNet',
            config: config,
            weights: new Map(),
            layers: []
        };

        // Input layer
        model.layers.push({
            type: 'conv2d',
            filters: 64,
            kernelSize: 7,
            stride: 2,
            padding: 'same',
            activation: 'relu'
        });

        model.layers.push({
            type: 'maxpool2d',
            poolSize: 3,
            stride: 2,
            padding: 'same'
        });

        // Residual blocks
        const blockSizes = [64, 128, 256, 512];
        const numBlocks = [2, 2, 2, 2];

        for (let i = 0; i < blockSizes.length; i++) {
            for (let j = 0; j < numBlocks[i]; j++) {
                model.layers.push(this.createResidualBlock(blockSizes[i], j === 0 && i > 0));
            }
        }

        // Global average pooling and classification
        model.layers.push({ type: 'globalavgpool2d' });
        model.layers.push({
            type: 'dense',
            units: config.numClasses,
            activation: 'softmax'
        });

        // Initialize weights
        await this.initializeModelWeights(model);

        return model;
    }

    /**
     * Create EfficientNet model for mobile inference
     */
    async createEfficientNetModel(config) {
        const model = {
            type: 'EfficientNet',
            config: config,
            weights: new Map(),
            layers: []
        };

        // Stem convolution
        model.layers.push({
            type: 'conv2d',
            filters: 32,
            kernelSize: 3,
            stride: 2,
            padding: 'same',
            activation: 'swish'
        });

        // Mobile inverted bottleneck blocks
        const blockConfigs = [
            { filters: 16, repeats: 1, stride: 1, kernelSize: 3 },
            { filters: 24, repeats: 2, stride: 2, kernelSize: 3 },
            { filters: 40, repeats: 2, stride: 2, kernelSize: 5 },
            { filters: 80, repeats: 3, stride: 2, kernelSize: 3 },
            { filters: 112, repeats: 3, stride: 1, kernelSize: 5 },
            { filters: 192, repeats: 4, stride: 2, kernelSize: 5 },
            { filters: 320, repeats: 1, stride: 1, kernelSize: 3 }
        ];

        for (const blockConfig of blockConfigs) {
            for (let i = 0; i < blockConfig.repeats; i++) {
                model.layers.push(this.createMBConvBlock(blockConfig, i === 0));
            }
        }

        // Head
        model.layers.push({
            type: 'conv2d',
            filters: 1280,
            kernelSize: 1,
            activation: 'swish'
        });

        model.layers.push({ type: 'globalavgpool2d' });
        model.layers.push({
            type: 'dropout',
            rate: config.dropoutRate
        });
        model.layers.push({
            type: 'dense',
            units: 2, // ad/not-ad
            activation: 'sigmoid'
        });

        await this.initializeModelWeights(model);
        return model;
    }

    /**
     * Create LSTM model for text sequence analysis
     */
    async createLSTMModel(config) {
        const model = {
            type: 'LSTM',
            config: config,
            weights: new Map(),
            layers: []
        };

        // Embedding layer
        model.layers.push({
            type: 'embedding',
            vocabSize: config.vocabSize,
            embeddingDim: config.embeddingDim,
            maxLength: 512
        });

        // LSTM layers
        for (let i = 0; i < config.numLayers; i++) {
            model.layers.push({
                type: 'lstm',
                units: config.hiddenSize,
                returnSequences: i < config.numLayers - 1,
                bidirectional: config.bidirectional,
                dropout: 0.2
            });
        }

        // Dense layers
        model.layers.push({
            type: 'dense',
            units: 128,
            activation: 'relu'
        });

        model.layers.push({
            type: 'dropout',
            rate: 0.3
        });

        model.layers.push({
            type: 'dense',
            units: 2,
            activation: 'softmax'
        });

        await this.initializeModelWeights(model);
        return model;
    }

    /**
     * Create Transformer model with attention mechanisms
     */
    async createTransformerModel(config) {
        const model = {
            type: 'Transformer',
            config: config,
            weights: new Map(),
            layers: []
        };

        // Token and position embeddings
        model.layers.push({
            type: 'token_embedding',
            vocabSize: config.vocabSize,
            embedDim: config.embedDim
        });

        model.layers.push({
            type: 'position_embedding',
            maxSeqLength: config.maxSeqLength,
            embedDim: config.embedDim
        });

        // Transformer blocks
        for (let i = 0; i < config.numLayers; i++) {
            model.layers.push({
                type: 'transformer_block',
                embedDim: config.embedDim,
                numHeads: config.numHeads,
                ffnDim: config.embedDim * 4,
                dropoutRate: 0.1
            });
        }

        // Classification head
        model.layers.push({
            type: 'global_average_pooling1d'
        });

        model.layers.push({
            type: 'dense',
            units: 2,
            activation: 'softmax'
        });

        await this.initializeModelWeights(model);
        return model;
    }

    /**
     * Create Vision Transformer model
     */
    async createViTModel(config) {
        const model = {
            type: 'ViT',
            config: config,
            weights: new Map(),
            layers: []
        };

        // Patch extraction and embedding
        const numPatches = (config.imageSize / config.patchSize) ** 2;
        
        model.layers.push({
            type: 'patch_extraction',
            imageSize: config.imageSize,
            patchSize: config.patchSize
        });

        model.layers.push({
            type: 'patch_embedding',
            numPatches: numPatches,
            dim: config.dim
        });

        // Class token and position embeddings
        model.layers.push({
            type: 'class_token',
            dim: config.dim
        });

        model.layers.push({
            type: 'position_embedding',
            numPatches: numPatches + 1,
            dim: config.dim
        });

        // Transformer encoder
        for (let i = 0; i < config.depth; i++) {
            model.layers.push({
                type: 'transformer_encoder',
                dim: config.dim,
                heads: config.heads,
                ffnDim: config.dim * 4
            });
        }

        // Classification head
        model.layers.push({
            type: 'layer_norm',
            dim: config.dim
        });

        model.layers.push({
            type: 'classification_head',
            dim: config.dim,
            numClasses: config.numClasses
        });

        await this.initializeModelWeights(model);
        return model;
    }

    /**
     * Create Graph Neural Network for DOM analysis
     */
    async createGNNModel(config) {
        const model = {
            type: 'GNN',
            config: config,
            weights: new Map(),
            layers: []
        };

        // Node feature embedding
        model.layers.push({
            type: 'node_embedding',
            inputDim: config.nodeFeatureDim,
            hiddenDim: config.hiddenDim
        });

        // Graph convolution layers
        for (let i = 0; i < config.numLayers; i++) {
            model.layers.push({
                type: 'graph_conv',
                inputDim: i === 0 ? config.hiddenDim : config.hiddenDim,
                outputDim: config.hiddenDim,
                activation: 'relu',
                dropout: 0.2
            });
        }

        // Graph pooling
        model.layers.push({
            type: 'graph_pooling',
            method: 'attention'
        });

        // Classification
        model.layers.push({
            type: 'dense',
            units: config.numClasses,
            activation: 'softmax'
        });

        await this.initializeModelWeights(model);
        return model;
    }

    /**
     * Create multimodal fusion model
     */
    async createFusionModel(config) {
        const model = {
            type: 'MultimodalFusion',
            config: config,
            weights: new Map(),
            layers: []
        };

        // Text branch
        model.layers.push({
            type: 'text_encoder',
            inputDim: config.textInputDim,
            hiddenDim: config.fusionDim
        });

        // Image branch
        model.layers.push({
            type: 'image_encoder',
            inputDim: config.imageInputDim,
            hiddenDim: config.fusionDim
        });

        // Fusion layer
        model.layers.push({
            type: 'cross_attention_fusion',
            dim: config.fusionDim,
            numHeads: 8
        });

        // Classification
        model.layers.push({
            type: 'dense',
            units: config.numClasses,
            activation: 'sigmoid'
        });

        await this.initializeModelWeights(model);
        return model;
    }

    /**
     * Initialize model weights with optimized initialization strategies
     */
    async initializeModelWeights(model) {
        const initStrategies = {
            conv2d: 'he_normal',
            dense: 'glorot_uniform',
            lstm: 'orthogonal',
            embedding: 'uniform'
        };

        for (const layer of model.layers) {
            const strategy = initStrategies[layer.type] || 'glorot_uniform';
            layer.weights = await this.initializeWeights(layer, strategy);
        }

        // Load pre-trained weights if available
        await this.loadPretrainedWeights(model);
    }

    /**
     * Initialize weights using specified strategy
     */
    async initializeWeights(layer, strategy) {
        const weights = {};

        switch (strategy) {
            case 'he_normal':
                return this.heNormalInit(layer);
            case 'glorot_uniform':
                return this.glorotUniformInit(layer);
            case 'orthogonal':
                return this.orthogonalInit(layer);
            case 'uniform':
                return this.uniformInit(layer);
            default:
                return this.randomInit(layer);
        }
    }

    /**
     * He normal initialization for ReLU activations
     */
    heNormalInit(layer) {
        const fanIn = this.calculateFanIn(layer);
        const std = Math.sqrt(2.0 / fanIn);
        return this.generateRandomWeights(layer, 0, std);
    }

    /**
     * Glorot uniform initialization
     */
    glorotUniformInit(layer) {
        const fanIn = this.calculateFanIn(layer);
        const fanOut = this.calculateFanOut(layer);
        const limit = Math.sqrt(6.0 / (fanIn + fanOut));
        return this.generateRandomWeights(layer, -limit, limit);
    }

    /**
     * Perform inference on input data
     */
    async predict(modelName, inputData, options = {}) {
        const startTime = performance.now();

        try {
            const model = this.models.get(modelName);
            if (!model) {
                throw new Error(`Model ${modelName} not found`);
            }

            // Preprocess input
            const preprocessedInput = await this.preprocessInput(inputData, model, options);

            // Run inference
            const output = await this.runInference(model, preprocessedInput, options);

            // Postprocess output
            const result = await this.postprocessOutput(output, model, options);

            // Update metrics
            const latency = performance.now() - startTime;
            this.updatePerformanceMetrics(latency, result.confidence);

            return {
                prediction: result.prediction,
                confidence: result.confidence,
                latency: latency,
                modelName: modelName
            };

        } catch (error) {
            console.error(`[DeepNN] Prediction failed for ${modelName}:`, error);
            return {
                prediction: null,
                confidence: 0,
                error: error.message,
                latency: performance.now() - startTime
            };
        }
    }

    /**
     * Run inference through model layers
     */
    async runInference(model, input, options) {
        let currentInput = input;

        for (const layer of model.layers) {
            currentInput = await this.executeLayer(layer, currentInput, options);
        }

        return currentInput;
    }

    /**
     * Execute a single layer
     */
    async executeLayer(layer, input, options) {
        switch (layer.type) {
            case 'conv2d':
                return await this.executeConv2D(layer, input);
            case 'maxpool2d':
                return await this.executeMaxPool2D(layer, input);
            case 'dense':
                return await this.executeDense(layer, input);
            case 'lstm':
                return await this.executeLSTM(layer, input);
            case 'attention':
                return await this.executeAttention(layer, input);
            case 'transformer_block':
                return await this.executeTransformerBlock(layer, input);
            case 'graph_conv':
                return await this.executeGraphConv(layer, input);
            default:
                console.warn(`[DeepNN] Unknown layer type: ${layer.type}`);
                return input;
        }
    }

    /**
     * Execute 2D convolution layer
     */
    async executeConv2D(layer, input) {
        const { filters, kernelSize, stride = 1, padding = 'valid', activation = 'linear' } = layer;
        
        // Implement convolution operation
        const output = await this.convolution2D(input, layer.weights.kernel, layer.weights.bias, {
            stride,
            padding,
            filters
        });

        // Apply activation
        return this.applyActivation(output, activation);
    }

    /**
     * Execute LSTM layer
     */
    async executeLSTM(layer, input) {
        const { units, returnSequences = false, bidirectional = false } = layer;
        
        if (bidirectional) {
            const forwardOutput = await this.lstmForward(input, layer.weights.forward);
            const backwardOutput = await this.lstmBackward(input, layer.weights.backward);
            return this.concatenate([forwardOutput, backwardOutput], -1);
        } else {
            return await this.lstmForward(input, layer.weights);
        }
    }

    /**
     * Execute multi-head attention layer
     */
    async executeAttention(layer, input) {
        const { numHeads, keyDim, valueDim } = layer;
        
        const queries = await this.linearTransform(input, layer.weights.queryWeights);
        const keys = await this.linearTransform(input, layer.weights.keyWeights);
        const values = await this.linearTransform(input, layer.weights.valueWeights);

        return await this.multiHeadAttention(queries, keys, values, numHeads);
    }

    /**
     * Batch prediction for multiple inputs
     */
    async predictBatch(modelName, inputBatch, options = {}) {
        const batchSize = inputBatch.length;
        const predictions = [];

        for (let i = 0; i < batchSize; i += this.config.batchSize) {
            const batch = inputBatch.slice(i, i + this.config.batchSize);
            const batchPredictions = await Promise.all(
                batch.map(input => this.predict(modelName, input, options))
            );
            predictions.push(...batchPredictions);
        }

        return predictions;
    }

    /**
     * Analyze element using ensemble of models
     */
    async analyzeElement(element, context = {}) {
        const features = await this.extractElementFeatures(element, context);
        const predictions = new Map();

        // CNN analysis for visual features
        if (features.imageData) {
            const cnnResult = await this.predict('resnet_ad_detector', features.imageData);
            predictions.set('cnn', cnnResult);
        }

        // RNN analysis for text content
        if (features.textSequence) {
            const rnnResult = await this.predict('lstm_text_analyzer', features.textSequence);
            predictions.set('rnn', rnnResult);
        }

        // Transformer analysis for contextual understanding
        if (features.contextTokens) {
            const transformerResult = await this.predict('transformer_attention', features.contextTokens);
            predictions.set('transformer', transformerResult);
        }

        // Graph analysis for DOM structure
        if (features.domGraph) {
            const gnnResult = await this.predict('gnn_dom', features.domGraph);
            predictions.set('gnn', gnnResult);
        }

        // Multimodal fusion
        if (predictions.size > 1) {
            const fusionInput = this.prepareFusionInput(predictions);
            const fusionResult = await this.predict('multimodal_fusion', fusionInput);
            predictions.set('fusion', fusionResult);
        }

        return this.ensemblePredictions(predictions);
    }

    /**
     * Extract comprehensive features from DOM element
     */
    async extractElementFeatures(element, context) {
        const features = {};

        try {
            // Visual features
            features.imageData = await this.extractVisualFeatures(element);
            
            // Text features
            features.textSequence = await this.extractTextFeatures(element);
            
            // Contextual features
            features.contextTokens = await this.extractContextualFeatures(element, context);
            
            // Structural features
            features.domGraph = await this.extractStructuralFeatures(element);
            
            // Behavioral features
            features.behaviorSequence = await this.extractBehavioralFeatures(element, context);

        } catch (error) {
            console.error('[DeepNN] Feature extraction failed:', error);
        }

        return features;
    }

    /**
     * Ensemble multiple model predictions
     */
    ensemblePredictions(predictions) {
        if (predictions.size === 0) {
            return { prediction: 0, confidence: 0 };
        }

        const weights = {
            cnn: 0.25,
            rnn: 0.2,
            transformer: 0.3,
            gnn: 0.15,
            fusion: 0.1
        };

        let weightedSum = 0;
        let totalWeight = 0;
        let maxConfidence = 0;

        for (const [modelType, result] of predictions) {
            if (result.prediction !== null) {
                const weight = weights[modelType] || 0.1;
                weightedSum += result.prediction * weight * result.confidence;
                totalWeight += weight * result.confidence;
                maxConfidence = Math.max(maxConfidence, result.confidence);
            }
        }

        const ensemblePrediction = totalWeight > 0 ? weightedSum / totalWeight : 0;
        const ensembleConfidence = Math.min(maxConfidence * (predictions.size / 5), 1.0);

        return {
            prediction: ensemblePrediction,
            confidence: ensembleConfidence,
            modelPredictions: Object.fromEntries(predictions)
        };
    }

    /**
     * Update performance monitoring metrics
     */
    updatePerformanceMetrics(latency, confidence) {
        this.performanceMetrics.totalInferences++;
        
        // Update average latency with exponential moving average
        const alpha = 0.1;
        this.performanceMetrics.averageLatency = 
            alpha * latency + (1 - alpha) * this.performanceMetrics.averageLatency;
        
        // Update accuracy score
        if (confidence > 0.8) {
            this.performanceMetrics.accuracyScore = 
                alpha * confidence + (1 - alpha) * this.performanceMetrics.accuracyScore;
        }

        // Update memory usage
        this.performanceMetrics.memoryUsage = this.calculateMemoryUsage();
    }

    /**
     * Calculate current memory usage
     */
    calculateMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor model performance every 30 seconds
        setInterval(() => {
            this.logPerformanceMetrics();
            this.optimizeModelPerformance();
        }, 30000);

        // Memory cleanup every 5 minutes
        setInterval(() => {
            this.cleanupModelCache();
        }, 300000);
    }

    /**
     * Log performance metrics
     */
    logPerformanceMetrics() {
        console.log('[DeepNN] Performance Metrics:', {
            totalInferences: this.performanceMetrics.totalInferences,
            averageLatency: `${this.performanceMetrics.averageLatency.toFixed(2)}ms`,
            accuracyScore: this.performanceMetrics.accuracyScore.toFixed(3),
            memoryUsage: `${(this.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
            modelsLoaded: this.models.size,
            cacheSize: this.modelCache.size
        });
    }

    /**
     * Optimize model performance based on metrics
     */
    optimizeModelPerformance() {
        // Adjust batch size based on latency
        if (this.performanceMetrics.averageLatency > 100) {
            this.config.batchSize = Math.max(1, this.config.batchSize - 4);
        } else if (this.performanceMetrics.averageLatency < 50) {
            this.config.batchSize = Math.min(64, this.config.batchSize + 4);
        }

        // Enable/disable quantization based on performance
        if (this.performanceMetrics.memoryUsage > this.config.maxModelSize) {
            this.config.enableQuantization = true;
            this.quantizeModels();
        }
    }

    /**
     * Quantize models to reduce memory usage
     */
    async quantizeModels() {
        for (const [name, model] of this.models) {
            if (!model.quantized) {
                await this.quantizeModel(model);
                console.log(`[DeepNN] Quantized model: ${name}`);
            }
        }
    }

    /**
     * Clean up model cache to free memory
     */
    cleanupModelCache() {
        const maxCacheSize = this.config.cacheSize;
        
        if (this.modelCache.size > maxCacheSize) {
            const entries = Array.from(this.modelCache.entries());
            entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
            
            const toRemove = entries.slice(0, entries.length - maxCacheSize);
            for (const [key] of toRemove) {
                this.modelCache.delete(key);
            }
            
            console.log(`[DeepNN] Cleaned up ${toRemove.length} cache entries`);
        }
    }

    /**
     * Get model information and statistics
     */
    getModelInfo() {
        const modelInfo = {};
        
        for (const [name, model] of this.models) {
            modelInfo[name] = {
                type: model.type,
                layers: model.layers.length,
                parameters: this.countParameters(model),
                quantized: model.quantized || false,
                memoryUsage: this.estimateModelMemory(model)
            };
        }

        return {
            models: modelInfo,
            performance: this.performanceMetrics,
            config: this.config
        };
    }

    /**
     * Count model parameters
     */
    countParameters(model) {
        let totalParams = 0;
        
        for (const layer of model.layers) {
            if (layer.weights) {
                for (const [name, weights] of Object.entries(layer.weights)) {
                    if (weights && weights.length) {
                        totalParams += weights.reduce((acc, w) => acc + (w.length || 1), 0);
                    }
                }
            }
        }
        
        return totalParams;
    }

    /**
     * Estimate model memory usage
     */
    estimateModelMemory(model) {
        const params = this.countParameters(model);
        const bytesPerParam = model.quantized ? 1 : 4; // 8-bit vs 32-bit
        return params * bytesPerParam;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeepNeuralNetworks;
} else {
    window.DeepNeuralNetworks = DeepNeuralNetworks;
}
