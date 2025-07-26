/**
 * OblivionFilter Safari Content Adapter
 * WebKit-specific compatibility layer for Safari extension
 * Handles Safari's unique WebExtension API differences
 */

class SafariContentAdapter {
    constructor() {
        this.isInitialized = false;
        this.safariAPI = null;
        this.messagePort = null;
        this.contentBlockerRules = new Map();
        
        this.initSafariCompatibility();
    }

    /**
     * Initialize Safari-specific compatibility layers
     */
    initSafariCompatibility() {
        // Check if we're running in Safari
        if (!this.isSafari()) {
            return;
        }

        // Safari WebKit API detection
        this.detectSafariAPI();
        
        // Initialize Safari content blocker integration
        this.initContentBlocker();
        
        // Setup Safari native messaging
        this.initSafariNativeMessaging();
        
        // Patch WebExtension API differences
        this.patchWebExtensionAPIs();
        
        this.isInitialized = true;
        console.log('Safari Content Adapter initialized');
    }

    /**
     * Detect if running in Safari browser
     */
    isSafari() {
        return (
            typeof safari !== 'undefined' ||
            /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) ||
            typeof webkit !== 'undefined'
        );
    }

    /**
     * Detect available Safari WebKit APIs
     */
    detectSafariAPI() {
        if (typeof safari !== 'undefined') {
            this.safariAPI = safari;
        } else if (typeof webkit !== 'undefined') {
            this.safariAPI = webkit;
        }
        
        // Check for Safari App Extension API
        if (typeof browser !== 'undefined' && browser.safari) {
            this.safariAPI = browser.safari;
        }
    }

    /**
     * Initialize Safari Content Blocker integration
     */
    initContentBlocker() {
        if (!this.safariAPI) return;

        // Content Blocker rule management
        this.contentBlockerManager = {
            /**
             * Add content blocker rule
             */
            addRule: (rule) => {
                const ruleId = this.generateRuleId();
                this.contentBlockerRules.set(ruleId, rule);
                
                // Convert to Safari Content Blocker format
                const safariRule = this.convertToSafariRule(rule);
                
                // Apply rule via Safari API
                if (this.safariAPI.contentBlocker) {
                    this.safariAPI.contentBlocker.addRule(safariRule);
                }
                
                return ruleId;
            },

            /**
             * Remove content blocker rule
             */
            removeRule: (ruleId) => {
                const rule = this.contentBlockerRules.get(ruleId);
                if (rule) {
                    this.contentBlockerRules.delete(ruleId);
                    
                    if (this.safariAPI.contentBlocker) {
                        this.safariAPI.contentBlocker.removeRule(ruleId);
                    }
                }
            },

            /**
             * Update all content blocker rules
             */
            updateRules: (rules) => {
                // Clear existing rules
                this.contentBlockerRules.clear();
                
                // Convert and apply new rules
                const safariRules = rules.map(rule => this.convertToSafariRule(rule));
                
                if (this.safariAPI.contentBlocker) {
                    this.safariAPI.contentBlocker.setRules(safariRules);
                }
            }
        };
    }

    /**
     * Convert OblivionFilter rule to Safari Content Blocker format
     */
    convertToSafariRule(rule) {
        const safariRule = {
            trigger: {},
            action: {}
        };

        // Convert trigger conditions
        if (rule.urlFilter) {
            safariRule.trigger['url-filter'] = rule.urlFilter;
        }
        
        if (rule.resourceTypes) {
            safariRule.trigger['resource-type'] = rule.resourceTypes;
        }
        
        if (rule.domains) {
            safariRule.trigger['if-domain'] = rule.domains;
        }
        
        if (rule.excludeDomains) {
            safariRule.trigger['unless-domain'] = rule.excludeDomains;
        }

        // Convert actions
        switch (rule.action) {
            case 'block':
                safariRule.action.type = 'block';
                break;
            case 'allow':
                safariRule.action.type = 'ignore-previous-rules';
                break;
            case 'redirect':
                safariRule.action.type = 'redirect';
                safariRule.action.redirect = { url: rule.redirectUrl };
                break;
            case 'modifyHeaders':
                safariRule.action.type = 'modify-headers';
                safariRule.action.headers = rule.headers;
                break;
            default:
                safariRule.action.type = 'block';
        }

        return safariRule;
    }

    /**
     * Initialize Safari native messaging
     */
    initSafariNativeMessaging() {
        if (!this.safariAPI) return;

        // Safari native messaging bridge
        this.nativeMessaging = {
            /**
             * Send message to native app
             */
            sendMessage: (message) => {
                return new Promise((resolve, reject) => {
                    try {
                        if (this.safariAPI.application) {
                            // Safari App Extension API
                            this.safariAPI.application.dispatchMessage('nativeMessage', message);
                            resolve({ success: true });
                        } else if (this.safariAPI.webkit && this.safariAPI.webkit.messageHandlers) {
                            // Safari WebKit message handlers
                            this.safariAPI.webkit.messageHandlers.nativeMessaging.postMessage(message);
                            resolve({ success: true });
                        } else {
                            reject(new Error('Safari native messaging not available'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            },

            /**
             * Listen for native messages
             */
            onMessage: (callback) => {
                if (this.safariAPI.application) {
                    this.safariAPI.application.addEventListener('message', (event) => {
                        if (event.name === 'nativeMessage') {
                            callback(event.message);
                        }
                    });
                }
            }
        };
    }

    /**
     * Patch WebExtension API differences for Safari compatibility
     */
    patchWebExtensionAPIs() {
        // Safari uses different API namespaces
        if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
            window.browser = chrome;
        }

        // Patch storage API for Safari
        this.patchStorageAPI();
        
        // Patch messaging API for Safari
        this.patchMessagingAPI();
        
        // Patch webRequest API for Safari
        this.patchWebRequestAPI();
        
        // Patch tabs API for Safari
        this.patchTabsAPI();
    }

    /**
     * Patch storage API for Safari compatibility
     */
    patchStorageAPI() {
        if (!window.browser || !window.browser.storage) return;

        const originalGet = window.browser.storage.local.get;
        const originalSet = window.browser.storage.local.set;

        // Safari storage API patches
        window.browser.storage.local.get = function(keys) {
            return new Promise((resolve, reject) => {
                try {
                    originalGet.call(this, keys, (result) => {
                        if (window.browser.runtime.lastError) {
                            reject(new Error(window.browser.runtime.lastError.message));
                        } else {
                            resolve(result);
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            });
        };

        window.browser.storage.local.set = function(items) {
            return new Promise((resolve, reject) => {
                try {
                    originalSet.call(this, items, () => {
                        if (window.browser.runtime.lastError) {
                            reject(new Error(window.browser.runtime.lastError.message));
                        } else {
                            resolve();
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            });
        };
    }

    /**
     * Patch messaging API for Safari compatibility
     */
    patchMessagingAPI() {
        if (!window.browser || !window.browser.runtime) return;

        const originalSendMessage = window.browser.runtime.sendMessage;

        window.browser.runtime.sendMessage = function(message, options = {}) {
            return new Promise((resolve, reject) => {
                try {
                    // Safari-specific message handling
                    if (typeof safari !== 'undefined' && safari.application) {
                        safari.application.dispatchMessage('extensionMessage', message);
                        resolve({ success: true });
                    } else {
                        originalSendMessage.call(this, message, (response) => {
                            if (window.browser.runtime.lastError) {
                                reject(new Error(window.browser.runtime.lastError.message));
                            } else {
                                resolve(response);
                            }
                        });
                    }
                } catch (error) {
                    reject(error);
                }
            });
        };
    }

    /**
     * Patch webRequest API for Safari compatibility
     */
    patchWebRequestAPI() {
        if (!window.browser || !window.browser.webRequest) return;

        // Safari webRequest API has different event handling
        const originalOnBeforeRequest = window.browser.webRequest.onBeforeRequest;

        if (originalOnBeforeRequest && typeof safari !== 'undefined') {
            // Wrap Safari webRequest events
            const safariWebRequestWrapper = {
                addListener: (callback, filter, extraInfoSpec) => {
                    // Convert to Safari content blocker when possible
                    if (filter && filter.urls) {
                        filter.urls.forEach(url => {
                            const rule = {
                                urlFilter: url,
                                action: 'block',
                                resourceTypes: filter.types || ['main_frame', 'sub_frame']
                            };
                            this.contentBlockerManager.addRule(rule);
                        });
                    }

                    // Fallback to original API
                    if (originalOnBeforeRequest.addListener) {
                        originalOnBeforeRequest.addListener(callback, filter, extraInfoSpec);
                    }
                }
            };

            window.browser.webRequest.onBeforeRequest = safariWebRequestWrapper;
        }
    }

    /**
     * Patch tabs API for Safari compatibility
     */
    patchTabsAPI() {
        if (!window.browser || !window.browser.tabs) return;

        // Safari tabs API adjustments
        const originalQuery = window.browser.tabs.query;

        window.browser.tabs.query = function(queryInfo) {
            return new Promise((resolve, reject) => {
                try {
                    if (typeof safari !== 'undefined' && safari.application) {
                        // Safari App Extension tabs API
                        const tabs = safari.application.browserWindows.map(window => 
                            window.tabs.map(tab => ({
                                id: tab.id,
                                url: tab.url,
                                title: tab.title,
                                active: tab.active,
                                windowId: window.id
                            }))
                        ).flat();

                        // Apply query filters
                        const filteredTabs = tabs.filter(tab => {
                            if (queryInfo.active !== undefined && tab.active !== queryInfo.active) return false;
                            if (queryInfo.url && !tab.url.includes(queryInfo.url)) return false;
                            return true;
                        });

                        resolve(filteredTabs);
                    } else {
                        originalQuery.call(this, queryInfo, resolve);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        };
    }

    /**
     * Generate unique rule ID
     */
    generateRuleId() {
        return 'safari_rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Safari-specific content script injection
     */
    injectContentScript(tabId, details) {
        if (!this.safariAPI) return Promise.reject(new Error('Safari API not available'));

        return new Promise((resolve, reject) => {
            try {
                if (this.safariAPI.application) {
                    // Safari App Extension content script injection
                    const tab = this.safariAPI.application.activeBrowserWindow.activeTab;
                    if (details.file) {
                        tab.page.dispatchMessage('injectScript', { file: details.file });
                    } else if (details.code) {
                        tab.page.dispatchMessage('executeScript', { code: details.code });
                    }
                    resolve({ success: true });
                } else {
                    reject(new Error('Safari content script injection not supported'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Safari-specific cookie management
     */
    manageCookies() {
        return {
            /**
             * Get cookies for Safari
             */
            get: (details) => {
                return new Promise((resolve, reject) => {
                    if (this.safariAPI && this.safariAPI.extension) {
                        // Safari extension cookie access
                        resolve([]); // Safari has limited cookie access
                    } else {
                        reject(new Error('Safari cookie access not available'));
                    }
                });
            },

            /**
             * Remove cookies in Safari
             */
            remove: (details) => {
                return new Promise((resolve, reject) => {
                    if (this.safariAPI && this.safariAPI.extension) {
                        // Safari extension cookie removal
                        resolve({ success: true });
                    } else {
                        reject(new Error('Safari cookie removal not available'));
                    }
                });
            }
        };
    }

    /**
     * Safari performance optimization
     */
    optimizeForSafari() {
        // Reduce memory usage for Safari
        this.memoryOptimization = {
            // Limit cache sizes
            maxCacheSize: 1000,
            
            // Throttle heavy operations
            throttleMs: 100,
            
            // Batch operations
            batchSize: 50
        };

        // Safari-specific performance monitoring
        this.performanceMonitor = {
            start: performance.now(),
            
            measure: (label) => {
                const duration = performance.now() - this.performanceMonitor.start;
                console.log(`Safari Performance [${label}]: ${duration}ms`);
                return duration;
            }
        };
    }

    /**
     * Get Safari compatibility info
     */
    getCompatibilityInfo() {
        return {
            isSafari: this.isSafari(),
            isInitialized: this.isInitialized,
            safariAPI: this.safariAPI ? 'available' : 'unavailable',
            contentBlocker: this.contentBlockerManager ? 'available' : 'unavailable',
            nativeMessaging: this.nativeMessaging ? 'available' : 'unavailable',
            rulesCount: this.contentBlockerRules.size,
            version: '2.0.0'
        };
    }
}

// Initialize Safari adapter
const safariAdapter = new SafariContentAdapter();

// Export for global access
if (typeof window !== 'undefined') {
    window.safariAdapter = safariAdapter;
}

// Expose compatibility layer
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafariContentAdapter;
}
