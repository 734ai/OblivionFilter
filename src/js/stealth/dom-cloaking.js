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

// DOM Cloaking Engine - Advanced stealth mechanisms to avoid detection
const DOMCloakingEngine = (function() {

    /******************************************************************************/

    // Stealth configuration - Enhanced for v2.0.0
    const config = {
        enabled: true,
        aggressiveMode: true,
        delayRange: [50, 200], // Random delay in milliseconds
        obfuscationLevel: 3, // 1-5 scale
        antiFingerprinting: true,
        behaviorMimicry: true,
        signatureRotation: true,
        
        // v2.0.0 New Features
        enableShadowDOM: true,
        enableAdvancedCloaking: true,
        enableMLHeuristics: false, // Coming in v2.1.0
        enableMemoryProtection: true,
        maxCloakedElements: 1000,
        cleanupInterval: 300000, // 5 minutes
        
        // Advanced obfuscation
        selectorObfuscation: true,
        attributeScrambling: true,
        dynamicMethodNames: true,
        contextualBehavior: true
    };

    /******************************************************************************/

    // Method signature obfuscation
    const obfuscatedMethods = new Map();
    const originalMethods = new Map();

    /******************************************************************************/
    
    // v2.0.0 Advanced Cloaking Features
    const cloakedElements = new WeakSet();
    const shadowContainers = new Map();
    const selectorMappings = new Map();
    const cleanupQueue = new Set();
    let cleanupInterval = null;
    let obfuscationCounter = 0;

    /******************************************************************************/

    // Advanced Shadow DOM Management
    const ShadowDOMManager = {
        createStealthContainer(hostElement) {
            if (!config.enableShadowDOM || !hostElement.attachShadow) {
                return this.createFallbackContainer(hostElement);
            }

            try {
                const shadowRoot = hostElement.attachShadow({ mode: 'closed' });
                
                // Create stealth wrapper inside shadow
                const wrapper = document.createElement('div');
                wrapper.style.cssText = `
                    position: absolute !important;
                    top: -9999px !important;
                    left: -9999px !important;
                    width: 0 !important;
                    height: 0 !important;
                    overflow: hidden !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                `;
                
                shadowRoot.appendChild(wrapper);
                
                const containerId = 'shadow_' + (++obfuscationCounter) + '_' + Math.random().toString(36).substr(2, 8);
                shadowContainers.set(containerId, { host: hostElement, shadow: shadowRoot, wrapper });
                
                return { containerId, shadowRoot, wrapper };
            } catch (e) {
                console.warn('[OblivionFilter] Shadow DOM creation failed, using fallback:', e);
                return this.createFallbackContainer(hostElement);
            }
        },

        createFallbackContainer(parentElement) {
            const container = document.createElement('div');
            container.style.cssText = `
                position: absolute !important;
                top: -9999px !important;
                left: -9999px !important;
                width: 0px !important;
                height: 0px !important;
                overflow: hidden !important;
                visibility: hidden !important;
                opacity: 0 !important;
                display: none !important;
                pointer-events: none !important;
                z-index: -9999 !important;
            `;

            parentElement.appendChild(container);
            
            const containerId = 'fallback_' + (++obfuscationCounter) + '_' + Math.random().toString(36).substr(2, 8);
            shadowContainers.set(containerId, { host: parentElement, container });
            
            return { containerId, container };
        },

        injectStealthElement(containerId, element) {
            const container = shadowContainers.get(containerId);
            if (!container) return false;

            try {
                if (container.wrapper) {
                    container.wrapper.appendChild(element);
                } else if (container.container) {
                    container.container.appendChild(element);
                }

                cloakedElements.add(element);
                cleanupQueue.add(element);
                return true;
            } catch (e) {
                console.warn('[OblivionFilter] Stealth injection failed:', e);
                return false;
            }
        }
    };

    /******************************************************************************/

    // Advanced Element Cloaking
    const AdvancedCloaking = {
        cloakElement(element, options = {}) {
            if (!config.enableAdvancedCloaking || cloakedElements.has(element)) {
                return false;
            }

            try {
                // Store original state
                element._originalState = {
                    style: element.style.cssText,
                    className: element.className,
                    id: element.id,
                    attributes: {}
                };

                // Store all custom attributes
                for (let attr of element.attributes) {
                    if (attr.name.startsWith('data-') || attr.name.startsWith('aria-')) {
                        element._originalState.attributes[attr.name] = attr.value;
                    }
                }

                // Apply aggressive cloaking
                element.style.cssText += `
                    position: absolute !important;
                    top: -9999px !important;
                    left: -9999px !important;
                    width: 0px !important;
                    height: 0px !important;
                    overflow: hidden !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    display: none !important;
                    pointer-events: none !important;
                    z-index: -9999 !important;
                `;

                // Obfuscate identifiers
                if (config.selectorObfuscation) {
                    if (element.id) {
                        const newId = this.generateObfuscatedId();
                        selectorMappings.set(newId, element.id);
                        element.id = newId;
                    }

                    if (element.className) {
                        const newClass = this.generateObfuscatedClass();
                        selectorMappings.set(newClass, element.className);
                        element.className = newClass;
                    }
                }

                // Scramble attributes
                if (config.attributeScrambling) {
                    this.scrambleAttributes(element);
                }

                // Mark as cloaked
                cloakedElements.add(element);
                element.setAttribute('data-obf-cloaked', 'true');
                element.setAttribute('data-obf-timestamp', Date.now().toString());

                return true;
            } catch (e) {
                console.warn('[OblivionFilter] Element cloaking failed:', e);
                return false;
            }
        },

        decloakElement(element) {
            if (!cloakedElements.has(element) || !element._originalState) {
                return false;
            }

            try {
                // Restore original state
                element.style.cssText = element._originalState.style;
                element.className = element._originalState.className;
                element.id = element._originalState.id;

                // Restore original attributes
                for (let [name, value] of Object.entries(element._originalState.attributes)) {
                    element.setAttribute(name, value);
                }

                // Clean up cloaking artifacts
                element.removeAttribute('data-obf-cloaked');
                element.removeAttribute('data-obf-timestamp');
                this.cleanupObfuscatedAttributes(element);

                cloakedElements.delete(element);
                delete element._originalState;

                return true;
            } catch (e) {
                console.warn('[OblivionFilter] Element decloaking failed:', e);
                return false;
            }
        },

        generateObfuscatedId() {
            return '_obf_id_' + (++obfuscationCounter) + '_' + Math.random().toString(36).substr(2, 8);
        },

        generateObfuscatedClass() {
            return '_obf_cls_' + (++obfuscationCounter) + '_' + Math.random().toString(36).substr(2, 8);
        },

        scrambleAttributes(element) {
            const scrambleAttrs = ['role', 'tabindex', 'title', 'alt'];
            
            scrambleAttrs.forEach(attr => {
                if (element.hasAttribute(attr)) {
                    const scrambled = 'obf_' + Math.random().toString(36).substr(2, 6);
                    element.setAttribute(scrambled, element.getAttribute(attr));
                    element.removeAttribute(attr);
                }
            });
        },

        cleanupObfuscatedAttributes(element) {
            const attributes = Array.from(element.attributes);
            attributes.forEach(attr => {
                if (attr.name.startsWith('obf_') || attr.name.startsWith('_obf_')) {
                    element.removeAttribute(attr.name);
                }
            });
        }
    };

    /******************************************************************************/

    // Memory Management and Cleanup for v2.0.0
    const MemoryManager = {
        startCleanup() {
            if (cleanupInterval) return;

            cleanupInterval = setInterval(() => {
                this.performCleanup();
            }, config.cleanupInterval);

            console.log('[OblivionFilter] Memory cleanup started');
        },

        stopCleanup() {
            if (cleanupInterval) {
                clearInterval(cleanupInterval);
                cleanupInterval = null;
            }
        },

        performCleanup() {
            let cleaned = 0;

            // Clean up stale cloaked elements
            const staleElements = [];
            cleanupQueue.forEach(element => {
                try {
                    if (!element.parentNode || this.isElementStale(element)) {
                        staleElements.push(element);
                    }
                } catch (e) {
                    staleElements.push(element);
                }
            });

            staleElements.forEach(element => {
                try {
                    AdvancedCloaking.decloakElement(element);
                    cloakedElements.delete(element);
                    cleanupQueue.delete(element);
                    cleaned++;
                } catch (e) {
                    console.warn('[OblivionFilter] Cleanup failed for element:', e);
                }
            });

            // Clean up shadow containers
            const staleShadows = [];
            shadowContainers.forEach((container, id) => {
                if (!container.host.parentNode) {
                    staleShadows.push(id);
                }
            });

            staleShadows.forEach(id => {
                shadowContainers.delete(id);
                cleaned++;
            });

            if (cleaned > 0) {
                console.log(`[OblivionFilter] Cleaned up ${cleaned} stale objects`);
            }
        },

        isElementStale(element) {
            if (!element.hasAttribute('data-obf-timestamp')) return false;
            
            const timestamp = parseInt(element.getAttribute('data-obf-timestamp'));
            const age = Date.now() - timestamp;
            
            return age > 600000; // 10 minutes
        },

        forceCleanup() {
            cloakedElements.forEach(element => {
                try {
                    AdvancedCloaking.decloakElement(element);
                } catch (e) {
                    console.warn('[OblivionFilter] Force cleanup failed:', e);
                }
            });

            cloakedElements.clear();
            cleanupQueue.clear();
            shadowContainers.clear();
            selectorMappings.clear();
        }
    };

    /******************************************************************************/

    // Initialize DOM cloaking
    const initialize = function() {
        if (!config.enabled) return;

        console.log('[OblivionFilter] DOM Cloaking Engine v2.0.0 initializing...');

        try {
            // Setup stealth wrappers
            setupStealthWrappers();
            
            // Implement anti-fingerprinting
            if (config.antiFingerprinting) {
                setupAntiFingerprinting();
            }

            // Setup behavior mimicry
            if (config.behaviorMimicry) {
                setupBehaviorMimicry();
            }

            // Randomize method signatures
            if (config.signatureRotation) {
                setupSignatureRotation();
            }

            // Start v2.0.0 memory management
            if (config.enableMemoryProtection) {
                MemoryManager.startCleanup();
            }

            console.log('[OblivionFilter] DOM Cloaking Engine v2.0.0 initialized successfully');
            console.log('[OblivionFilter] Active features:', {
                shadowDOM: config.enableShadowDOM,
                advancedCloaking: config.enableAdvancedCloaking,
                selectorObfuscation: config.selectorObfuscation,
                memoryProtection: config.enableMemoryProtection,
                attributeScrambling: config.attributeScrambling
            });

        } catch (error) {
            console.error('[OblivionFilter] DOM Cloaking initialization failed:', error);
        }
    };

    /******************************************************************************/

    // Setup stealth wrappers for critical DOM methods
    const setupStealthWrappers = function() {
        
        // Wrap querySelector/querySelectorAll with stealth timing
        const originalQuerySelector = Document.prototype.querySelector;
        const originalQuerySelectorAll = Document.prototype.querySelectorAll;

        Document.prototype.querySelector = function(selector) {
            return executeWithStealthTiming(() => {
                return originalQuerySelector.call(this, selector);
            });
        };

        Document.prototype.querySelectorAll = function(selector) {
            return executeWithStealthTiming(() => {
                return originalQuerySelectorAll.call(this, selector);
            });
        };

        // Wrap element style modifications
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            return executeWithStealthTiming(() => {
                return originalSetAttribute.call(this, name, value);
            });
        };

        // Wrap MutationObserver to avoid detection
        const originalMutationObserver = window.MutationObserver;
        window.MutationObserver = function(callback) {
            const wrappedCallback = function(mutations, observer) {
                // Add random delay to avoid detection patterns
                setTimeout(() => {
                    callback.call(this, mutations, observer);
                }, getRandomDelay());
            };
            return new originalMutationObserver(wrappedCallback);
        };

        // Store original methods
        originalMethods.set('querySelector', originalQuerySelector);
        originalMethods.set('querySelectorAll', originalQuerySelectorAll);
        originalMethods.set('setAttribute', originalSetAttribute);
        originalMethods.set('MutationObserver', originalMutationObserver);
    };

    /******************************************************************************/

    // Execute function with stealth timing
    const executeWithStealthTiming = function(func) {
        if (config.aggressiveMode) {
            // Add random micro-delay to disrupt timing analysis
            const delay = getRandomDelay();
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(func());
                }, delay);
            });
        } else {
            return func();
        }
    };

    /******************************************************************************/

    // Get random delay within configured range
    const getRandomDelay = function() {
        const [min, max] = config.delayRange;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    /******************************************************************************/

    // Anti-fingerprinting mechanisms
    const setupAntiFingerprinting = function() {
        
        // Randomize user agent properties
        Object.defineProperty(Navigator.prototype, 'userAgent', {
            get: function() {
                return obfuscateUserAgent(navigator.userAgent);
            },
            configurable: true
        });

        // Spoof extension detection methods
        spoofExtensionDetection();

        // Randomize timing APIs
        const originalPerformanceNow = Performance.prototype.now;
        Performance.prototype.now = function() {
            const realTime = originalPerformanceNow.call(this);
            // Add small random offset to disrupt timing fingerprinting
            return realTime + (Math.random() * 2 - 1); // ±1ms jitter
        };
    };

    /******************************************************************************/

    // Obfuscate user agent to avoid detection
    const obfuscateUserAgent = function(originalUA) {
        // Subtle modifications to avoid pattern detection
        const modifications = [
            ua => ua.replace(/Chrome\/[\d.]+/, `Chrome/${generateFakeVersion()}`),
            ua => ua.replace(/Version\/[\d.]+/, `Version/${generateFakeVersion()}`),
            ua => ua.replace(/Safari\/[\d.]+/, `Safari/${generateFakeVersion()}`)
        ];

        const randomMod = modifications[Math.floor(Math.random() * modifications.length)];
        return randomMod(originalUA);
    };

    /******************************************************************************/

    // Generate fake version numbers
    const generateFakeVersion = function() {
        const major = Math.floor(Math.random() * 10) + 90; // 90-99
        const minor = Math.floor(Math.random() * 10);
        const patch = Math.floor(Math.random() * 1000);
        const build = Math.floor(Math.random() * 100);
        return `${major}.${minor}.${patch}.${build}`;
    };

    /******************************************************************************/

    // Spoof common extension detection methods
    const spoofExtensionDetection = function() {
        
        // Spoof Chrome extension detection
        if (window.chrome && window.chrome.runtime) {
            const originalSendMessage = chrome.runtime.sendMessage;
            chrome.runtime.sendMessage = function(...args) {
                // Simulate random failures to avoid detection
                if (Math.random() < 0.1) {
                    throw new Error('Extension context invalidated');
                }
                return originalSendMessage.apply(this, args);
            };
        }

        // Spoof resource loading patterns
        const originalCreateElement = Document.prototype.createElement;
        Document.prototype.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            
            // Add stealth attributes to avoid detection
            if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'link') {
                // Random timing for resource loading
                setTimeout(() => {
                    element.dispatchEvent(new Event('load'));
                }, getRandomDelay());
            }
            
            return element;
        };
    };

    /******************************************************************************/

    // Setup behavior mimicry to appear like normal browsing
    const setupBehaviorMimicry = function() {
        
        // Simulate human-like mouse movement patterns
        simulateHumanBehavior();
        
        // Randomize script execution patterns
        randomizeExecutionPatterns();
        
        // Mimic normal extension behavior
        mimicNormalExtensionBehavior();
    };

    /******************************************************************************/

    // Simulate human-like behavior patterns
    const simulateHumanBehavior = function() {
        
        // Random mouse movements
        setInterval(() => {
            if (Math.random() < 0.1) { // 10% chance every interval
                simulateMouseMovement();
            }
        }, getRandomDelay() * 10);

        // Random scroll events
        setInterval(() => {
            if (Math.random() < 0.05) { // 5% chance
                simulateScrollBehavior();
            }
        }, getRandomDelay() * 20);
    };

    /******************************************************************************/

    // Simulate mouse movement
    const simulateMouseMovement = function() {
        const event = new MouseEvent('mousemove', {
            clientX: Math.random() * window.innerWidth,
            clientY: Math.random() * window.innerHeight,
            bubbles: true
        });
        document.dispatchEvent(event);
    };

    /******************************************************************************/

    // Simulate scroll behavior
    const simulateScrollBehavior = function() {
        const scrollEvent = new Event('scroll', { bubbles: true });
        window.dispatchEvent(scrollEvent);
    };

    /******************************************************************************/

    // Randomize execution patterns
    const randomizeExecutionPatterns = function() {
        
        // Override setTimeout with randomized delays
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay, ...args) {
            const randomizedDelay = delay + (Math.random() * 10 - 5); // ±5ms
            return originalSetTimeout.call(this, callback, Math.max(0, randomizedDelay), ...args);
        };

        // Override setInterval with jitter
        const originalSetInterval = window.setInterval;
        window.setInterval = function(callback, delay, ...args) {
            const jitteredDelay = delay + (Math.random() * 20 - 10); // ±10ms
            return originalSetInterval.call(this, callback, Math.max(1, jitteredDelay), ...args);
        };
    };

    /******************************************************************************/

    // Mimic normal extension behavior
    const mimicNormalExtensionBehavior = function() {
        
        // Simulate normal extension API usage patterns
        if (window.chrome && window.chrome.storage) {
            // Random storage access to appear normal
            setInterval(() => {
                if (Math.random() < 0.02) { // 2% chance
                    chrome.storage.local.get('dummy_key', () => {
                        // Do nothing, just access storage
                    });
                }
            }, getRandomDelay() * 100);
        }

        // Simulate normal content script injection patterns
        simulateContentScriptBehavior();
    };

    /******************************************************************************/

    // Simulate content script behavior
    const simulateContentScriptBehavior = function() {
        
        // Random DOM queries to appear like normal extension
        setInterval(() => {
            if (Math.random() < 0.05) { // 5% chance
                const randomSelectors = [
                    'div', 'span', 'p', 'a', 'img', 'button', 'input'
                ];
                const selector = randomSelectors[Math.floor(Math.random() * randomSelectors.length)];
                document.querySelector(selector);
            }
        }, getRandomDelay() * 50);
    };

    /******************************************************************************/

    // Setup signature rotation to avoid pattern recognition
    const setupSignatureRotation = function() {
        
        // Rotate method signatures periodically
        setInterval(() => {
            rotateMethodSignatures();
        }, 60000 + getRandomDelay() * 10); // Every ~1 minute with jitter

        // Rotate event listener patterns
        rotateEventPatterns();
    };

    /******************************************************************************/

    // Rotate method signatures
    const rotateMethodSignatures = function() {
        
        // Generate new obfuscated method names
        const methods = ['querySelector', 'querySelectorAll', 'setAttribute'];
        
        methods.forEach(method => {
            if (obfuscatedMethods.has(method)) {
                // Create new signature
                const newSignature = generateObfuscatedSignature(method);
                obfuscatedMethods.set(method, newSignature);
            }
        });
    };

    /******************************************************************************/

    // Generate obfuscated method signature
    const generateObfuscatedSignature = function(methodName) {
        const obfuscationLevel = config.obfuscationLevel;
        let signature = methodName;

        for (let i = 0; i < obfuscationLevel; i++) {
            signature = btoa(signature).replace(/[=]/g, '');
        }

        return signature;
    };

    /******************************************************************************/

    // Rotate event listener patterns
    const rotateEventPatterns = function() {
        
        // Remove and re-add event listeners with different patterns
        const events = ['click', 'scroll', 'mousemove', 'keydown'];
        
        events.forEach(eventType => {
            // Remove old listeners (if any)
            document.removeEventListener(eventType, dummyHandler);
            
            // Add new listener with random delay
            setTimeout(() => {
                document.addEventListener(eventType, dummyHandler, { 
                    passive: true,
                    once: false 
                });
            }, getRandomDelay());
        });
    };

    /******************************************************************************/

    // Dummy event handler for stealth purposes
    const dummyHandler = function(event) {
        // Do nothing, just exist to appear normal
        if (Math.random() < 0.001) { // 0.1% chance to do something
            console.debug('[OblivionFilter] Stealth event handler triggered');
        }
    };

    /******************************************************************************/

    // Clean up stealth mechanisms
    const cleanup = function() {
        console.log('[OblivionFilter] DOM Cloaking Engine v2.0.0 shutting down...');
        
        try {
            // Stop memory management
            MemoryManager.stopCleanup();
            MemoryManager.forceCleanup();

            // Restore original methods
            originalMethods.forEach((originalMethod, methodName) => {
                try {
                    switch(methodName) {
                        case 'querySelector':
                            Document.prototype.querySelector = originalMethod;
                            break;
                        case 'querySelectorAll':
                            Document.prototype.querySelectorAll = originalMethod;
                            break;
                        case 'setAttribute':
                            Element.prototype.setAttribute = originalMethod;
                            break;
                        case 'MutationObserver':
                            window.MutationObserver = originalMethod;
                            break;
                    }
                } catch (error) {
                    console.warn('[OblivionFilter] Failed to restore original method:', methodName, error);
                }
            });

            // Clear all tracking
            originalMethods.clear();
            obfuscatedMethods.clear();

            console.log('[OblivionFilter] DOM Cloaking Engine v2.0.0 cleaned up successfully');

        } catch (error) {
            console.error('[OblivionFilter] Cleanup failed:', error);
        }
    };

    /******************************************************************************/

    // Public API - Enhanced for v2.0.0
    return {
        // Core functions
        initialize: initialize,
        cleanup: cleanup,
        config: config,
        
        // Legacy timing functions
        executeWithStealthTiming: executeWithStealthTiming,
        getRandomDelay: getRandomDelay,
        
        // v2.0.0 Shadow DOM functions
        createStealthContainer: ShadowDOMManager.createStealthContainer,
        injectStealthElement: ShadowDOMManager.injectStealthElement,
        
        // v2.0.0 Advanced cloaking functions
        cloakElement: AdvancedCloaking.cloakElement,
        decloakElement: AdvancedCloaking.decloakElement,
        
        // v2.0.0 Memory management
        performCleanup: MemoryManager.performCleanup,
        forceCleanup: MemoryManager.forceCleanup,
        
        // Statistics and monitoring
        getStats() {
            return {
                cloakedElements: cloakedElements.size,
                shadowContainers: shadowContainers.size,
                selectorMappings: selectorMappings.size,
                cleanupQueue: cleanupQueue.size,
                obfuscationCounter: obfuscationCounter,
                memoryCleanupActive: cleanupInterval !== null
            };
        },
        
        // Configuration management
        updateConfig(newConfig) {
            Object.assign(config, newConfig);
            console.log('[OblivionFilter] Configuration updated:', newConfig);
        },
        
        // Version info
        version: '2.0.0',
        features: [
            'Advanced DOM Cloaking',
            'Shadow DOM Support',
            'Memory Management',
            'Selector Obfuscation',
            'Attribute Scrambling',
            'Anti-Fingerprinting',
            'Behavioral Mimicry'
        ]
    };

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    DOMCloakingEngine.initialize();
}

/******************************************************************************/

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMCloakingEngine;
}

/******************************************************************************/
