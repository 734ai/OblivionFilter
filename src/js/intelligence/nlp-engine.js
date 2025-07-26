/*******************************************************************************

    OblivionFilter - Natural Language Processing Engine v2.1.0
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

// Natural Language Processing Engine for Text Ad Detection
// Advanced NLP techniques for identifying sponsored content and text ads
const NLPEngine = (function() {

    /******************************************************************************/

    // Configuration
    const config = {
        enabled: true,
        
        // Language models
        models: {
            sentiment: true,
            intentClassification: true,
            entityRecognition: true,
            topicModeling: true,
            semanticSimilarity: true
        },
        
        // Detection targets
        targets: {
            promotionalLanguage: true,
            callToAction: true,
            priceIndicators: true,
            urgencyMarkers: true,
            brandMentions: true,
            affiliate: true
        },
        
        // Performance settings
        performance: {
            maxProcessingTime: 30, // ms
            cacheResults: true,
            batchProcessing: true,
            multiLanguage: true
        }
    };

    /******************************************************************************/

    // Language detection and processing
    const LanguageProcessor = {
        // Supported languages with detection patterns
        languages: {
            'en': {
                name: 'English',
                stopWords: new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']),
                adMarkers: ['sponsored', 'advertisement', 'promoted', 'ad', 'deal', 'sale', 'discount', 'buy now', 'click here', 'limited time', 'exclusive', 'free trial']
            },
            'es': {
                name: 'Spanish',
                stopWords: new Set(['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las']),
                adMarkers: ['patrocinado', 'anuncio', 'promoción', 'oferta', 'descuento', 'comprar', 'gratis', 'limitado']
            },
            'fr': {
                name: 'French', 
                stopWords: new Set(['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par']),
                adMarkers: ['sponsorisé', 'publicité', 'promotion', 'offre', 'réduction', 'acheter', 'gratuit', 'limité']
            },
            'de': {
                name: 'German',
                stopWords: new Set(['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'es', 'an', 'werden']),
                adMarkers: ['gesponsert', 'werbung', 'anzeige', 'angebot', 'rabatt', 'kaufen', 'kostenlos', 'begrenzt']
            }
        },

        // Detect language of text
        detectLanguage(text) {
            if (!text || text.length < 10) return 'en'; // Default to English
            
            const words = this.tokenize(text.toLowerCase());
            const scores = {};
            
            // Initialize scores
            Object.keys(this.languages).forEach(lang => scores[lang] = 0);
            
            // Score based on stop words
            for (const word of words) {
                for (const [lang, langData] of Object.entries(this.languages)) {
                    if (langData.stopWords.has(word)) {
                        scores[lang]++;
                    }
                }
            }
            
            // Return language with highest score
            return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
        },

        // Basic tokenization
        tokenize(text) {
            return text.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(token => token.length > 1);
        },

        // Remove stop words
        removeStopWords(tokens, language = 'en') {
            const stopWords = this.languages[language]?.stopWords || this.languages.en.stopWords;
            return tokens.filter(token => !stopWords.has(token));
        },

        // Calculate n-grams
        getNGrams(tokens, n = 2) {
            const ngrams = [];
            for (let i = 0; i <= tokens.length - n; i++) {
                ngrams.push(tokens.slice(i, i + n).join(' '));
            }
            return ngrams;
        }
    };

    /******************************************************************************/

    // Sentiment Analysis for promotional content detection
    const SentimentAnalyzer = {
        // Promotional sentiment indicators
        positiveWords: new Set([
            'amazing', 'awesome', 'best', 'excellent', 'fantastic', 'great', 'incredible',
            'outstanding', 'perfect', 'spectacular', 'stunning', 'superb', 'wonderful',
            'revolutionary', 'innovative', 'breakthrough', 'cutting-edge', 'advanced',
            'premium', 'luxury', 'exclusive', 'special', 'unique', 'rare', 'limited'
        ]),

        // Sales-oriented words
        salesWords: new Set([
            'buy', 'purchase', 'order', 'shop', 'sale', 'deal', 'discount', 'offer',
            'save', 'cheap', 'affordable', 'bargain', 'value', 'price', 'cost',
            'free', 'bonus', 'gift', 'reward', 'win', 'earn', 'profit'
        ]),

        // Urgency indicators
        urgencyWords: new Set([
            'now', 'today', 'immediately', 'urgent', 'hurry', 'quick', 'fast',
            'limited', 'expires', 'deadline', 'last', 'final', 'ending', 'closing',
            'while', 'supplies', 'last', 'only', 'few', 'left'
        ]),

        // Analyze sentiment and promotional indicators
        analyze(text, language = 'en') {
            const tokens = LanguageProcessor.tokenize(text);
            const cleanTokens = LanguageProcessor.removeStopWords(tokens, language);
            
            let positiveScore = 0;
            let salesScore = 0;
            let urgencyScore = 0;
            
            // Count promotional indicators
            for (const token of cleanTokens) {
                if (this.positiveWords.has(token)) positiveScore++;
                if (this.salesWords.has(token)) salesScore++;
                if (this.urgencyWords.has(token)) urgencyScore++;
            }
            
            // Calculate normalized scores
            const totalTokens = cleanTokens.length || 1;
            
            return {
                positive: positiveScore / totalTokens,
                sales: salesScore / totalTokens,
                urgency: urgencyScore / totalTokens,
                promotional: (positiveScore + salesScore * 1.5 + urgencyScore * 2) / totalTokens,
                wordCount: totalTokens
            };
        }
    };

    /******************************************************************************/

    // Intent Classification for call-to-action detection
    const IntentClassifier = {
        // Intent patterns and their weights
        intents: {
            purchase: {
                patterns: [
                    /\b(buy|purchase|order|shop|get|grab)\b/i,
                    /\b(add to cart|checkout|payment)\b/i,
                    /\b(price|cost|\$\d+|\€\d+|£\d+)\b/i
                ],
                weight: 2.0
            },
            
            signup: {
                patterns: [
                    /\b(sign up|register|join|subscribe|follow)\b/i,
                    /\b(create account|get started|try free)\b/i,
                    /\b(newsletter|updates|notifications)\b/i
                ],
                weight: 1.5
            },
            
            engagement: {
                patterns: [
                    /\b(click|tap|press|visit|check out)\b/i,
                    /\b(like|share|comment|rate|review)\b/i,
                    /\b(learn more|find out|discover)\b/i
                ],
                weight: 1.0
            },
            
            download: {
                patterns: [
                    /\b(download|install|get app|mobile app)\b/i,
                    /\b(app store|play store|ios|android)\b/i
                ],
                weight: 1.8
            },
            
            contact: {
                patterns: [
                    /\b(call|contact|reach out|get in touch)\b/i,
                    /\b(phone|email|message|chat)\b/i,
                    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/ // Phone number pattern
                ],
                weight: 1.2
            }
        },

        // Classify intent in text
        classify(text) {
            const results = {};
            let maxScore = 0;
            let primaryIntent = 'none';
            
            for (const [intent, data] of Object.entries(this.intents)) {
                let score = 0;
                
                for (const pattern of data.patterns) {
                    const matches = (text.match(pattern) || []).length;
                    score += matches * data.weight;
                }
                
                results[intent] = score;
                
                if (score > maxScore) {
                    maxScore = score;
                    primaryIntent = intent;
                }
            }
            
            return {
                primary: primaryIntent,
                scores: results,
                confidence: maxScore,
                isCallToAction: maxScore > 1.0
            };
        }
    };

    /******************************************************************************/

    // Entity Recognition for brand and product detection
    const EntityRecognizer = {
        // Common brand indicators
        brandPatterns: [
            /\b[A-Z][a-z]+ (Inc|LLC|Corp|Ltd|Co)\b/,
            /\b(™|®|©)\b/,
            /\b[A-Z]{2,}\b/, // Acronyms
            /\b(brand|company|corporation|business)\b/i
        ],

        // Price patterns
        pricePatterns: [
            /\$\d+(?:,\d{3})*(?:\.\d{2})?/,
            /\€\d+(?:,\d{3})*(?:\.\d{2})?/,
            /£\d+(?:,\d{3})*(?:\.\d{2})?/,
            /\b\d+(?:,\d{3})*(?:\.\d{2})?\s?(dollars?|euros?|pounds?|USD|EUR|GBP)\b/i,
            /\bfree\b/i,
            /\b\d+%\s?(off|discount)\b/i
        ],

        // Product keywords
        productKeywords: [
            'product', 'item', 'service', 'solution', 'package', 'plan', 'subscription',
            'software', 'app', 'tool', 'device', 'gadget', 'equipment', 'system'
        ],

        // Extract entities from text
        extract(text) {
            const entities = {
                brands: [],
                prices: [],
                products: [],
                urls: [],
                emails: []
            };

            // Extract brands
            for (const pattern of this.brandPatterns) {
                const matches = text.match(new RegExp(pattern, 'g')) || [];
                entities.brands.push(...matches);
            }

            // Extract prices
            for (const pattern of this.pricePatterns) {
                const matches = text.match(new RegExp(pattern, 'g')) || [];
                entities.prices.push(...matches);
            }

            // Extract product mentions
            const tokens = LanguageProcessor.tokenize(text);
            for (const keyword of this.productKeywords) {
                if (tokens.includes(keyword)) {
                    entities.products.push(keyword);
                }
            }

            // Extract URLs
            const urlPattern = /https?:\/\/[^\s]+/g;
            entities.urls = text.match(urlPattern) || [];

            // Extract emails
            const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            entities.emails = text.match(emailPattern) || [];

            return entities;
        }
    };

    /******************************************************************************/

    // Topic Modeling for content categorization
    const TopicModeler = {
        // Topic categories with keywords
        topics: {
            ecommerce: [
                'shop', 'store', 'buy', 'sell', 'product', 'cart', 'checkout',
                'shipping', 'delivery', 'return', 'refund', 'warranty'
            ],
            
            finance: [
                'bank', 'loan', 'credit', 'investment', 'insurance', 'savings',
                'money', 'financial', 'mortgage', 'interest', 'rate'
            ],
            
            technology: [
                'software', 'app', 'digital', 'online', 'cloud', 'data',
                'tech', 'computer', 'mobile', 'internet', 'web'
            ],
            
            travel: [
                'hotel', 'flight', 'vacation', 'trip', 'travel', 'booking',
                'destination', 'tourism', 'resort', 'cruise', 'airline'
            ],
            
            health: [
                'health', 'medical', 'doctor', 'medicine', 'fitness', 'wellness',
                'diet', 'nutrition', 'exercise', 'supplement', 'pharmacy'
            ],
            
            education: [
                'course', 'learn', 'education', 'training', 'skill', 'study',
                'university', 'college', 'degree', 'certificate', 'online'
            ],
            
            entertainment: [
                'game', 'movie', 'music', 'video', 'streaming', 'entertainment',
                'show', 'series', 'film', 'concert', 'event'
            ]
        },

        // Classify topic of text
        classify(text) {
            const tokens = LanguageProcessor.removeStopWords(
                LanguageProcessor.tokenize(text)
            );
            
            const scores = {};
            
            // Calculate topic scores
            for (const [topic, keywords] of Object.entries(this.topics)) {
                let score = 0;
                
                for (const token of tokens) {
                    if (keywords.includes(token)) {
                        score++;
                    }
                }
                
                scores[topic] = score / tokens.length;
            }
            
            // Find dominant topic
            const dominantTopic = Object.keys(scores).reduce((a, b) => 
                scores[a] > scores[b] ? a : b
            );
            
            return {
                dominant: dominantTopic,
                scores,
                confidence: scores[dominantTopic]
            };
        }
    };

    /******************************************************************************/

    // Main NLP analysis engine
    let initialized = false;
    let analysisCache = new Map();
    let statistics = {
        totalAnalyses: 0,
        languageDistribution: {},
        topicDistribution: {},
        avgProcessingTime: 0
    };

    /******************************************************************************/

    // Initialize NLP engine
    const initialize = function() {
        if (initialized) return;
        
        console.log('[NLP] Initializing Natural Language Processing engine...');
        
        // Pre-compile patterns for better performance
        EntityRecognizer.compiledPatterns = EntityRecognizer.brandPatterns.map(
            pattern => new RegExp(pattern, 'gi')
        );
        
        initialized = true;
        console.log('[NLP] NLP engine initialized successfully');
    };

    // Main text analysis function
    const analyzeText = function(text, options = {}) {
        if (!initialized) {
            console.warn('[NLP] Engine not initialized');
            return null;
        }
        
        const startTime = performance.now();
        
        try {
            // Check cache
            const cacheKey = `${text}_${JSON.stringify(options)}`;
            if (config.performance.cacheResults && analysisCache.has(cacheKey)) {
                return analysisCache.get(cacheKey);
            }
            
            // Language detection
            const language = LanguageProcessor.detectLanguage(text);
            
            // Sentiment analysis
            const sentiment = SentimentAnalyzer.analyze(text, language);
            
            // Intent classification
            const intent = IntentClassifier.classify(text);
            
            // Entity recognition
            const entities = EntityRecognizer.extract(text);
            
            // Topic modeling
            const topic = TopicModeler.classify(text);
            
            // Calculate advertising probability
            const adProbability = this.calculateAdProbability({
                sentiment,
                intent,
                entities,
                topic,
                language
            });
            
            const result = {
                language,
                sentiment,
                intent,
                entities,
                topic,
                adProbability,
                isAdvertising: adProbability > 0.6,
                processingTime: performance.now() - startTime,
                timestamp: Date.now()
            };
            
            // Update statistics
            this.updateStatistics(result);
            
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
            console.error('[NLP] Analysis failed:', error);
            return null;
        }
    };

    // Calculate advertising probability
    const calculateAdProbability = function(analysis) {
        let score = 0;
        
        // Sentiment indicators
        score += analysis.sentiment.promotional * 0.3;
        score += analysis.sentiment.sales * 0.4;
        score += analysis.sentiment.urgency * 0.5;
        
        // Intent indicators
        if (analysis.intent.isCallToAction) {
            score += 0.4;
        }
        score += analysis.intent.confidence * 0.1;
        
        // Entity indicators
        if (analysis.entities.prices.length > 0) score += 0.3;
        if (analysis.entities.brands.length > 0) score += 0.2;
        if (analysis.entities.urls.length > 0) score += 0.1;
        
        // Topic indicators
        const commercialTopics = ['ecommerce', 'finance'];
        if (commercialTopics.includes(analysis.topic.dominant)) {
            score += analysis.topic.confidence * 0.2;
        }
        
        return Math.min(score, 1.0);
    };

    // Update analysis statistics
    const updateStatistics = function(result) {
        statistics.totalAnalyses++;
        
        // Language distribution
        const lang = result.language;
        statistics.languageDistribution[lang] = 
            (statistics.languageDistribution[lang] || 0) + 1;
        
        // Topic distribution
        const topic = result.topic.dominant;
        statistics.topicDistribution[topic] = 
            (statistics.topicDistribution[topic] || 0) + 1;
        
        // Average processing time
        statistics.avgProcessingTime = 
            (statistics.avgProcessingTime * (statistics.totalAnalyses - 1) + 
             result.processingTime) / statistics.totalAnalyses;
    };

    // Batch analyze multiple texts
    const batchAnalyze = async function(texts, options = {}) {
        const results = [];
        
        for (let i = 0; i < texts.length; i++) {
            const result = analyzeText(texts[i], options);
            results.push(result);
            
            // Allow other tasks to run every 10 analyses
            if (i % 10 === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        return results;
    };

    // Update configuration
    const updateConfig = function(newConfig) {
        Object.assign(config, newConfig);
        console.log('[NLP] Configuration updated');
    };

    // Get statistics
    const getStatistics = function() {
        return {
            ...statistics,
            cacheSize: analysisCache.size,
            initialized
        };
    };

    // Clear cache
    const clearCache = function() {
        analysisCache.clear();
        console.log('[NLP] Cache cleared');
    };

    /******************************************************************************/

    // Public API
    return {
        initialize,
        analyzeText,
        batchAnalyze,
        updateConfig,
        getStatistics,
        clearCache,
        
        // Sub-modules for direct access
        LanguageProcessor,
        SentimentAnalyzer,
        IntentClassifier,
        EntityRecognizer,
        TopicModeler,
        
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
            NLPEngine.initialize();
        });
    } else {
        NLPEngine.initialize();
    }
}

/******************************************************************************/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NLPEngine;
}
