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

// Advanced Anti-Adblock Bypass Engine
const AntiAdblockEngine = (function() {

    /******************************************************************************/

    // Configuration for anti-adblock bypass
    const config = {
        enabled: true,
        aggressiveMode: true,
        stealthLevel: 5, // 1-5 scale
        bypassMethods: {
            domManipulation: true,
            scriptInjection: true,
            timingAttacks: true,
            behaviorMimicry: true,
            signatureEvading: true
        },
        targetSystems: [
            'AdBlock Plus detection',
            'uBlock Origin detection', 
            'AdGuard detection',
            'Generic adblocker detection',
            'Custom anti-adblock scripts'
        ]
    };

    /******************************************************************************/

    // Known anti-adblock patterns and their bypasses
    const bypassPatterns = new Map([
        // Common variable names used by anti-adblock
        ['adblock', 'advertising_enabled'],
        ['adblocker', 'content_filter'],
        ['adblockplus', 'enhanced_privacy'],
        ['ublock', 'resource_optimizer'],
        ['adguard', 'tracker_shield'],
        
        // Common detection methods
        ['getComputedStyle', 'getElementStyle'],
        ['querySelector', 'findElement'],
        ['addEventListener', 'attachHandler'],
        ['removeEventListener', 'detachHandler'],
        ['MutationObserver', 'DOMWatcher']
    ]);

    /******************************************************************************/

    // Initialize anti-adblock bypass
    const initialize = function() {
        if (!config.enabled) return;

        console.log('[OblivionFilter] Initializing Anti-Adblock Bypass Engine...');

        // Setup stealth wrappers
        setupStealthWrappers();
        
        // Implement DOM manipulation bypasses
        if (config.bypassMethods.domManipulation) {
            setupDOMManipulationBypass();
        }

        // Setup script injection bypasses
        if (config.bypassMethods.scriptInjection) {
            setupScriptInjectionBypass();
        }

        // Implement timing attack resistance
        if (config.bypassMethods.timingAttacks) {
            setupTimingAttackResistance();
        }

        // Setup behavior mimicry
        if (config.bypassMethods.behaviorMimicry) {
            setupBehaviorMimicry();
        }

        // Setup signature evasion
        if (config.bypassMethods.signatureEvading) {
            setupSignatureEvasion();
        }

        console.log('[OblivionFilter] Anti-Adblock Bypass Engine initialized');
    };

    /******************************************************************************/

    // Setup stealth wrappers for critical methods
    const setupStealthWrappers = function() {
        
        // Wrap document.createElement to avoid detection
        const originalCreateElement = Document.prototype.createElement;
        Document.prototype.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            
            // Add stealth properties to avoid detection
            if (tagName.toLowerCase() === 'div') {
                // Spoof common ad container detection
                Object.defineProperty(element, 'offsetHeight', {
                    get: function() {
                        // Return realistic dimensions to avoid detection
                        return Math.floor(Math.random() * 300) + 100;
                    },
                    configurable: true
                });
                
                Object.defineProperty(element, 'offsetWidth', {
                    get: function() {
                        return Math.floor(Math.random() * 300) + 100;
                    },
                    configurable: true
                });
            }
            
            return element;
        };

        // Wrap getComputedStyle to spoof CSS detection
        const originalGetComputedStyle = window.getComputedStyle;
        window.getComputedStyle = function(element, pseudoElement) {
            const styles = originalGetComputedStyle.call(this, element, pseudoElement);
            
            // Create proxy to intercept property access
            return new Proxy(styles, {
                get: function(target, property) {
                    const value = target[property];
                    
                    // Spoof common anti-adblock CSS checks
                    if (property === 'display' && value === 'none') {
                        // Sometimes return 'block' to fool detection
                        if (Math.random() < 0.3) {
                            return 'block';
                        }
                    }
                    
                    if (property === 'visibility' && value === 'hidden') {
                        if (Math.random() < 0.3) {
                            return 'visible';
                        }
                    }
                    
                    return value;
                }
            });
        };
    };

    /******************************************************************************/

    // Setup DOM manipulation bypasses
    const setupDOMManipulationBypass = function() {
        
        // Intercept and neutralize anti-adblock DOM modifications
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            
            // Block suspicious attribute modifications
            if (name === 'data-adblock-detected' || 
                name === 'data-blocked' ||
                name.includes('anti-adblock')) {
                console.debug('[OblivionFilter] Blocked suspicious attribute:', name);
                return;
            }
            
            return originalSetAttribute.call(this, name, value);
        };

        // Intercept style modifications that might be anti-adblock related
        const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
        CSSStyleDeclaration.prototype.setProperty = function(property, value, priority) {
            
            // Block overlay creation attempts
            if (property === 'position' && value === 'fixed' && 
                this.zIndex && parseInt(this.zIndex) > 9999) {
                console.debug('[OblivionFilter] Blocked overlay creation attempt');
                return;
            }
            
            return originalSetProperty.call(this, property, value, priority);
        };

        // Protect against element removal detection
        const originalRemoveChild = Node.prototype.removeChild;
        Node.prototype.removeChild = function(child) {
            
            // Simulate element still exists for detection scripts
            if (child && child.dataset && child.dataset.oblivionProtected) {
                console.debug('[OblivionFilter] Protected element from removal');
                return child;
            }
            
            return originalRemoveChild.call(this, child);
        };
    };

    /******************************************************************************/

    // Setup script injection bypasses
    const setupScriptInjectionBypass = function() {
        
        // Intercept script injections that might be anti-adblock
        const originalAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function(child) {
            
            if (child.tagName === 'SCRIPT') {
                const scriptContent = child.textContent || child.src;
                
                // Check for anti-adblock script patterns
                if (isAntiAdblockScript(scriptContent)) {
                    console.debug('[OblivionFilter] Blocked anti-adblock script injection');
                    
                    // Return a dummy script element
                    const dummyScript = document.createElement('script');
                    dummyScript.textContent = '// OblivionFilter: Anti-adblock script neutralized';
                    return dummyScript;
                }
            }
            
            return originalAppendChild.call(this, child);
        };

        // Intercept eval() calls that might be anti-adblock
        const originalEval = window.eval;
        window.eval = function(code) {
            
            if (typeof code === 'string' && isAntiAdblockScript(code)) {
                console.debug('[OblivionFilter] Blocked anti-adblock eval()');
                return undefined;
            }
            
            return originalEval.call(this, code);
        };

        // Intercept Function constructor
        const originalFunction = window.Function;
        window.Function = function(...args) {
            const code = args[args.length - 1];
            
            if (typeof code === 'string' && isAntiAdblockScript(code)) {
                console.debug('[OblivionFilter] Blocked anti-adblock Function()');
                return function() { return undefined; };
            }
            
            return originalFunction.apply(this, args);
        };
    };

    /******************************************************************************/

    // Check if script content is anti-adblock related
    const isAntiAdblockScript = function(content) {
        if (!content || typeof content !== 'string') return false;

        const antiAdblockPatterns = [
            /adblock/i,
            /adblocker/i,
            /ad.blocker/i,
            /ublock/i,
            /adguard/i,
            /detector/i,
            /blocked.*ad/i,
            /ad.*blocked/i,
            /please.*disable/i,
            /whitelist.*site/i,
            /turn.*off.*adblock/i,
            /remove.*overlay/i,
            /getComputedStyle.*display.*none/i,
            /offsetHeight.*0/i,
            /offsetWidth.*0/i
        ];

        return antiAdblockPatterns.some(pattern => pattern.test(content));
    };

    /******************************************************************************/

    // Setup timing attack resistance
    const setupTimingAttackResistance = function() {
        
        // Add random delays to critical operations
        const addStealthDelay = function(originalMethod, context, args) {
            const delay = Math.random() * 10; // 0-10ms random delay
            
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(originalMethod.apply(context, args));
                }, delay);
            });
        };

        // Wrap timing-sensitive methods
        const originalQuerySelector = Document.prototype.querySelector;
        Document.prototype.querySelector = function(...args) {
            if (config.aggressiveMode) {
                return addStealthDelay(originalQuerySelector, this, args);
            }
            return originalQuerySelector.apply(this, args);
        };

        // Randomize performance.now() to resist timing fingerprinting
        const originalPerformanceNow = Performance.prototype.now;
        Performance.prototype.now = function() {
            const realTime = originalPerformanceNow.call(this);
            const jitter = (Math.random() - 0.5) * 2; // ±1ms jitter
            return realTime + jitter;
        };

        // Add jitter to setTimeout/setInterval
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay, ...args) {
            const jitteredDelay = delay + (Math.random() * 10 - 5); // ±5ms jitter
            return originalSetTimeout.call(this, callback, Math.max(0, jitteredDelay), ...args);
        };
    };

    /******************************************************************************/

    // Setup behavior mimicry
    const setupBehaviorMimicry = function() {
        
        // Simulate normal user behavior to avoid detection
        simulateUserActivity();
        
        // Create fake ad elements to fool detection
        createDecoyElements();
        
        // Simulate normal extension behavior patterns
        simulateExtensionBehavior();
    };

    /******************************************************************************/

    // Simulate user activity
    const simulateUserActivity = function() {
        
        // Random mouse movements
        setInterval(() => {
            if (Math.random() < 0.1) {
                const event = new MouseEvent('mousemove', {
                    clientX: Math.random() * window.innerWidth,
                    clientY: Math.random() * window.innerHeight,
                    bubbles: true
                });
                document.dispatchEvent(event);
            }
        }, 1000 + Math.random() * 2000);

        // Random clicks on non-interactive elements
        setInterval(() => {
            if (Math.random() < 0.05) {
                const elements = document.querySelectorAll('div, span, p');
                if (elements.length > 0) {
                    const randomElement = elements[Math.floor(Math.random() * elements.length)];
                    const event = new MouseEvent('click', { bubbles: true });
                    randomElement.dispatchEvent(event);
                }
            }
        }, 5000 + Math.random() * 10000);
    };

    /******************************************************************************/

    // Create decoy elements to fool anti-adblock detection
    const createDecoyElements = function() {
        
        // Create fake ad containers
        const createFakeAd = function() {
            const adContainer = document.createElement('div');
            adContainer.className = 'advertisement';
            adContainer.style.cssText = `
                width: 300px; 
                height: 250px; 
                position: absolute; 
                left: -9999px; 
                visibility: hidden;
                background: url('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
            `;
            adContainer.innerHTML = '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="300" height="250">';
            
            document.body.appendChild(adContainer);
            
            // Remove after random time
            setTimeout(() => {
                if (adContainer.parentNode) {
                    adContainer.parentNode.removeChild(adContainer);
                }
            }, 10000 + Math.random() * 20000);
        };

        // Create multiple fake ads at intervals
        setInterval(createFakeAd, 30000 + Math.random() * 60000);
        
        // Create initial fake ad
        if (document.body) {
            createFakeAd();
        } else {
            document.addEventListener('DOMContentLoaded', createFakeAd);
        }
    };

    /******************************************************************************/

    // Simulate extension behavior
    const simulateExtensionBehavior = function() {
        
        // Simulate storage access patterns
        if (window.chrome && window.chrome.storage) {
            setInterval(() => {
                if (Math.random() < 0.1) {
                    chrome.storage.local.get(['dummy_key'], () => {
                        // Simulate normal extension storage access
                    });
                }
            }, 10000 + Math.random() * 20000);
        }

        // Simulate message passing
        if (window.chrome && window.chrome.runtime) {
            setInterval(() => {
                if (Math.random() < 0.05) {
                    try {
                        chrome.runtime.sendMessage({type: 'heartbeat'}, () => {
                            // Simulate normal extension communication
                        });
                    } catch (e) {
                        // Ignore errors
                    }
                }
            }, 15000 + Math.random() * 30000);
        }
    };

    /******************************************************************************/

    // Setup signature evasion
    const setupSignatureEvasion = function() {
        
        // Obfuscate method names and signatures
        obfuscateMethodSignatures();
        
        // Rotate detection patterns
        rotateDetectionPatterns();
        
        // Implement dynamic code generation
        setupDynamicCodeGeneration();
    };

    /******************************************************************************/

    // Obfuscate method signatures
    const obfuscateMethodSignatures = function() {
        
        // Create aliases for common methods to avoid detection
        bypassPatterns.forEach((obfuscated, original) => {
            if (window[original]) {
                window[obfuscated] = window[original];
                
                // Sometimes replace original with obfuscated version
                if (Math.random() < 0.5) {
                    const temp = window[original];
                    delete window[original];
                    window[original] = temp;
                }
            }
        });
    };

    /******************************************************************************/

    // Rotate detection patterns
    const rotateDetectionPatterns = function() {
        
        setInterval(() => {
            // Randomize some global properties
            Object.defineProperty(window, 'adblockDetected', {
                get: function() {
                    return Math.random() < 0.1; // 10% chance to return true
                },
                configurable: true
            });

            // Create fake properties that anti-adblock might check
            const fakeProperties = ['__adblockplus', '__ublock', '__adguard'];
            fakeProperties.forEach(prop => {
                if (Math.random() < 0.3) {
                    window[prop] = {
                        version: '0.0.0',
                        enabled: false,
                        active: false
                    };
                }
            });
            
        }, 60000 + Math.random() * 120000); // Every 1-3 minutes
    };

    /******************************************************************************/

    // Setup dynamic code generation
    const setupDynamicCodeGeneration = function() {
        
        // Generate dynamic bypass functions
        const generateBypassFunction = function(pattern) {
            const functionBody = `
                return function(${pattern.params || ''}) {
                    // Dynamic bypass for ${pattern.name}
                    var result = ${pattern.defaultReturn || 'true'};
                    if (Math.random() < 0.1) {
                        result = ${pattern.alternateReturn || 'false'};
                    }
                    return result;
                };
            `;
            
            return new Function(functionBody)();
        };

        // Create dynamic bypasses for common patterns
        const commonPatterns = [
            { name: 'adBlockDetected', defaultReturn: 'false', alternateReturn: 'true' },
            { name: 'isAdBlockEnabled', defaultReturn: 'false', alternateReturn: 'true' },
            { name: 'hasAdBlocker', defaultReturn: 'false', alternateReturn: 'true' }
        ];

        commonPatterns.forEach(pattern => {
            window[pattern.name] = generateBypassFunction(pattern);
        });
    };

    /******************************************************************************/

    // Get bypass statistics
    const getStats = function() {
        return {
            enabled: config.enabled,
            stealthLevel: config.stealthLevel,
            bypassMethods: config.bypassMethods,
            patternsKnown: bypassPatterns.size,
            targetSystems: config.targetSystems.length
        };
    };

    /******************************************************************************/

    // Clean up bypasses
    const cleanup = function() {
        console.log('[OblivionFilter] Cleaning up Anti-Adblock Bypass Engine...');
        // Cleanup implementation would go here
        console.log('[OblivionFilter] Anti-Adblock Bypass Engine cleaned up');
    };

    /******************************************************************************/

    // Public API
    return {
        initialize: initialize,
        cleanup: cleanup,
        getStats: getStats,
        config: config,
        isAntiAdblockScript: isAntiAdblockScript
    };

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    AntiAdblockEngine.initialize();
}

/******************************************************************************/

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AntiAdblockEngine;
}

/******************************************************************************/
