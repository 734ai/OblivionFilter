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

// Cosmetic Filtering Engine for OblivionFilter
// Handles CSS selectors, element hiding, and DOM manipulation with stealth features

const cosmeticFilteringEngine = (function() {

    // Filter storage
    const genericFilters = new Set();
    const specificFilters = new Map(); // domain -> filters
    const proceduralFilters = new Set();
    const allowFilters = new Set();
    
    // Stealth configuration
    const stealthConfig = {
        randomizeInjection: true,
        obfuscateSelectors: true,
        mimicNativeCSS: true,
        maxBatchSize: 50,
        injectionDelay: [10, 100] // min, max ms
    };

    // Performance tracking
    let injectionsCount = 0;
    let elementsHidden = 0;
    let selectorsApplied = 0;

    /**************************************************************************/

    const SelectorCompiler = class {
        constructor() {
            this.selectorCache = new Map();
            this.optimizedSelectors = new Map();
        }

        // Enhanced selector compilation with stealth obfuscation
        compile(filters) {
            const compiled = {
                generic: [],
                specific: new Map(),
                procedural: [],
                exceptions: new Set()
            };

            for (const filter of filters) {
                if (!filter || !filter.selector) continue;

                const selector = this.optimizeSelector(filter.selector);
                
                if (filter.action === 'allow') {
                    compiled.exceptions.add(selector);
                    continue;
                }

                if (filter.procedural) {
                    compiled.procedural.push({
                        selector: selector,
                        domains: filter.domains,
                        original: filter
                    });
                    continue;
                }

                if (filter.domains && filter.domains.size > 0) {
                    // Domain-specific filter
                    for (const domain of filter.domains) {
                        if (!compiled.specific.has(domain)) {
                            compiled.specific.set(domain, []);
                        }
                        compiled.specific.get(domain).push(selector);
                    }
                } else {
                    // Generic filter
                    compiled.generic.push(selector);
                }
            }

            // Apply stealth obfuscation
            if (stealthConfig.obfuscateSelectors) {
                this.obfuscateSelectors(compiled);
            }

            return compiled;
        }

        optimizeSelector(selector) {
            // Cache optimized selectors
            if (this.selectorCache.has(selector)) {
                return this.selectorCache.get(selector);
            }

            let optimized = selector;

            // Basic optimizations
            optimized = optimized.trim();
            optimized = optimized.replace(/\s+/g, ' ');
            optimized = optimized.replace(/\s*>\s*/g, '>');
            optimized = optimized.replace(/\s*\+\s*/g, '+');
            optimized = optimized.replace(/\s*~\s*/g, '~');

            // Enhanced optimizations for stealth
            if (stealthConfig.mimicNativeCSS) {
                optimized = this.mimicNativeStyle(optimized);
            }

            this.selectorCache.set(selector, optimized);
            return optimized;
        }

        mimicNativeStyle(selector) {
            // Make selectors look more like native browser CSS
            const nativePatterns = [
                { from: /\[id\*="/g, to: '[id*="' },
                { from: /\[class\*="/g, to: '[class*="' },
                { from: /div\[/g, to: 'div[' }
            ];

            for (const pattern of nativePatterns) {
                selector = selector.replace(pattern.from, pattern.to);
            }

            return selector;
        }

        obfuscateSelectors(compiled) {
            // Apply stealth transformations to avoid detection
            
            // Randomize generic filter order
            this.shuffleArray(compiled.generic);
            
            // Add decoy selectors occasionally
            if (Math.random() < 0.1) {
                const decoys = this.generateDecoySelectors();
                compiled.generic.push(...decoys);
            }
        }

        shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        generateDecoySelectors() {
            // Generate innocent-looking selectors that don't hide anything
            return [
                '.legitimate-content-container',
                'div[data-content-type="article"]',
                'section.main-content'
            ];
        }
    };

    /**************************************************************************/

    const StyleInjector = class {
        constructor() {
            this.injectedStyles = new Map();
            this.styleElements = new Set();
            this.mutationObserver = null;
        }

        // Enhanced style injection with stealth timing
        async inject(domain, compiled) {
            injectionsCount++;

            const selectors = this.getSelectorsForDomain(domain, compiled);
            if (selectors.length === 0) return;

            // Apply random delay for stealth
            if (stealthConfig.randomizeInjection) {
                const delay = this.getRandomDelay();
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Batch selectors for performance
            const batches = this.batchSelectors(selectors);
            
            for (const batch of batches) {
                await this.injectBatch(batch, domain);
                
                // Small delay between batches
                if (batches.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 5));
                }
            }
        }

        getSelectorsForDomain(domain, compiled) {
            const selectors = [...compiled.generic];
            
            // Add domain-specific selectors
            if (compiled.specific.has(domain)) {
                selectors.push(...compiled.specific.get(domain));
            }
            
            // Check for subdomain matches
            for (const [specificDomain, specificSelectors] of compiled.specific.entries()) {
                if (domain.includes(specificDomain) && domain !== specificDomain) {
                    selectors.push(...specificSelectors);
                }
            }
            
            // Filter out exceptions
            return selectors.filter(selector => !compiled.exceptions.has(selector));
        }

        batchSelectors(selectors) {
            const batches = [];
            const batchSize = stealthConfig.maxBatchSize;
            
            for (let i = 0; i < selectors.length; i += batchSize) {
                batches.push(selectors.slice(i, i + batchSize));
            }
            
            return batches;
        }

        async injectBatch(selectors, domain) {
            if (selectors.length === 0) return;

            const css = this.generateCSS(selectors);
            const styleId = `oblivion-filter-${domain}-${Date.now()}`;
            
            try {
                const styleElement = document.createElement('style');
                styleElement.id = styleId;
                styleElement.textContent = css;
                
                // Choose injection point strategically
                const injectionPoint = this.getInjectionPoint();
                injectionPoint.appendChild(styleElement);
                
                this.styleElements.add(styleElement);
                this.injectedStyles.set(styleId, {
                    element: styleElement,
                    selectors: selectors,
                    domain: domain,
                    timestamp: Date.now()
                });

                selectorsApplied += selectors.length;
                
                // Count hidden elements
                this.countHiddenElements(selectors);
                
            } catch (e) {
                console.warn('OblivionFilter: Failed to inject styles:', e);
            }
        }

        generateCSS(selectors) {
            // Enhanced CSS generation with stealth features
            let css = '';
            
            if (stealthConfig.mimicNativeCSS) {
                // Add comment to make it look like legitimate CSS
                css += '/* Enhanced content styling */\n';
            }
            
            // Group selectors efficiently
            const groupedSelectors = this.groupSelectorsByRule(selectors);
            
            for (const [rule, selectorList] of groupedSelectors.entries()) {
                css += `${selectorList.join(', ')} { ${rule} }\n`;
            }
            
            return css;
        }

        groupSelectorsByRule(selectors) {
            const groups = new Map();
            const defaultRule = 'display: none !important;';
            
            for (const selector of selectors) {
                // Most selectors use display: none
                let rule = defaultRule;
                
                // Special rules for certain patterns
                if (selector.includes('[style*="display"]')) {
                    rule = 'visibility: hidden !important; opacity: 0 !important;';
                } else if (selector.includes('.sticky') || selector.includes('.fixed')) {
                    rule = 'position: static !important; display: none !important;';
                }
                
                if (!groups.has(rule)) {
                    groups.set(rule, []);
                }
                groups.get(rule).push(selector);
            }
            
            return groups;
        }

        getInjectionPoint() {
            // Choose the best injection point for stealth
            if (document.head) {
                return document.head;
            } else if (document.documentElement) {
                return document.documentElement;
            } else {
                return document;
            }
        }

        getRandomDelay() {
            const [min, max] = stealthConfig.injectionDelay;
            return Math.random() * (max - min) + min;
        }

        countHiddenElements(selectors) {
            // Count how many elements were actually hidden
            for (const selector of selectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    elementsHidden += elements.length;
                } catch (e) {
                    // Invalid selector, ignore
                }
            }
        }

        // Remove injected styles
        remove(styleId) {
            const injection = this.injectedStyles.get(styleId);
            if (injection) {
                injection.element.remove();
                this.styleElements.delete(injection.element);
                this.injectedStyles.delete(styleId);
            }
        }

        // Remove all injected styles
        removeAll() {
            for (const styleElement of this.styleElements) {
                styleElement.remove();
            }
            this.styleElements.clear();
            this.injectedStyles.clear();
        }
    };

    /**************************************************************************/

    const ProceduralEngine = class {
        constructor() {
            this.proceduralFilters = new Set();
            this.activeWatchers = new Map();
        }

        // Enhanced procedural filtering with stealth features
        process(filters, domain) {
            for (const filter of filters) {
                if (!this.matchesDomain(filter.domains, domain)) continue;
                
                try {
                    this.processProceduralFilter(filter);
                } catch (e) {
                    console.warn('OblivionFilter: Procedural filter error:', e);
                }
            }
        }

        processProceduralFilter(filter) {
            const selector = filter.selector;
            
            if (selector.includes(':has(')) {
                this.processHasFilter(filter);
            } else if (selector.includes(':xpath(')) {
                this.processXpathFilter(filter);
            } else if (selector.includes(':contains(')) {
                this.processContainsFilter(filter);
            } else if (selector.includes(':matches-css(')) {
                this.processMatchesCssFilter(filter);
            }
        }

        processHasFilter(filter) {
            // Enhanced :has() implementation
            const match = filter.selector.match(/^(.+?):has\((.+?)\)(.*)$/);
            if (!match) return;
            
            const [, parentSelector, childSelector, suffix] = match;
            
            const parents = document.querySelectorAll(parentSelector);
            for (const parent of parents) {
                if (parent.querySelector(childSelector)) {
                    this.hideElement(parent, filter);
                }
            }
        }

        processXpathFilter(filter) {
            // Enhanced XPath support
            const match = filter.selector.match(/:xpath\((.+?)\)/);
            if (!match) return;
            
            const xpath = match[1].replace(/['"]/g, '');
            
            try {
                const result = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                    null
                );
                
                for (let i = 0; i < result.snapshotLength; i++) {
                    const element = result.snapshotItem(i);
                    this.hideElement(element, filter);
                }
            } catch (e) {
                console.warn('OblivionFilter: XPath error:', e);
            }
        }

        processContainsFilter(filter) {
            // Enhanced :contains() implementation
            const match = filter.selector.match(/^(.+?):contains\((.+?)\)(.*)$/);
            if (!match) return;
            
            const [, selector, text, suffix] = match;
            const searchText = text.replace(/['"]/g, '').toLowerCase();
            
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                if (element.textContent.toLowerCase().includes(searchText)) {
                    this.hideElement(element, filter);
                }
            }
        }

        processMatchesCssFilter(filter) {
            // Enhanced :matches-css() implementation
            const match = filter.selector.match(/^(.+?):matches-css\((.+?)\)(.*)$/);
            if (!match) return;
            
            const [, selector, cssMatch, suffix] = match;
            const [property, value] = cssMatch.split(':').map(s => s.trim());
            
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.getPropertyValue(property).includes(value)) {
                    this.hideElement(element, filter);
                }
            }
        }

        hideElement(element, filter) {
            if (!element || element.hasAttribute('data-oblivion-hidden')) return;
            
            element.setAttribute('data-oblivion-hidden', 'true');
            element.style.setProperty('display', 'none', 'important');
            
            elementsHidden++;
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
    };

    /**************************************************************************/

    const CosmeticEngine = class {
        constructor() {
            this.compiler = new SelectorCompiler();
            this.injector = new StyleInjector();
            this.procedural = new ProceduralEngine();
            this.compiled = null;
        }

        // Main processing function
        async process(domain) {
            if (!this.compiled) return;
            
            // Inject CSS-based filters
            await this.injector.inject(domain, this.compiled);
            
            // Process procedural filters
            if (this.compiled.procedural.length > 0) {
                this.procedural.process(this.compiled.procedural, domain);
            }
        }

        // Compile cosmetic filters
        compile(filters) {
            this.compiled = this.compiler.compile(filters);
            return this.compiled;
        }

        // Get current domain from URL
        getCurrentDomain() {
            try {
                return new URL(window.location.href).hostname;
            } catch (e) {
                return '';
            }
        }

        // Public API methods
        async apply() {
            const domain = this.getCurrentDomain();
            if (domain) {
                await this.process(domain);
            }
        }

        reset() {
            this.injector.removeAll();
            this.compiled = null;
        }

        getStats() {
            return {
                injectionsCount,
                elementsHidden,
                selectorsApplied,
                injectedStyles: this.injector.injectedStyles.size
            };
        }
    };

    /**************************************************************************/

    // Public API
    return {
        CosmeticEngine,
        SelectorCompiler,
        StyleInjector,
        ProceduralEngine,
        
        // Factory method
        create() {
            return new CosmeticEngine();
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
    module.exports = cosmeticFilteringEngine;
} else if (typeof window !== 'undefined') {
    window.cosmeticFilteringEngine = cosmeticFilteringEngine;
}
