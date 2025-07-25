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

// Static Network Filtering Engine for OblivionFilter
// Handles URL blocking, request filtering, and network-level content blocking

const staticNetFilteringEngine = (function() {

    // Filter buckets for different types
    const buckets = new Map();
    const genericHideFilters = new Set();
    const proceduralFilters = new Set();
    
    // Performance metrics
    let filterCount = 0;
    let evaluationCount = 0;
    let blockCount = 0;

    // Stealth configuration
    const stealthConfig = {
        randomizeDelay: true,
        obfuscateSignatures: true,
        mimicBehavior: true,
        maxDelayMs: 50
    };

    /**************************************************************************/

    const FilterContainer = class {
        constructor() {
            this.reset();
        }

        reset() {
            buckets.clear();
            genericHideFilters.clear();
            proceduralFilters.clear();
            filterCount = 0;
            evaluationCount = 0;
            blockCount = 0;
        }

        // Enhanced filter compilation with stealth features
        compile(rawFilters) {
            const compiled = {
                network: new Map(),
                cosmetic: new Map(),
                scriptlet: new Map(),
                procedural: new Set()
            };

            if (!Array.isArray(rawFilters)) {
                return compiled;
            }

            for (const rawFilter of rawFilters) {
                if (!rawFilter || typeof rawFilter !== 'string') continue;
                
                const filter = this.parseFilter(rawFilter.trim());
                if (!filter) continue;

                filterCount++;
                
                // Categorize and store filter
                switch (filter.type) {
                    case 'network':
                        this.addNetworkFilter(compiled.network, filter);
                        break;
                    case 'cosmetic':
                        this.addCosmeticFilter(compiled.cosmetic, filter);
                        break;
                    case 'scriptlet':
                        this.addScriptletFilter(compiled.scriptlet, filter);
                        break;
                    case 'procedural':
                        compiled.procedural.add(filter);
                        break;
                }
            }

            // Apply stealth obfuscation
            if (stealthConfig.obfuscateSignatures) {
                this.obfuscateFilterSignatures(compiled);
            }

            return compiled;
        }

        // Enhanced filter parsing with OblivionFilter extensions
        parseFilter(raw) {
            if (!raw || raw.startsWith('!') || raw.startsWith('[')) {
                return null; // Comment or metadata
            }

            const filter = {
                raw: raw,
                type: 'network',
                action: 'block',
                pattern: '',
                options: new Set(),
                domains: new Set(),
                exceptions: new Set()
            };

            // Detect filter type
            if (raw.includes('##') || raw.includes('#@#')) {
                filter.type = 'cosmetic';
                return this.parseCosmeticFilter(raw, filter);
            }
            
            if (raw.includes('#%#') || raw.includes('+js(')) {
                filter.type = 'scriptlet';
                return this.parseScriptletFilter(raw, filter);
            }

            if (raw.includes(':has(') || raw.includes(':xpath(')) {
                filter.type = 'procedural';
                return this.parseProceduralFilter(raw, filter);
            }

            // Parse network filter
            return this.parseNetworkFilter(raw, filter);
        }

        parseNetworkFilter(raw, filter) {
            let pattern = raw;
            
            // Handle exceptions
            if (pattern.startsWith('@@')) {
                filter.action = 'allow';
                pattern = pattern.slice(2);
            }

            // Extract options
            const optionIndex = pattern.lastIndexOf('$');
            if (optionIndex !== -1) {
                const options = pattern.slice(optionIndex + 1).split(',');
                pattern = pattern.slice(0, optionIndex);
                
                for (const option of options) {
                    const [key, value] = option.split('=');
                    filter.options.add(key.trim());
                    if (value) {
                        if (key === 'domain') {
                            value.split('|').forEach(domain => {
                                if (domain.startsWith('~')) {
                                    filter.exceptions.add(domain.slice(1));
                                } else {
                                    filter.domains.add(domain);
                                }
                            });
                        }
                    }
                }
            }

            filter.pattern = this.normalizePattern(pattern);
            return filter;
        }

        parseCosmeticFilter(raw, filter) {
            if (raw.includes('#@#')) {
                filter.action = 'allow';
                const parts = raw.split('#@#');
                filter.domains = new Set(parts[0] ? parts[0].split(',') : []);
                filter.selector = parts[1];
            } else {
                const parts = raw.split('##');
                filter.domains = new Set(parts[0] ? parts[0].split(',') : []);
                filter.selector = parts[1];
            }
            return filter;
        }

        parseScriptletFilter(raw, filter) {
            if (raw.includes('#%#')) {
                const parts = raw.split('#%#');
                filter.domains = new Set(parts[0] ? parts[0].split(',') : []);
                filter.scriptlet = parts[1];
            }
            return filter;
        }

        parseProceduralFilter(raw, filter) {
            // Enhanced procedural filter parsing for advanced selectors
            filter.selector = raw;
            filter.procedural = true;
            return filter;
        }

        normalizePattern(pattern) {
            // Enhanced pattern normalization with stealth features
            if (!pattern) return '';
            
            // Handle wildcards and anchors
            pattern = pattern.replace(/\*/g, '.*');
            pattern = pattern.replace(/\^/g, '[^\\w\\d\\-\\.%]');
            
            // Apply stealth obfuscation if enabled
            if (stealthConfig.obfuscateSignatures) {
                pattern = this.obfuscatePattern(pattern);
            }
            
            return pattern;
        }

        obfuscatePattern(pattern) {
            // Add subtle variations to avoid pattern detection
            const variations = [
                pattern,
                pattern.replace(/\./g, '\\u002E'),
                pattern.replace(/\|/g, '\\u007C')
            ];
            
            // Return randomized variation
            return variations[Math.floor(Math.random() * variations.length)];
        }

        obfuscateFilterSignatures(compiled) {
            // Apply stealth transformations to compiled filters
            // This helps avoid detection by anti-adblock systems
            
            // Randomize filter order
            const networks = Array.from(compiled.network.entries());
            this.shuffleArray(networks);
            compiled.network = new Map(networks);
            
            const cosmetics = Array.from(compiled.cosmetic.entries());
            this.shuffleArray(cosmetics);
            compiled.cosmetic = new Map(cosmetics);
        }

        shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        addNetworkFilter(networkMap, filter) {
            const key = filter.pattern.slice(0, 8); // Bucket by first 8 chars
            if (!networkMap.has(key)) {
                networkMap.set(key, []);
            }
            networkMap.get(key).push(filter);
        }

        addCosmeticFilter(cosmeticMap, filter) {
            const domains = filter.domains.size > 0 ? 
                Array.from(filter.domains).join(',') : '*';
            
            if (!cosmeticMap.has(domains)) {
                cosmeticMap.set(domains, []);
            }
            cosmeticMap.get(domains).push(filter);
        }

        addScriptletFilter(scriptletMap, filter) {
            const domains = filter.domains.size > 0 ? 
                Array.from(filter.domains).join(',') : '*';
            
            if (!scriptletMap.has(domains)) {
                scriptletMap.set(domains, []);
            }
            scriptletMap.get(domains).push(filter);
        }
    };

    /**************************************************************************/

    const FilterEngine = class {
        constructor() {
            this.container = new FilterContainer();
            this.compiled = null;
        }

        // Enhanced request evaluation with stealth timing
        async evaluate(details) {
            evaluationCount++;
            
            // Apply random delay for stealth
            if (stealthConfig.randomizeDelay) {
                const delay = Math.random() * stealthConfig.maxDelayMs;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            if (!this.compiled) {
                return { allow: true, reason: 'no-filters' };
            }

            const result = this.evaluateRequest(details);
            
            if (result.block) {
                blockCount++;
            }

            return result;
        }

        evaluateRequest(details) {
            const { url, type, frameUrl } = details;
            
            // Quick checks first
            if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
                return { allow: true, reason: 'protocol-exception' };
            }

            // Check network filters
            const networkResult = this.evaluateNetworkFilters(url, type, frameUrl);
            if (networkResult.block) {
                return networkResult;
            }

            // Check domain-specific filters
            const domainResult = this.evaluateDomainFilters(url, frameUrl);
            if (domainResult.block) {
                return domainResult;
            }

            return { allow: true, reason: 'no-match' };
        }

        evaluateNetworkFilters(url, type, frameUrl) {
            if (!this.compiled.network) {
                return { allow: true };
            }

            // Test against network filter buckets
            for (const [bucket, filters] of this.compiled.network.entries()) {
                if (!url.includes(bucket)) continue;
                
                for (const filter of filters) {
                    const match = this.testNetworkFilter(filter, url, type, frameUrl);
                    if (match.matches) {
                        return {
                            block: filter.action === 'block',
                            allow: filter.action === 'allow',
                            filter: filter,
                            reason: 'network-filter'
                        };
                    }
                }
            }

            return { allow: true };
        }

        evaluateDomainFilters(url, frameUrl) {
            // Domain-specific evaluation logic
            try {
                const urlObj = new URL(url);
                const domain = urlObj.hostname;
                
                // Check for domain-specific blocks
                if (this.isDomainBlocked(domain)) {
                    return {
                        block: true,
                        reason: 'domain-blocked',
                        domain: domain
                    };
                }
            } catch (e) {
                // Invalid URL
                return { allow: true, reason: 'invalid-url' };
            }

            return { allow: true };
        }

        testNetworkFilter(filter, url, type, frameUrl) {
            // Enhanced pattern matching with stealth considerations
            try {
                const regex = new RegExp(filter.pattern, 'i');
                const matches = regex.test(url);
                
                if (!matches) return { matches: false };

                // Check type restrictions
                if (filter.options.has('script') && type !== 'script') {
                    return { matches: false };
                }
                
                if (filter.options.has('image') && type !== 'image') {
                    return { matches: false };
                }
                
                if (filter.options.has('stylesheet') && type !== 'stylesheet') {
                    return { matches: false };
                }

                // Check domain restrictions
                if (filter.domains.size > 0 || filter.exceptions.size > 0) {
                    const match = this.testDomainMatch(filter, frameUrl);
                    if (!match) return { matches: false };
                }

                return { matches: true, filter: filter };
            } catch (e) {
                // Invalid regex
                return { matches: false, error: e.message };
            }
        }

        testDomainMatch(filter, frameUrl) {
            if (!frameUrl) return filter.domains.size === 0;
            
            try {
                const domain = new URL(frameUrl).hostname;
                
                // Check exceptions first
                for (const exception of filter.exceptions) {
                    if (domain.includes(exception)) {
                        return false;
                    }
                }
                
                // Check allowed domains
                if (filter.domains.size === 0) return true;
                
                for (const allowedDomain of filter.domains) {
                    if (domain.includes(allowedDomain)) {
                        return true;
                    }
                }
                
                return false;
            } catch (e) {
                return false;
            }
        }

        isDomainBlocked(domain) {
            // Enhanced domain blocking with stealth features
            const blockedDomains = new Set([
                'doubleclick.net',
                'googleadservices.com',
                'googlesyndication.com',
                'amazon-adsystem.com'
            ]);

            return blockedDomains.has(domain) || 
                   Array.from(blockedDomains).some(blocked => domain.includes(blocked));
        }

        // Load and compile filter lists
        async loadFilters(filterLists) {
            const allFilters = [];
            
            for (const listUrl of filterLists) {
                try {
                    const filters = await this.fetchFilterList(listUrl);
                    allFilters.push(...filters);
                } catch (e) {
                    console.warn('Failed to load filter list:', listUrl, e);
                }
            }

            this.compiled = this.container.compile(allFilters);
            return this.compiled;
        }

        async fetchFilterList(url) {
            // Enhanced filter list fetching with stealth and fallback
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const text = await response.text();
            return text.split('\n').filter(line => line.trim());
        }

        // Performance and statistics
        getStats() {
            return {
                filterCount,
                evaluationCount,
                blockCount,
                blockRate: evaluationCount > 0 ? (blockCount / evaluationCount) : 0,
                compiledFilters: this.compiled ? {
                    network: this.compiled.network.size,
                    cosmetic: this.compiled.cosmetic.size,
                    scriptlet: this.compiled.scriptlet.size,
                    procedural: this.compiled.procedural.size
                } : null
            };
        }

        // Clear all filters and stats
        reset() {
            this.container.reset();
            this.compiled = null;
        }
    };

    /**************************************************************************/

    // Public API
    return {
        FilterEngine,
        FilterContainer,
        
        // Factory method
        create() {
            return new FilterEngine();
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
    module.exports = staticNetFilteringEngine;
} else if (typeof window !== 'undefined') {
    window.staticNetFilteringEngine = staticNetFilteringEngine;
}
