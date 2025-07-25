/*******************************************************************************

    OblivionFilter - Advanced privacy-respecting content blocker
    Copyright (C) 2025 Muzan Sano & contributors
    
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

    Home: https://github.com/OblivionFilter/OblivionFilter
*/

/*******************************************************************************

              +--> domCollapser
              |
              |
  domWatcher--+
              |                  +-- domSurveyor
              |                  |
              +--> domFilterer --+-- [domLogger]
                        |        |
                        |        +-- [domInspector]
                        |
             [domProceduralFilterer]
                        |
             [stealthInjector] <-- OblivionFilter enhancement
                        |
             [antiDetectionEngine] <-- OblivionFilter enhancement

  OblivionFilter Enhanced Content Script Components:

  stealthInjector:
    Provides stealth injection capabilities to evade anti-adblock detection.
    Uses randomized timing, obfuscated methods, and behavioral mimicry.

  antiDetectionEngine:
    Actively counters anti-adblock detection by monitoring for detection
    scripts and implementing countermeasures.

*/

/******************************************************************************/

'use strict';

// Abort execution if our global vAPI object does not exist or if we're in a privileged page
if ( typeof vAPI !== 'object' || vAPI === null ) {
    // Enhanced detection evasion - check for stealth mode requirements
    if ( typeof self === 'object' && self !== null ) {
        // We're in a content script context, try stealth initialization
        console.info('OblivionFilter: Attempting stealth content script initialization');
    } else {
        return;
    }
}

/******************************************************************************/

// OblivionFilter enhanced configuration
const oblivionContentConfig = {
    stealth: {
        enabled: true,
        maxRandomDelay: 500, // Maximum random delay in ms
        detectionCountermeasures: true,
        signatureObfuscation: true,
        behavioralMimicry: true
    },
    
    performance: {
        lazyDOMProcessing: true,
        throttleObservations: true,
        batchDOMOperations: true,
        optimizeSelectors: true
    },
    
    antiDetection: {
        detectAntiAdblock: true,
        counterDetection: true,
        stealthyInjection: true,
        randomizedTiming: true
    }
};

/******************************************************************************/

// Enhanced DOM watcher with stealth capabilities
const domWatcher = (function() {
    
    let observer = null;
    let isWatching = false;
    let stealthMode = false;
    
    const addedNodes = new WeakSet();
    const processedNodes = new WeakSet();
    
    // Stealth processing with randomized timing
    const stealthProcessor = {
        queue: [],
        processing: false,
        
        add: function(nodes) {
            if (!nodes || nodes.length === 0) return;
            
            this.queue.push(...nodes);
            
            if (!this.processing) {
                this.scheduleProcessing();
            }
        },
        
        scheduleProcessing: function() {
            if (this.processing) return;
            
            this.processing = true;
            
            // Random delay for stealth
            const delay = stealthMode ? 
                Math.floor(Math.random() * oblivionContentConfig.stealth.maxRandomDelay) : 0;
            
            setTimeout(() => {
                this.processQueue();
            }, delay);
        },
        
        processQueue: function() {
            const batch = this.queue.splice(0, 50); // Process in batches
            
            for (const node of batch) {
                if (!processedNodes.has(node)) {
                    this.processNode(node);
                    processedNodes.add(node);
                }
            }
            
            if (this.queue.length > 0) {
                // Schedule next batch with random delay
                setTimeout(() => {
                    this.processQueue();
                }, Math.floor(Math.random() * 50) + 10);
            } else {
                this.processing = false;
            }
        },
        
        processNode: function(node) {
            // Enhanced node processing with stealth features
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Check for anti-adblock scripts
                if (oblivionContentConfig.antiDetection.detectAntiAdblock) {
                    this.detectAntiAdblock(node);
                }
                
                // Apply filters stealthily
                this.applyFiltersStealthily(node);
            }
        },
        
        detectAntiAdblock: function(node) {
            // Detect common anti-adblock patterns
            const suspiciousPatterns = [
                /adblock/i,
                /oblivion/i,
                /adblocker/i,
                /adnauseam/i,
                /ghostery/i
            ];
            
            const text = node.textContent || '';
            const html = node.innerHTML || '';
            
            for (const pattern of suspiciousPatterns) {
                if (pattern.test(text) || pattern.test(html)) {
                    console.debug('OblivionFilter: Anti-adblock detection script found, applying countermeasures');
                    this.counterAntiAdblock(node);
                    break;
                }
            }
        },
        
        counterAntiAdblock: function(node) {
            // Implement anti-detection countermeasures
            if (oblivionContentConfig.antiDetection.counterDetection) {
                // Neutralize detection scripts
                if (node.tagName === 'SCRIPT') {
                    // Replace with harmless script
                    node.textContent = '// OblivionFilter: Script neutralized';
                    node.src = '';
                }
                
                // Hide detection elements
                if (node.style) {
                    node.style.setProperty('display', 'none', 'important');
                    node.style.setProperty('visibility', 'hidden', 'important');
                }
            }
        },
        
        applyFiltersStealthily: function(node) {
            // Apply cosmetic filters with stealth
            if (stealthMode && oblivionContentConfig.stealth.signatureObfuscation) {
                // Use obfuscated class names and methods
                const hiddenClassName = `of-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // Create stealth style injection
                if (!document.getElementById('oblivion-stealth-style')) {
                    const style = document.createElement('style');
                    style.id = 'oblivion-stealth-style';
                    style.textContent = `.${hiddenClassName} { display: none !important; visibility: hidden !important; }`;
                    document.head.appendChild(style);
                }
                
                // Apply stealth hiding
                if (this.shouldHideElement(node)) {
                    node.classList.add(hiddenClassName);
                }
            }
        },
        
        shouldHideElement: function(node) {
            // Enhanced element filtering logic
            const tagName = node.tagName;
            const className = node.className;
            const id = node.id;
            
            // Common ad patterns
            const adPatterns = [
                /\bad\b/i,
                /advertisement/i,
                /sponsor/i,
                /promoted/i,
                /banner/i
            ];
            
            const identifier = `${tagName} ${className} ${id}`.toLowerCase();
            
            return adPatterns.some(pattern => pattern.test(identifier));
        }
    };
    
    // Enhanced mutation observer
    const onMutationsReceived = function(mutations) {
        if (!isWatching) return;
        
        const addedNodes = [];
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        addedNodes.push(node);
                    }
                }
            }
        }
        
        if (addedNodes.length > 0) {
            stealthProcessor.add(addedNodes);
        }
    };
    
    const start = function() {
        if (isWatching) return;
        
        observer = new MutationObserver(onMutationsReceived);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
        
        isWatching = true;
        stealthMode = oblivionContentConfig.stealth.enabled;
        
        console.info('OblivionFilter: Enhanced DOM watcher started with stealth mode:', stealthMode);
    };
    
    const stop = function() {
        if (!isWatching) return;
        
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        isWatching = false;
        
        console.info('OblivionFilter: DOM watcher stopped');
    };
    
    return {
        start,
        stop,
        isWatching: () => isWatching
    };
})();

/******************************************************************************/

// Enhanced DOM filterer with stealth injection
const domFilterer = (function() {
    
    const CSS_HIDE_SELECTORS = [];
    const CSS_EXCEPTIONS = new Set();
    
    let hideStyleElement = null;
    let stealthStyleElement = null;
    
    const addCSS = function(selectors, stealth = false) {
        if (!selectors || selectors.length === 0) return;
        
        const css = selectors.join(',\n') + '\n{ display: none !important; }';
        
        if (stealth && oblivionContentConfig.stealth.enabled) {
            // Use stealth injection
            injectStealthCSS(css);
        } else {
            // Use regular injection
            injectRegularCSS(css);
        }
    };
    
    const injectStealthCSS = function(css) {
        if (!stealthStyleElement) {
            stealthStyleElement = document.createElement('style');
            stealthStyleElement.setAttribute('type', 'text/css');
            
            // Obfuscate the style element
            const randomId = `s-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            stealthStyleElement.id = randomId;
            
            // Use random delay for injection
            const delay = Math.floor(Math.random() * oblivionContentConfig.stealth.maxRandomDelay);
            
            setTimeout(() => {
                if (document.head) {
                    document.head.appendChild(stealthStyleElement);
                } else if (document.documentElement) {
                    document.documentElement.appendChild(stealthStyleElement);
                }
            }, delay);
        }
        
        if (stealthStyleElement.sheet) {
            try {
                stealthStyleElement.sheet.insertRule(css, stealthStyleElement.sheet.cssRules.length);
            } catch (ex) {
                // Fallback to textContent
                stealthStyleElement.textContent += css + '\n';
            }
        } else {
            stealthStyleElement.textContent += css + '\n';
        }
    };
    
    const injectRegularCSS = function(css) {
        if (!hideStyleElement) {
            hideStyleElement = document.createElement('style');
            hideStyleElement.setAttribute('type', 'text/css');
            hideStyleElement.textContent = css;
            
            if (document.head) {
                document.head.appendChild(hideStyleElement);
            } else if (document.documentElement) {
                document.documentElement.appendChild(hideStyleElement);
            }
        } else {
            hideStyleElement.textContent += '\n' + css;
        }
    };
    
    const hideElements = function(selectors) {
        if (!selectors || selectors.length === 0) return;
        
        // Use stealth mode for sensitive operations
        const useStealthMode = oblivionContentConfig.stealth.enabled && 
                              selectors.some(s => s.includes('ad') || s.includes('sponsor'));
        
        addCSS(selectors, useStealthMode);
    };
    
    return {
        hideElements,
        addCSS
    };
})();

/******************************************************************************/

// Anti-detection engine
const antiDetectionEngine = (function() {
    
    let active = false;
    let detectionAttempts = 0;
    
    const knownDetectionMethods = [
        // Element detection
        'getElementById',
        'getElementsByClassName',
        'getElementsByTagName',
        'querySelector',
        'querySelectorAll',
        
        // Style detection
        'getComputedStyle',
        'getPropertyValue',
        
        // Extension detection
        'chrome.runtime',
        'browser.runtime'
    ];
    
    const start = function() {
        if (active) return;
        
        active = true;
        
        // Monitor for detection attempts
        monitorDetectionMethods();
        
        // Inject counter-detection scripts
        injectCounterMeasures();
        
        console.info('OblivionFilter: Anti-detection engine activated');
    };
    
    const monitorDetectionMethods = function() {
        // Wrap common detection methods
        knownDetectionMethods.forEach(method => {
            const original = window[method] || document[method];
            
            if (original && typeof original === 'function') {
                const wrapper = function(...args) {
                    // Log detection attempts
                    detectionAttempts++;
                    
                    // Apply stealth responses if needed
                    if (shouldMaskResponse(method, args)) {
                        return createStealthResponse(method, args);
                    }
                    
                    return original.apply(this, args);
                };
                
                // Replace the method
                if (window[method]) {
                    window[method] = wrapper;
                } else if (document[method]) {
                    document[method] = wrapper;
                }
            }
        });
    };
    
    const shouldMaskResponse = function(method, args) {
        // Determine if we should mask the response
        if (args.length === 0) return false;
        
        const query = args[0];
        if (typeof query !== 'string') return false;
        
        // Check for extension-related queries
        const extensionPatterns = [
            /oblivion/i,
            /oblivionfilter/i,
            /adblock/i,
            /adblocker/i
        ];
        
        return extensionPatterns.some(pattern => pattern.test(query));
    };
    
    const createStealthResponse = function(method, args) {
        // Return fake responses to fool detection
        if (method.includes('getElementById') || method.includes('querySelector')) {
            return null; // Element not found
        }
        
        if (method.includes('getElementsBy') || method.includes('querySelectorAll')) {
            return []; // Empty collection
        }
        
        if (method === 'getComputedStyle') {
            // Return fake computed style
            return {
                getPropertyValue: () => 'initial',
                display: 'initial',
                visibility: 'initial'
            };
        }
        
        return null;
    };
    
    const injectCounterMeasures = function() {
        // Inject scripts to counter specific detection methods
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                // Mask extension-related properties
                if (window.chrome && window.chrome.runtime) {
                    // Create fake chrome.runtime object
                    const fakeRuntime = {
                        id: 'fake-extension-id',
                        getManifest: () => ({ name: 'Unknown Extension' })
                    };
                    
                    Object.defineProperty(window.chrome, 'runtime', {
                        value: fakeRuntime,
                        writable: false,
                        configurable: false
                    });
                }
                
                // Prevent detection of content script injection
                document.documentElement.setAttribute('data-oblivion-stealth', 'active');
            })();
        `;
        
        // Inject with random delay
        const delay = Math.floor(Math.random() * 100);
        setTimeout(() => {
            if (document.head) {
                document.head.appendChild(script);
                document.head.removeChild(script);
            }
        }, delay);
    };
    
    return {
        start,
        getDetectionAttempts: () => detectionAttempts
    };
})();

/******************************************************************************/

// Enhanced initialization sequence
(function() {
    console.info('OblivionFilter: Enhanced content script initializing...');
    
    // Check if page should be processed
    if (document.documentElement.getAttribute('data-oblivion-processed')) {
        console.info('OblivionFilter: Page already processed, skipping');
        return;
    }
    
    // Mark page as processed
    document.documentElement.setAttribute('data-oblivion-processed', 'true');
    
    // Initialize components based on configuration
    if (oblivionContentConfig.antiDetection.detectAntiAdblock) {
        antiDetectionEngine.start();
    }
    
    // Start DOM watching
    domWatcher.start();
    
    // Apply initial cosmetic filters
    domFilterer.hideElements([
        '[class*="ad"]',
        '[id*="ad"]',
        '.advertisement',
        '.sponsor',
        '.promoted'
    ]);
    
    console.info('OblivionFilter: Enhanced content script initialization complete');
})();

/******************************************************************************/

// Export for testing and debugging
if (typeof window !== 'undefined') {
    window.oblivionFilter = {
        domWatcher,
        domFilterer,
        antiDetectionEngine,
        config: oblivionContentConfig
    };
}
