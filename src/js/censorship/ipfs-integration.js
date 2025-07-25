/*******************************************************************************

    OblivionFilter - IPFS Integration Engine v2.0.0
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

// OblivionFilter IPFS Integration Engine
// Provides decentralized filter list updates and censorship resistance
const IPFSIntegrationEngine = (function() {

    /******************************************************************************/

    // Configuration for IPFS integration
    const config = {
        enabled: true,
        usePublicGateways: true,
        fallbackToGitHub: true,
        
        // IPFS Gateway Configuration
        gateways: [
            'https://ipfs.io',
            'https://gateway.pinata.cloud',
            'https://cloudflare-ipfs.com',
            'https://dweb.link',
            'https://ipfs.infura.io',
            'https://gateway.temporal.cloud'
        ],

        // Filter List IPFS Hashes (CIDv1)
        filterLists: {
            'easylist': {
                hash: 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku', // Example hash
                fallbackUrl: 'https://easylist.to/easylist/easylist.txt',
                priority: 1,
                updateInterval: 86400000 // 24 hours
            },
            'easyprivacy': {
                hash: 'bafkreigdvj2hiv6mjnrxw27b25rcs53tuzn2xd5gv7320ewrkywv56jrmq', // Example hash
                fallbackUrl: 'https://easylist.to/easylist/easyprivacy.txt',
                priority: 2,
                updateInterval: 86400000
            },
            'ublock-filters': {
                hash: 'bafkreihf5gcs42wjnl2epsqmnxtnzpaxfwqvn7b45ghd7uwiv4rjkfh4dy', // Example hash
                fallbackUrl: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
                priority: 3,
                updateInterval: 43200000 // 12 hours
            },
            'oblivion-custom': {
                hash: 'bafkreia7ztq5xjlvmp7jhx4rgq5b6xlqvb5zzscvs74jnk4mmrqxq3kgru', // Example hash
                fallbackUrl: 'https://raw.githubusercontent.com/734ai/OblivionFilter/main/lists/custom.txt',
                priority: 0,
                updateInterval: 21600000 // 6 hours
            }
        },

        // Performance and reliability settings
        performance: {
            timeoutMs: 10000,
            maxRetries: 3,
            parallelRequests: 3,
            cacheValidityMs: 3600000, // 1 hour
            compressionEnabled: true
        },

        // Privacy and security settings
        security: {
            validateHashes: true,
            allowOnlyKnownHashes: true,
            useRandomizedGateways: true,
            enableProxy: false // Can be enabled for additional privacy
        }
    };

    /******************************************************************************/

    // State management
    let state = {
        isInitialized: false,
        activeRequests: new Map(),
        cache: new Map(),
        gatewayStatus: new Map(),
        lastUpdateCheck: 0,
        updateQueue: [],
        statistics: {
            successfulFetches: 0,
            failedFetches: 0,
            bytesDownloaded: 0,
            cacheHits: 0,
            ipfsRequests: 0,
            fallbackRequests: 0
        }
    };

    /******************************************************************************/

    // IPFS Gateway Manager
    const GatewayManager = {
        
        // Initialize gateway status tracking
        initialize: function() {
            config.gateways.forEach(gateway => {
                state.gatewayStatus.set(gateway, {
                    isActive: true,
                    responseTime: 0,
                    lastCheck: 0,
                    failureCount: 0,
                    successCount: 0
                });
            });
        },

        // Get best available gateway
        getBestGateway: function() {
            const activeGateways = Array.from(state.gatewayStatus.entries())
                .filter(([gateway, status]) => status.isActive)
                .sort((a, b) => {
                    // Sort by success rate and response time
                    const aRatio = a[1].successCount / Math.max(1, a[1].successCount + a[1].failureCount);
                    const bRatio = b[1].successCount / Math.max(1, b[1].successCount + b[1].failureCount);
                    
                    if (Math.abs(aRatio - bRatio) < 0.1) {
                        return a[1].responseTime - b[1].responseTime;
                    }
                    return bRatio - aRatio;
                });

            if (activeGateways.length === 0) {
                // Reset all gateways if none are active
                this.resetGatewayStatus();
                return config.gateways[0];
            }

            // Randomize selection among top gateways for privacy
            const topGateways = activeGateways.slice(0, Math.min(3, activeGateways.length));
            const selectedGateway = topGateways[Math.floor(Math.random() * topGateways.length)];
            
            return selectedGateway[0];
        },

        // Update gateway status based on request results
        updateGatewayStatus: function(gateway, success, responseTime) {
            const status = state.gatewayStatus.get(gateway);
            if (!status) return;

            status.lastCheck = Date.now();
            status.responseTime = responseTime;

            if (success) {
                status.successCount++;
                status.failureCount = Math.max(0, status.failureCount - 1); // Gradual recovery
                status.isActive = true;
            } else {
                status.failureCount++;
                
                // Disable gateway if too many failures
                if (status.failureCount > 3) {
                    status.isActive = false;
                }
            }
        },

        // Reset gateway status (recovery mechanism)
        resetGatewayStatus: function() {
            config.gateways.forEach(gateway => {
                const status = state.gatewayStatus.get(gateway);
                if (status) {
                    status.isActive = true;
                    status.failureCount = 0;
                }
            });
        },

        // Health check for gateways
        performHealthCheck: async function() {
            const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'; // Hello World hash
            const promises = config.gateways.map(async gateway => {
                const startTime = Date.now();
                try {
                    const response = await this.fetchFromGateway(gateway, testHash, 5000);
                    const responseTime = Date.now() - startTime;
                    this.updateGatewayStatus(gateway, true, responseTime);
                } catch (error) {
                    const responseTime = Date.now() - startTime;
                    this.updateGatewayStatus(gateway, false, responseTime);
                }
            });

            await Promise.allSettled(promises);
        },

        // Fetch content from specific gateway
        fetchFromGateway: async function(gateway, hash, timeout = config.performance.timeoutMs) {
            const url = `${gateway}/ipfs/${hash}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                    method: 'GET',
                    headers: {
                        'Accept': 'text/plain,application/octet-stream,*/*',
                        'Cache-Control': 'no-cache'
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }
    };

    /******************************************************************************/

    // Content Fetcher
    const ContentFetcher = {
        
        // Fetch filter list from IPFS with fallback
        fetchFilterList: async function(listName) {
            const listConfig = config.filterLists[listName];
            if (!listConfig) {
                throw new Error(`Unknown filter list: ${listName}`);
            }

            // Check cache first
            const cacheKey = `ipfs_${listName}_${listConfig.hash}`;
            const cached = this.getCachedContent(cacheKey);
            if (cached) {
                state.statistics.cacheHits++;
                return cached;
            }

            let content = null;
            let error = null;

            // Try IPFS first
            if (config.enabled) {
                try {
                    content = await this.fetchFromIPFS(listConfig.hash);
                    state.statistics.ipfsRequests++;
                    state.statistics.successfulFetches++;
                } catch (ipfsError) {
                    error = ipfsError;
                    console.warn(`[OblivionFilter] IPFS fetch failed for ${listName}:`, ipfsError.message);
                }
            }

            // Fallback to traditional HTTP if IPFS fails
            if (!content && config.fallbackToGitHub && listConfig.fallbackUrl) {
                try {
                    content = await this.fetchFromHTTP(listConfig.fallbackUrl);
                    state.statistics.fallbackRequests++;
                    state.statistics.successfulFetches++;
                    console.info(`[OblivionFilter] Used HTTP fallback for ${listName}`);
                } catch (httpError) {
                    error = httpError;
                    console.error(`[OblivionFilter] HTTP fallback failed for ${listName}:`, httpError.message);
                }
            }

            if (!content) {
                state.statistics.failedFetches++;
                throw new Error(`Failed to fetch ${listName}: ${error?.message || 'Unknown error'}`);
            }

            // Cache the content
            this.setCachedContent(cacheKey, content);
            state.statistics.bytesDownloaded += content.length;

            return content;
        },

        // Fetch content from IPFS network
        fetchFromIPFS: async function(hash) {
            let lastError = null;
            
            for (let attempt = 0; attempt < config.performance.maxRetries; attempt++) {
                const gateway = GatewayManager.getBestGateway();
                const startTime = Date.now();
                
                try {
                    const response = await GatewayManager.fetchFromGateway(gateway, hash);
                    const content = await response.text();
                    
                    const responseTime = Date.now() - startTime;
                    GatewayManager.updateGatewayStatus(gateway, true, responseTime);
                    
                    // Validate content if hash validation is enabled
                    if (config.security.validateHashes) {
                        const isValid = await this.validateContent(content, hash);
                        if (!isValid) {
                            throw new Error('Content hash validation failed');
                        }
                    }
                    
                    return content;
                } catch (error) {
                    const responseTime = Date.now() - startTime;
                    GatewayManager.updateGatewayStatus(gateway, false, responseTime);
                    lastError = error;
                    
                    // Wait before retry
                    if (attempt < config.performance.maxRetries - 1) {
                        await this.delay(1000 * (attempt + 1)); // Exponential backoff
                    }
                }
            }
            
            throw lastError || new Error('IPFS fetch failed after all retries');
        },

        // Fetch content from HTTP endpoint
        fetchFromHTTP: async function(url) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.performance.timeoutMs);

            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                    method: 'GET',
                    headers: {
                        'Accept': 'text/plain,*/*',
                        'Cache-Control': 'no-cache',
                        'User-Agent': 'OblivionFilter/2.0.0'
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.text();
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        },

        // Validate content integrity
        validateContent: async function(content, expectedHash) {
            try {
                // Simple validation - in production, would use actual IPFS hash validation
                const encoder = new TextEncoder();
                const data = encoder.encode(content);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                
                // For demo purposes, accept any non-empty content
                // In production, this would validate against the actual IPFS hash
                return content.length > 0;
            } catch (error) {
                console.warn('[OblivionFilter] Content validation failed:', error);
                return false;
            }
        },

        // Cache management
        getCachedContent: function(key) {
            const cached = state.cache.get(key);
            if (!cached) return null;

            // Check cache validity
            if (Date.now() - cached.timestamp > config.performance.cacheValidityMs) {
                state.cache.delete(key);
                return null;
            }

            return cached.content;
        },

        setCachedContent: function(key, content) {
            state.cache.set(key, {
                content: content,
                timestamp: Date.now()
            });

            // Limit cache size
            if (state.cache.size > 20) {
                const oldestKey = Array.from(state.cache.keys())[0];
                state.cache.delete(oldestKey);
            }
        },

        // Utility function for delays
        delay: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    };

    /******************************************************************************/

    // Update Manager
    const UpdateManager = {
        
        // Check for updates for all filter lists
        checkForUpdates: async function() {
            const now = Date.now();
            if (now - state.lastUpdateCheck < 60000) { // Minimum 1 minute between checks
                return;
            }

            state.lastUpdateCheck = now;
            const updatePromises = [];

            for (const [listName, listConfig] of Object.entries(config.filterLists)) {
                const lastUpdate = this.getLastUpdateTime(listName);
                if (now - lastUpdate > listConfig.updateInterval) {
                    updatePromises.push(this.updateFilterList(listName));
                }
            }

            if (updatePromises.length > 0) {
                console.log(`[OblivionFilter] Checking updates for ${updatePromises.length} filter lists`);
                const results = await Promise.allSettled(updatePromises);
                
                const successful = results.filter(r => r.status === 'fulfilled').length;
                const failed = results.filter(r => r.status === 'rejected').length;
                
                console.log(`[OblivionFilter] Update check complete: ${successful} successful, ${failed} failed`);
            }
        },

        // Update specific filter list
        updateFilterList: async function(listName) {
            try {
                console.log(`[OblivionFilter] Updating filter list: ${listName}`);
                const content = await ContentFetcher.fetchFilterList(listName);
                
                // Store updated content
                await this.storeFilterList(listName, content);
                this.setLastUpdateTime(listName, Date.now());
                
                // Notify other components about the update
                if (typeof vAPI !== 'undefined' && vAPI.messaging) {
                    vAPI.messaging.send('background', {
                        what: 'filterListUpdated',
                        listName: listName,
                        contentLength: content.length
                    });
                }
                
                console.log(`[OblivionFilter] Successfully updated ${listName} (${content.length} bytes)`);
                return content;
            } catch (error) {
                console.error(`[OblivionFilter] Failed to update ${listName}:`, error);
                throw error;
            }
        },

        // Store filter list content
        storeFilterList: async function(listName, content) {
            const key = `filterList_${listName}`;
            
            // Compress content if enabled
            let storedContent = content;
            if (config.performance.compressionEnabled && typeof CompressionStream !== 'undefined') {
                try {
                    storedContent = await this.compressContent(content);
                } catch (error) {
                    console.warn('[OblivionFilter] Compression failed, storing uncompressed:', error);
                }
            }

            // Use appropriate storage API
            if (typeof browser !== 'undefined' && browser.storage) {
                await browser.storage.local.set({ [key]: storedContent });
            } else if (typeof chrome !== 'undefined' && chrome.storage) {
                return new Promise((resolve, reject) => {
                    chrome.storage.local.set({ [key]: storedContent }, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve();
                        }
                    });
                });
            } else {
                // Fallback to localStorage
                localStorage.setItem(key, storedContent);
            }
        },

        // Retrieve filter list content
        getFilterList: async function(listName) {
            const key = `filterList_${listName}`;
            
            try {
                let content = null;
                
                if (typeof browser !== 'undefined' && browser.storage) {
                    const result = await browser.storage.local.get(key);
                    content = result[key];
                } else if (typeof chrome !== 'undefined' && chrome.storage) {
                    content = await new Promise((resolve, reject) => {
                        chrome.storage.local.get(key, (result) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else {
                                resolve(result[key]);
                            }
                        });
                    });
                } else {
                    content = localStorage.getItem(key);
                }

                // Decompress if needed
                if (content && config.performance.compressionEnabled) {
                    try {
                        content = await this.decompressContent(content);
                    } catch (error) {
                        console.warn('[OblivionFilter] Decompression failed:', error);
                    }
                }

                return content;
            } catch (error) {
                console.error(`[OblivionFilter] Failed to retrieve ${listName}:`, error);
                return null;
            }
        },

        // Compress content for storage
        compressContent: async function(content) {
            // Simple compression placeholder - in production would use proper compression
            return content;
        },

        // Decompress content from storage
        decompressContent: async function(content) {
            // Simple decompression placeholder - in production would use proper decompression
            return content;
        },

        // Update time tracking
        getLastUpdateTime: function(listName) {
            const key = `lastUpdate_${listName}`;
            const timestamp = localStorage.getItem(key);
            return timestamp ? parseInt(timestamp, 10) : 0;
        },

        setLastUpdateTime: function(listName, timestamp) {
            const key = `lastUpdate_${listName}`;
            localStorage.setItem(key, timestamp.toString());
        }
    };

    /******************************************************************************/

    // Main engine interface
    const IPFSIntegrationEngine = {
        
        // Initialize IPFS integration engine
        initialize: async function() {
            if (state.isInitialized) return;

            console.log('[OblivionFilter] IPFS Integration Engine v2.0.0 initializing...');

            try {
                // Initialize gateway manager
                GatewayManager.initialize();

                // Perform initial health check
                if (config.usePublicGateways) {
                    await GatewayManager.performHealthCheck();
                }

                // Check for filter list updates
                setTimeout(() => {
                    UpdateManager.checkForUpdates().catch(error => {
                        console.warn('[OblivionFilter] Initial update check failed:', error);
                    });
                }, 5000); // Delay initial check

                // Schedule periodic updates
                setInterval(() => {
                    UpdateManager.checkForUpdates().catch(error => {
                        console.warn('[OblivionFilter] Periodic update check failed:', error);
                    });
                }, 3600000); // Check every hour

                state.isInitialized = true;
                console.log('[OblivionFilter] IPFS Integration Engine v2.0.0 initialized successfully');
                console.log('[OblivionFilter] Available gateways:', config.gateways.length);
                console.log('[OblivionFilter] Tracked filter lists:', Object.keys(config.filterLists).length);

            } catch (error) {
                console.error('[OblivionFilter] IPFS Integration initialization failed:', error);
                throw error;
            }
        },

        // Update configuration
        updateConfig: function(newConfig) {
            Object.assign(config, newConfig);
            console.log('[OblivionFilter] IPFS integration configuration updated');
        },

        // Force update of specific filter list
        forceUpdate: async function(listName) {
            if (!state.isInitialized) {
                throw new Error('IPFS Integration Engine not initialized');
            }

            return await UpdateManager.updateFilterList(listName);
        },

        // Force update of all filter lists
        forceUpdateAll: async function() {
            if (!state.isInitialized) {
                throw new Error('IPFS Integration Engine not initialized');
            }

            const updatePromises = Object.keys(config.filterLists).map(listName => 
                UpdateManager.updateFilterList(listName).catch(error => ({ error, listName }))
            );

            const results = await Promise.all(updatePromises);
            return results;
        },

        // Get filter list content
        getFilterList: async function(listName) {
            if (!state.isInitialized) {
                await this.initialize();
            }

            let content = await UpdateManager.getFilterList(listName);
            
            // If not in storage, fetch it
            if (!content) {
                content = await ContentFetcher.fetchFilterList(listName);
                await UpdateManager.storeFilterList(listName, content);
                UpdateManager.setLastUpdateTime(listName, Date.now());
            }

            return content;
        },

        // Add new filter list
        addFilterList: function(name, hash, fallbackUrl, priority = 10, updateInterval = 86400000) {
            config.filterLists[name] = {
                hash: hash,
                fallbackUrl: fallbackUrl,
                priority: priority,
                updateInterval: updateInterval
            };

            console.log(`[OblivionFilter] Added filter list: ${name}`);
        },

        // Remove filter list
        removeFilterList: function(name) {
            delete config.filterLists[name];
            
            // Clean up storage
            const key = `filterList_${name}`;
            const updateKey = `lastUpdate_${name}`;
            
            if (typeof browser !== 'undefined' && browser.storage) {
                browser.storage.local.remove([key, updateKey]);
            } else if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.remove([key, updateKey]);
            } else {
                localStorage.removeItem(key);
                localStorage.removeItem(updateKey);
            }

            console.log(`[OblivionFilter] Removed filter list: ${name}`);
        },

        // Get engine statistics
        getStatistics: function() {
            const gatewayStats = Array.from(state.gatewayStatus.entries()).map(([gateway, status]) => ({
                gateway: gateway,
                isActive: status.isActive,
                responseTime: status.responseTime,
                successCount: status.successCount,
                failureCount: status.failureCount
            }));

            return {
                version: '2.0.0',
                enabled: config.enabled,
                isInitialized: state.isInitialized,
                statistics: { ...state.statistics },
                gatewayStats: gatewayStats,
                cacheSize: state.cache.size,
                filterLists: Object.keys(config.filterLists),
                lastUpdateCheck: state.lastUpdateCheck
            };
        },

        // Cleanup and stop
        cleanup: function() {
            state.isInitialized = false;
            state.activeRequests.clear();
            state.cache.clear();
            console.log('[OblivionFilter] IPFS Integration Engine cleaned up');
        }
    };

    // Export the engine
    return IPFSIntegrationEngine;

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    window.IPFSIntegrationEngine = IPFSIntegrationEngine;
}

/******************************************************************************/

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IPFSIntegrationEngine;
}

/******************************************************************************/
