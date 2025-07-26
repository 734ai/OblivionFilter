/*******************************************************************************

    OblivionFilter - Transformer Analysis Engine v2.1.0
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

// Transformer-based Content Analysis Engine
// Advanced text and content analysis using transformer architectures
const TransformerAnalysisEngine = (function() {

    /******************************************************************************/

    // Configuration
    const config = {
        enabled: true,
        model: {
            type: 'lightweight_transformer',
            embedding_dim: 256,
            hidden_dim: 512,
            num_heads: 8,
            num_layers: 6,
            max_sequence_length: 1024,
            dropout: 0.1
        },
        
        // Analysis targets
        targets: {
            textAds: true,
            sponsoredContent: true,
            nativeAdvertising: true,
            promotionalText: true,
            clickbait: true,
            trackers: true
        },
        
        // Performance settings
        performance: {
            maxProcessingTime: 50, // ms per analysis
            batchSize: 16,
            cacheResults: true,
            useWebWorker: true
        }
    };

    /******************************************************************************/

    // Lightweight Transformer Implementation
    class LightweightTransformer {
        constructor(options = {}) {
            this.embeddingDim = options.embedding_dim || 256;
            this.hiddenDim = options.hidden_dim || 512;
            this.numHeads = options.num_heads || 8;
            this.numLayers = options.num_layers || 6;
            this.maxSeqLength = options.max_sequence_length || 1024;
            this.dropout = options.dropout || 0.1;
            
            this.vocab = new Map();
            this.vocabSize = 10000;
            this.embeddings = null;
            this.layers = [];
            
            this.initialized = false;
            this.tokenCache = new Map();
        }

        // Initialize the transformer model
        async initialize() {
            console.log('[TransformerAnalysis] Initializing lightweight transformer...');
            
            // Initialize embedding layer
            this.embeddings = this.createEmbeddingMatrix(this.vocabSize, this.embeddingDim);
            
            // Initialize transformer layers
            for (let i = 0; i < this.numLayers; i++) {
                this.layers.push(this.createTransformerLayer());
            }
            
            // Load pre-trained weights if available
            await this.loadPretrainedWeights();
            
            // Build vocabulary from common ad patterns
            this.buildVocabulary();
            
            this.initialized = true;
            console.log('[TransformerAnalysis] Transformer initialized successfully');
        }

        // Create embedding matrix with Xavier initialization
        createEmbeddingMatrix(vocabSize, embeddingDim) {
            const matrix = [];
            const scale = Math.sqrt(6.0 / (vocabSize + embeddingDim));
            
            for (let i = 0; i < vocabSize; i++) {
                const row = [];
                for (let j = 0; j < embeddingDim; j++) {
                    row.push((Math.random() - 0.5) * 2 * scale);
                }
                matrix.push(row);
            }
            
            return matrix;
        }

        // Create a transformer layer
        createTransformerLayer() {
            return {
                // Multi-head self-attention
                attention: {
                    query: this.createLinearLayer(this.embeddingDim, this.embeddingDim),
                    key: this.createLinearLayer(this.embeddingDim, this.embeddingDim),
                    value: this.createLinearLayer(this.embeddingDim, this.embeddingDim),
                    output: this.createLinearLayer(this.embeddingDim, this.embeddingDim)
                },
                
                // Feed-forward network
                feedForward: {
                    layer1: this.createLinearLayer(this.embeddingDim, this.hiddenDim),
                    layer2: this.createLinearLayer(this.hiddenDim, this.embeddingDim)
                },
                
                // Layer normalization parameters
                layerNorm1: this.createLayerNorm(this.embeddingDim),
                layerNorm2: this.createLayerNorm(this.embeddingDim)
            };
        }

        // Create linear transformation layer
        createLinearLayer(inputDim, outputDim) {
            const weights = [];
            const scale = Math.sqrt(2.0 / inputDim);
            
            for (let i = 0; i < outputDim; i++) {
                const row = [];
                for (let j = 0; j < inputDim; j++) {
                    row.push((Math.random() - 0.5) * 2 * scale);
                }
                weights.push(row);
            }
            
            const bias = new Array(outputDim).fill(0);
            
            return { weights, bias };
        }

        // Create layer normalization
        createLayerNorm(dim) {
            return {
                gamma: new Array(dim).fill(1.0),
                beta: new Array(dim).fill(0.0)
            };
        }

        // Build vocabulary from common advertising patterns
        buildVocabulary() {
            const commonAdTerms = [
                'advertisement', 'sponsored', 'promoted', 'ad', 'ads', 'banner',
                'click', 'buy', 'purchase', 'sale', 'discount', 'offer',
                'deal', 'limited', 'time', 'free', 'trial', 'subscribe',
                'follow', 'like', 'share', 'comment', 'affiliate',
                'partner', 'recommendation', 'review', 'testimonial',
                'promo', 'code', 'coupon', 'exclusive', 'premium',
                'upgrade', 'bonus', 'reward', 'earn', 'win', 'prize'
            ];
            
            let vocabIndex = 0;
            
            // Add special tokens
            this.vocab.set('[PAD]', vocabIndex++);
            this.vocab.set('[UNK]', vocabIndex++);
            this.vocab.set('[CLS]', vocabIndex++);
            this.vocab.set('[SEP]', vocabIndex++);
            
            // Add common ad terms
            for (const term of commonAdTerms) {
                if (!this.vocab.has(term.toLowerCase())) {
                    this.vocab.set(term.toLowerCase(), vocabIndex++);
                }
            }
            
            console.log(`[TransformerAnalysis] Built vocabulary with ${this.vocab.size} tokens`);
        }

        // Tokenize text input
        tokenize(text) {
            if (!text || typeof text !== 'string') return [];
            
            // Check cache first
            if (this.tokenCache.has(text)) {
                return this.tokenCache.get(text);
            }
            
            // Simple tokenization (can be enhanced with BPE)
            const tokens = text.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(token => token.length > 0)
                .slice(0, this.maxSeqLength - 2); // Reserve space for [CLS] and [SEP]
            
            // Add special tokens
            const tokenIds = [this.vocab.get('[CLS]') || 1];
            
            for (const token of tokens) {
                const tokenId = this.vocab.get(token) || this.vocab.get('[UNK]') || 1;
                tokenIds.push(tokenId);
            }
            
            tokenIds.push(this.vocab.get('[SEP]') || 3);
            
            // Cache result
            this.tokenCache.set(text, tokenIds);
            
            return tokenIds;
        }

        // Forward pass through transformer
        forward(tokenIds) {
            if (!this.initialized) {
                throw new Error('Transformer not initialized');
            }
            
            // Input embeddings
            let embeddings = this.getEmbeddings(tokenIds);
            
            // Add positional encoding
            embeddings = this.addPositionalEncoding(embeddings);
            
            // Pass through transformer layers
            for (const layer of this.layers) {
                embeddings = this.transformerLayerForward(embeddings, layer);
            }
            
            // Pool to get final representation
            const pooled = this.poolSequence(embeddings);
            
            // Classification head
            const logits = this.classify(pooled);
            
            return logits;
        }

        // Get embeddings for token IDs
        getEmbeddings(tokenIds) {
            const embeddings = [];
            for (const tokenId of tokenIds) {
                if (tokenId < this.embeddings.length) {
                    embeddings.push([...this.embeddings[tokenId]]);
                } else {
                    embeddings.push(new Array(this.embeddingDim).fill(0));
                }
            }
            return embeddings;
        }

        // Add sinusoidal positional encoding
        addPositionalEncoding(embeddings) {
            const seqLength = embeddings.length;
            
            for (let pos = 0; pos < seqLength; pos++) {
                for (let i = 0; i < this.embeddingDim; i += 2) {
                    const angle = pos / Math.pow(10000, i / this.embeddingDim);
                    
                    if (i < this.embeddingDim) {
                        embeddings[pos][i] += Math.sin(angle);
                    }
                    if (i + 1 < this.embeddingDim) {
                        embeddings[pos][i + 1] += Math.cos(angle);
                    }
                }
            }
            
            return embeddings;
        }

        // Transformer layer forward pass
        transformerLayerForward(input, layer) {
            // Multi-head self-attention
            const attended = this.multiHeadAttention(input, layer.attention);
            
            // Residual connection + layer norm
            const normed1 = this.layerNorm(this.residualAdd(input, attended), layer.layerNorm1);
            
            // Feed-forward network
            const feedForward = this.feedForwardNetwork(normed1, layer.feedForward);
            
            // Residual connection + layer norm
            const normed2 = this.layerNorm(this.residualAdd(normed1, feedForward), layer.layerNorm2);
            
            return normed2;
        }

        // Multi-head attention mechanism
        multiHeadAttention(input, attention) {
            const seqLength = input.length;
            const headDim = this.embeddingDim / this.numHeads;
            
            // Compute Q, K, V
            const queries = this.linearTransform(input, attention.query);
            const keys = this.linearTransform(input, attention.key);
            const values = this.linearTransform(input, attention.value);
            
            // Split into heads and compute attention
            const attentionOutput = [];
            
            for (let i = 0; i < seqLength; i++) {
                const outputRow = new Array(this.embeddingDim).fill(0);
                
                for (let head = 0; head < this.numHeads; head++) {
                    const headStart = head * headDim;
                    const headEnd = (head + 1) * headDim;
                    
                    // Extract head-specific Q, K, V
                    const q = queries[i].slice(headStart, headEnd);
                    
                    // Compute attention weights for this head
                    const attentionWeights = [];
                    let sumWeights = 0;
                    
                    for (let j = 0; j < seqLength; j++) {
                        const k = keys[j].slice(headStart, headEnd);
                        const score = this.dotProduct(q, k) / Math.sqrt(headDim);
                        const weight = Math.exp(score);
                        attentionWeights.push(weight);
                        sumWeights += weight;
                    }
                    
                    // Normalize weights
                    for (let j = 0; j < attentionWeights.length; j++) {
                        attentionWeights[j] /= sumWeights;
                    }
                    
                    // Weighted sum of values
                    for (let j = 0; j < seqLength; j++) {
                        const v = values[j].slice(headStart, headEnd);
                        for (let k = 0; k < headDim; k++) {
                            outputRow[headStart + k] += attentionWeights[j] * v[k];
                        }
                    }
                }
                
                attentionOutput.push(outputRow);
            }
            
            // Final linear transformation
            return this.linearTransform(attentionOutput, attention.output);
        }

        // Feed-forward network
        feedForwardNetwork(input, feedForward) {
            // First linear layer with ReLU
            const hidden = this.linearTransform(input, feedForward.layer1);
            const activated = hidden.map(row => row.map(x => Math.max(0, x))); // ReLU
            
            // Second linear layer
            return this.linearTransform(activated, feedForward.layer2);
        }

        // Linear transformation
        linearTransform(input, layer) {
            const output = [];
            
            for (let i = 0; i < input.length; i++) {
                const outputRow = [];
                
                for (let j = 0; j < layer.weights.length; j++) {
                    let sum = layer.bias[j];
                    
                    for (let k = 0; k < input[i].length; k++) {
                        sum += input[i][k] * layer.weights[j][k];
                    }
                    
                    outputRow.push(sum);
                }
                
                output.push(outputRow);
            }
            
            return output;
        }

        // Layer normalization
        layerNorm(input, layerNorm) {
            const output = [];
            
            for (const row of input) {
                // Calculate mean and variance
                const mean = row.reduce((sum, x) => sum + x, 0) / row.length;
                const variance = row.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / row.length;
                const std = Math.sqrt(variance + 1e-8);
                
                // Normalize
                const normalized = row.map((x, i) => 
                    layerNorm.gamma[i] * (x - mean) / std + layerNorm.beta[i]
                );
                
                output.push(normalized);
            }
            
            return output;
        }

        // Residual connection
        residualAdd(input1, input2) {
            const output = [];
            
            for (let i = 0; i < input1.length; i++) {
                const row = [];
                for (let j = 0; j < input1[i].length; j++) {
                    row.push(input1[i][j] + input2[i][j]);
                }
                output.push(row);
            }
            
            return output;
        }

        // Pool sequence to get single representation
        poolSequence(embeddings) {
            // Use [CLS] token representation (first token)
            if (embeddings.length > 0) {
                return embeddings[0];
            }
            
            return new Array(this.embeddingDim).fill(0);
        }

        // Classification head
        classify(pooled) {
            // Simple linear classifier for ad detection
            const weights = this.classificationWeights || this.createLinearLayer(this.embeddingDim, 1);
            
            let logit = weights.bias[0];
            for (let i = 0; i < pooled.length; i++) {
                logit += pooled[i] * weights.weights[0][i];
            }
            
            return 1 / (1 + Math.exp(-logit)); // Sigmoid activation
        }

        // Utility functions
        dotProduct(a, b) {
            let sum = 0;
            for (let i = 0; i < Math.min(a.length, b.length); i++) {
                sum += a[i] * b[i];
            }
            return sum;
        }

        // Load pre-trained weights (placeholder)
        async loadPretrainedWeights() {
            // In a real implementation, this would load weights from a file
            // For now, we use random initialization
            this.classificationWeights = this.createLinearLayer(this.embeddingDim, 1);
            console.log('[TransformerAnalysis] Using random initialization (no pre-trained weights)');
        }
    }

    /******************************************************************************/

    // Main analysis engine
    let transformer = null;
    let initialized = false;
    let analysisCache = new Map();
    let statistics = {
        totalAnalyses: 0,
        adDetections: 0,
        averageConfidence: 0,
        processingTime: 0
    };

    /******************************************************************************/

    // Initialize the transformer analysis engine
    const initialize = async function() {
        if (initialized) return;
        
        console.log('[TransformerAnalysis] Initializing transformer analysis engine...');
        
        try {
            transformer = new LightweightTransformer(config.model);
            await transformer.initialize();
            
            initialized = true;
            console.log('[TransformerAnalysis] Transformer analysis engine initialized successfully');
            
        } catch (error) {
            console.error('[TransformerAnalysis] Initialization failed:', error);
            throw error;
        }
    };

    // Analyze text content for advertising patterns
    const analyzeText = function(text, context = {}) {
        if (!initialized || !transformer) {
            console.warn('[TransformerAnalysis] Engine not initialized');
            return { isAd: false, confidence: 0, reason: 'engine_not_initialized' };
        }
        
        const startTime = performance.now();
        
        try {
            // Check cache first
            const cacheKey = `${text}_${JSON.stringify(context)}`;
            if (analysisCache.has(cacheKey)) {
                return analysisCache.get(cacheKey);
            }
            
            // Tokenize input
            const tokens = transformer.tokenize(text);
            
            if (tokens.length === 0) {
                return { isAd: false, confidence: 0, reason: 'empty_input' };
            }
            
            // Run transformer analysis
            const confidence = transformer.forward(tokens);
            const isAd = confidence > config.confidenceThreshold;
            
            // Generate explanation
            const reason = this.generateExplanation(text, confidence, context);
            
            const result = {
                isAd,
                confidence,
                reason,
                analysisType: 'transformer',
                processingTime: performance.now() - startTime
            };
            
            // Update statistics
            statistics.totalAnalyses++;
            statistics.averageConfidence = 
                (statistics.averageConfidence * (statistics.totalAnalyses - 1) + confidence) / 
                statistics.totalAnalyses;
            statistics.processingTime += result.processingTime;
            
            if (isAd) {
                statistics.adDetections++;
            }
            
            // Cache result
            if (config.performance.cacheResults) {
                analysisCache.set(cacheKey, result);
                
                // Limit cache size
                if (analysisCache.size > 1000) {
                    const firstKey = analysisCache.keys().next().value;
                    analysisCache.delete(firstKey);
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('[TransformerAnalysis] Analysis failed:', error);
            return { isAd: false, confidence: 0, reason: 'analysis_error' };
        }
    };

    // Generate human-readable explanation
    const generateExplanation = function(text, confidence, context) {
        const explanations = [];
        
        if (confidence > 0.8) {
            explanations.push('High confidence advertising content detected');
        } else if (confidence > 0.6) {
            explanations.push('Likely advertising content');
        } else if (confidence > 0.4) {
            explanations.push('Possible advertising content');
        } else {
            explanations.push('Low probability of advertising content');
        }
        
        // Add specific pattern detections
        const adKeywords = ['advertisement', 'sponsored', 'promoted', 'ad'];
        const foundKeywords = adKeywords.filter(keyword => 
            text.toLowerCase().includes(keyword)
        );
        
        if (foundKeywords.length > 0) {
            explanations.push(`Contains advertising keywords: ${foundKeywords.join(', ')}`);
        }
        
        return explanations.join('; ');
    };

    // Analyze DOM element for advertising content
    const analyzeElement = function(element, context = {}) {
        if (!element) return { isAd: false, confidence: 0, reason: 'no_element' };
        
        // Extract text content
        const textContent = element.textContent || element.innerText || '';
        const htmlContent = element.outerHTML || '';
        
        // Combine various text sources
        const combinedText = [
            textContent,
            element.className,
            element.id,
            element.getAttribute('data-ad') || '',
            element.getAttribute('data-sponsor') || ''
        ].join(' ').trim();
        
        if (!combinedText) {
            return { isAd: false, confidence: 0, reason: 'no_text_content' };
        }
        
        // Add element context
        const elementContext = {
            ...context,
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            hasAdKeywords: /\b(ad|ads|advertisement|sponsored|promo)\b/i.test(combinedText)
        };
        
        return analyzeText(combinedText, elementContext);
    };

    // Batch analyze multiple elements
    const batchAnalyze = async function(elements, context = {}) {
        const results = [];
        const batchSize = config.performance.batchSize;
        
        for (let i = 0; i < elements.length; i += batchSize) {
            const batch = elements.slice(i, i + batchSize);
            const batchResults = batch.map(element => analyzeElement(element, context));
            results.push(...batchResults);
            
            // Allow other tasks to run
            if (i + batchSize < elements.length) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        return results;
    };

    // Update configuration
    const updateConfig = function(newConfig) {
        Object.assign(config, newConfig);
        console.log('[TransformerAnalysis] Configuration updated:', config);
    };

    // Get current statistics
    const getStatistics = function() {
        return {
            ...statistics,
            cacheSize: analysisCache.size,
            initialized,
            config: { ...config }
        };
    };

    // Clear analysis cache
    const clearCache = function() {
        analysisCache.clear();
        console.log('[TransformerAnalysis] Analysis cache cleared');
    };

    // Reset statistics
    const resetStatistics = function() {
        statistics = {
            totalAnalyses: 0,
            adDetections: 0,
            averageConfidence: 0,
            processingTime: 0
        };
        console.log('[TransformerAnalysis] Statistics reset');
    };

    /******************************************************************************/

    // Public API
    return {
        initialize,
        analyzeText,
        analyzeElement,
        batchAnalyze,
        updateConfig,
        getStatistics,
        clearCache,
        resetStatistics,
        
        // Configuration access
        get config() { return { ...config }; },
        get initialized() { return initialized; }
    };

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            TransformerAnalysisEngine.initialize().catch(console.error);
        });
    } else {
        TransformerAnalysisEngine.initialize().catch(console.error);
    }
}

/******************************************************************************/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransformerAnalysisEngine;
}
