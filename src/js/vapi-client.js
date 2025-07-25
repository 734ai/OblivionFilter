/*******************************************************************************

    OblivionFilter - Enhanced Content Blocker
    Copyright (C) 2025 OblivionFilter Contributors
    Based on uBlock Origin by Raymond Hill

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

/******************************************************************************/

// vAPI client - Enhanced for content script communication and stealth operations

'use strict';

/******************************************************************************/

// Enhanced vAPI client with OblivionFilter stealth features
const vAPIClient = (function() {
    
    if (typeof vAPI === 'undefined') {
        // Create minimal vAPI if not available
        self.vAPI = {
            app: { name: 'OblivionFilter' },
            webextFlavor: { soup: new Set(['oblivionfilter']) }
        };
    }
    
    const self = {
        sessionId: Math.random().toString(36).substr(2, 9),
        startTime: Date.now(),
        stealthMode: true,
        
        // Enhanced messaging with stealth
        messaging: null,
        
        // DOM utilities for content scripts
        domUtils: null,
        
        // Stealth injection system
        stealthInjector: null,
        
        // Performance tracking
        performance: {
            injections: 0,
            blocks: 0,
            modifications: 0
        }
    };
    
    /**************************************************************************/
    
    // Enhanced messaging system for content scripts
    self.messaging = (function() {
        
        const messageQueue = [];
        let isReady = false;
        
        const sendMessage = function(message, callback) {
            if (!isReady) {
                messageQueue.push({ message, callback });
                return;
            }
            
            // Add stealth metadata
            if (self.stealthMode) {
                message._stealth = {
                    sessionId: self.sessionId,
                    timestamp: Date.now(),
                    origin: location.origin
                };
            }
            
            try {
                if (typeof browser !== 'undefined' && browser.runtime) {
                    browser.runtime.sendMessage(message, callback);
                } else if (typeof chrome !== 'undefined' && chrome.runtime) {
                    chrome.runtime.sendMessage(message, callback);
                } else {
                    console.error('OblivionFilter: No runtime messaging available');
                }
            } catch (error) {
                console.error('OblivionFilter: Messaging error:', error);
                if (callback) callback(null);
            }
        };
        
        const onMessage = function(message, sender, callback) {
            // Validate stealth metadata
            if (self.stealthMode && message._stealth) {
                if (message._stealth.sessionId !== self.sessionId) {
                    console.debug('OblivionFilter: Foreign session message, ignoring');
                    return;
                }
            }
            
            // Handle specific message types
            switch (message.what) {
                case 'injectCSS':
                    self.stealthInjector.injectCSS(message.css, message.stealth);
                    break;
                    
                case 'hideElements':
                    self.domUtils.hideElements(message.selectors);
                    break;
                    
                case 'injectScript':
                    self.stealthInjector.injectScript(message.script, message.stealth);
                    break;
                    
                case 'getPageInfo':
                    if (callback) {
                        callback({
                            url: location.href,
                            title: document.title,
                            performance: self.performance
                        });
                    }
                    break;
            }
        };
        
        // Setup message listener
        if (typeof browser !== 'undefined' && browser.runtime) {
            browser.runtime.onMessage.addListener(onMessage);
        } else if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener(onMessage);
        }
        
        // Process queued messages when ready
        const processQueue = function() {
            isReady = true;
            messageQueue.forEach(({ message, callback }) => {
                sendMessage(message, callback);
            });
            messageQueue.length = 0;
        };
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', processQueue);
        } else {
            setTimeout(processQueue, 0);
        }
        
        return {
            send: sendMessage,
            addListener: onMessage,
            isReady: () => isReady
        };
    })();
    
    /**************************************************************************/
    
    // Enhanced DOM utilities for content scripts
    self.domUtils = (function() {
        
        const hiddenElements = new WeakSet();
        const stealthSelectors = new Set();
        
        return {
            // Hide elements with stealth options
            hideElements: function(selectors, options = {}) {
                if (!Array.isArray(selectors)) {
                    selectors = [selectors];
                }
                
                const useStealthMode = options.stealth !== false && self.stealthMode;
                const delay = useStealthMode ? Math.floor(Math.random() * 200) : 0;
                
                setTimeout(() => {
                    selectors.forEach(selector => {
                        try {
                            const elements = document.querySelectorAll(selector);
                            elements.forEach(element => {
                                if (!hiddenElements.has(element)) {
                                    this.hideElement(element, options);
                                    hiddenElements.add(element);
                                }
                            });
                            
                            if (useStealthMode) {
                                stealthSelectors.add(selector);
                            }
                            
                        } catch (error) {
                            console.error('OblivionFilter: Invalid selector:', selector, error);
                        }
                    });
                }, delay);
                
                self.performance.blocks += selectors.length;
            },
            
            // Hide individual element
            hideElement: function(element, options = {}) {
                if (!element || !element.style) return;
                
                const method = options.method || 'css';
                
                switch (method) {
                    case 'css':
                        element.style.setProperty('display', 'none', 'important');
                        element.style.setProperty('visibility', 'hidden', 'important');
                        break;
                        
                    case 'remove':
                        if (element.parentNode) {
                            element.parentNode.removeChild(element);
                        }
                        break;
                        
                    case 'collapse':
                        element.style.setProperty('height', '0', 'important');
                        element.style.setProperty('width', '0', 'important');
                        element.style.setProperty('padding', '0', 'important');
                        element.style.setProperty('margin', '0', 'important');
                        element.style.setProperty('border', 'none', 'important');
                        break;
                }
            },
            
            // Create elements with stealth attributes
            createElement: function(tagName, attributes = {}) {
                const element = document.createElement(tagName);
                
                // Add stealth attributes if in stealth mode
                if (self.stealthMode) {
                    attributes['data-oblivion'] = self.sessionId;
                }
                
                // Apply attributes
                Object.keys(attributes).forEach(key => {
                    if (key === 'textContent' || key === 'innerHTML') {
                        element[key] = attributes[key];
                    } else {
                        element.setAttribute(key, attributes[key]);
                    }
                });
                
                return element;
            },
            
            // Enhanced element observation
            observeElements: function(selectors, callback) {
                const observer = new MutationObserver(mutations => {
                    mutations.forEach(mutation => {
                        if (mutation.type === 'childList') {
                            mutation.addedNodes.forEach(node => {
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    selectors.forEach(selector => {
                                        if (node.matches && node.matches(selector)) {
                                            callback(node, selector);
                                        }
                                        
                                        // Check descendants
                                        const matches = node.querySelectorAll ? 
                                                       node.querySelectorAll(selector) : [];
                                        matches.forEach(match => callback(match, selector));
                                    });
                                }
                            });
                        }
                    });
                });
                
                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
                
                return observer;
            }
        };
    })();
    
    /**************************************************************************/
    
    // Stealth injection system
    self.stealthInjector = (function() {
        
        const injectedStyles = new Set();
        const injectedScripts = new Set();
        
        return {
            // Inject CSS with stealth features
            injectCSS: function(css, stealth = true) {
                if (injectedStyles.has(css)) return;
                
                const style = self.domUtils.createElement('style', {
                    type: 'text/css',
                    'data-oblivion-css': stealth ? 'stealth' : 'normal'
                });
                
                const delay = stealth ? Math.floor(Math.random() * 300) : 0;
                
                setTimeout(() => {
                    style.textContent = css;
                    
                    if (document.head) {
                        document.head.appendChild(style);
                    } else if (document.documentElement) {
                        document.documentElement.appendChild(style);
                    }
                    
                    injectedStyles.add(css);
                    self.performance.injections++;
                }, delay);
            },
            
            // Inject JavaScript with stealth features
            injectScript: function(script, stealth = true) {
                if (injectedScripts.has(script)) return;
                
                const scriptElement = self.domUtils.createElement('script', {
                    'data-oblivion-script': stealth ? 'stealth' : 'normal'
                });
                
                const delay = stealth ? Math.floor(Math.random() * 500) : 0;
                
                setTimeout(() => {
                    scriptElement.textContent = script;
                    
                    if (document.head) {
                        document.head.appendChild(scriptElement);
                        document.head.removeChild(scriptElement);
                    } else if (document.documentElement) {
                        document.documentElement.appendChild(scriptElement);
                        document.documentElement.removeChild(scriptElement);
                    }
                    
                    injectedScripts.add(script);
                    self.performance.injections++;
                }, delay);
            },
            
            // Inject scriptlets for advanced blocking
            injectScriptlet: function(name, args = []) {
                const scriptlet = this.getScriptlet(name);
                if (scriptlet) {
                    const script = `(${scriptlet})(${args.map(JSON.stringify).join(', ')});`;
                    this.injectScript(script, true);
                }
            },
            
            // Get predefined scriptlets
            getScriptlet: function(name) {
                const scriptlets = {
                    'abort-on-property-read': function(property) {
                        const parts = property.split('.');
                        let obj = window;
                        
                        for (let i = 0; i < parts.length - 1; i++) {
                            if (!obj[parts[i]]) {
                                obj[parts[i]] = {};
                            }
                            obj = obj[parts[i]];
                        }
                        
                        Object.defineProperty(obj, parts[parts.length - 1], {
                            get: function() {
                                throw new Error('OblivionFilter: Property access blocked');
                            }
                        });
                    },
                    
                    'abort-current-inline-script': function(property, search) {
                        const error = new Error('OblivionFilter: Inline script blocked');
                        if (typeof property === 'string' && window[property]) {
                            const original = window[property];
                            window[property] = function() {
                                if (typeof search === 'string' && 
                                    document.currentScript && 
                                    document.currentScript.textContent.includes(search)) {
                                    throw error;
                                }
                                return original.apply(this, arguments);
                            };
                        }
                    },
                    
                    'set-constant': function(property, value) {
                        const parts = property.split('.');
                        let obj = window;
                        
                        for (let i = 0; i < parts.length - 1; i++) {
                            if (!obj[parts[i]]) {
                                obj[parts[i]] = {};
                            }
                            obj = obj[parts[i]];
                        }
                        
                        const finalValue = value === 'true' ? true : 
                                          value === 'false' ? false :
                                          value === 'null' ? null :
                                          value === 'undefined' ? undefined :
                                          isNaN(value) ? value : Number(value);
                        
                        Object.defineProperty(obj, parts[parts.length - 1], {
                            value: finalValue,
                            writable: false,
                            configurable: false
                        });
                    }
                };
                
                return scriptlets[name];
            }
        };
    })();
    
    /**************************************************************************/
    
    // Initialize client
    (function() {
        console.info('OblivionFilter vAPI Client: Enhanced content script utilities loaded');
        
        // Setup stealth mode if needed
        if (self.stealthMode) {
            document.documentElement.setAttribute('data-oblivion-stealth', 'active');
        }
        
        // Initialize performance tracking
        self.performance.startTime = Date.now();
    })();
    
    return self;
})();

/******************************************************************************/

// Export for global usage
if (typeof self !== 'undefined') {
    self.vAPIClient = vAPIClient;
}

// Add to vAPI namespace if available
if (typeof vAPI !== 'undefined') {
    vAPI.client = vAPIClient;
}
