/*******************************************************************************

    OblivionFilter - Behavioral Mimicry Engine v2.0.0
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

// OblivionFilter Behavioral Mimicry Engine
// Mimics human-like browsing behavior to evade detection algorithms
const BehavioralMimicryEngine = (function() {

    /******************************************************************************/

    // Configuration for behavioral mimicry
    const config = {
        enabled: true,
        aggressiveMode: false,
        
        // User behavior simulation
        behavior: {
            mouseMovements: true,
            scrolling: true,
            clickPatterns: true,
            typingSimulation: false, // Disabled by default for privacy
            focusChanges: true,
            windowResize: true
        },

        // Timing patterns
        timing: {
            humanLike: true,
            variableDelays: true,
            reactionTimes: {
                min: 150,  // Minimum human reaction time
                max: 1200  // Maximum reasonable reaction time
            },
            taskSwitching: {
                min: 500,
                max: 3000
            }
        },

        // Interaction patterns
        interactions: {
            randomScrolling: true,
            mouseHover: true,
            elementInspection: true,
            contextMenuUsage: false, // Disabled to avoid disruption
            keyboardShortcuts: true
        },

        // Browser behavior simulation
        browserBehavior: {
            tabSwitching: true,
            pageRefresh: false, // Disabled to avoid disruption
            backButton: false,  // Disabled to avoid navigation issues
            devToolsSimulation: false, // Risky, disabled by default
            extensionInteraction: true
        },

        // Anti-pattern detection
        antiDetection: {
            avoidPerfectTiming: true,
            simulateDistractions: true,
            variableAccuracy: true,
            naturalPauses: true
        }
    };

    /******************************************************************************/

    // State management
    let state = {
        isActive: false,
        lastActivity: 0,
        mousePosition: { x: 0, y: 0 },
        scrollPosition: 0,
        interactionHistory: [],
        timingPatterns: [],
        activeTimers: new Set(),
        behaviorMetrics: {
            mouseMovements: 0,
            clicks: 0,
            scrolls: 0,
            keystrokes: 0,
            focusChanges: 0
        }
    };

    /******************************************************************************/

    // Human Behavior Analyzer
    const BehaviorAnalyzer = {
        
        // Analyze current page context for behavior adaptation
        analyzePageContext: function() {
            const context = {
                pageType: this.detectPageType(),
                contentDensity: this.calculateContentDensity(),
                interactivity: this.assessInteractivity(),
                readingTime: this.estimateReadingTime(),
                complexity: this.calculatePageComplexity()
            };

            return context;
        },

        // Detect page type for behavior adaptation
        detectPageType: function() {
            const url = window.location.href;
            const title = document.title.toLowerCase();
            const content = document.body ? document.body.textContent.toLowerCase() : '';

            // Social media patterns
            if (url.includes('facebook.com') || url.includes('twitter.com') || 
                url.includes('instagram.com') || url.includes('linkedin.com')) {
                return 'social_media';
            }

            // E-commerce patterns
            if (url.includes('amazon.') || url.includes('ebay.') || 
                title.includes('shop') || content.includes('add to cart')) {
                return 'ecommerce';
            }

            // News/media patterns
            if (url.includes('news') || title.includes('news') || 
                content.includes('article') || content.includes('breaking')) {
                return 'news_media';
            }

            // Search patterns
            if (url.includes('google.com') || url.includes('bing.com') || 
                url.includes('search') || title.includes('search')) {
                return 'search';
            }

            // Video/streaming patterns
            if (url.includes('youtube.com') || url.includes('netflix.com') || 
                url.includes('video') || title.includes('watch')) {
                return 'video_streaming';
            }

            // Default
            return 'general_content';
        },

        // Calculate content density for scroll behavior
        calculateContentDensity: function() {
            if (!document.body) return 0;

            const textNodes = document.evaluate(
                '//text()[normalize-space()]',
                document.body,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null
            );

            const totalText = textNodes.snapshotLength;
            const viewportHeight = window.innerHeight;
            const documentHeight = document.body.scrollHeight;

            return totalText / (documentHeight / viewportHeight);
        },

        // Assess page interactivity
        assessInteractivity: function() {
            const interactiveElements = document.querySelectorAll(
                'button, input, select, textarea, a, [onclick], [role="button"]'
            );

            const forms = document.querySelectorAll('form');
            const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');

            let score = 0;
            score += interactiveElements.length * 0.1;
            score += forms.length * 2;
            score += videos.length * 1.5;

            return Math.min(score, 10); // Cap at 10
        },

        // Estimate reading time for natural behavior
        estimateReadingTime: function() {
            if (!document.body) return 0;

            const text = document.body.textContent;
            const words = text.trim().split(/\s+/).length;
            const averageWPM = 200; // Average reading speed

            return (words / averageWPM) * 60 * 1000; // Return in milliseconds
        },

        // Calculate page complexity
        calculatePageComplexity: function() {
            const elements = document.querySelectorAll('*').length;
            const images = document.querySelectorAll('img').length;
            const scripts = document.querySelectorAll('script').length;
            const iframes = document.querySelectorAll('iframe').length;

            let complexity = 0;
            complexity += elements * 0.01;
            complexity += images * 0.1;
            complexity += scripts * 0.2;
            complexity += iframes * 0.5;

            return Math.min(complexity, 100);
        }
    };

    /******************************************************************************/

    // Mouse Movement Simulator
    const MouseSimulator = {
        
        // Generate human-like mouse movements
        simulateMouseMovement: function() {
            if (!config.behavior.mouseMovements) return;

            const context = BehaviorAnalyzer.analyzePageContext();
            const movement = this.generateMovementPattern(context);

            this.executeMouseMovement(movement);
        },

        // Generate movement pattern based on context
        generateMovementPattern: function(context) {
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            let pattern;

            switch (context.pageType) {
                case 'social_media':
                    pattern = this.generateSocialMediaPattern(viewport);
                    break;
                case 'ecommerce':
                    pattern = this.generateEcommercePattern(viewport);
                    break;
                case 'news_media':
                    pattern = this.generateReadingPattern(viewport);
                    break;
                case 'search':
                    pattern = this.generateSearchPattern(viewport);
                    break;
                default:
                    pattern = this.generateGeneralPattern(viewport);
            }

            return pattern;
        },

        // Generate social media browsing pattern
        generateSocialMediaPattern: function(viewport) {
            return {
                type: 'social_scroll',
                movements: [
                    { x: viewport.width * 0.5, y: viewport.height * 0.3, duration: 200 },
                    { x: viewport.width * 0.4, y: viewport.height * 0.5, duration: 300 },
                    { x: viewport.width * 0.6, y: viewport.height * 0.7, duration: 250 }
                ],
                scrolls: [
                    { direction: 'down', distance: 200, duration: 400 },
                    { direction: 'up', distance: 50, duration: 200 }
                ]
            };
        },

        // Generate e-commerce browsing pattern
        generateEcommercePattern: function(viewport) {
            return {
                type: 'product_browsing',
                movements: [
                    { x: viewport.width * 0.2, y: viewport.height * 0.4, duration: 300 },
                    { x: viewport.width * 0.8, y: viewport.height * 0.4, duration: 400 },
                    { x: viewport.width * 0.5, y: viewport.height * 0.6, duration: 200 }
                ],
                scrolls: [
                    { direction: 'down', distance: 300, duration: 600 }
                ]
            };
        },

        // Generate reading pattern
        generateReadingPattern: function(viewport) {
            return {
                type: 'reading',
                movements: [
                    { x: viewport.width * 0.1, y: viewport.height * 0.3, duration: 100 },
                    { x: viewport.width * 0.9, y: viewport.height * 0.3, duration: 800 },
                    { x: viewport.width * 0.1, y: viewport.height * 0.4, duration: 100 }
                ],
                scrolls: [
                    { direction: 'down', distance: 150, duration: 1000 }
                ]
            };
        },

        // Generate search pattern
        generateSearchPattern: function(viewport) {
            return {
                type: 'search_scanning',
                movements: [
                    { x: viewport.width * 0.5, y: viewport.height * 0.2, duration: 200 },
                    { x: viewport.width * 0.3, y: viewport.height * 0.4, duration: 300 },
                    { x: viewport.width * 0.7, y: viewport.height * 0.6, duration: 300 }
                ],
                scrolls: [
                    { direction: 'down', distance: 400, duration: 500 }
                ]
            };
        },

        // Generate general browsing pattern
        generateGeneralPattern: function(viewport) {
            return {
                type: 'general_browsing',
                movements: [
                    { x: Math.random() * viewport.width, y: Math.random() * viewport.height, duration: 200 + Math.random() * 300 }
                ],
                scrolls: [
                    { direction: Math.random() > 0.5 ? 'down' : 'up', distance: 100 + Math.random() * 200, duration: 300 + Math.random() * 400 }
                ]
            };
        },

        // Execute mouse movement pattern
        executeMouseMovement: function(pattern) {
            let delay = 0;

            pattern.movements.forEach((movement, index) => {
                setTimeout(() => {
                    this.moveMouse(movement.x, movement.y, movement.duration);
                }, delay);
                delay += movement.duration + Math.random() * 100; // Add random pause
            });

            // Execute scrolls after movements
            pattern.scrolls.forEach((scroll, index) => {
                setTimeout(() => {
                    this.executeScroll(scroll);
                }, delay);
                delay += scroll.duration + Math.random() * 200;
            });
        },

        // Simulate mouse movement to coordinates
        moveMouse: function(targetX, targetY, duration) {
            const startX = state.mousePosition.x;
            const startY = state.mousePosition.y;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function for natural movement
                const easeProgress = this.easeInOutQuad(progress);

                const currentX = startX + (targetX - startX) * easeProgress;
                const currentY = startY + (targetY - startY) * easeProgress;

                // Add slight randomness to path
                const randomX = currentX + (Math.random() - 0.5) * 5;
                const randomY = currentY + (Math.random() - 0.5) * 5;

                state.mousePosition.x = randomX;
                state.mousePosition.y = randomY;

                // Dispatch mouse move event if needed (careful not to interfere)
                if (config.behavior.mouseMovements && Math.random() > 0.9) {
                    this.dispatchMouseEvent('mousemove', randomX, randomY);
                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    state.behaviorMetrics.mouseMovements++;
                }
            };

            animate();
        },

        // Execute scroll action
        executeScroll: function(scroll) {
            const direction = scroll.direction === 'down' ? 1 : -1;
            const distance = scroll.distance * direction;
            const steps = 10;
            const stepDistance = distance / steps;
            const stepDuration = scroll.duration / steps;

            for (let i = 0; i < steps; i++) {
                setTimeout(() => {
                    window.scrollBy(0, stepDistance);
                    state.scrollPosition += stepDistance;
                    state.behaviorMetrics.scrolls++;
                }, i * stepDuration);
            }
        },

        // Dispatch mouse event
        dispatchMouseEvent: function(type, x, y) {
            try {
                const event = new MouseEvent(type, {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y
                });

                const element = document.elementFromPoint(x, y);
                if (element) {
                    element.dispatchEvent(event);
                }
            } catch (error) {
                // Silently handle any errors
            }
        },

        // Easing function for natural movement
        easeInOutQuad: function(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
    };

    /******************************************************************************/

    // Interaction Simulator
    const InteractionSimulator = {
        
        // Simulate human-like interactions
        simulateInteractions: function() {
            if (!config.interactions.randomScrolling && !config.interactions.mouseHover) return;

            const context = BehaviorAnalyzer.analyzePageContext();
            
            // Schedule random interactions based on context
            this.scheduleInteraction(context);
        },

        // Schedule an interaction based on context
        scheduleInteraction: function(context) {
            const delay = this.calculateInteractionDelay(context);
            
            const timer = setTimeout(() => {
                this.executeRandomInteraction(context);
                state.activeTimers.delete(timer);
                
                // Schedule next interaction
                if (state.isActive) {
                    this.scheduleInteraction(context);
                }
            }, delay);

            state.activeTimers.add(timer);
        },

        // Calculate delay based on context
        calculateInteractionDelay: function(context) {
            let baseDelay = 5000; // 5 seconds base

            // Adjust based on page type
            switch (context.pageType) {
                case 'social_media':
                    baseDelay = 3000; // More frequent on social media
                    break;
                case 'news_media':
                    baseDelay = 8000; // Slower on reading content
                    break;
                case 'video_streaming':
                    baseDelay = 15000; // Much less frequent during video
                    break;
            }

            // Add randomness
            return baseDelay + Math.random() * baseDelay;
        },

        // Execute a random interaction
        executeRandomInteraction: function(context) {
            const interactions = this.getAvailableInteractions(context);
            if (interactions.length === 0) return;

            const selectedInteraction = interactions[Math.floor(Math.random() * interactions.length)];
            this.executeInteraction(selectedInteraction, context);
        },

        // Get available interactions for context
        getAvailableInteractions: function(context) {
            const interactions = [];

            if (config.interactions.randomScrolling) {
                interactions.push('scroll');
            }

            if (config.interactions.mouseHover) {
                interactions.push('hover');
            }

            if (config.interactions.elementInspection) {
                interactions.push('inspect');
            }

            if (config.behavior.focusChanges) {
                interactions.push('focus');
            }

            return interactions;
        },

        // Execute specific interaction
        executeInteraction: function(type, context) {
            switch (type) {
                case 'scroll':
                    this.executeScrollInteraction(context);
                    break;
                case 'hover':
                    this.executeHoverInteraction();
                    break;
                case 'inspect':
                    this.executeInspectionInteraction();
                    break;
                case 'focus':
                    this.executeFocusInteraction();
                    break;
            }

            state.lastActivity = Date.now();
        },

        // Execute scroll interaction
        executeScrollInteraction: function(context) {
            const direction = Math.random() > 0.7 ? 'up' : 'down'; // Bias toward down
            const distance = 50 + Math.random() * 200;
            const duration = 300 + Math.random() * 400;

            MouseSimulator.executeScroll({
                direction: direction,
                distance: distance,
                duration: duration
            });
        },

        // Execute hover interaction
        executeHoverInteraction: function() {
            const elements = document.querySelectorAll('a, button, [role="button"], img');
            if (elements.length === 0) return;

            const randomElement = elements[Math.floor(Math.random() * elements.length)];
            const rect = randomElement.getBoundingClientRect();

            if (rect.top >= 0 && rect.top <= window.innerHeight) {
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                MouseSimulator.moveMouse(centerX, centerY, 200 + Math.random() * 300);
                
                // Brief pause on element
                setTimeout(() => {
                    MouseSimulator.moveMouse(
                        centerX + (Math.random() - 0.5) * 50,
                        centerY + (Math.random() - 0.5) * 50,
                        100
                    );
                }, 500 + Math.random() * 500);
            }
        },

        // Execute inspection interaction
        executeInspectionInteraction: function() {
            const interestingElements = document.querySelectorAll('h1, h2, h3, img, .price, .title, .headline');
            if (interestingElements.length === 0) return;

            const element = interestingElements[Math.floor(Math.random() * interestingElements.length)];
            const rect = element.getBoundingClientRect();

            if (rect.top >= 0 && rect.top <= window.innerHeight) {
                // Move to element and pause
                MouseSimulator.moveMouse(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    300 + Math.random() * 200
                );

                // Simulate reading time
                const readingTime = Math.max(500, rect.width * 3); // Approximate reading time
                setTimeout(() => {
                    // Small movement to simulate reading
                    MouseSimulator.moveMouse(
                        rect.left + rect.width * 0.8,
                        rect.top + rect.height / 2,
                        200
                    );
                }, readingTime);
            }
        },

        // Execute focus interaction
        executeFocusInteraction: function() {
            // Simulate brief focus loss (like checking another tab mentally)
            const focusableElements = document.querySelectorAll('input, textarea, select, button, a');
            if (focusableElements.length === 0) return;

            const element = focusableElements[Math.floor(Math.random() * focusableElements.length)];
            
            try {
                if (element.focus && typeof element.focus === 'function') {
                    element.focus();
                    setTimeout(() => {
                        if (element.blur && typeof element.blur === 'function') {
                            element.blur();
                        }
                    }, 100 + Math.random() * 200);
                    
                    state.behaviorMetrics.focusChanges++;
                }
            } catch (error) {
                // Silently handle errors
            }
        }
    };

    /******************************************************************************/

    // Timing Pattern Generator
    const TimingGenerator = {
        
        // Generate human-like timing delays
        generateHumanDelay: function(baseDelay = 1000, context = 'general') {
            if (!config.timing.humanLike) return baseDelay;

            // Apply context-specific multipliers
            let multiplier = 1;
            switch (context) {
                case 'reading':
                    multiplier = 1.5;
                    break;
                case 'decision_making':
                    multiplier = 2;
                    break;
                case 'distraction':
                    multiplier = 3;
                    break;
                case 'quick_scan':
                    multiplier = 0.5;
                    break;
            }

            const adjustedBase = baseDelay * multiplier;

            // Add human variability
            const variation = this.generateHumanVariation();
            const finalDelay = adjustedBase * variation;

            // Ensure within reasonable bounds
            return Math.max(100, Math.min(finalDelay, 10000));
        },

        // Generate human-like variation factor
        generateHumanVariation: function() {
            // Use log-normal distribution to simulate human timing
            const mu = 0; // Mean of underlying normal
            const sigma = 0.3; // Standard deviation

            const normal = this.boxMullerTransform();
            const logNormal = Math.exp(mu + sigma * normal);

            return Math.max(0.3, Math.min(logNormal, 3)); // Clamp between 0.3x and 3x
        },

        // Box-Muller transformation for normal distribution
        boxMullerTransform: function() {
            if (this.spare !== undefined) {
                const spare = this.spare;
                delete this.spare;
                return spare;
            }

            const u = Math.random();
            const v = Math.random();
            const mag = sigma * Math.sqrt(-2 * Math.log(u));
            const spare = mag * Math.cos(2 * Math.PI * v);
            this.spare = spare;

            return mag * Math.sin(2 * Math.PI * v);
        },

        // Generate distraction patterns
        generateDistractionPattern: function() {
            if (!config.antiDetection.simulateDistractions) return null;

            const distractionTypes = [
                'brief_pause',
                'attention_shift',
                'micro_break',
                'confusion_delay'
            ];

            const type = distractionTypes[Math.floor(Math.random() * distractionTypes.length)];
            
            switch (type) {
                case 'brief_pause':
                    return { delay: 200 + Math.random() * 500, type: 'pause' };
                case 'attention_shift':
                    return { delay: 500 + Math.random() * 1000, type: 'shift' };
                case 'micro_break':
                    return { delay: 1000 + Math.random() * 2000, type: 'break' };
                case 'confusion_delay':
                    return { delay: 2000 + Math.random() * 3000, type: 'confusion' };
                default:
                    return null;
            }
        }
    };

    /******************************************************************************/

    // Main engine interface
    const BehavioralMimicryEngine = {
        
        // Initialize behavioral mimicry engine
        initialize: function() {
            if (!config.enabled) return;

            console.log('[OblivionFilter] Behavioral Mimicry Engine v2.0.0 initializing...');

            // Initialize state
            state = {
                isActive: true,
                lastActivity: Date.now(),
                mousePosition: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                scrollPosition: window.pageYOffset,
                interactionHistory: [],
                timingPatterns: [],
                activeTimers: new Set(),
                behaviorMetrics: {
                    mouseMovements: 0,
                    clicks: 0,
                    scrolls: 0,
                    keystrokes: 0,
                    focusChanges: 0
                }
            };

            // Start behavior simulation
            this.startBehaviorSimulation();

            // Setup event listeners for natural behavior
            this.setupEventListeners();

            console.log('[OblivionFilter] Behavioral Mimicry Engine v2.0.0 initialized successfully');
            console.log('[OblivionFilter] Active behaviors:', {
                mouseMovements: config.behavior.mouseMovements,
                scrolling: config.behavior.scrolling,
                interactions: config.interactions.randomScrolling,
                humanTiming: config.timing.humanLike
            });
        },

        // Start behavior simulation
        startBehaviorSimulation: function() {
            // Initial delay before starting behavior
            const initialDelay = TimingGenerator.generateHumanDelay(2000, 'quick_scan');
            
            setTimeout(() => {
                // Start mouse simulation
                if (config.behavior.mouseMovements) {
                    this.scheduleMouseSimulation();
                }

                // Start interaction simulation
                if (config.interactions.randomScrolling || config.interactions.mouseHover) {
                    InteractionSimulator.simulateInteractions();
                }
            }, initialDelay);
        },

        // Schedule mouse simulation
        scheduleMouseSimulation: function() {
            if (!state.isActive) return;

            const delay = TimingGenerator.generateHumanDelay(5000, 'general');
            
            const timer = setTimeout(() => {
                MouseSimulator.simulateMouseMovement();
                state.activeTimers.delete(timer);
                
                // Schedule next mouse simulation
                this.scheduleMouseSimulation();
            }, delay);

            state.activeTimers.add(timer);
        },

        // Setup event listeners
        setupEventListeners: function() {
            // Track actual user interactions to adjust behavior
            document.addEventListener('mousemove', (e) => {
                state.mousePosition.x = e.clientX;
                state.mousePosition.y = e.clientY;
                state.lastActivity = Date.now();
            }, { passive: true });

            document.addEventListener('scroll', () => {
                state.scrollPosition = window.pageYOffset;
                state.lastActivity = Date.now();
            }, { passive: true });

            document.addEventListener('click', () => {
                state.behaviorMetrics.clicks++;
                state.lastActivity = Date.now();
                
                // Pause automation briefly after real user interaction
                this.pauseAutomation(1000 + Math.random() * 2000);
            }, { passive: true });

            // Page visibility changes
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseEngine();
                } else {
                    this.resumeEngine();
                }
            });
        },

        // Pause automation temporarily
        pauseAutomation: function(duration) {
            const wasActive = state.isActive;
            state.isActive = false;

            setTimeout(() => {
                state.isActive = wasActive;
            }, duration);
        },

        // Pause engine
        pauseEngine: function() {
            state.isActive = false;
        },

        // Resume engine
        resumeEngine: function() {
            state.isActive = true;
            
            // Restart behavior simulation if it was active
            if (config.enabled) {
                this.startBehaviorSimulation();
            }
        },

        // Update configuration
        updateConfig: function(newConfig) {
            Object.assign(config, newConfig);
            console.log('[OblivionFilter] Behavioral mimicry configuration updated');
        },

        // Get engine statistics
        getStatistics: function() {
            return {
                version: '2.0.0',
                enabled: config.enabled,
                isActive: state.isActive,
                lastActivity: state.lastActivity,
                behaviorMetrics: { ...state.behaviorMetrics },
                activeTimers: state.activeTimers.size,
                interactionHistory: state.interactionHistory.length,
                configuration: {
                    mouseMovements: config.behavior.mouseMovements,
                    scrolling: config.behavior.scrolling,
                    interactions: config.interactions,
                    timing: config.timing.humanLike
                }
            };
        },

        // Cleanup and stop
        cleanup: function() {
            state.isActive = false;
            
            // Clear all active timers
            state.activeTimers.forEach(timer => clearTimeout(timer));
            state.activeTimers.clear();

            console.log('[OblivionFilter] Behavioral Mimicry Engine cleaned up');
        }
    };

    // Export the engine
    return BehavioralMimicryEngine;

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    window.BehavioralMimicryEngine = BehavioralMimicryEngine;
    if (window.oblivionContentConfig && window.oblivionContentConfig.stealth.behavioralMimicry) {
        // Initialize after page load to avoid interfering with initial page setup
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => BehavioralMimicryEngine.initialize(), 1000);
            });
        } else {
            setTimeout(() => BehavioralMimicryEngine.initialize(), 1000);
        }
    }
}

/******************************************************************************/

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BehavioralMimicryEngine;
}

/******************************************************************************/
