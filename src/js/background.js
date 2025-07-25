/*******************************************************************************

    OblivionFilter - Enhanced Content Blocker
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
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/734ai/OblivionFilter
*/

'use strict';

/******************************************************************************/

// OblivionFilter Configuration - Enhanced for v2.0.0
const oblivionConfig = {
    version: '2.0.0',
    build: 'stealth-advanced',
    features: {
        antiAdblock: true,
        stealthMode: true,
        decentralizedUpdates: true,
        manifestV3Resistance: true,
        zeroTelemetry: true,
        advancedFiltering: true,
        
        // v2.0.0 New Features
        advancedDOMCloaking: true,
        shadowDOMSupport: true,
        machineLearningHeuristics: false, // v2.1.0
        behavioralMimicry: true,
        memoryProtection: true,
        selectorObfuscation: true
    },
    stealth: {
        randomDelayMin: 50,
        randomDelayMax: 200,
        obfuscationLevel: 4, // Increased for v2.0.0
        antiFingerprinting: true,
        domCloaking: true,
        signatureObfuscation: true,
        
        // v2.0.0 Advanced Stealth
        enableShadowDOM: true,
        enableAdvancedCloaking: true,
        enableMemoryProtection: true,
        maxCloakedElements: 1000,
        cleanupInterval: 300000,
        selectorObfuscation: true,
        attributeScrambling: true,
        dynamicMethodNames: true,
        contextualBehavior: true,
        
        // v2.0.0 Traffic Randomization
        trafficRandomization: {
            enabled: true,
            aggressiveMode: false,
            timingRandomization: true,
            headerRandomization: true,
            dummyTraffic: true,
            statisticalPoisoning: true,
            
            // Background-specific settings
            globalTrafficManagement: true,
            crossTabCoordination: true,
            networkLevelObfuscation: true
        },
        
        // v2.0.0 Behavioral Mimicry
        behavioralMimicry: {
            enabled: true,
            humanBehaviorSim: true,
            naturalMouseMovement: true,
            contextAwareness: true,
            interactionDelay: true,
            
            // Background-specific behavioral settings
            globalBehaviorCoordination: true,
            crossTabSync: true,
            behaviorMemory: true,
            adaptiveBehavior: true
        },
        
        // v2.0.0 IPFS Integration (Phase 3 - Censorship Resistance)
        ipfsIntegration: {
            enabled: true,
            usePublicGateways: true,
            fallbackToGitHub: true,
            compressionEnabled: true,
            autoUpdateEnabled: true,
            
            // Background-specific IPFS settings
            gatewayManagement: true,
            failoverHandling: true,
            updateCoordination: true,
            cacheManagement: true
        },
        
        // v2.0.0 P2P Network (Phase 3 - Enhanced Censorship Resistance)
        p2pNetwork: {
            enabled: true,
            autoConnect: true,
            maxPeers: 20,
            maxConnections: 8,
            
            // Background-specific P2P settings
            coordinateFilterUpdates: true,
            enableDHT: true,
            enableMeshRouting: true,
            peerDiscovery: true,
            filterDistribution: true
        },
        
        // v2.1.0 ML Heuristics (Machine Learning & Intelligence)
        mlHeuristics: {
            enabled: false, // Enabling in v2.1.0
            learningMode: true,
            confidenceThreshold: 0.75,
            autoCollectTrainingData: true,
            enableNeuralNetwork: true,
            
            // Background-specific ML settings
            globalModelManagement: true,
            distributedLearning: false, // Future feature
            modelSyncAcrossTabs: true,
            backgroundTraining: true
        },
        
        // v2.0.0 Tor Integration (Phase 3 - Complete Censorship Resistance)
        torIntegration: {
            enabled: true,
            autoDetectTorProxy: true,
            enableBridgeDiscovery: true,
            enableHiddenServices: true,
            preferV3Onions: true,
            
            // Background-specific Tor settings
            coordinateTorCircuits: true,
            manageBridgePool: true,
            onionDomainCaching: true,
            crossTabTorSync: true,
            bridgeHealthMonitoring: true,
            torTrafficCoordination: true
        }
    },
    performance: {
        maxMemoryUsage: 75 * 1024 * 1024, // 75MB for v2.0.0
        filterEvalTimeout: 1, // 1ms
        startupTimeout: 500, // 500ms
        maxRulesPerList: 100000
    },
    security: {
        contentSecurityPolicy: true,
        integrityChecking: true,
        secureStorage: true,
        antiTampering: true
    }
};

/******************************************************************************/

// Static Network Filtering Engine
class StaticNetworkFilteringEngine {
    constructor() {
        this.filters = new Map();
        this.allowFilters = new Map();
        this.redirectFilters = new Map();
        this.modifyHeadersFilters = new Map();
        this.compiled = false;
        this.stats = {
            totalFilters: 0,
            blockFilters: 0,
            allowFilters: 0,
            redirectFilters: 0,
            modifyHeadersFilters: 0
        };
    }

    addFilter(filter) {
        if (!filter || typeof filter !== 'string') return false;
        
        const parsed = this.parseFilter(filter);
        if (!parsed) return false;

        if (parsed.action === 'allow') {
            this.allowFilters.set(parsed.id, parsed);
            this.stats.allowFilters++;
        } else if (parsed.action === 'redirect') {
            this.redirectFilters.set(parsed.id, parsed);
            this.stats.redirectFilters++;
        } else if (parsed.action === 'modifyHeaders') {
            this.modifyHeadersFilters.set(parsed.id, parsed);
            this.stats.modifyHeadersFilters++;
        } else {
            this.filters.set(parsed.id, parsed);
            this.stats.blockFilters++;
        }

        this.stats.totalFilters++;
        this.compiled = false;
        return true;
    }

    parseFilter(filter) {
        // Basic filter parsing - enhanced for OblivionFilter
        if (filter.startsWith('!') || filter.trim() === '') return null;
        
        const id = this.generateFilterId(filter);
        let action = 'block';
        let pattern = filter;
        let options = {};

        // Check for whitelist filters
        if (filter.startsWith('@@')) {
            action = 'allow';
            pattern = filter.substring(2);
        }

        // Parse options
        const optionsIndex = pattern.lastIndexOf('$');
        if (optionsIndex !== -1) {
            const optionsStr = pattern.substring(optionsIndex + 1);
            pattern = pattern.substring(0, optionsIndex);
            options = this.parseOptions(optionsStr);
        }

        // Determine action based on options
        if (options.redirect) action = 'redirect';
        if (options.modifyHeaders) action = 'modifyHeaders';

        return {
            id,
            original: filter,
            pattern,
            action,
            options,
            regex: this.createRegexFromPattern(pattern)
        };
    }

    parseOptions(optionsStr) {
        const options = {};
        const parts = optionsStr.split(',');
        
        for (const part of parts) {
            const [key, value] = part.split('=');
            if (value) {
                options[key] = value;
            } else {
                options[key] = true;
            }
        }
        
        return options;
    }

    createRegexFromPattern(pattern) {
        // Convert filter pattern to regex with stealth obfuscation
        let regex = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\^/g, '[^a-zA-Z0-9.%_-]')
            .replace(/\|/g, '');

        // Add stealth randomization
        if (oblivionConfig.stealth.signatureObfuscation) {
            regex = this.obfuscateRegex(regex);
        }

        try {
            return new RegExp(regex, 'i');
        } catch (e) {
            console.warn('Invalid filter pattern:', pattern);
            return null;
        }
    }

    obfuscateRegex(regex) {
        // Simple regex obfuscation to avoid detection
        return regex.replace(/[a-z]/g, (match) => {
            return Math.random() > 0.5 ? `[${match}${match.toUpperCase()}]` : match;
        });
    }

    generateFilterId(filter) {
        // Generate unique ID for filter
        let hash = 0;
        for (let i = 0; i < filter.length; i++) {
            const char = filter.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `filter_${Math.abs(hash)}_${Date.now()}`;
    }

    match(url, type = 'other', hostname = '') {
        if (!this.compiled) this.compile();

        const startTime = performance.now();
        
        // Check allow filters first
        for (const [id, filter] of this.allowFilters) {
            if (this.testFilter(filter, url, type, hostname)) {
                this.updateStats('allowed', performance.now() - startTime);
                return { action: 'allow', filter };
            }
        }

        // Check block filters
        for (const [id, filter] of this.filters) {
            if (this.testFilter(filter, url, type, hostname)) {
                this.updateStats('blocked', performance.now() - startTime);
                return { action: 'block', filter };
            }
        }

        // Check redirect filters
        for (const [id, filter] of this.redirectFilters) {
            if (this.testFilter(filter, url, type, hostname)) {
                this.updateStats('redirected', performance.now() - startTime);
                return { action: 'redirect', filter };
            }
        }

        this.updateStats('allowed', performance.now() - startTime);
        return { action: 'allow', filter: null };
    }

    testFilter(filter, url, type, hostname) {
        if (!filter.regex) return false;
        
        // Test regex match
        if (!filter.regex.test(url)) return false;

        // Test options
        if (filter.options.domain) {
            const domains = filter.options.domain.split('|');
            const domainMatch = domains.some(domain => {
                if (domain.startsWith('~')) {
                    return hostname !== domain.substring(1);
                }
                return hostname === domain || hostname.endsWith('.' + domain);
            });
            if (!domainMatch) return false;
        }

        if (filter.options.type) {
            const types = filter.options.type.split('|');
            if (!types.includes(type)) return false;
        }

        return true;
    }

    compile() {
        // Optimization pass for filters
        console.log(`[OblivionFilter] Compiling ${this.stats.totalFilters} filters...`);
        this.compiled = true;
    }

    updateStats(action, time) {
        // Update performance statistics
        if (!this.performanceStats) {
            this.performanceStats = {
                blocked: 0,
                allowed: 0,
                redirected: 0,
                avgTime: 0,
                totalTime: 0,
                requests: 0
            };
        }

        this.performanceStats[action]++;
        this.performanceStats.totalTime += time;
        this.performanceStats.requests++;
        this.performanceStats.avgTime = this.performanceStats.totalTime / this.performanceStats.requests;
    }

    getStats() {
        return {
            filters: this.stats,
            performance: this.performanceStats || {}
        };
    }
}

/******************************************************************************/

// Enhanced OblivionFilter object with stealth extensions
const OblivionFilter = (function() {
    'use strict';

    // Core components
    let staticFilterEngine = null;
    let initialized = false;
    let settings = {};
    let stats = {
        blocked: 0,
        allowed: 0,
        requests: 0,
        startTime: Date.now()
    };

    /******************************************************************************/

    const initialize = async function() {
        if (initialized) return;

        console.log('[OblivionFilter] Initializing v' + oblivionConfig.version + ' (' + oblivionConfig.build + ')');
        console.log('[OblivionFilter] Enhanced features:', oblivionConfig.features);

        try {
            // Load settings
            settings = getDefaultSettings();
            
            // Initialize filtering engines
            staticFilterEngine = new StaticNetworkFilteringEngine();

            // Setup request interceptor
            setupRequestInterceptor();

            // v2.0.0: Initialize advanced stealth features
            if (oblivionConfig.features.advancedDOMCloaking) {
                await initializeStealthFeatures();
            }

            // v2.0.0: Initialize Tor integration (Phase 3 - Complete Censorship Resistance)
            if (oblivionConfig.stealth.torIntegration.enabled) {
                await initializeTorIntegration();
            }

            initialized = true;
            console.log('[OblivionFilter] v2.0.0 initialization complete with advanced stealth and Tor integration');
            console.log('[OblivionFilter] Memory protection:', oblivionConfig.features.memoryProtection);
            console.log('[OblivionFilter] Shadow DOM support:', oblivionConfig.features.shadowDOMSupport);
            console.log('[OblivionFilter] Tor integration:', oblivionConfig.stealth.torIntegration.enabled);

        } catch (error) {
            console.error('[OblivionFilter] Initialization failed:', error);
        }
    };

    /******************************************************************************/

    // v2.0.0: Initialize advanced stealth features
    const initializeStealthFeatures = async function() {
        console.log('[OblivionFilter] Initializing advanced stealth features...');

        try {
            // Initialize DOM cloaking engine with v2.0.0 config
            if (typeof DOMCloakingEngine !== 'undefined') {
                DOMCloakingEngine.updateConfig({
                    enableShadowDOM: oblivionConfig.stealth.enableShadowDOM,
                    enableAdvancedCloaking: oblivionConfig.stealth.enableAdvancedCloaking,
                    enableMemoryProtection: oblivionConfig.stealth.enableMemoryProtection,
                    maxCloakedElements: oblivionConfig.stealth.maxCloakedElements,
                    cleanupInterval: oblivionConfig.stealth.cleanupInterval,
                    selectorObfuscation: oblivionConfig.stealth.selectorObfuscation,
                    attributeScrambling: oblivionConfig.stealth.attributeScrambling,
                    dynamicMethodNames: oblivionConfig.stealth.dynamicMethodNames
                });

                console.log('[OblivionFilter] DOM Cloaking Engine v2.0.0 configured');
            }

            // Initialize signature obfuscation
            if (typeof SignatureObfuscationEngine !== 'undefined') {
                SignatureObfuscationEngine.updateConfig({
                    obfuscationLevel: oblivionConfig.stealth.obfuscationLevel,
                    enableRotation: true,
                    rotationInterval: 60000 // 1 minute
                });

                console.log('[OblivionFilter] Signature Obfuscation Engine configured');
            }

            // Initialize behavioral mimicry
            if (oblivionConfig.features.behavioralMimicry) {
                await initializeBehavioralMimicry();
            }

            // v2.0.0: Initialize Traffic Randomization Engine
            if (oblivionConfig.stealth.trafficRandomization.enabled && 
                typeof TrafficRandomizationEngine !== 'undefined') {
                TrafficRandomizationEngine.updateConfig({
                    enabled: oblivionConfig.stealth.trafficRandomization.enabled,
                    aggressiveMode: oblivionConfig.stealth.trafficRandomization.aggressiveMode,
                    
                    timing: {
                        baseDelay: { min: 20, max: 300 }, // Higher delays for background
                        requestSpacing: { min: 100, max: 1000 },
                        burstPrevention: {
                            enabled: true,
                            maxConcurrent: 5,
                            cooldownPeriod: 2000
                        }
                    },
                    
                    patterns: {
                        headerRandomization: oblivionConfig.stealth.trafficRandomization.headerRandomization,
                        userAgentRotation: true,
                        referrerMasking: true,
                        acceptHeaderVariation: true
                    },
                    
                    dummyTraffic: {
                        enabled: oblivionConfig.stealth.trafficRandomization.dummyTraffic,
                        frequency: { min: 120000, max: 600000 }, // 2-10 minutes for background
                        targets: [
                            'https://httpbin.org/delay/1',
                            'https://httpbin.org/bytes/512',
                            'https://httpbin.org/uuid',
                            'https://httpbin.org/headers',
                            'https://httpbin.org/user-agent'
                        ]
                    },
                    
                    antiAnalysis: {
                        statisticalPoisoning: oblivionConfig.stealth.trafficRandomization.statisticalPoisoning,
                        temporalDecorrelation: true,
                        volumeObfuscation: true,
                        behavioralMimicry: true
                    }
                });

                TrafficRandomizationEngine.initialize();
                console.log('[OblivionFilter] Traffic Randomization Engine v2.0.0 configured');
            }

            console.log('[OblivionFilter] Advanced stealth features initialized successfully');

        } catch (error) {
            console.error('[OblivionFilter] Stealth initialization failed:', error);
        }
    };

    /******************************************************************************/

    // v2.0.0: Initialize behavioral mimicry
    const initializeBehavioralMimicry = async function() {
        // Randomize timing patterns to mimic human behavior
        const humanTimingPatterns = {
            minDelay: oblivionConfig.stealth.randomDelayMin,
            maxDelay: oblivionConfig.stealth.randomDelayMax,
            varianceThreshold: 0.3, // 30% variance
            naturalPauses: [100, 250, 500, 750, 1000] // Common human pause durations
        };

        // Apply behavioral patterns to filter engine
        if (staticFilterEngine) {
            staticFilterEngine.setBehavioralMimicry(humanTimingPatterns);
        }

        console.log('[OblivionFilter] Behavioral mimicry initialized');
    };

    /******************************************************************************/

    // v2.0.0: Initialize Tor integration (Phase 3 - Complete Censorship Resistance)
    const initializeTorIntegration = async function() {
        try {
            console.log('[OblivionFilter] Initializing Tor integration...');
            
            // Check if Tor components are available
            if (typeof window !== 'undefined' && window.torIntegrationManager) {
                // Initialize Tor proxy detection and circuit management
                await window.torIntegrationManager.init();
                
                // Setup onion domain handling
                if (window.onionDomainHandler) {
                    await window.onionDomainHandler.init();
                }
                
                // Initialize bridge relay system
                if (window.bridgeRelaySystem) {
                    await window.bridgeRelaySystem.init();
                }
                
                // Setup cross-tab Tor coordination
                if (oblivionConfig.stealth.torIntegration.crossTabTorSync) {
                    setupTorCoordination();
                }
                
                console.log('[OblivionFilter] Tor integration initialized successfully');
                
                // Report Tor status
                const torStatus = window.torIntegrationManager.getStatus();
                console.log('[OblivionFilter] Tor proxy detected:', torStatus.proxy ? 'Yes' : 'No');
                console.log('[OblivionFilter] Active circuits:', torStatus.circuits);
                console.log('[OblivionFilter] Bridge connections:', torStatus.bridges);
                
            } else {
                console.warn('[OblivionFilter] Tor integration components not available');
            }
            
        } catch (error) {
            console.error('[OblivionFilter] Failed to initialize Tor integration:', error);
        }
    };
    
    // Setup cross-tab Tor coordination
    const setupTorCoordination = function() {
        // Listen for Tor events from other tabs
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'tor-circuit-request') {
                // Handle circuit sharing requests
                if (window.torIntegrationManager) {
                    const circuit = window.torIntegrationManager.circuitManager.getBestCircuit(
                        message.domain,
                        message.purpose
                    );
                    sendResponse({ circuit: circuit ? circuit.id : null });
                }
            } else if (message.type === 'tor-bridge-discovery') {
                // Share discovered bridges
                if (window.bridgeRelaySystem) {
                    const bridges = window.bridgeRelaySystem.getBridgeList();
                    sendResponse({ bridges });
                }
            } else if (message.type === 'onion-cache-sync') {
                // Sync onion domain cache
                if (window.onionDomainHandler) {
                    const cacheData = window.onionDomainHandler.onionCache;
                    sendResponse({ cache: Array.from(cacheData.entries()) });
                }
            }
        });
        
        console.log('[OblivionFilter] Tor coordination setup complete');
    };

    /******************************************************************************/

    const getDefaultSettings = function() {
        return {
            enabled: true,
            stealthMode: true,
            antiAdblock: true,
            cosmeticFiltering: true,
            scriptletInjection: true,
            advancedBlocking: true,
            decentralizedUpdates: true,
            zeroTelemetry: true,
            filterLists: [
                'easylist',
                'easyprivacy',
                'oblivion-stealth'
            ],
            customFilters: [],
            whitelist: [],
            performance: {
                maxMemoryUsage: oblivionConfig.performance.maxMemoryUsage,
                filterEvalTimeout: oblivionConfig.performance.filterEvalTimeout
            }
        };
    };

    /******************************************************************************/

    const setupRequestInterceptor = function() {
        if (!chrome.webRequest) return;

        // Block requests based on static filters
        chrome.webRequest.onBeforeRequest.addListener(
            function(details) {
                if (!settings.enabled) return {};

                const result = staticFilterEngine.match(
                    details.url,
                    details.type,
                    new URL(details.url).hostname
                );

                if (result.action === 'block') {
                    stats.blocked++;
                    return { cancel: true };
                } else if (result.action === 'redirect' && result.filter.options.redirect) {
                    stats.blocked++;
                    return { redirectUrl: result.filter.options.redirect };
                }

                stats.allowed++;
                return {};
            },
            { urls: ['<all_urls>'] },
            ['blocking']
        );
    };

    /******************************************************************************/

    const getStats = function() {
        return {
            version: oblivionConfig.version,
            build: oblivionConfig.build,
            uptime: Date.now() - stats.startTime,
            requests: {
                total: stats.requests,
                blocked: stats.blocked,
                allowed: stats.allowed,
                blockRate: stats.requests > 0 ? (stats.blocked / stats.requests * 100) : 0
            },
            engines: {
                static: staticFilterEngine ? staticFilterEngine.getStats() : {}
            },
            settings: settings,
            memory: {
                used: performance.memory ? performance.memory.usedJSHeapSize : 0,
                limit: oblivionConfig.performance.maxMemoryUsage
            }
        };
    };

    /******************************************************************************/

    const isEnabled = function() {
        return settings.enabled;
    };

    const enable = function() {
        settings.enabled = true;
    };

    const disable = function() {
        settings.enabled = false;
    };

    /******************************************************************************/

    // Public API
    return {
        initialize: initialize,
        getStats: getStats,
        isEnabled: isEnabled,
        enable: enable,
        disable: disable,
        version: oblivionConfig.version,
        build: oblivionConfig.build
    };

})();

/******************************************************************************/

// Initialize OblivionFilter when background script loads
(async function() {
    'use strict';
    
    try {
        await OblivionFilter.initialize();
        console.log('[OblivionFilter] Background script ready');
    } catch (error) {
        console.error('[OblivionFilter] Background script initialization failed:', error);
    }
})();

/******************************************************************************/

// Export for testing (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OblivionFilter, oblivionConfig };
}

/******************************************************************************/