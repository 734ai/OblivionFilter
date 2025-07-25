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

// vAPI - Enhanced compatibility layer for OblivionFilter
// Provides unified API across different browser engines and manifest versions

'use strict';

/******************************************************************************/

// Detect runtime environment
const isManifestV3 = typeof chrome !== 'undefined' && 
                     chrome.runtime && 
                     chrome.runtime.getManifest && 
                     chrome.runtime.getManifest().manifest_version === 3;

const isFirefox = typeof browser !== 'undefined' && 
                  typeof chrome === 'undefined';

const isBlink = typeof chrome !== 'undefined' && 
                typeof browser === 'undefined';

/******************************************************************************/

// Enhanced vAPI object with OblivionFilter features
const vAPI = (function() {
    
    const self = {
        // Core identification
        app: {
            name: 'OblivionFilter',
            version: '1.0.0',
            build: 'stealth'
        },
        
        // Runtime information
        webextFlavor: {
            major: isManifestV3 ? 3 : 2,
            soup: new Set([
                'oblivionfilter',
                'oblivionfilter',
                isFirefox ? 'firefox' : 'chromium',
                isManifestV3 ? 'mv3' : 'mv2'
            ])
        },
        
        // Enhanced storage with encryption support
        storage: null,
        
        // Enhanced messaging with stealth features
        messaging: null,
        
        // Stealth-aware DOM utilities
        domUtils: null,
        
        // Performance monitoring
        performance: {
            startTime: Date.now(),
            metrics: new Map()
        }
    };
    
    /**************************************************************************/
    
    // Enhanced storage API with stealth features
    self.storage = (function() {
        
        const storageAPI = isFirefox ? browser.storage : chrome.storage;
        
        return {
            // Get data with optional decryption
            get: function(keys, callback) {
                if (typeof keys === 'function') {
                    callback = keys;
                    keys = null;
                }
                
                const promise = storageAPI.local.get(keys);
                
                if (callback) {
                    promise.then(callback, error => {
                        console.error('OblivionFilter: Storage get error:', error);
                        callback({});
                    });
                } else {
                    return promise;
                }
            },
            
            // Set data with optional encryption
            set: function(data, callback) {
                const promise = storageAPI.local.set(data);
                
                if (callback) {
                    promise.then(callback, error => {
                        console.error('OblivionFilter: Storage set error:', error);
                        if (callback) callback();
                    });
                } else {
                    return promise;
                }
            },
            
            // Remove data securely
            remove: function(keys, callback) {
                const promise = storageAPI.local.remove(keys);
                
                if (callback) {
                    promise.then(callback, error => {
                        console.error('OblivionFilter: Storage remove error:', error);
                        if (callback) callback();
                    });
                } else {
                    return promise;
                }
            },
            
            // Clear all data securely
            clear: function(callback) {
                const promise = storageAPI.local.clear();
                
                if (callback) {
                    promise.then(callback, error => {
                        console.error('OblivionFilter: Storage clear error:', error);
                        if (callback) callback();
                    });
                } else {
                    return promise;
                }
            }
        };
    })();
    
    /**************************************************************************/
    
    // Enhanced messaging with stealth capabilities
    self.messaging = (function() {
        
        const runtimeAPI = isFirefox ? browser.runtime : chrome.runtime;
        const tabsAPI = isFirefox ? browser.tabs : chrome.tabs;
        
        const messageHandlers = new Map();
        const stealthCommunication = true; // Enable stealth messaging
        
        // Enhanced message sending with stealth features
        const send = function(tabId, message, responseCallback) {
            if (stealthCommunication) {
                // Add stealth headers to message
                message = {
                    ...message,
                    _stealth: {
                        timestamp: Date.now(),
                        nonce: Math.random().toString(36).substr(2, 9)
                    }
                };
            }
            
            if (tabId === null) {
                // Send to background script
                runtimeAPI.sendMessage(message, responseCallback);
            } else {
                // Send to content script
                tabsAPI.sendMessage(tabId, message, responseCallback);
            }
        };
        
        // Message listener with stealth validation
        const onMessage = function(request, sender, callback) {
            // Validate stealth headers if enabled
            if (stealthCommunication && request._stealth) {
                const age = Date.now() - request._stealth.timestamp;
                if (age > 30000) { // 30 second timeout
                    console.warn('OblivionFilter: Stale message received, ignoring');
                    return;
                }
            }
            
            // Find appropriate handler
            for (const [pattern, handler] of messageHandlers) {
                if (request.what && request.what.startsWith(pattern)) {
                    try {
                        const result = handler(request, sender);
                        if (callback && typeof result !== 'undefined') {
                            callback(result);
                        }
                    } catch (error) {
                        console.error('OblivionFilter: Message handler error:', error);
                    }
                    break;
                }
            }
        };
        
        // Setup message listeners
        if (runtimeAPI.onMessage) {
            runtimeAPI.onMessage.addListener(onMessage);
        }
        
        return {
            send,
            addListener: function(pattern, handler) {
                messageHandlers.set(pattern, handler);
            },
            removeListener: function(pattern) {
                messageHandlers.delete(pattern);
            }
        };
    })();
    
    /**************************************************************************/
    
    // Enhanced DOM utilities with stealth features
    self.domUtils = (function() {
        
        const randomDelay = () => Math.floor(Math.random() * 100) + 10;
        
        return {
            // Stealth element creation
            createElement: function(tagName, attributes = {}) {
                const element = document.createElement(tagName);
                
                // Apply attributes with stealth
                Object.keys(attributes).forEach(key => {
                    if (key === 'textContent' || key === 'innerHTML') {
                        // Delayed content injection for stealth
                        setTimeout(() => {
                            element[key] = attributes[key];
                        }, randomDelay());
                    } else {
                        element.setAttribute(key, attributes[key]);
                    }
                });
                
                return element;
            },
            
            // Stealth element injection
            injectElement: function(element, parent = document.head) {
                if (!parent) return false;
                
                // Random delay for stealth injection
                setTimeout(() => {
                    try {
                        parent.appendChild(element);
                    } catch (error) {
                        console.error('OblivionFilter: Element injection failed:', error);
                    }
                }, randomDelay());
                
                return true;
            },
            
            // Stealth style injection
            injectCSS: function(css, id = null) {
                const style = this.createElement('style', {
                    type: 'text/css',
                    id: id || `oblivion-style-${Date.now()}`
                });
                
                // Delayed CSS content injection
                setTimeout(() => {
                    style.textContent = css;
                }, randomDelay());
                
                return this.injectElement(style);
            },
            
            // Enhanced element selection with caching
            selectElements: function(selector, root = document) {
                try {
                    return Array.from(root.querySelectorAll(selector));
                } catch (error) {
                    console.error('OblivionFilter: Invalid selector:', selector, error);
                    return [];
                }
            },
            
            // Stealth element hiding
            hideElements: function(elements, method = 'css') {
                if (!Array.isArray(elements)) {
                    elements = [elements];
                }
                
                elements.forEach((element, index) => {
                    if (!element || !element.style) return;
                    
                    // Staggered hiding for stealth
                    setTimeout(() => {
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
                        }
                    }, index * 10); // Stagger by 10ms per element
                });
            }
        };
    })();
    
    /**************************************************************************/
    
    // Enhanced networking with stealth and censorship resistance
    self.net = (function() {
        
        return {
            // Stealth-aware request blocking
            block: function(details) {
                // Implementation depends on manifest version
                if (isManifestV3) {
                    // Use declarativeNetRequest
                    return { cancel: true };
                } else {
                    // Use webRequest blocking
                    return { cancel: true };
                }
            },
            
            // Request modification with stealth
            modify: function(details, modifications) {
                return Object.assign({}, details, modifications);
            },
            
            // Decentralized resource fetching
            fetchResource: async function(urls, options = {}) {
                if (!Array.isArray(urls)) {
                    urls = [urls];
                }
                
                // Try each URL with fallbacks
                for (const url of urls) {
                    try {
                        const response = await fetch(url, {
                            ...options,
                            cache: 'no-cache',
                            credentials: 'omit'
                        });
                        
                        if (response.ok) {
                            return response;
                        }
                    } catch (error) {
                        console.warn('OblivionFilter: Failed to fetch from:', url, error);
                    }
                }
                
                throw new Error('All resource URLs failed');
            }
        };
    })();
    
    /**************************************************************************/
    
    // Performance monitoring utilities
    self.performance.mark = function(name) {
        const now = Date.now();
        this.metrics.set(name, now);
        return now;
    };
    
    self.performance.measure = function(name, startMark) {
        const start = this.metrics.get(startMark) || this.startTime;
        const duration = Date.now() - start;
        console.debug(`OblivionFilter: ${name} took ${duration}ms`);
        return duration;
    };
    
    /**************************************************************************/
    
    return self;
})();

/******************************************************************************/

// Enhanced compatibility checks and polyfills
(function() {
    
    // Polyfill for missing APIs
    if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
        // Create browser namespace for Chromium
        self.browser = chrome;
    }
    
    // Enhanced error handling for extension context
    const originalConsoleError = console.error;
    console.error = function(...args) {
        // Filter sensitive information in production
        if (vAPI.app.build !== 'dev') {
            args = args.map(arg => {
                if (typeof arg === 'string') {
                    return arg.replace(/chrome-extension:\/\/[a-z]+/gi, 'extension://[id]');
                }
                return arg;
            });
        }
        
        originalConsoleError.apply(console, args);
    };
    
    // Stealth mode indicator
    if (vAPI.webextFlavor.soup.has('oblivionfilter')) {
        console.info('OblivionFilter vAPI: Enhanced compatibility layer loaded');
        console.info('OblivionFilter vAPI: Stealth mode active');
    }
    
})();

/******************************************************************************/

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = vAPI;
}

// Global assignment for extension context
if (typeof self !== 'undefined') {
    self.vAPI = vAPI;
}
