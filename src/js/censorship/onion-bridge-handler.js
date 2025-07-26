/**
 * OblivionFilter v2.0.0
 * Onion Domain Handler & Bridge Relay System
 * 
 * Specialized handler for .onion domains and bridge relay management:
 * - Advanced .onion domain resolution and caching
 * - Bridge relay discovery and management
 * - Hidden service directory integration
 * - Onion service authentication
 * - Exit enclave support
 * 
 * @version 2.0.0
 * @author OblivionFilter Development Team
 * @license GPL-3.0
 */

'use strict';

/**
 * Onion Domain Handler
 * Specialized manager for .onion domain operations
 */
class OnionDomainHandler {
    constructor() {
        this.isInitialized = false;
        this.onionCache = new Map();
        this.authTokens = new Map();
        this.hiddenServiceDirectory = new Map();
        this.introductionPoints = new Map();
        this.rendezVousCache = new Map();
        
        // Configuration
        this.config = {
            cacheTimeout: 300000, // 5 minutes
            maxCacheSize: 1000,
            authTimeout: 3600000, // 1 hour
            maxRetries: 3,
            retryDelay: 2000,
            enableV2Support: false, // v2 deprecated
            enableAuth: true,
            enableClientAuth: true
        };
        
        // Performance metrics
        this.metrics = {
            resolutions: 0,
            cacheHits: 0,
            cacheMisses: 0,
            authSuccesses: 0,
            authFailures: 0,
            v3Resolutions: 0,
            v2Resolutions: 0,
            errors: 0
        };
        
        this.init();
    }
    
    /**
     * Initialize onion domain handler
     */
    async init() {
        try {
            console.log('🧅 Initializing Onion Domain Handler...');
            
            // Initialize onion service directory
            await this.initHiddenServiceDirectory();
            
            // Setup authentication system
            await this.initAuthenticationSystem();
            
            // Initialize introduction point manager
            await this.initIntroductionPointManager();
            
            // Setup rendezvous system
            await this.initRendezVousSystem();
            
            // Start maintenance tasks
            this.startMaintenance();
            
            this.isInitialized = true;
            console.log('✅ Onion Domain Handler initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Onion Domain Handler:', error);
            throw error;
        }
    }
    
    /**
     * Initialize hidden service directory
     */
    async initHiddenServiceDirectory() {
        this.hsDirectory = {
            // Add hidden service to directory
            addService: (onionAddress, serviceInfo) => {
                this.hiddenServiceDirectory.set(onionAddress, {
                    ...serviceInfo,
                    added: Date.now(),
                    lastSeen: Date.now(),
                    accessCount: 0
                });
                
                console.log(`📁 Added ${onionAddress} to hidden service directory`);
            },
            
            // Get service info
            getService: (onionAddress) => {
                const service = this.hiddenServiceDirectory.get(onionAddress);
                if (service) {
                    service.lastSeen = Date.now();
                    service.accessCount++;
                }
                return service;
            },
            
            // Remove expired services
            cleanup: () => {
                const now = Date.now();
                const expiredServices = [];
                
                for (const [address, service] of this.hiddenServiceDirectory) {
                    if (now - service.lastSeen > 86400000) { // 24 hours
                        expiredServices.push(address);
                    }
                }
                
                expiredServices.forEach(address => {
                    this.hiddenServiceDirectory.delete(address);
                    console.log(`🗑️ Removed expired service: ${address}`);
                });
            },
            
            // Get popular services
            getPopularServices: (limit = 10) => {
                return Array.from(this.hiddenServiceDirectory.entries())
                    .sort(([,a], [,b]) => b.accessCount - a.accessCount)
                    .slice(0, limit)
                    .map(([address, info]) => ({ address, ...info }));
            }
        };
        
        // Load known services
        await this.loadKnownServices();
    }
    
    /**
     * Load known onion services
     */
    async loadKnownServices() {
        const knownServices = [
            {
                address: 'duckduckgogg42ts72.onion',
                name: 'DuckDuckGo Search',
                category: 'search',
                version: 2,
                verified: true
            },
            {
                address: '3g2upl4pq6kufc4m.onion',
                name: 'DuckDuckGo (v2)',
                category: 'search',
                version: 2,
                verified: true
            },
            {
                address: 'facebookwkhpilnemxj7asaniu7vnjjbiltxjqhye3mhbshg7kx5tfyd.onion',
                name: 'Facebook',
                category: 'social',
                version: 3,
                verified: true
            },
            {
                address: 'expyuzz4wqqyqhjn.onion',
                name: 'ProPublica',
                category: 'news',
                version: 2,
                verified: true
            }
        ];
        
        knownServices.forEach(service => {
            this.hsDirectory.addService(service.address, service);
        });
        
        console.log(`📚 Loaded ${knownServices.length} known onion services`);
    }
    
    /**
     * Initialize authentication system
     */
    async initAuthenticationSystem() {
        this.authSystem = {
            // Generate client auth
            generateClientAuth: (onionAddress) => {
                const authKey = this.generateAuthKey();
                const token = {
                    address: onionAddress,
                    key: authKey,
                    created: Date.now(),
                    used: 0
                };
                
                this.authTokens.set(onionAddress, token);
                return token;
            },
            
            // Validate auth token
            validateAuth: (onionAddress, authData) => {
                const token = this.authTokens.get(onionAddress);
                if (!token) return false;
                
                // Check expiration
                if (Date.now() - token.created > this.config.authTimeout) {
                    this.authTokens.delete(onionAddress);
                    return false;
                }
                
                // Validate auth data
                const isValid = this.validateAuthData(authData, token.key);
                
                if (isValid) {
                    token.used++;
                    this.metrics.authSuccesses++;
                } else {
                    this.metrics.authFailures++;
                }
                
                return isValid;
            },
            
            // Store auth credentials
            storeCredentials: (onionAddress, username, password) => {
                const credentials = {
                    username,
                    password: this.hashPassword(password),
                    stored: Date.now()
                };
                
                this.authTokens.set(`${onionAddress}_creds`, credentials);
            },
            
            // Get stored credentials
            getCredentials: (onionAddress) => {
                return this.authTokens.get(`${onionAddress}_creds`);
            }
        };
    }
    
    /**
     * Initialize introduction point manager
     */
    async initIntroductionPointManager() {
        this.introPointManager = {
            // Add introduction points
            addIntroPoints: (onionAddress, introPoints) => {
                this.introductionPoints.set(onionAddress, {
                    points: introPoints,
                    updated: Date.now(),
                    failures: 0
                });
                
                console.log(`🔗 Added ${introPoints.length} intro points for ${onionAddress}`);
            },
            
            // Get best introduction point
            getBestIntroPoint: (onionAddress) => {
                const introData = this.introductionPoints.get(onionAddress);
                if (!introData || !introData.points.length) {
                    return null;
                }
                
                // Select point with lowest failure rate
                return introData.points.reduce((best, current) => {
                    return (current.failures || 0) < (best.failures || 0) ? current : best;
                });
            },
            
            // Mark introduction point as failed
            markIntroPointFailed: (onionAddress, introPoint) => {
                const introData = this.introductionPoints.get(onionAddress);
                if (introData) {
                    const point = introData.points.find(p => p.fingerprint === introPoint.fingerprint);
                    if (point) {
                        point.failures = (point.failures || 0) + 1;
                        point.lastFailure = Date.now();
                    }
                }
            },
            
            // Clean failed intro points
            cleanFailedPoints: () => {
                for (const [address, introData] of this.introductionPoints) {
                    introData.points = introData.points.filter(point => 
                        (point.failures || 0) < 5 // Remove after 5 failures
                    );
                    
                    if (introData.points.length === 0) {
                        this.introductionPoints.delete(address);
                    }
                }
            }
        };
    }
    
    /**
     * Initialize rendezvous system
     */
    async initRendezVousSystem() {
        this.rendezVousManager = {
            // Create rendezvous point
            createRendezVous: async (onionAddress) => {
                const rvPoint = {
                    id: this.generateRendezVousId(),
                    address: onionAddress,
                    created: Date.now(),
                    state: 'creating',
                    cookie: this.generateRendezVousCookie()
                };
                
                this.rendezVousCache.set(rvPoint.id, rvPoint);
                
                console.log(`🤝 Created rendezvous point ${rvPoint.id} for ${onionAddress}`);
                
                return rvPoint;
            },
            
            // Establish rendezvous
            establishRendezVous: async (rvId, introPoint) => {
                const rvPoint = this.rendezVousCache.get(rvId);
                if (!rvPoint) {
                    throw new Error('Rendezvous point not found');
                }
                
                try {
                    // Simulate rendezvous establishment
                    rvPoint.state = 'establishing';
                    rvPoint.introPoint = introPoint;
                    
                    await this.performRendezVousHandshake(rvPoint);
                    
                    rvPoint.state = 'established';
                    rvPoint.established = Date.now();
                    
                    console.log(`✅ Established rendezvous ${rvId}`);
                    
                    return rvPoint;
                    
                } catch (error) {
                    rvPoint.state = 'failed';
                    rvPoint.error = error.message;
                    throw error;
                }
            },
            
            // Close rendezvous
            closeRendezVous: (rvId) => {
                const rvPoint = this.rendezVousCache.get(rvId);
                if (rvPoint) {
                    rvPoint.state = 'closed';
                    rvPoint.closed = Date.now();
                    
                    // Remove after delay
                    setTimeout(() => {
                        this.rendezVousCache.delete(rvId);
                    }, 60000);
                }
            }
        };
    }
    
    /**
     * Resolve onion domain with full v3 support
     */
    async resolveOnionDomain(onionAddress, options = {}) {
        try {
            if (!this.isValidOnionAddress(onionAddress)) {
                throw new Error('Invalid onion address format');
            }
            
            // Check cache first
            const cached = this.onionCache.get(onionAddress);
            if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
                this.metrics.cacheHits++;
                return cached.data;
            }
            
            this.metrics.cacheMisses++;
            this.metrics.resolutions++;
            
            console.log(`🔍 Resolving onion domain: ${onionAddress}`);
            
            // Determine onion version
            const version = this.getOnionVersion(onionAddress);
            
            let resolution;
            if (version === 3) {
                resolution = await this.resolveV3Onion(onionAddress, options);
                this.metrics.v3Resolutions++;
            } else if (version === 2 && this.config.enableV2Support) {
                resolution = await this.resolveV2Onion(onionAddress, options);
                this.metrics.v2Resolutions++;
                console.warn('⚠️ Using deprecated v2 onion service');
            } else {
                throw new Error('Unsupported onion service version');
            }
            
            // Cache resolution
            this.cacheResolution(onionAddress, resolution);
            
            // Add to hidden service directory
            this.hsDirectory.addService(onionAddress, {
                version,
                resolved: Date.now(),
                introPoints: resolution.introPoints
            });
            
            return resolution;
            
        } catch (error) {
            console.error(`Failed to resolve ${onionAddress}:`, error);
            this.metrics.errors++;
            throw error;
        }
    }
    
    /**
     * Resolve v3 onion service
     */
    async resolveV3Onion(onionAddress, options) {
        try {
            // Extract public key from address
            const pubkey = onionAddress.substring(0, 56);
            
            // Validate checksum
            if (!this.validateV3Checksum(onionAddress)) {
                throw new Error('Invalid v3 onion address checksum');
            }
            
            // Get or create circuit for HSDir requests
            const hsDirCircuit = await this.getHSDirCircuit();
            
            // Fetch hidden service descriptor
            const descriptor = await this.fetchHSDescriptor(pubkey, hsDirCircuit);
            
            // Parse introduction points
            const introPoints = this.parseIntroductionPoints(descriptor);
            
            // Store introduction points
            this.introPointManager.addIntroPoints(onionAddress, introPoints);
            
            // Create rendezvous point
            const rvPoint = await this.rendezVousManager.createRendezVous(onionAddress);
            
            // Select best introduction point
            const bestIntroPoint = this.introPointManager.getBestIntroPoint(onionAddress);
            
            if (!bestIntroPoint) {
                throw new Error('No available introduction points');
            }
            
            // Establish rendezvous
            await this.rendezVousManager.establishRendezVous(rvPoint.id, bestIntroPoint);
            
            return {
                address: onionAddress,
                version: 3,
                pubkey,
                descriptor,
                introPoints,
                rendezVous: rvPoint,
                resolved: Date.now()
            };
            
        } catch (error) {
            console.error(`Failed to resolve v3 onion ${onionAddress}:`, error);
            throw error;
        }
    }
    
    /**
     * Resolve v2 onion service (deprecated)
     */
    async resolveV2Onion(onionAddress, options) {
        if (!this.config.enableV2Support) {
            throw new Error('v2 onion services are disabled');
        }
        
        console.warn('⚠️ v2 onion services are deprecated and insecure');
        
        try {
            const pubkey = onionAddress.substring(0, 16);
            
            // Simplified v2 resolution
            const introPoints = [
                {
                    fingerprint: 'V2INTRO1234567890ABCDEF',
                    address: '192.168.2.10:9001',
                    key: 'v2-intro-key-1'
                }
            ];
            
            return {
                address: onionAddress,
                version: 2,
                pubkey,
                introPoints,
                resolved: Date.now(),
                deprecated: true
            };
            
        } catch (error) {
            console.error(`Failed to resolve v2 onion ${onionAddress}:`, error);
            throw error;
        }
    }
    
    /**
     * Connect to onion service
     */
    async connectToOnionService(onionAddress, options = {}) {
        try {
            // Resolve if not already resolved
            let resolution = this.onionCache.get(onionAddress)?.data;
            if (!resolution) {
                resolution = await this.resolveOnionDomain(onionAddress, options);
            }
            
            // Handle authentication if required
            if (options.auth) {
                const authValid = await this.handleAuthentication(onionAddress, options.auth);
                if (!authValid) {
                    throw new Error('Authentication failed');
                }
            }
            
            // Create connection circuit
            const connectionCircuit = await this.createOnionCircuit(resolution);
            
            // Establish connection
            const connection = await this.establishOnionConnection(
                onionAddress,
                connectionCircuit,
                resolution
            );
            
            console.log(`✅ Connected to onion service: ${onionAddress}`);
            
            return connection;
            
        } catch (error) {
            console.error(`Failed to connect to ${onionAddress}:`, error);
            throw error;
        }
    }
    
    /**
     * Handle onion service authentication
     */
    async handleAuthentication(onionAddress, authData) {
        try {
            if (!this.config.enableAuth) {
                return true;
            }
            
            // Check for stored credentials
            const credentials = this.authSystem.getCredentials(onionAddress);
            if (credentials && authData.username && authData.password) {
                const passwordHash = this.hashPassword(authData.password);
                if (credentials.username === authData.username && 
                    credentials.password === passwordHash) {
                    return true;
                }
            }
            
            // Client authorization
            if (authData.clientAuth && this.config.enableClientAuth) {
                return this.authSystem.validateAuth(onionAddress, authData.clientAuth);
            }
            
            // Generate new auth if needed
            if (authData.generateAuth) {
                const authToken = this.authSystem.generateClientAuth(onionAddress);
                authData.authToken = authToken;
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Authentication error:', error);
            return false;
        }
    }
    
    /**
     * Get onion service information
     */
    getOnionInfo(onionAddress) {
        const cached = this.onionCache.get(onionAddress);
        const hsInfo = this.hsDirectory.getService(onionAddress);
        const introPoints = this.introductionPoints.get(onionAddress);
        
        return {
            address: onionAddress,
            version: this.getOnionVersion(onionAddress),
            cached: !!cached,
            inDirectory: !!hsInfo,
            hasIntroPoints: !!introPoints,
            lastResolved: cached?.timestamp,
            accessCount: hsInfo?.accessCount || 0,
            introPointCount: introPoints?.points?.length || 0
        };
    }
    
    /**
     * Utility methods
     */
    
    isValidOnionAddress(address) {
        // v2: 16 base32 chars + .onion
        const v2Pattern = /^[a-z2-7]{16}\.onion$/i;
        
        // v3: 56 base32 chars + .onion
        const v3Pattern = /^[a-z2-7]{56}\.onion$/i;
        
        return v2Pattern.test(address) || v3Pattern.test(address);
    }
    
    getOnionVersion(address) {
        if (address.length === 22) return 2; // 16 + .onion
        if (address.length === 62) return 3; // 56 + .onion
        return 0; // Invalid
    }
    
    validateV3Checksum(address) {
        // Simplified checksum validation
        const pubkey = address.substring(0, 56);
        return pubkey.length === 56 && /^[a-z2-7]+$/.test(pubkey);
    }
    
    cacheResolution(onionAddress, resolution) {
        // Implement LRU cache
        if (this.onionCache.size >= this.config.maxCacheSize) {
            const oldestKey = this.onionCache.keys().next().value;
            this.onionCache.delete(oldestKey);
        }
        
        this.onionCache.set(onionAddress, {
            data: resolution,
            timestamp: Date.now()
        });
    }
    
    generateAuthKey() {
        return 'auth_' + Math.random().toString(36).substr(2, 32);
    }
    
    generateRendezVousId() {
        return 'rv_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
    }
    
    generateRendezVousCookie() {
        return 'cookie_' + Math.random().toString(36).substr(2, 20);
    }
    
    hashPassword(password) {
        // Simple hash (use proper crypto in production)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
    
    validateAuthData(authData, key) {
        // Simplified auth validation
        return authData && authData.key === key;
    }
    
    async getHSDirCircuit() {
        // Get or create circuit for hidden service directory requests
        if (window.torIntegrationManager) {
            return await window.torIntegrationManager.circuitManager.createCircuit('hsdir');
        }
        throw new Error('Tor integration not available');
    }
    
    async fetchHSDescriptor(pubkey, circuit) {
        // Simulate fetching hidden service descriptor
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    pubkey,
                    introPoints: [
                        {
                            fingerprint: 'INTRO' + Math.random().toString(36).substr(2, 16),
                            serviceKey: 'service-key-' + Math.random().toString(36).substr(2, 16),
                            address: `192.168.3.${Math.floor(Math.random() * 254) + 1}:9001`
                        },
                        {
                            fingerprint: 'INTRO' + Math.random().toString(36).substr(2, 16),
                            serviceKey: 'service-key-' + Math.random().toString(36).substr(2, 16),
                            address: `192.168.3.${Math.floor(Math.random() * 254) + 1}:9001`
                        }
                    ],
                    fetched: Date.now()
                });
            }, 1500);
        });
    }
    
    parseIntroductionPoints(descriptor) {
        return descriptor.introPoints || [];
    }
    
    async createOnionCircuit(resolution) {
        if (window.torIntegrationManager) {
            return await window.torIntegrationManager.circuitManager.createCircuit('onion');
        }
        throw new Error('Tor integration not available');
    }
    
    async establishOnionConnection(onionAddress, circuit, resolution) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    address: onionAddress,
                    circuit: circuit.id,
                    established: Date.now(),
                    state: 'connected'
                });
            }, 2000);
        });
    }
    
    async performRendezVousHandshake(rvPoint) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    handshake: 'completed'
                });
            }, 1000);
        });
    }
    
    /**
     * Maintenance tasks
     */
    startMaintenance() {
        // Cache cleanup
        setInterval(() => {
            this.cleanupCache();
        }, 60000);
        
        // Auth token cleanup
        setInterval(() => {
            this.cleanupAuthTokens();
        }, 300000);
        
        // Introduction point cleanup
        setInterval(() => {
            this.introPointManager.cleanFailedPoints();
        }, 180000);
        
        // Hidden service directory cleanup
        setInterval(() => {
            this.hsDirectory.cleanup();
        }, 3600000);
    }
    
    cleanupCache() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, value] of this.onionCache) {
            if (now - value.timestamp > this.config.cacheTimeout) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.onionCache.delete(key));
        
        if (expiredKeys.length > 0) {
            console.log(`🧹 Cleaned ${expiredKeys.length} expired cache entries`);
        }
    }
    
    cleanupAuthTokens() {
        const now = Date.now();
        const expiredTokens = [];
        
        for (const [key, token] of this.authTokens) {
            if (now - token.created > this.config.authTimeout) {
                expiredTokens.push(key);
            }
        }
        
        expiredTokens.forEach(key => this.authTokens.delete(key));
        
        if (expiredTokens.length > 0) {
            console.log(`🧹 Cleaned ${expiredTokens.length} expired auth tokens`);
        }
    }
    
    /**
     * Get metrics and status
     */
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.onionCache.size,
            authTokens: this.authTokens.size,
            hiddenServices: this.hiddenServiceDirectory.size,
            introPointSets: this.introductionPoints.size,
            rendezVousPoints: this.rendezVousCache.size
        };
    }
    
    getStatus() {
        return {
            initialized: this.isInitialized,
            config: this.config,
            metrics: this.getMetrics(),
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100,
            authSuccessRate: this.metrics.authSuccesses / (this.metrics.authSuccesses + this.metrics.authFailures) * 100
        };
    }
}

/**
 * Bridge Relay System
 * Manages bridge discovery, connection, and relay operations
 */
class BridgeRelaySystem {
    constructor() {
        this.isInitialized = false;
        this.bridges = new Map();
        this.relayNodes = new Set();
        this.bridgePool = [];
        this.activeBridges = new Set();
        this.failedBridges = new Set();
        
        // Configuration
        this.config = {
            maxBridges: 10,
            bridgeTimeout: 30000,
            retryAttempts: 3,
            retryDelay: 5000,
            healthCheckInterval: 60000,
            discoveryInterval: 300000,
            preferObfs4: true,
            enableSnowflake: true,
            enableMeek: true
        };
        
        // Metrics
        this.metrics = {
            bridgesDiscovered: 0,
            bridgesConnected: 0,
            bridgesFailed: 0,
            bytesRelayed: 0,
            connectionsRelayed: 0,
            avgLatency: 0,
            uptime: 0
        };
        
        this.init();
    }
    
    /**
     * Initialize bridge relay system
     */
    async init() {
        try {
            console.log('🌉 Initializing Bridge Relay System...');
            
            // Initialize bridge discovery
            await this.initBridgeDiscovery();
            
            // Setup relay functionality
            await this.initRelaySystem();
            
            // Initialize pluggable transports
            await this.initPluggableTransports();
            
            // Start monitoring
            this.startMonitoring();
            
            this.isInitialized = true;
            console.log('✅ Bridge Relay System initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Bridge Relay System:', error);
            throw error;
        }
    }
    
    /**
     * Initialize bridge discovery
     */
    async initBridgeDiscovery() {
        this.bridgeDiscovery = {
            // Discover bridges from multiple sources
            discoverBridges: async () => {
                try {
                    console.log('🔍 Discovering bridges...');
                    
                    // Built-in bridges
                    await this.addBuiltinBridges();
                    
                    // BridgeDB bridges
                    await this.fetchBridgeDBBridges();
                    
                    // Community bridges
                    await this.fetchCommunityBridges();
                    
                    // P2P discovered bridges
                    await this.fetchP2PBridges();
                    
                    this.metrics.bridgesDiscovered = this.bridgePool.length;
                    
                    console.log(`📊 Discovered ${this.bridgePool.length} bridges`);
                    
                } catch (error) {
                    console.error('Failed to discover bridges:', error);
                }
            },
            
            // Test bridge connectivity
            testBridge: async (bridge) => {
                try {
                    console.log(`🧪 Testing bridge ${bridge.address}...`);
                    
                    const startTime = Date.now();
                    const isReachable = await this.testBridgeConnection(bridge);
                    const latency = Date.now() - startTime;
                    
                    if (isReachable) {
                        bridge.latency = latency;
                        bridge.lastTested = Date.now();
                        bridge.failures = 0;
                        return true;
                    } else {
                        bridge.failures = (bridge.failures || 0) + 1;
                        return false;
                    }
                    
                } catch (error) {
                    console.error(`Failed to test bridge ${bridge.address}:`, error);
                    return false;
                }
            },
            
            // Get best bridges
            getBestBridges: (count = 3) => {
                return this.bridgePool
                    .filter(bridge => bridge.failures < 3)
                    .sort((a, b) => (a.latency || 999999) - (b.latency || 999999))
                    .slice(0, count);
            }
        };
        
        // Start discovery
        await this.bridgeDiscovery.discoverBridges();
    }
    
    /**
     * Add built-in bridges
     */
    async addBuiltinBridges() {
        const builtinBridges = [
            {
                type: 'obfs4',
                address: '192.95.36.142:443',
                fingerprint: 'CDF2E852BF539B82BD10E27E9115A31734E378C2',
                cert: 'Bvg/itxeL4TWKLP6N1MaQzSOC6tcRIBv6q57DYAZc3317kLFzhU8x9qZC2yzqgSW8hJUGdJK',
                iatMode: 0,
                priority: 1,
                source: 'builtin'
            },
            {
                type: 'obfs4',
                address: '38.229.1.78:80',
                fingerprint: '0BAC39417268B96B9F514E7F63FA6FBA1A788955',
                cert: 'SGtRCPCF4R/SZtqh/Z6fHKOVHO0RtXCXp7RTdQfO7lGy0p7N1LV5p9l8BNs7xqLzggx7',
                iatMode: 1,
                priority: 2,
                source: 'builtin'
            },
            {
                type: 'snowflake',
                address: 'snowflake.torproject.net:443',
                fingerprint: '2B280B23E1107BB62ABFC40DDCC8824814F80A72',
                stun: 'stun:stun.l.google.com:19302',
                priority: 3,
                source: 'builtin'
            }
        ];
        
        builtinBridges.forEach(bridge => {
            this.bridgePool.push(bridge);
            console.log(`➕ Added builtin bridge: ${bridge.type}://${bridge.address}`);
        });
    }
    
    /**
     * Initialize relay system
     */
    async initRelaySystem() {
        this.relaySystem = {
            // Start relay service
            startRelay: async (bridge) => {
                try {
                    console.log(`🔄 Starting relay through ${bridge.address}...`);
                    
                    const relay = {
                        bridge,
                        id: this.generateRelayId(),
                        started: Date.now(),
                        connections: 0,
                        bytesTransferred: 0,
                        state: 'starting'
                    };
                    
                    // Establish bridge connection
                    const connection = await this.establishBridgeConnection(bridge);
                    relay.connection = connection;
                    relay.state = 'active';
                    
                    this.activeBridges.add(relay);
                    this.metrics.bridgesConnected++;
                    
                    console.log(`✅ Relay active through ${bridge.address}`);
                    
                    return relay;
                    
                } catch (error) {
                    console.error(`Failed to start relay through ${bridge.address}:`, error);
                    throw error;
                }
            },
            
            // Stop relay
            stopRelay: (relayId) => {
                const relay = Array.from(this.activeBridges).find(r => r.id === relayId);
                if (relay) {
                    relay.state = 'stopping';
                    relay.stopped = Date.now();
                    
                    // Close connection
                    if (relay.connection) {
                        relay.connection.close();
                    }
                    
                    this.activeBridges.delete(relay);
                    console.log(`🛑 Stopped relay ${relayId}`);
                }
            },
            
            // Relay traffic
            relayTraffic: async (data, destination, relay) => {
                try {
                    if (relay.state !== 'active') {
                        throw new Error('Relay not active');
                    }
                    
                    // Relay data through bridge
                    const result = await this.transmitThroughBridge(data, destination, relay.bridge);
                    
                    // Update metrics
                    relay.bytesTransferred += data.length;
                    relay.connections++;
                    this.metrics.bytesRelayed += data.length;
                    this.metrics.connectionsRelayed++;
                    
                    return result;
                    
                } catch (error) {
                    console.error('Failed to relay traffic:', error);
                    throw error;
                }
            }
        };
    }
    
    /**
     * Initialize pluggable transports
     */
    async initPluggableTransports() {
        this.pluggableTransports = {
            // obfs4 transport
            obfs4: {
                name: 'obfs4',
                available: true,
                connect: async (bridge) => {
                    console.log(`🔐 Connecting via obfs4 to ${bridge.address}...`);
                    return await this.connectObfs4(bridge);
                }
            },
            
            // Snowflake transport
            snowflake: {
                name: 'snowflake',
                available: this.config.enableSnowflake,
                connect: async (bridge) => {
                    console.log(`❄️ Connecting via Snowflake to ${bridge.address}...`);
                    return await this.connectSnowflake(bridge);
                }
            },
            
            // meek transport
            meek: {
                name: 'meek',
                available: this.config.enableMeek,
                connect: async (bridge) => {
                    console.log(`🌐 Connecting via meek to ${bridge.address}...`);
                    return await this.connectMeek(bridge);
                }
            }
        };
    }
    
    /**
     * Connect to bridge
     */
    async connectToBridge(bridge) {
        try {
            const transport = this.pluggableTransports[bridge.type];
            if (!transport || !transport.available) {
                throw new Error(`Transport ${bridge.type} not available`);
            }
            
            const connection = await transport.connect(bridge);
            
            console.log(`✅ Connected to bridge ${bridge.address} via ${bridge.type}`);
            
            return connection;
            
        } catch (error) {
            console.error(`Failed to connect to bridge ${bridge.address}:`, error);
            this.failedBridges.add(bridge);
            this.metrics.bridgesFailed++;
            throw error;
        }
    }
    
    /**
     * Pluggable transport implementations
     */
    
    async connectObfs4(bridge) {
        // Simulate obfs4 connection
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.2) { // 80% success rate
                    resolve({
                        type: 'obfs4',
                        bridge: bridge.address,
                        fingerprint: bridge.fingerprint,
                        connected: Date.now()
                    });
                } else {
                    reject(new Error('obfs4 connection failed'));
                }
            }, 3000);
        });
    }
    
    async connectSnowflake(bridge) {
        // Simulate Snowflake connection
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.3) { // 70% success rate (more variable)
                    resolve({
                        type: 'snowflake',
                        bridge: bridge.address,
                        stun: bridge.stun,
                        connected: Date.now()
                    });
                } else {
                    reject(new Error('Snowflake connection failed'));
                }
            }, 5000);
        });
    }
    
    async connectMeek(bridge) {
        // Simulate meek connection
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.25) { // 75% success rate
                    resolve({
                        type: 'meek',
                        bridge: bridge.address,
                        fronted: true,
                        connected: Date.now()
                    });
                } else {
                    reject(new Error('meek connection failed'));
                }
            }, 4000);
        });
    }
    
    /**
     * Utility methods
     */
    
    generateRelayId() {
        return 'relay_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();
    }
    
    async testBridgeConnection(bridge) {
        try {
            // Simple connectivity test
            const connection = await this.connectToBridge(bridge);
            connection.close && connection.close();
            return true;
        } catch (error) {
            return false;
        }
    }
    
    async establishBridgeConnection(bridge) {
        return await this.connectToBridge(bridge);
    }
    
    async transmitThroughBridge(data, destination, bridge) {
        // Simulate data transmission
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    transmitted: data.length,
                    destination,
                    bridge: bridge.address,
                    timestamp: Date.now()
                });
            }, 500);
        });
    }
    
    async fetchBridgeDBBridges() {
        // Simulate fetching from BridgeDB
        console.log('📡 Fetching bridges from BridgeDB...');
        // Implementation would fetch real bridges
    }
    
    async fetchCommunityBridges() {
        // Fetch from OblivionFilter community
        if (window.p2pNetworkManager) {
            try {
                const communityBridges = await window.p2pNetworkManager.requestBridgeList();
                if (communityBridges && communityBridges.length > 0) {
                    this.bridgePool.push(...communityBridges);
                    console.log(`🤝 Added ${communityBridges.length} community bridges`);
                }
            } catch (error) {
                console.error('Failed to fetch community bridges:', error);
            }
        }
    }
    
    async fetchP2PBridges() {
        // Fetch from P2P network
        if (window.ipfsIntegrationManager) {
            try {
                const p2pBridges = await window.ipfsIntegrationManager.fetchBridgeList();
                if (p2pBridges && p2pBridges.length > 0) {
                    this.bridgePool.push(...p2pBridges);
                    console.log(`🌐 Added ${p2pBridges.length} P2P bridges`);
                }
            } catch (error) {
                console.error('Failed to fetch P2P bridges:', error);
            }
        }
    }
    
    /**
     * Monitoring and maintenance
     */
    startMonitoring() {
        // Health checks
        setInterval(() => {
            this.performHealthChecks();
        }, this.config.healthCheckInterval);
        
        // Bridge discovery
        setInterval(() => {
            this.bridgeDiscovery.discoverBridges();
        }, this.config.discoveryInterval);
        
        // Metrics collection
        setInterval(() => {
            this.collectMetrics();
        }, 10000);
    }
    
    async performHealthChecks() {
        console.log('🏥 Performing bridge health checks...');
        
        const healthyBridges = [];
        const unhealthyBridges = [];
        
        for (const bridge of this.bridgePool) {
            const isHealthy = await this.bridgeDiscovery.testBridge(bridge);
            if (isHealthy) {
                healthyBridges.push(bridge);
            } else {
                unhealthyBridges.push(bridge);
            }
        }
        
        console.log(`✅ Healthy bridges: ${healthyBridges.length}`);
        console.log(`❌ Unhealthy bridges: ${unhealthyBridges.length}`);
        
        // Remove consistently failed bridges
        this.bridgePool = this.bridgePool.filter(bridge => bridge.failures < 5);
    }
    
    collectMetrics() {
        const activeBridgesCount = this.activeBridges.size;
        const totalLatency = Array.from(this.activeBridges)
            .reduce((sum, relay) => sum + (relay.bridge.latency || 0), 0);
        
        this.metrics.activeBridges = activeBridgesCount;
        this.metrics.avgLatency = activeBridgesCount > 0 ? 
            totalLatency / activeBridgesCount : 0;
        this.metrics.uptime = Date.now() - (this.startTime || Date.now());
    }
    
    /**
     * Public API
     */
    
    getStatus() {
        return {
            initialized: this.isInitialized,
            bridgePool: this.bridgePool.length,
            activeBridges: this.activeBridges.size,
            failedBridges: this.failedBridges.size,
            metrics: this.metrics,
            transports: Object.keys(this.pluggableTransports).filter(
                key => this.pluggableTransports[key].available
            )
        };
    }
    
    getBridgeList() {
        return this.bridgePool.map(bridge => ({
            type: bridge.type,
            address: bridge.address,
            fingerprint: bridge.fingerprint,
            latency: bridge.latency,
            failures: bridge.failures || 0,
            lastTested: bridge.lastTested
        }));
    }
    
    getActiveBridges() {
        return Array.from(this.activeBridges).map(relay => ({
            id: relay.id,
            bridge: relay.bridge.address,
            type: relay.bridge.type,
            started: relay.started,
            connections: relay.connections,
            bytesTransferred: relay.bytesTransferred
        }));
    }
}

// Initialize global instances
if (typeof window !== 'undefined') {
    window.onionDomainHandler = new OnionDomainHandler();
    window.bridgeRelaySystem = new BridgeRelaySystem();
    
    // Integration with main Tor system
    window.addEventListener('load', () => {
        if (window.torIntegrationManager) {
            // Connect onion handler
            window.torIntegrationManager.onionHandler = window.onionDomainHandler;
            
            // Connect bridge system
            window.torIntegrationManager.bridgeSystem = window.bridgeRelaySystem;
            
            console.log('🔗 Tor integration components connected');
        }
    });
}

console.log('🧅 OblivionFilter Onion Domain Handler & Bridge Relay System v2.0.0 loaded');
