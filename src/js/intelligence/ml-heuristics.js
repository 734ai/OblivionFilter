/*******************************************************************************

    OblivionFilter - ML Heuristic Engine v2.1.0
    Copyright (C) 2024 OblivionFilter Contributors

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

/******************************************************************************/

'use strict';

/******************************************************************************/

// OblivionFilter ML Heuristic Engine
// Provides intelligent ad detection using machine learning algorithms
const MLHeuristicEngine = (function() {

    /******************************************************************************/

    // Configuration for ML heuristics
    const config = {
        enabled: true,
        learningMode: true,
        confidenceThreshold: 0.75,
        
        // Feature extraction settings
        features: {
            dom: {
                enabled: true,
                maxDepth: 10,
                analyzeClasses: true,
                analyzeIds: true,
                analyzeAttributes: true,
                analyzeText: true
            },
            css: {
                enabled: true,
                analyzeSelectors: true,
                analyzeProperties: true,
                analyzeValues: true
            },
            network: {
                enabled: true,
                analyzeUrls: true,
                analyzeHeaders: true,
                analyzeParameters: true
            },
            behavioral: {
                enabled: true,
                trackInteractions: true,
                analyzeTimings: true,
                detectPatterns: true
            }
        },

        // Model configuration
        models: {
            adClassifier: {
                type: 'neural_network',
                layers: [512, 256, 128, 64, 1],
                activation: 'relu',
                outputActivation: 'sigmoid',
                learningRate: 0.001,
                epochs: 100,
                batchSize: 32
            },
            trackerClassifier: {
                type: 'decision_tree',
                maxDepth: 20,
                minSamplesLeaf: 5,
                criterion: 'gini'
            },
            contentClassifier: {
                type: 'random_forest',
                estimators: 50,
                maxDepth: 15,
                minSamplesLeaf: 3
            }
        },

        // Training data configuration
        training: {
            autoCollect: true,
            maxSamples: 10000,
            retrainInterval: 86400000, // 24 hours
            validationSplit: 0.2,
            crossValidationFolds: 5
        },

        // Performance settings
        performance: {
            maxProcessingTime: 100, // ms
            maxMemoryUsage: 50 * 1024 * 1024, // 50MB
            enableParallelProcessing: true,
            cacheResults: true,
            cacheTTL: 3600000 // 1 hour
        }
    };

    /******************************************************************************/

    // State management
    let state = {
        isInitialized: false,
        models: new Map(),
        trainingData: new Map(),
        featureCache: new Map(),
        predictions: new Map(),
        statistics: {
            predictions: 0,
            correctPredictions: 0,
            falsePositives: 0,
            falseNegatives: 0,
            averageConfidence: 0,
            processingTime: 0,
            memoryUsage: 0
        },
        lastTraining: 0,
        isTraining: false
    };

    /******************************************************************************/

    // Feature Extraction Engine
    const FeatureExtractor = {
        
        // Extract comprehensive features from DOM element
        extractDOMFeatures: function(element) {
            if (!element || !config.features.dom.enabled) return {};

            const features = {};
            
            try {
                // Basic element properties
                features.tagName = element.tagName ? element.tagName.toLowerCase() : '';
                features.elementType = this.getElementType(element);
                features.hasChildren = element.children && element.children.length > 0;
                features.childCount = element.children ? element.children.length : 0;
                features.textLength = element.textContent ? element.textContent.length : 0;
                features.hasText = features.textLength > 0;

                // Position and size
                const rect = element.getBoundingClientRect();
                features.width = rect.width;
                features.height = rect.height;
                features.area = rect.width * rect.height;
                features.aspectRatio = rect.height > 0 ? rect.width / rect.height : 0;
                features.isVisible = rect.width > 0 && rect.height > 0;
                features.top = rect.top;
                features.left = rect.left;

                // Class analysis
                if (config.features.dom.analyzeClasses && element.className) {
                    const classes = element.className.split(' ').filter(c => c.length > 0);
                    features.classCount = classes.length;
                    features.hasAdKeywords = this.hasAdKeywords(classes.join(' '));
                    features.hasTrackingKeywords = this.hasTrackingKeywords(classes.join(' '));
                    features.hasDisplayKeywords = this.hasDisplayKeywords(classes.join(' '));
                }

                // ID analysis
                if (config.features.dom.analyzeIds && element.id) {
                    features.hasId = true;
                    features.idLength = element.id.length;
                    features.idHasAdKeywords = this.hasAdKeywords(element.id);
                    features.idHasTrackingKeywords = this.hasTrackingKeywords(element.id);
                }

                // Attribute analysis
                if (config.features.dom.analyzeAttributes) {
                    const attributes = element.attributes;
                    features.attributeCount = attributes ? attributes.length : 0;
                    features.hasDataAttributes = this.hasDataAttributes(element);
                    features.hasTrackingAttributes = this.hasTrackingAttributes(element);
                    features.hasStyleAttribute = element.hasAttribute('style');
                }

                // Text content analysis
                if (config.features.dom.analyzeText && element.textContent) {
                    const text = element.textContent.toLowerCase();
                    features.hasPromotionalText = this.hasPromotionalText(text);
                    features.hasClickbaitText = this.hasClickbaitText(text);
                    features.textDensity = text.length / Math.max(1, features.area);
                }

                // Link analysis
                if (element.tagName === 'A' || element.querySelector('a')) {
                    features.isLink = true;
                    features.hasExternalLink = this.hasExternalLink(element);
                    features.hasTrackingParams = this.hasTrackingParams(element);
                }

                // Image analysis
                if (element.tagName === 'IMG' || element.querySelector('img')) {
                    features.hasImage = true;
                    features.imageCount = element.querySelectorAll('img').length;
                    features.hasLazyLoading = this.hasLazyLoading(element);
                }

                // Frame analysis
                if (element.tagName === 'IFRAME' || element.querySelector('iframe')) {
                    features.hasFrame = true;
                    features.frameCount = element.querySelectorAll('iframe').length;
                    features.hasThirdPartyFrame = this.hasThirdPartyFrame(element);
                }

            } catch (error) {
                console.warn('[OblivionFilter] Feature extraction error:', error);
            }

            return features;
        },

        // Extract CSS-related features
        extractCSSFeatures: function(element) {
            if (!element || !config.features.css.enabled) return {};

            const features = {};
            
            try {
                const computedStyle = window.getComputedStyle(element);
                
                // Display properties
                features.display = computedStyle.display;
                features.position = computedStyle.position;
                features.visibility = computedStyle.visibility;
                features.opacity = parseFloat(computedStyle.opacity) || 0;
                features.zIndex = parseInt(computedStyle.zIndex) || 0;

                // Layout properties
                features.float = computedStyle.float;
                features.clear = computedStyle.clear;
                features.overflow = computedStyle.overflow;
                features.whiteSpace = computedStyle.whiteSpace;

                // Size and spacing
                features.marginTop = this.parsePixelValue(computedStyle.marginTop);
                features.marginRight = this.parsePixelValue(computedStyle.marginRight);
                features.marginBottom = this.parsePixelValue(computedStyle.marginBottom);
                features.marginLeft = this.parsePixelValue(computedStyle.marginLeft);
                features.paddingTotal = this.getTotalPadding(computedStyle);
                features.marginTotal = this.getTotalMargin(computedStyle);

                // Typography
                features.fontSize = this.parsePixelValue(computedStyle.fontSize);
                features.fontWeight = computedStyle.fontWeight;
                features.textAlign = computedStyle.textAlign;
                features.textDecoration = computedStyle.textDecoration;

                // Background and borders
                features.hasBackgroundImage = computedStyle.backgroundImage !== 'none';
                features.hasBackgroundColor = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';
                features.hasBorder = this.hasBorder(computedStyle);
                features.borderRadius = this.parsePixelValue(computedStyle.borderRadius);

                // Suspicious CSS patterns
                features.hasNegativeMargin = this.hasNegativeMargin(computedStyle);
                features.hasAbsolutePosition = computedStyle.position === 'absolute';
                features.hasFixedPosition = computedStyle.position === 'fixed';
                features.hasHighZIndex = features.zIndex > 1000;
                features.isHidden = features.opacity < 0.1 || 
                                 computedStyle.visibility === 'hidden' || 
                                 computedStyle.display === 'none';

            } catch (error) {
                console.warn('[OblivionFilter] CSS feature extraction error:', error);
            }

            return features;
        },

        // Extract network-related features
        extractNetworkFeatures: function(url, headers = {}) {
            if (!url || !config.features.network.enabled) return {};

            const features = {};
            
            try {
                const urlObj = new URL(url);
                
                // URL structure
                features.domain = urlObj.hostname;
                features.subdomain = this.getSubdomain(urlObj.hostname);
                features.path = urlObj.pathname;
                features.query = urlObj.search;
                features.fragment = urlObj.hash;
                features.protocol = urlObj.protocol;

                // URL characteristics
                features.urlLength = url.length;
                features.pathLength = urlObj.pathname.length;
                features.queryLength = urlObj.search.length;
                features.parameterCount = new URLSearchParams(urlObj.search).size;
                features.subdomainCount = urlObj.hostname.split('.').length - 2;

                // Suspicious URL patterns
                features.hasAdKeywords = this.hasAdKeywords(url);
                features.hasTrackingKeywords = this.hasTrackingKeywords(url);
                features.hasRandomString = this.hasRandomString(url);
                features.hasEncodedData = this.hasEncodedData(url);
                features.hasTrackingParams = this.hasTrackingParams(null, url);

                // Domain analysis
                features.isThirdParty = this.isThirdPartyDomain(urlObj.hostname);
                features.isKnownAdDomain = this.isKnownAdDomain(urlObj.hostname);
                features.isKnownTrackerDomain = this.isKnownTrackerDomain(urlObj.hostname);
                features.isDGA = this.isDGADomain(urlObj.hostname);

                // Header analysis
                if (headers && Object.keys(headers).length > 0) {
                    features.hasTrackingHeaders = this.hasTrackingHeaders(headers);
                    features.hasAdHeaders = this.hasAdHeaders(headers);
                    features.contentType = headers['content-type'] || '';
                    features.hasSetCookie = 'set-cookie' in headers;
                }

            } catch (error) {
                console.warn('[OblivionFilter] Network feature extraction error:', error);
            }

            return features;
        },

        // Extract behavioral features
        extractBehavioralFeatures: function(element, interactions = []) {
            if (!element || !config.features.behavioral.enabled) return {};

            const features = {};
            
            try {
                // Interaction patterns
                features.clickCount = interactions.filter(i => i.type === 'click').length;
                features.hoverCount = interactions.filter(i => i.type === 'hover').length;
                features.scrollCount = interactions.filter(i => i.type === 'scroll').length;
                features.totalInteractions = interactions.length;

                // Timing analysis
                if (interactions.length > 0) {
                    const times = interactions.map(i => i.timestamp).sort();
                    features.firstInteractionTime = times[0];
                    features.lastInteractionTime = times[times.length - 1];
                    features.interactionDuration = features.lastInteractionTime - features.firstInteractionTime;
                    features.averageTimeBetweenInteractions = 
                        interactions.length > 1 ? 
                        features.interactionDuration / (interactions.length - 1) : 0;
                }

                // Element behavior
                features.hasAnimations = this.hasAnimations(element);
                features.hasTransitions = this.hasTransitions(element);
                features.isSticky = this.isSticky(element);
                features.appearsOnScroll = this.appearsOnScroll(element);
                features.hasPopupBehavior = this.hasPopupBehavior(element);

                // Load timing
                features.loadTime = this.getElementLoadTime(element);
                features.isLazyLoaded = this.isLazyLoaded(element);
                features.loadedAfterDOMReady = this.loadedAfterDOMReady(element);

            } catch (error) {
                console.warn('[OblivionFilter] Behavioral feature extraction error:', error);
            }

            return features;
        },

        // Utility functions for feature extraction
        getElementType: function(element) {
            if (element.tagName === 'DIV') return 'div';
            if (element.tagName === 'SPAN') return 'span';
            if (element.tagName === 'A') return 'link';
            if (element.tagName === 'IMG') return 'image';
            if (element.tagName === 'IFRAME') return 'frame';
            if (element.tagName === 'VIDEO') return 'video';
            if (element.tagName === 'CANVAS') return 'canvas';
            return 'other';
        },

        hasAdKeywords: function(text) {
            const adKeywords = [
                'ad', 'ads', 'advertisement', 'banner', 'sponsor', 'promoted',
                'marketing', 'promo', 'campaign', 'affiliate', 'adsense',
                'doubleclick', 'googlesyndication', 'amazon-adsystem'
            ];
            return adKeywords.some(keyword => 
                text.toLowerCase().includes(keyword.toLowerCase()));
        },

        hasTrackingKeywords: function(text) {
            const trackingKeywords = [
                'track', 'analytics', 'pixel', 'beacon', 'telemetry',
                'metrics', 'stats', 'collect', 'monitor', 'utm_',
                'fbclid', 'gclid', '_ga', 'mixpanel', 'segment'
            ];
            return trackingKeywords.some(keyword => 
                text.toLowerCase().includes(keyword.toLowerCase()));
        },

        hasDisplayKeywords: function(text) {
            const displayKeywords = [
                'display', 'show', 'popup', 'modal', 'overlay',
                'float', 'sticky', 'fixed', 'absolute'
            ];
            return displayKeywords.some(keyword => 
                text.toLowerCase().includes(keyword.toLowerCase()));
        },

        hasPromotionalText: function(text) {
            const promoWords = [
                'buy now', 'click here', 'limited time', 'special offer',
                'discount', 'sale', 'free shipping', 'best deal'
            ];
            return promoWords.some(phrase => text.includes(phrase));
        },

        hasClickbaitText: function(text) {
            const clickbaitWords = [
                'you won\'t believe', 'shocking', 'amazing', 'incredible',
                'this one trick', 'doctors hate', 'must see'
            ];
            return clickbaitWords.some(phrase => text.includes(phrase));
        },

        parsePixelValue: function(value) {
            if (typeof value === 'string' && value.endsWith('px')) {
                return parseFloat(value) || 0;
            }
            return 0;
        },

        getTotalPadding: function(style) {
            return this.parsePixelValue(style.paddingTop) +
                   this.parsePixelValue(style.paddingRight) +
                   this.parsePixelValue(style.paddingBottom) +
                   this.parsePixelValue(style.paddingLeft);
        },

        getTotalMargin: function(style) {
            return this.parsePixelValue(style.marginTop) +
                   this.parsePixelValue(style.marginRight) +
                   this.parsePixelValue(style.marginBottom) +
                   this.parsePixelValue(style.marginLeft);
        },

        hasBorder: function(style) {
            return style.borderTopWidth !== '0px' ||
                   style.borderRightWidth !== '0px' ||
                   style.borderBottomWidth !== '0px' ||
                   style.borderLeftWidth !== '0px';
        },

        hasNegativeMargin: function(style) {
            return this.parsePixelValue(style.marginTop) < 0 ||
                   this.parsePixelValue(style.marginRight) < 0 ||
                   this.parsePixelValue(style.marginBottom) < 0 ||
                   this.parsePixelValue(style.marginLeft) < 0;
        },

        // More utility functions would continue here...
        getSubdomain: function(hostname) {
            const parts = hostname.split('.');
            return parts.length > 2 ? parts[0] : '';
        },

        isThirdPartyDomain: function(hostname) {
            return hostname !== window.location.hostname;
        },

        isKnownAdDomain: function(hostname) {
            const adDomains = [
                'doubleclick.net', 'googlesyndication.com', 'amazon-adsystem.com',
                'facebook.com', 'googleadservices.com', 'adsystem.amazon.com'
            ];
            return adDomains.some(domain => hostname.includes(domain));
        },

        isKnownTrackerDomain: function(hostname) {
            const trackerDomains = [
                'google-analytics.com', 'googletagmanager.com', 'mixpanel.com',
                'segment.com', 'hotjar.com', 'fullstory.com'
            ];
            return trackerDomains.some(domain => hostname.includes(domain));
        },

        isDGADomain: function(hostname) {
            // Simple heuristic for Domain Generation Algorithm detection
            const entropy = this.calculateEntropy(hostname);
            return entropy > 3.5; // High entropy suggests random generation
        },

        calculateEntropy: function(str) {
            const freq = {};
            for (let i = 0; i < str.length; i++) {
                freq[str[i]] = (freq[str[i]] || 0) + 1;
            }
            
            let entropy = 0;
            for (const char in freq) {
                const p = freq[char] / str.length;
                entropy -= p * Math.log2(p);
            }
            
            return entropy;
        },

        hasRandomString: function(url) {
            // Look for sequences of random-looking characters
            const randomPattern = /[a-z0-9]{10,}/gi;
            const matches = url.match(randomPattern);
            if (!matches) return false;
            
            return matches.some(match => this.calculateEntropy(match) > 3.0);
        },

        hasEncodedData: function(url) {
            return url.includes('%') || url.includes('base64') || url.includes('encode');
        },

        hasDataAttributes: function(element) {
            const attributes = element.attributes;
            for (let i = 0; i < attributes.length; i++) {
                if (attributes[i].name.startsWith('data-')) {
                    return true;
                }
            }
            return false;
        },

        hasTrackingAttributes: function(element) {
            const trackingAttrs = [
                'data-track', 'data-analytics', 'data-pixel',
                'data-gtm', 'data-ga', 'data-fb'
            ];
            return trackingAttrs.some(attr => element.hasAttribute(attr));
        },

        hasExternalLink: function(element) {
            const links = element.tagName === 'A' ? [element] : element.querySelectorAll('a');
            for (const link of links) {
                if (link.hostname && link.hostname !== window.location.hostname) {
                    return true;
                }
            }
            return false;
        },

        hasTrackingParams: function(element, url = null) {
            const trackingParams = [
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
                'fbclid', 'gclid', 'msclkid', 'ref', 'referrer'
            ];
            
            if (url) {
                const urlObj = new URL(url);
                return trackingParams.some(param => urlObj.searchParams.has(param));
            }
            
            if (element) {
                const links = element.tagName === 'A' ? [element] : element.querySelectorAll('a');
                for (const link of links) {
                    try {
                        const linkUrl = new URL(link.href);
                        if (trackingParams.some(param => linkUrl.searchParams.has(param))) {
                            return true;
                        }
                    } catch (e) {
                        // Invalid URL, skip
                    }
                }
            }
            
            return false;
        },

        hasLazyLoading: function(element) {
            const images = element.tagName === 'IMG' ? [element] : element.querySelectorAll('img');
            return Array.from(images).some(img => 
                img.hasAttribute('loading') || 
                img.hasAttribute('data-src') ||
                img.hasAttribute('data-lazy')
            );
        },

        hasThirdPartyFrame: function(element) {
            const frames = element.tagName === 'IFRAME' ? [element] : element.querySelectorAll('iframe');
            return Array.from(frames).some(frame => {
                try {
                    const frameUrl = new URL(frame.src);
                    return frameUrl.hostname !== window.location.hostname;
                } catch (e) {
                    return false;
                }
            });
        },

        hasTrackingHeaders: function(headers) {
            const trackingHeaders = [
                'x-forwarded-for', 'x-real-ip', 'user-agent',
                'referer', 'x-requested-with'
            ];
            return trackingHeaders.some(header => header in headers);
        },

        hasAdHeaders: function(headers) {
            const adHeaders = [
                'x-ads-enabled', 'x-advertisement', 'x-sponsored'
            ];
            return adHeaders.some(header => header in headers);
        },

        hasAnimations: function(element) {
            const style = window.getComputedStyle(element);
            return style.animationName !== 'none' || style.transition !== 'none';
        },

        hasTransitions: function(element) {
            const style = window.getComputedStyle(element);
            return style.transition !== 'none' && style.transition !== '';
        },

        isSticky: function(element) {
            const style = window.getComputedStyle(element);
            return style.position === 'sticky' || style.position === 'fixed';
        },

        appearsOnScroll: function(element) {
            // This would need to be tracked over time
            return element.hasAttribute('data-scroll-reveal') ||
                   element.classList.contains('scroll-reveal');
        },

        hasPopupBehavior: function(element) {
            return element.classList.contains('popup') ||
                   element.classList.contains('modal') ||
                   element.classList.contains('overlay');
        },

        getElementLoadTime: function(element) {
            // This would need to be tracked during page load
            return 0; // Placeholder
        },

        isLazyLoaded: function(element) {
            return this.hasLazyLoading(element);
        },

        loadedAfterDOMReady: function(element) {
            // This would need to be tracked during page load
            return false; // Placeholder
        }
    };

    /******************************************************************************/

    // Simple Neural Network Implementation
    const NeuralNetwork = {
        
        create: function(layers, learningRate = 0.001) {
            const network = {
                layers: layers,
                weights: [],
                biases: [],
                learningRate: learningRate,
                activations: []
            };

            // Initialize weights and biases
            for (let i = 0; i < layers.length - 1; i++) {
                const weightMatrix = this.createMatrix(layers[i + 1], layers[i]);
                const biasVector = this.createVector(layers[i + 1]);
                
                // Xavier initialization
                const scale = Math.sqrt(2.0 / layers[i]);
                this.randomizeMatrix(weightMatrix, scale);
                this.randomizeVector(biasVector, 0.1);
                
                network.weights.push(weightMatrix);
                network.biases.push(biasVector);
            }

            return network;
        },

        forward: function(network, input) {
            let activation = input.slice(); // Copy input
            network.activations = [activation];

            for (let i = 0; i < network.weights.length; i++) {
                const weighted = this.matrixVectorMultiply(network.weights[i], activation);
                const biased = this.vectorAdd(weighted, network.biases[i]);
                
                // Apply activation function
                if (i === network.weights.length - 1) {
                    // Output layer - sigmoid
                    activation = biased.map(x => this.sigmoid(x));
                } else {
                    // Hidden layers - ReLU
                    activation = biased.map(x => Math.max(0, x));
                }
                
                network.activations.push(activation);
            }

            return activation[0]; // Return single output
        },

        train: function(network, trainingData, epochs = 100) {
            for (let epoch = 0; epoch < epochs; epoch++) {
                let totalLoss = 0;
                
                for (const sample of trainingData) {
                    const prediction = this.forward(network, sample.input);
                    const loss = Math.pow(prediction - sample.output, 2);
                    totalLoss += loss;
                    
                    // Simplified backpropagation
                    this.backpropagate(network, sample.input, sample.output, prediction);
                }
                
                if (epoch % 10 === 0) {
                    const avgLoss = totalLoss / trainingData.length;
                    console.log(`[OblivionFilter] Training epoch ${epoch}, loss: ${avgLoss.toFixed(4)}`);
                }
            }
        },

        backpropagate: function(network, input, target, prediction) {
            // Simplified backpropagation for single output
            const outputError = target - prediction;
            const outputDelta = outputError * this.sigmoidDerivative(prediction);
            
            // Update output layer weights and biases
            const lastWeightIndex = network.weights.length - 1;
            const lastActivation = network.activations[lastWeightIndex];
            
            for (let i = 0; i < network.weights[lastWeightIndex].length; i++) {
                for (let j = 0; j < network.weights[lastWeightIndex][i].length; j++) {
                    network.weights[lastWeightIndex][i][j] += 
                        network.learningRate * outputDelta * lastActivation[j];
                }
            }
            
            network.biases[lastWeightIndex][0] += network.learningRate * outputDelta;
        },

        // Utility functions
        createMatrix: function(rows, cols) {
            return Array(rows).fill().map(() => Array(cols).fill(0));
        },

        createVector: function(size) {
            return Array(size).fill(0);
        },

        randomizeMatrix: function(matrix, scale = 1.0) {
            for (let i = 0; i < matrix.length; i++) {
                for (let j = 0; j < matrix[i].length; j++) {
                    matrix[i][j] = (Math.random() - 0.5) * 2 * scale;
                }
            }
        },

        randomizeVector: function(vector, scale = 1.0) {
            for (let i = 0; i < vector.length; i++) {
                vector[i] = (Math.random() - 0.5) * 2 * scale;
            }
        },

        matrixVectorMultiply: function(matrix, vector) {
            const result = [];
            for (let i = 0; i < matrix.length; i++) {
                let sum = 0;
                for (let j = 0; j < vector.length; j++) {
                    sum += matrix[i][j] * vector[j];
                }
                result.push(sum);
            }
            return result;
        },

        vectorAdd: function(a, b) {
            return a.map((val, i) => val + b[i]);
        },

        sigmoid: function(x) {
            return 1 / (1 + Math.exp(-x));
        },

        sigmoidDerivative: function(x) {
            return x * (1 - x);
        }
    };

    /******************************************************************************/

    // Decision Tree Implementation
    const DecisionTree = {
        
        create: function(maxDepth = 10, minSamplesLeaf = 5) {
            return {
                maxDepth: maxDepth,
                minSamplesLeaf: minSamplesLeaf,
                tree: null
            };
        },

        train: function(model, trainingData) {
            model.tree = this.buildTree(trainingData, 0, model.maxDepth, model.minSamplesLeaf);
        },

        predict: function(model, features) {
            return this.traverseTree(model.tree, features);
        },

        buildTree: function(data, depth, maxDepth, minSamplesLeaf) {
            // Base cases
            if (depth >= maxDepth || data.length < minSamplesLeaf) {
                return this.createLeaf(data);
            }

            // Find best split
            const bestSplit = this.findBestSplit(data);
            if (!bestSplit) {
                return this.createLeaf(data);
            }

            // Split data
            const leftData = data.filter(sample => sample.input[bestSplit.feature] <= bestSplit.threshold);
            const rightData = data.filter(sample => sample.input[bestSplit.feature] > bestSplit.threshold);

            if (leftData.length === 0 || rightData.length === 0) {
                return this.createLeaf(data);
            }

            // Recursively build subtrees
            return {
                feature: bestSplit.feature,
                threshold: bestSplit.threshold,
                left: this.buildTree(leftData, depth + 1, maxDepth, minSamplesLeaf),
                right: this.buildTree(rightData, depth + 1, maxDepth, minSamplesLeaf)
            };
        },

        findBestSplit: function(data) {
            let bestGini = Infinity;
            let bestSplit = null;

            const features = Object.keys(data[0].input);
            
            for (const feature of features) {
                const values = data.map(sample => sample.input[feature]).filter(v => typeof v === 'number');
                if (values.length === 0) continue;

                const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
                
                for (let i = 0; i < uniqueValues.length - 1; i++) {
                    const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
                    const gini = this.calculateGini(data, feature, threshold);
                    
                    if (gini < bestGini) {
                        bestGini = gini;
                        bestSplit = { feature: feature, threshold: threshold };
                    }
                }
            }

            return bestSplit;
        },

        calculateGini: function(data, feature, threshold) {
            const leftData = data.filter(sample => sample.input[feature] <= threshold);
            const rightData = data.filter(sample => sample.input[feature] > threshold);
            
            const totalSize = data.length;
            const leftSize = leftData.length;
            const rightSize = rightData.length;
            
            if (leftSize === 0 || rightSize === 0) return Infinity;
            
            const leftGini = this.giniImpurity(leftData);
            const rightGini = this.giniImpurity(rightData);
            
            return (leftSize / totalSize) * leftGini + (rightSize / totalSize) * rightGini;
        },

        giniImpurity: function(data) {
            if (data.length === 0) return 0;
            
            const counts = {};
            for (const sample of data) {
                const label = sample.output;
                counts[label] = (counts[label] || 0) + 1;
            }
            
            let impurity = 1;
            for (const count of Object.values(counts)) {
                const prob = count / data.length;
                impurity -= prob * prob;
            }
            
            return impurity;
        },

        createLeaf: function(data) {
            const counts = {};
            for (const sample of data) {
                const label = sample.output;
                counts[label] = (counts[label] || 0) + 1;
            }
            
            // Return majority class
            const majority = Object.keys(counts).reduce((a, b) => 
                counts[a] > counts[b] ? a : b
            );
            
            return {
                isLeaf: true,
                prediction: parseFloat(majority),
                confidence: counts[majority] / data.length
            };
        },

        traverseTree: function(node, features) {
            if (node.isLeaf) {
                return node.prediction;
            }
            
            const featureValue = features[node.feature];
            if (typeof featureValue !== 'number') {
                return 0; // Default prediction
            }
            
            if (featureValue <= node.threshold) {
                return this.traverseTree(node.left, features);
            } else {
                return this.traverseTree(node.right, features);
            }
        }
    };

    /******************************************************************************/

    // Main ML Engine Interface
    const MLHeuristicEngine = {
        
        // Initialize ML engine
        initialize: async function() {
            if (state.isInitialized) return;

            console.log('[OblivionFilter] ML Heuristic Engine v2.1.0 initializing...');

            try {
                // Initialize models
                state.models.set('adClassifier', NeuralNetwork.create(
                    config.models.adClassifier.layers,
                    config.models.adClassifier.learningRate
                ));

                state.models.set('trackerClassifier', DecisionTree.create(
                    config.models.trackerClassifier.maxDepth,
                    config.models.trackerClassifier.minSamplesLeaf
                ));

                state.models.set('contentClassifier', DecisionTree.create(
                    config.models.contentClassifier.maxDepth,
                    config.models.contentClassifier.minSamplesLeaf
                ));

                // Initialize training data
                state.trainingData.set('ads', []);
                state.trainingData.set('trackers', []);
                state.trainingData.set('content', []);

                // Load existing training data if available
                await this.loadTrainingData();

                // Train initial models if we have data
                await this.trainModels();

                state.isInitialized = true;
                console.log('[OblivionFilter] ML Heuristic Engine v2.1.0 initialized successfully');

            } catch (error) {
                console.error('[OblivionFilter] ML engine initialization failed:', error);
                throw error;
            }
        },

        // Analyze element and predict if it's an ad/tracker
        analyzeElement: async function(element, context = {}) {
            if (!state.isInitialized) {
                await this.initialize();
            }

            const startTime = performance.now();
            
            try {
                // Extract features
                const features = this.extractAllFeatures(element, context);
                
                // Get predictions from all models
                const predictions = {
                    isAd: this.predictWithModel('adClassifier', features),
                    isTracker: this.predictWithModel('trackerClassifier', features),
                    isContent: this.predictWithModel('contentClassifier', features)
                };

                // Combine predictions with confidence weighting
                const finalPrediction = this.combinePredictions(predictions);
                
                // Cache result
                this.cacheResult(element, finalPrediction);
                
                // Update statistics
                state.statistics.predictions++;
                state.statistics.processingTime += performance.now() - startTime;

                return {
                    isAd: finalPrediction.isAd,
                    isTracker: finalPrediction.isTracker,
                    confidence: finalPrediction.confidence,
                    features: features,
                    predictions: predictions
                };

            } catch (error) {
                console.warn('[OblivionFilter] ML analysis failed:', error);
                return {
                    isAd: false,
                    isTracker: false,
                    confidence: 0,
                    error: error.message
                };
            }
        },

        // Extract all features for an element
        extractAllFeatures: function(element, context) {
            const features = {};
            
            // Merge all feature types
            Object.assign(features, FeatureExtractor.extractDOMFeatures(element));
            Object.assign(features, FeatureExtractor.extractCSSFeatures(element));
            
            if (context.url) {
                Object.assign(features, FeatureExtractor.extractNetworkFeatures(context.url, context.headers));
            }
            
            if (context.interactions) {
                Object.assign(features, FeatureExtractor.extractBehavioralFeatures(element, context.interactions));
            }

            // Convert features to numerical format
            return this.normalizeFeatures(features);
        },

        // Normalize features for ML models
        normalizeFeatures: function(features) {
            const normalized = {};
            
            for (const [key, value] of Object.entries(features)) {
                if (typeof value === 'boolean') {
                    normalized[key] = value ? 1 : 0;
                } else if (typeof value === 'number') {
                    normalized[key] = isNaN(value) ? 0 : value;
                } else if (typeof value === 'string') {
                    // Convert strings to numeric representations
                    normalized[key] = value.length > 0 ? 1 : 0;
                } else {
                    normalized[key] = 0;
                }
            }
            
            return normalized;
        },

        // Make prediction with specific model
        predictWithModel: function(modelName, features) {
            const model = state.models.get(modelName);
            if (!model) return 0;

            try {
                if (modelName === 'adClassifier') {
                    // Convert features to array for neural network
                    const featureArray = this.featuresToArray(features);
                    return NeuralNetwork.forward(model, featureArray);
                } else {
                    // Use decision tree
                    return DecisionTree.predict(model, features);
                }
            } catch (error) {
                console.warn(`[OblivionFilter] Prediction failed for ${modelName}:`, error);
                return 0;
            }
        },

        // Convert features object to array
        featuresToArray: function(features) {
            const expectedFeatures = [
                'width', 'height', 'area', 'aspectRatio', 'classCount', 'hasAdKeywords',
                'hasTrackingKeywords', 'hasId', 'attributeCount', 'textLength', 'hasImage',
                'hasFrame', 'hasExternalLink', 'opacity', 'zIndex', 'hasAbsolutePosition',
                'urlLength', 'parameterCount', 'isThirdParty', 'hasTrackingParams'
            ];
            
            return expectedFeatures.map(feature => features[feature] || 0);
        },

        // Combine predictions from multiple models
        combinePredictions: function(predictions) {
            const weights = {
                isAd: 0.6,
                isTracker: 0.3,
                isContent: 0.1
            };

            const weightedSum = 
                predictions.isAd * weights.isAd +
                predictions.isTracker * weights.isTracker +
                (1 - predictions.isContent) * weights.isContent;

            const confidence = Math.abs(weightedSum - 0.5) * 2; // Convert to 0-1 confidence

            return {
                isAd: weightedSum > config.confidenceThreshold,
                isTracker: predictions.isTracker > config.confidenceThreshold,
                confidence: confidence
            };
        },

        // Add training sample
        addTrainingSample: function(element, label, context = {}) {
            if (!config.training.autoCollect) return;

            try {
                const features = this.extractAllFeatures(element, context);
                const sample = {
                    input: features,
                    output: label ? 1 : 0,
                    timestamp: Date.now()
                };

                // Determine category
                let category = 'content';
                if (label && context.isAd) {
                    category = 'ads';
                } else if (label && context.isTracker) {
                    category = 'trackers';
                }

                const categoryData = state.trainingData.get(category);
                categoryData.push(sample);

                // Limit training data size
                if (categoryData.length > config.training.maxSamples) {
                    categoryData.shift(); // Remove oldest sample
                }

                console.log(`[OblivionFilter] Added training sample: ${category}, total: ${categoryData.length}`);

            } catch (error) {
                console.warn('[OblivionFilter] Failed to add training sample:', error);
            }
        },

        // Train all models
        trainModels: async function() {
            if (state.isTraining) return;

            state.isTraining = true;
            
            try {
                console.log('[OblivionFilter] Starting model training...');

                // Train ad classifier (neural network)
                const adData = state.trainingData.get('ads');
                const contentData = state.trainingData.get('content');
                
                if (adData.length > 10 && contentData.length > 10) {
                    const combinedData = [...adData, ...contentData];
                    const adModel = state.models.get('adClassifier');
                    NeuralNetwork.train(adModel, combinedData, config.models.adClassifier.epochs);
                }

                // Train tracker classifier (decision tree)
                const trackerData = state.trainingData.get('trackers');
                if (trackerData.length > 10) {
                    const trackerModel = state.models.get('trackerClassifier');
                    DecisionTree.train(trackerModel, trackerData);
                }

                // Train content classifier (decision tree)
                if (contentData.length > 10) {
                    const contentModel = state.models.get('contentClassifier');
                    DecisionTree.train(contentModel, contentData);
                }

                state.lastTraining = Date.now();
                console.log('[OblivionFilter] Model training completed');

            } catch (error) {
                console.error('[OblivionFilter] Model training failed:', error);
            } finally {
                state.isTraining = false;
            }
        },

        // Load training data from storage
        loadTrainingData: async function() {
            try {
                for (const category of ['ads', 'trackers', 'content']) {
                    const key = `mlTrainingData_${category}`;
                    
                    let data = null;
                    if (typeof browser !== 'undefined' && browser.storage) {
                        const result = await browser.storage.local.get(key);
                        data = result[key];
                    } else if (typeof chrome !== 'undefined' && chrome.storage) {
                        data = await new Promise((resolve) => {
                            chrome.storage.local.get(key, (result) => {
                                resolve(result[key]);
                            });
                        });
                    } else {
                        const stored = localStorage.getItem(key);
                        data = stored ? JSON.parse(stored) : null;
                    }

                    if (data && Array.isArray(data)) {
                        state.trainingData.set(category, data);
                        console.log(`[OblivionFilter] Loaded ${data.length} ${category} training samples`);
                    }
                }
            } catch (error) {
                console.warn('[OblivionFilter] Failed to load training data:', error);
            }
        },

        // Save training data to storage
        saveTrainingData: async function() {
            try {
                for (const [category, data] of state.trainingData.entries()) {
                    const key = `mlTrainingData_${category}`;
                    
                    if (typeof browser !== 'undefined' && browser.storage) {
                        await browser.storage.local.set({ [key]: data });
                    } else if (typeof chrome !== 'undefined' && chrome.storage) {
                        await new Promise((resolve) => {
                            chrome.storage.local.set({ [key]: data }, resolve);
                        });
                    } else {
                        localStorage.setItem(key, JSON.stringify(data));
                    }
                }
                console.log('[OblivionFilter] Training data saved');
            } catch (error) {
                console.warn('[OblivionFilter] Failed to save training data:', error);
            }
        },

        // Cache prediction result
        cacheResult: function(element, prediction) {
            if (!config.performance.cacheResults) return;

            const key = this.getElementKey(element);
            state.predictions.set(key, {
                prediction: prediction,
                timestamp: Date.now()
            });

            // Limit cache size
            if (state.predictions.size > 1000) {
                const oldestKey = Array.from(state.predictions.keys())[0];
                state.predictions.delete(oldestKey);
            }
        },

        // Get cached result
        getCachedResult: function(element) {
            if (!config.performance.cacheResults) return null;

            const key = this.getElementKey(element);
            const cached = state.predictions.get(key);
            
            if (!cached) return null;
            
            if (Date.now() - cached.timestamp > config.performance.cacheTTL) {
                state.predictions.delete(key);
                return null;
            }

            return cached.prediction;
        },

        // Generate unique key for element
        getElementKey: function(element) {
            const rect = element.getBoundingClientRect();
            return `${element.tagName}_${rect.x}_${rect.y}_${rect.width}_${rect.height}_${element.className}`;
        },

        // Get engine statistics
        getStatistics: function() {
            const accuracy = state.statistics.predictions > 0 ? 
                state.statistics.correctPredictions / state.statistics.predictions : 0;

            return {
                version: '2.1.0',
                isInitialized: state.isInitialized,
                isTraining: state.isTraining,
                statistics: {
                    ...state.statistics,
                    accuracy: accuracy,
                    avgProcessingTime: state.statistics.predictions > 0 ? 
                        state.statistics.processingTime / state.statistics.predictions : 0
                },
                trainingData: {
                    ads: state.trainingData.get('ads')?.length || 0,
                    trackers: state.trainingData.get('trackers')?.length || 0,
                    content: state.trainingData.get('content')?.length || 0
                },
                lastTraining: state.lastTraining,
                cacheSize: state.predictions.size,
                memoryUsage: this.getMemoryUsage()
            };
        },

        // Estimate memory usage
        getMemoryUsage: function() {
            let size = 0;
            
            // Approximate size calculation
            size += state.predictions.size * 100; // Rough estimate per prediction
            size += state.trainingData.get('ads')?.length * 1000 || 0;
            size += state.trainingData.get('trackers')?.length * 1000 || 0;
            size += state.trainingData.get('content')?.length * 1000 || 0;
            
            return size;
        },

        // Update configuration
        updateConfig: function(newConfig) {
            Object.assign(config, newConfig);
            console.log('[OblivionFilter] ML engine configuration updated');
        },

        // Cleanup and stop
        cleanup: function() {
            state.isInitialized = false;
            state.isTraining = false;
            state.models.clear();
            state.predictions.clear();
            console.log('[OblivionFilter] ML Heuristic Engine cleaned up');
        }
    };

    // Export the engine
    return MLHeuristicEngine;

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    window.MLHeuristicEngine = MLHeuristicEngine;
}

/******************************************************************************/

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MLHeuristicEngine;
}

/******************************************************************************/
