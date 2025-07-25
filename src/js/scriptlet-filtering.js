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

// Scriptlet Injection Engine for OblivionFilter
// Advanced JavaScript injection with stealth and anti-detection features

const scriptletEngine = (function() {

    // Scriptlet library
    const scriptlets = new Map();
    const injectedScripts = new Set();
    
    // Stealth configuration
    const stealthConfig = {
        randomizeExecution: true,
        obfuscateCode: true,
        mimicNativeAPI: true,
        randomDelay: [50, 200], // min, max ms
        codeVariations: true
    };

    // Performance metrics
    let injectionsCount = 0;
    let executionsCount = 0;
    let errorsCount = 0;

    /**************************************************************************/

    const ScriptletLibrary = class {
        constructor() {
            this.initializeBuiltinScriptlets();
        }

        initializeBuiltinScriptlets() {
            // Core anti-adblock bypass scriptlets
            this.register('abort-on-property-read', this.abortOnPropertyRead);
            this.register('abort-on-property-write', this.abortOnPropertyWrite);
            this.register('abort-current-inline-script', this.abortCurrentInlineScript);
            this.register('remove-attr', this.removeAttr);
            this.register('remove-class', this.removeClass);
            this.register('set-constant', this.setConstant);
            this.register('no-setTimeout-if', this.noSetTimeoutIf);
            this.register('no-setInterval-if', this.noSetIntervalIf);
            this.register('remove-node-text', this.removeNodeText);
            this.register('hide-if-contains', this.hideIfContains);
            this.register('json-prune', this.jsonPrune);
            this.register('prevent-addEventListener', this.preventAddEventListener);
            this.register('prevent-fetch', this.preventFetch);
            this.register('prevent-xhr', this.preventXHR);
            this.register('stealth-mode', this.stealthMode);
        }

        register(name, scriptletFunction) {
            scriptlets.set(name, {
                name: name,
                func: scriptletFunction,
                variations: this.generateVariations(scriptletFunction)
            });
        }

        generateVariations(func) {
            // Generate code variations for stealth
            const variations = [];
            const original = func.toString();
            
            // Variation 1: Different variable names
            let variation1 = original.replace(/\bvar\s+/g, 'let ');
            variation1 = variation1.replace(/console\.log/g, 'console.debug');
            variations.push(variation1);
            
            // Variation 2: Different formatting
            let variation2 = original.replace(/{\s*/g, '{ ');
            variation2 = variation2.replace(/;\s*/g, '; ');
            variations.push(variation2);
            
            // Variation 3: Additional comments
            let variation3 = original.replace(/{/g, '{ /* enhanced */ ');
            variations.push(variation3);
            
            return variations;
        }

        get(name) {
            return scriptlets.get(name);
        }

        // Built-in scriptlets with enhanced stealth features

        abortOnPropertyRead() {
            return function(target, property) {
                const magicString = String.fromCharCode(Date.now() % 26 + 97) +
                                  Math.random().toString(36).substr(2, 8);
                
                const descriptor = Object.getOwnPropertyDescriptor(window[target], property);
                if (descriptor && descriptor.get) return;
                
                Object.defineProperty(window[target], property, {
                    get: function() {
                        throw new ReferenceError(magicString);
                    },
                    set: function() {}
                });
            };
        }

        abortOnPropertyWrite() {
            return function(target, property) {
                const magicString = String.fromCharCode(Date.now() % 26 + 97) +
                                  Math.random().toString(36).substr(2, 8);
                
                const descriptor = Object.getOwnPropertyDescriptor(window[target], property);
                if (descriptor && descriptor.set) return;
                
                Object.defineProperty(window[target], property, {
                    get: function() {
                        return undefined;
                    },
                    set: function() {
                        throw new ReferenceError(magicString);
                    }
                });
            };
        }

        abortCurrentInlineScript() {
            return function(search) {
                const regex = new RegExp(search);
                const currentScript = document.currentScript;
                
                if (currentScript && regex.test(currentScript.textContent)) {
                    throw new Error('Script execution prevented');
                }
            };
        }

        removeAttr() {
            return function(selector, attribute) {
                const removeAttribute = () => {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        element.removeAttribute(attribute);
                    }
                };
                
                // Remove immediately
                removeAttribute();
                
                // Watch for new elements
                const observer = new MutationObserver(removeAttribute);
                observer.observe(document, { childList: true, subtree: true });
            };
        }

        removeClass() {
            return function(selector, className) {
                const removeClasses = () => {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        element.classList.remove(className);
                    }
                };
                
                removeClasses();
                
                const observer = new MutationObserver(removeClasses);
                observer.observe(document, { childList: true, subtree: true, attributes: true });
            };
        }

        setConstant() {
            return function(property, value) {
                const path = property.split('.');
                let obj = window;
                
                for (let i = 0; i < path.length - 1; i++) {
                    const prop = path[i];
                    if (!(prop in obj)) {
                        obj[prop] = {};
                    }
                    obj = obj[prop];
                }
                
                const finalProp = path[path.length - 1];
                const finalValue = value === 'true' ? true : 
                                 value === 'false' ? false :
                                 value === 'null' ? null :
                                 value === 'undefined' ? undefined :
                                 isNaN(value) ? value : Number(value);
                
                Object.defineProperty(obj, finalProp, {
                    value: finalValue,
                    writable: false,
                    enumerable: true
                });
            };
        }

        noSetTimeoutIf() {
            return function(search) {
                const originalSetTimeout = window.setTimeout;
                const regex = new RegExp(search);
                
                window.setTimeout = function(callback, delay, ...args) {
                    if (typeof callback === 'string' && regex.test(callback)) {
                        return originalSetTimeout(() => {}, delay);
                    }
                    
                    if (typeof callback === 'function' && regex.test(callback.toString())) {
                        return originalSetTimeout(() => {}, delay);
                    }
                    
                    return originalSetTimeout.apply(this, arguments);
                };
            };
        }

        noSetIntervalIf() {
            return function(search) {
                const originalSetInterval = window.setInterval;
                const regex = new RegExp(search);
                
                window.setInterval = function(callback, delay, ...args) {
                    if (typeof callback === 'string' && regex.test(callback)) {
                        return originalSetInterval(() => {}, delay);
                    }
                    
                    if (typeof callback === 'function' && regex.test(callback.toString())) {
                        return originalSetInterval(() => {}, delay);
                    }
                    
                    return originalSetInterval.apply(this, arguments);
                };
            };
        }

        removeNodeText() {
            return function(selector, textToRemove) {
                const regex = new RegExp(textToRemove, 'gi');
                
                const processNodes = () => {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        const walker = document.createTreeWalker(
                            element,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );
                        
                        const textNodes = [];
                        let node;
                        while (node = walker.nextNode()) {
                            textNodes.push(node);
                        }
                        
                        for (const textNode of textNodes) {
                            textNode.textContent = textNode.textContent.replace(regex, '');
                        }
                    }
                };
                
                processNodes();
                
                const observer = new MutationObserver(processNodes);
                observer.observe(document, { childList: true, subtree: true });
            };
        }

        hideIfContains() {
            return function(selector, text) {
                const hideElements = () => {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        if (element.textContent.includes(text)) {
                            element.style.setProperty('display', 'none', 'important');
                        }
                    }
                };
                
                hideElements();
                
                const observer = new MutationObserver(hideElements);
                observer.observe(document, { childList: true, subtree: true });
            };
        }

        jsonPrune() {
            return function(jsonPath, propertiesToRemove) {
                const originalParse = JSON.parse;
                const properties = propertiesToRemove.split(',');
                
                JSON.parse = function(text, reviver) {
                    const result = originalParse.call(this, text, reviver);
                    
                    if (typeof result === 'object' && result !== null) {
                        for (const property of properties) {
                            delete result[property.trim()];
                        }
                    }
                    
                    return result;
                };
            };
        }

        preventAddEventListener() {
            return function(eventType) {
                const originalAddEventListener = EventTarget.prototype.addEventListener;
                
                EventTarget.prototype.addEventListener = function(type, listener, options) {
                    if (type === eventType) {
                        return;
                    }
                    
                    return originalAddEventListener.call(this, type, listener, options);
                };
            };
        }

        preventFetch() {
            return function(urlPattern) {
                const originalFetch = window.fetch;
                const regex = new RegExp(urlPattern);
                
                window.fetch = function(resource, init) {
                    const url = typeof resource === 'string' ? resource : resource.url;
                    
                    if (regex.test(url)) {
                        return Promise.reject(new Error('Request blocked'));
                    }
                    
                    return originalFetch.apply(this, arguments);
                };
            };
        }

        preventXHR() {
            return function(urlPattern) {
                const originalOpen = XMLHttpRequest.prototype.open;
                const regex = new RegExp(urlPattern);
                
                XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                    if (regex.test(url)) {
                        this.abort = () => {};
                        this.send = () => {};
                        return;
                    }
                    
                    return originalOpen.apply(this, arguments);
                };
            };
        }

        stealthMode() {
            return function() {
                // Enhanced stealth mode scriptlet
                
                // Hide extension detection
                Object.defineProperty(window, 'chrome', {
                    get: function() {
                        return undefined;
                    }
                });
                
                Object.defineProperty(navigator, 'webdriver', {
                    get: function() {
                        return undefined;
                    }
                });
                
                // Spoof console to avoid detection
                const originalLog = console.log;
                console.log = function(...args) {
                    if (args.some(arg => typeof arg === 'string' && /adblock|ublock/i.test(arg))) {
                        return;
                    }
                    return originalLog.apply(this, args);
                };
                
                // Randomize timing to avoid detection
                const originalSetTimeout = window.setTimeout;
                window.setTimeout = function(callback, delay, ...args) {
                    const randomDelay = delay + (Math.random() * 10 - 5);
                    return originalSetTimeout.call(this, callback, Math.max(0, randomDelay), ...args);
                };
            };
        }
    };

    /**************************************************************************/

    const ScriptletCompiler = class {
        constructor() {
            this.library = new ScriptletLibrary();
            this.compilationCache = new Map();
        }

        compile(scriptletString) {
            // Parse scriptlet string: name(args)
            const match = scriptletString.match(/^([^(]+)\(([^)]*)\)$/);
            if (!match) {
                throw new Error(`Invalid scriptlet format: ${scriptletString}`);
            }

            const [, name, argsString] = match;
            const args = this.parseArguments(argsString);
            
            return this.compileScriptlet(name, args);
        }

        parseArguments(argsString) {
            if (!argsString.trim()) return [];
            
            const args = [];
            let current = '';
            let inQuotes = false;
            let quoteChar = '';
            
            for (let i = 0; i < argsString.length; i++) {
                const char = argsString[i];
                
                if ((char === '"' || char === "'") && !inQuotes) {
                    inQuotes = true;
                    quoteChar = char;
                } else if (char === quoteChar && inQuotes) {
                    inQuotes = false;
                    quoteChar = '';
                } else if (char === ',' && !inQuotes) {
                    args.push(current.trim());
                    current = '';
                    continue;
                }
                
                current += char;
            }
            
            if (current.trim()) {
                args.push(current.trim());
            }
            
            return args.map(arg => {
                // Remove quotes
                if ((arg.startsWith('"') && arg.endsWith('"')) ||
                    (arg.startsWith("'") && arg.endsWith("'"))) {
                    return arg.slice(1, -1);
                }
                return arg;
            });
        }

        compileScriptlet(name, args) {
            const cacheKey = `${name}:${args.join(',')}`;
            
            if (this.compilationCache.has(cacheKey)) {
                return this.compilationCache.get(cacheKey);
            }

            const scriptlet = this.library.get(name);
            if (!scriptlet) {
                throw new Error(`Unknown scriptlet: ${name}`);
            }

            // Get the base function
            const baseFunction = scriptlet.func();
            
            // Create wrapper with arguments
            const compiledCode = this.createWrapper(baseFunction, args);
            
            // Apply stealth obfuscation if enabled
            const finalCode = stealthConfig.obfuscateCode ? 
                this.obfuscateCode(compiledCode) : compiledCode;
            
            const result = {
                name: name,
                args: args,
                code: finalCode,
                originalCode: baseFunction.toString()
            };
            
            this.compilationCache.set(cacheKey, result);
            return result;
        }

        createWrapper(scriptletFunction, args) {
            // Create a self-executing wrapper
            const argsString = args.map(arg => JSON.stringify(arg)).join(', ');
            
            return `
(function() {
    'use strict';
    try {
        const scriptletFunc = ${scriptletFunction.toString()};
        scriptletFunc.apply(null, [${argsString}]);
    } catch (e) {
        // Silent failure for stealth
    }
})();`;
        }

        obfuscateCode(code) {
            // Apply various obfuscation techniques
            
            // 1. Variable name randomization
            const varMap = new Map();
            code = code.replace(/\b(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (match, keyword, varName) => {
                if (!varMap.has(varName)) {
                    varMap.set(varName, this.generateRandomName());
                }
                return `${keyword} ${varMap.get(varName)}`;
            });
            
            // Apply variable replacements
            for (const [original, obfuscated] of varMap.entries()) {
                const regex = new RegExp(`\\b${original}\\b`, 'g');
                code = code.replace(regex, obfuscated);
            }
            
            // 2. Add random comments
            code = code.replace(/{/g, '{ /* ' + this.generateRandomComment() + ' */ ');
            
            // 3. String obfuscation
            code = code.replace(/'([^']+)'/g, (match, str) => {
                return this.obfuscateString(str);
            });
            
            return code;
        }

        generateRandomName() {
            const prefixes = ['_', '__', '$', '$$'];
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            
            let name = prefixes[Math.floor(Math.random() * prefixes.length)];
            
            for (let i = 0; i < 6; i++) {
                name += chars[Math.floor(Math.random() * chars.length)];
            }
            
            return name;
        }

        generateRandomComment() {
            const comments = [
                'enhanced functionality',
                'optimized performance',
                'browser compatibility',
                'security enhancement',
                'stability improvement'
            ];
            
            return comments[Math.floor(Math.random() * comments.length)];
        }

        obfuscateString(str) {
            // Convert string to unicode escape sequences occasionally
            if (Math.random() < 0.3) {
                return '"' + str.split('').map(char => 
                    `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
                ).join('') + '"';
            }
            
            return `'${str}'`;
        }
    };

    /**************************************************************************/

    const ScriptletInjector = class {
        constructor() {
            this.compiler = new ScriptletCompiler();
            this.injectedScripts = new Set();
        }

        async inject(scriptletFilters, domain) {
            for (const filter of scriptletFilters) {
                if (!this.matchesDomain(filter.domains, domain)) continue;
                
                try {
                    await this.injectScriptlet(filter);
                } catch (e) {
                    errorsCount++;
                    console.warn('OblivionFilter: Scriptlet injection failed:', e);
                }
            }
        }

        async injectScriptlet(filter) {
            injectionsCount++;
            
            // Apply random delay for stealth
            if (stealthConfig.randomizeExecution) {
                const delay = this.getRandomDelay();
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const compiled = this.compiler.compile(filter.scriptlet);
            const scriptId = this.generateScriptId(filter);
            
            // Check if already injected
            if (this.injectedScripts.has(scriptId)) {
                return;
            }

            // Create and inject script element
            const scriptElement = document.createElement('script');
            scriptElement.id = scriptId;
            scriptElement.textContent = compiled.code;
            
            // Choose injection strategy
            const injectionPoint = this.getInjectionPoint();
            injectionPoint.appendChild(scriptElement);
            
            // Clean up script element after execution
            setTimeout(() => {
                if (scriptElement.parentNode) {
                    scriptElement.parentNode.removeChild(scriptElement);
                }
            }, 100);
            
            this.injectedScripts.add(scriptId);
            executionsCount++;
        }

        matchesDomain(domains, currentDomain) {
            if (!domains || domains.size === 0) return true;
            
            for (const domain of domains) {
                if (currentDomain.includes(domain)) {
                    return true;
                }
            }
            
            return false;
        }

        generateScriptId(filter) {
            const hash = this.simpleHash(filter.scriptlet + Array.from(filter.domains).join(''));
            return `oblivion-scriptlet-${hash}`;
        }

        simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(36);
        }

        getInjectionPoint() {
            // Choose the best injection point for stealth and effectiveness
            if (document.head) {
                return document.head;
            } else if (document.documentElement) {
                return document.documentElement;
            } else {
                // Fallback: inject into body when available
                return document.body || document;
            }
        }

        getRandomDelay() {
            const [min, max] = stealthConfig.randomDelay;
            return Math.random() * (max - min) + min;
        }

        // Get current domain
        getCurrentDomain() {
            try {
                return new URL(window.location.href).hostname;
            } catch (e) {
                return '';
            }
        }

        // Public methods
        async apply(scriptletFilters) {
            const domain = this.getCurrentDomain();
            if (domain && scriptletFilters.length > 0) {
                await this.inject(scriptletFilters, domain);
            }
        }

        reset() {
            this.injectedScripts.clear();
        }

        getStats() {
            return {
                injectionsCount,
                executionsCount,
                errorsCount,
                injectedScripts: this.injectedScripts.size,
                successRate: injectionsCount > 0 ? (executionsCount / injectionsCount) : 0
            };
        }
    };

    /**************************************************************************/

    // Main Scriptlet Engine
    const ScriptletEngine = class {
        constructor() {
            this.injector = new ScriptletInjector();
            this.library = new ScriptletLibrary();
        }

        // Process and inject scriptlets
        async process(filters) {
            const scriptletFilters = filters.filter(filter => 
                filter.type === 'scriptlet' && filter.scriptlet
            );
            
            if (scriptletFilters.length > 0) {
                await this.injector.apply(scriptletFilters);
            }
        }

        // Register custom scriptlet
        registerScriptlet(name, scriptletFunction) {
            this.library.register(name, scriptletFunction);
        }

        // Get available scriptlets
        getAvailableScriptlets() {
            return Array.from(scriptlets.keys());
        }

        // Configuration and stats
        configure(config) {
            Object.assign(stealthConfig, config);
        }

        getConfig() {
            return { ...stealthConfig };
        }

        getStats() {
            return this.injector.getStats();
        }

        reset() {
            this.injector.reset();
        }
    };

    /**************************************************************************/

    // Public API
    return {
        ScriptletEngine,
        ScriptletLibrary,
        ScriptletCompiler,
        ScriptletInjector,
        
        // Factory method
        create() {
            return new ScriptletEngine();
        },

        // Configuration
        configure(config) {
            Object.assign(stealthConfig, config);
        },

        getConfig() {
            return { ...stealthConfig };
        }
    };

})();

/******************************************************************************/

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = scriptletEngine;
} else if (typeof window !== 'undefined') {
    window.scriptletEngine = scriptletEngine;
}
