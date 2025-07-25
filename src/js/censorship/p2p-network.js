/*******************************************************************************

    OblivionFilter - P2P Network Engine v2.0.0
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

// OblivionFilter P2P Network Engine
// Provides decentralized peer-to-peer filter list distribution and updates
const P2PNetworkEngine = (function() {

    /******************************************************************************/

    // Configuration for P2P networking
    const config = {
        enabled: true,
        maxPeers: 20,
        maxConnections: 8,
        autoConnect: true,
        
        // WebRTC Configuration
        webrtc: {
            enabled: true,
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun.mozilla.org:3478' }
            ],
            connectionTimeout: 30000,
            dataChannelOptions: {
                ordered: true,
                maxRetransmits: 3
            }
        },

        // DHT (Distributed Hash Table) Configuration
        dht: {
            enabled: true,
            nodeId: null, // Generated automatically
            bucketSize: 20,
            refreshInterval: 300000, // 5 minutes
            republishInterval: 86400000, // 24 hours
            ttl: 604800000 // 7 days
        },

        // Mesh Network Configuration
        mesh: {
            enabled: true,
            topology: 'hybrid', // 'full', 'ring', 'star', 'hybrid'
            redundancy: 3, // Number of paths for each route
            healingEnabled: true,
            maxHops: 6
        },

        // Discovery Configuration
        discovery: {
            enabled: true,
            methods: ['webrtc', 'websocket', 'broadcast'],
            announceInterval: 60000, // 1 minute
            discoveryTimeout: 10000,
            bootstrapNodes: [
                // Public bootstrap nodes (can be community-maintained)
                'wss://oblivion-bootstrap-1.example.com/ws',
                'wss://oblivion-bootstrap-2.example.com/ws'
            ]
        },

        // Filter Distribution Configuration
        filterDistribution: {
            enabled: true,
            chunkSize: 64 * 1024, // 64KB chunks
            compressionEnabled: true,
            encryptionEnabled: true,
            verificationEnabled: true,
            cacheSize: 100 * 1024 * 1024, // 100MB cache
            syncInterval: 3600000 // 1 hour
        },

        // Security Configuration
        security: {
            enableEncryption: true,
            enableAuthentication: false, // Anonymous by default
            enableSignatureVerification: true,
            trustedNodes: [], // Explicitly trusted node IDs
            blacklistedNodes: [], // Blocked node IDs
            maxMessageSize: 1024 * 1024, // 1MB max message
            rateLimitEnabled: true
        },

        // Performance Configuration
        performance: {
            maxBandwidth: 1024 * 1024, // 1MB/s
            maxConcurrentTransfers: 5,
            connectionPoolSize: 20,
            messageQueueSize: 1000,
            heartbeatInterval: 30000, // 30 seconds
            timeoutMultiplier: 2.0
        }
    };

    /******************************************************************************/

    // State management
    let state = {
        isInitialized: false,
        nodeId: null,
        peers: new Map(),
        connections: new Map(),
        routingTable: new Map(),
        dhtData: new Map(),
        filterCache: new Map(),
        messageQueue: [],
        transferQueue: [],
        statistics: {
            connectedPeers: 0,
            totalConnections: 0,
            bytesTransferred: 0,
            messagesExchanged: 0,
            filtersSynced: 0,
            uptime: 0,
            networkLatency: 0
        },
        startTime: 0,
        lastHeartbeat: 0
    };

    /******************************************************************************/

    // Utility functions for crypto and encoding
    const CryptoUtils = {
        
        // Generate random node ID
        generateNodeId: function() {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        },

        // Generate key pair for encryption
        generateKeyPair: async function() {
            try {
                return await crypto.subtle.generateKey(
                    {
                        name: 'ECDH',
                        namedCurve: 'P-256'
                    },
                    true,
                    ['deriveKey']
                );
            } catch (error) {
                console.warn('[OblivionFilter] Key generation failed:', error);
                return null;
            }
        },

        // Derive shared secret
        deriveSharedKey: async function(privateKey, publicKey) {
            try {
                return await crypto.subtle.deriveKey(
                    {
                        name: 'ECDH',
                        public: publicKey
                    },
                    privateKey,
                    {
                        name: 'AES-GCM',
                        length: 256
                    },
                    false,
                    ['encrypt', 'decrypt']
                );
            } catch (error) {
                console.warn('[OblivionFilter] Key derivation failed:', error);
                return null;
            }
        },

        // Encrypt message
        encrypt: async function(data, key) {
            try {
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const encoder = new TextEncoder();
                const dataArray = typeof data === 'string' ? encoder.encode(data) : data;
                
                const encrypted = await crypto.subtle.encrypt(
                    {
                        name: 'AES-GCM',
                        iv: iv
                    },
                    key,
                    dataArray
                );

                return {
                    data: encrypted,
                    iv: iv
                };
            } catch (error) {
                console.warn('[OblivionFilter] Encryption failed:', error);
                return null;
            }
        },

        // Decrypt message
        decrypt: async function(encryptedData, key, iv) {
            try {
                const decrypted = await crypto.subtle.decrypt(
                    {
                        name: 'AES-GCM',
                        iv: iv
                    },
                    key,
                    encryptedData
                );

                return decrypted;
            } catch (error) {
                console.warn('[OblivionFilter] Decryption failed:', error);
                return null;
            }
        },

        // Hash data
        hash: async function(data) {
            try {
                const encoder = new TextEncoder();
                const dataArray = typeof data === 'string' ? encoder.encode(data) : data;
                const hashBuffer = await crypto.subtle.digest('SHA-256', dataArray);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (error) {
                console.warn('[OblivionFilter] Hashing failed:', error);
                return null;
            }
        }
    };

    /******************************************************************************/

    // WebRTC Peer Connection Manager
    const WebRTCManager = {
        
        // Create peer connection
        createPeerConnection: function(peerId) {
            try {
                const pc = new RTCPeerConnection({
                    iceServers: config.webrtc.iceServers
                });

                // Handle ICE candidates
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        this.sendSignalingMessage(peerId, {
                            type: 'ice-candidate',
                            candidate: event.candidate
                        });
                    }
                };

                // Handle connection state changes
                pc.onconnectionstatechange = () => {
                    console.log(`[OblivionFilter] P2P connection state: ${pc.connectionState} for peer ${peerId}`);
                    
                    if (pc.connectionState === 'connected') {
                        this.onPeerConnected(peerId, pc);
                    } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                        this.onPeerDisconnected(peerId);
                    }
                };

                // Handle data channel
                pc.ondatachannel = (event) => {
                    const channel = event.channel;
                    this.setupDataChannel(peerId, channel);
                };

                return pc;
            } catch (error) {
                console.error('[OblivionFilter] Failed to create peer connection:', error);
                return null;
            }
        },

        // Create data channel
        createDataChannel: function(peerConnection, peerId) {
            try {
                const channel = peerConnection.createDataChannel('oblivion-p2p', config.webrtc.dataChannelOptions);
                this.setupDataChannel(peerId, channel);
                return channel;
            } catch (error) {
                console.error('[OblivionFilter] Failed to create data channel:', error);
                return null;
            }
        },

        // Setup data channel handlers
        setupDataChannel: function(peerId, channel) {
            channel.onopen = () => {
                console.log(`[OblivionFilter] Data channel opened for peer ${peerId}`);
                state.statistics.connectedPeers++;
                this.onChannelReady(peerId, channel);
            };

            channel.onclose = () => {
                console.log(`[OblivionFilter] Data channel closed for peer ${peerId}`);
                state.statistics.connectedPeers = Math.max(0, state.statistics.connectedPeers - 1);
                this.onChannelClosed(peerId);
            };

            channel.onmessage = (event) => {
                this.handleMessage(peerId, event.data);
            };

            channel.onerror = (error) => {
                console.error(`[OblivionFilter] Data channel error for peer ${peerId}:`, error);
            };
        },

        // Handle channel ready
        onChannelReady: function(peerId, channel) {
            const peer = state.peers.get(peerId);
            if (peer) {
                peer.dataChannel = channel;
                peer.connected = true;
                peer.lastSeen = Date.now();
                
                // Send initial handshake
                this.sendHandshake(peerId);
                
                // Update routing table
                RoutingManager.addPeer(peerId, peer);
            }
        },

        // Handle channel closed
        onChannelClosed: function(peerId) {
            const peer = state.peers.get(peerId);
            if (peer) {
                peer.connected = false;
                peer.dataChannel = null;
                
                // Update routing table
                RoutingManager.removePeer(peerId);
            }
        },

        // Send handshake message
        sendHandshake: function(peerId) {
            const handshake = {
                type: 'handshake',
                nodeId: state.nodeId,
                timestamp: Date.now(),
                capabilities: {
                    filterSharing: true,
                    dhtParticipation: config.dht.enabled,
                    meshRouting: config.mesh.enabled
                },
                version: '2.0.0'
            };

            this.sendMessage(peerId, handshake);
        },

        // Send message to peer
        sendMessage: function(peerId, message) {
            const peer = state.peers.get(peerId);
            if (!peer || !peer.connected || !peer.dataChannel) {
                return false;
            }

            try {
                const serialized = JSON.stringify(message);
                peer.dataChannel.send(serialized);
                state.statistics.messagesExchanged++;
                return true;
            } catch (error) {
                console.warn(`[OblivionFilter] Failed to send message to peer ${peerId}:`, error);
                return false;
            }
        },

        // Handle incoming message
        handleMessage: function(peerId, data) {
            try {
                const message = JSON.parse(data);
                state.statistics.messagesExchanged++;
                
                switch (message.type) {
                    case 'handshake':
                        this.handleHandshake(peerId, message);
                        break;
                    case 'filter-request':
                        FilterDistribution.handleFilterRequest(peerId, message);
                        break;
                    case 'filter-response':
                        FilterDistribution.handleFilterResponse(peerId, message);
                        break;
                    case 'dht-query':
                        DHTManager.handleQuery(peerId, message);
                        break;
                    case 'dht-response':
                        DHTManager.handleResponse(peerId, message);
                        break;
                    case 'ping':
                        this.handlePing(peerId, message);
                        break;
                    case 'pong':
                        this.handlePong(peerId, message);
                        break;
                    default:
                        console.warn(`[OblivionFilter] Unknown message type: ${message.type}`);
                }
            } catch (error) {
                console.warn('[OblivionFilter] Failed to handle message:', error);
            }
        },

        // Handle handshake
        handleHandshake: function(peerId, message) {
            const peer = state.peers.get(peerId);
            if (peer) {
                peer.capabilities = message.capabilities;
                peer.version = message.version;
                peer.lastSeen = Date.now();
                
                console.log(`[OblivionFilter] Handshake completed with peer ${peerId}`);
                
                // Send our own handshake if not already sent
                if (!peer.handshakeSent) {
                    this.sendHandshake(peerId);
                    peer.handshakeSent = true;
                }
            }
        },

        // Handle ping
        handlePing: function(peerId, message) {
            const pong = {
                type: 'pong',
                timestamp: Date.now(),
                pingId: message.pingId
            };
            this.sendMessage(peerId, pong);
        },

        // Handle pong
        handlePong: function(peerId, message) {
            const peer = state.peers.get(peerId);
            if (peer && peer.lastPing && peer.lastPing.id === message.pingId) {
                const latency = Date.now() - peer.lastPing.timestamp;
                peer.latency = latency;
                peer.lastSeen = Date.now();
                
                // Update network latency statistics
                const totalLatency = Array.from(state.peers.values())
                    .filter(p => p.latency !== undefined)
                    .reduce((sum, p) => sum + p.latency, 0);
                const connectedPeers = Array.from(state.peers.values()).filter(p => p.connected).length;
                
                if (connectedPeers > 0) {
                    state.statistics.networkLatency = totalLatency / connectedPeers;
                }
            }
        },

        // Send ping to peer
        sendPing: function(peerId) {
            const pingId = CryptoUtils.generateNodeId().substring(0, 8);
            const ping = {
                type: 'ping',
                timestamp: Date.now(),
                pingId: pingId
            };

            const peer = state.peers.get(peerId);
            if (peer) {
                peer.lastPing = {
                    id: pingId,
                    timestamp: Date.now()
                };
            }

            return this.sendMessage(peerId, ping);
        },

        // Placeholder for signaling (would use WebSocket or other mechanism)
        sendSignalingMessage: function(peerId, message) {
            // In a real implementation, this would send the message through a signaling server
            console.log(`[OblivionFilter] Signaling message for ${peerId}:`, message.type);
        },

        // Handle peer connected
        onPeerConnected: function(peerId, peerConnection) {
            state.statistics.totalConnections++;
            console.log(`[OblivionFilter] Peer connected: ${peerId}`);
        },

        // Handle peer disconnected
        onPeerDisconnected: function(peerId) {
            const peer = state.peers.get(peerId);
            if (peer) {
                peer.connected = false;
                peer.dataChannel = null;
                state.statistics.connectedPeers = Math.max(0, state.statistics.connectedPeers - 1);
            }
            
            console.log(`[OblivionFilter] Peer disconnected: ${peerId}`);
            
            // Attempt reconnection if auto-connect is enabled
            if (config.autoConnect) {
                setTimeout(() => {
                    PeerDiscovery.reconnectToPeer(peerId);
                }, 5000);
            }
        }
    };

    /******************************************************************************/

    // Peer Discovery Manager
    const PeerDiscovery = {
        
        // Start peer discovery
        startDiscovery: function() {
            console.log('[OblivionFilter] Starting peer discovery...');
            
            // Start announcement broadcasts
            if (config.discovery.enabled) {
                this.startAnnouncements();
            }
            
            // Connect to bootstrap nodes
            this.connectToBootstrapNodes();
            
            // Set up discovery intervals
            setInterval(() => {
                this.performDiscovery();
            }, config.discovery.announceInterval);
        },

        // Start periodic announcements
        startAnnouncements: function() {
            setInterval(() => {
                this.announcePresence();
            }, config.discovery.announceInterval);
        },

        // Announce presence to network
        announcePresence: function() {
            const announcement = {
                type: 'peer-announcement',
                nodeId: state.nodeId,
                timestamp: Date.now(),
                capabilities: {
                    filterSharing: config.filterDistribution.enabled,
                    dhtParticipation: config.dht.enabled,
                    meshRouting: config.mesh.enabled
                }
            };

            // Broadcast to all connected peers
            state.peers.forEach((peer, peerId) => {
                if (peer.connected) {
                    WebRTCManager.sendMessage(peerId, announcement);
                }
            });
        },

        // Connect to bootstrap nodes
        connectToBootstrapNodes: function() {
            config.discovery.bootstrapNodes.forEach(nodeUrl => {
                this.connectToBootstrapNode(nodeUrl);
            });
        },

        // Connect to single bootstrap node
        connectToBootstrapNode: function(nodeUrl) {
            try {
                // In a real implementation, this would establish WebSocket connection
                // to bootstrap node and exchange peer information
                console.log(`[OblivionFilter] Connecting to bootstrap node: ${nodeUrl}`);
                
                // Simulated bootstrap node response with peer list
                setTimeout(() => {
                    this.handleBootstrapResponse([
                        { id: 'peer1', address: 'simulated' },
                        { id: 'peer2', address: 'simulated' }
                    ]);
                }, 1000);
                
            } catch (error) {
                console.warn(`[OblivionFilter] Failed to connect to bootstrap node ${nodeUrl}:`, error);
            }
        },

        // Handle bootstrap node response
        handleBootstrapResponse: function(peerList) {
            peerList.forEach(peerInfo => {
                if (peerInfo.id !== state.nodeId && !state.peers.has(peerInfo.id)) {
                    this.addPeer(peerInfo.id, peerInfo);
                }
            });
        },

        // Add discovered peer
        addPeer: function(peerId, peerInfo) {
            if (state.peers.size >= config.maxPeers) {
                return false; // Peer limit reached
            }

            const peer = {
                id: peerId,
                address: peerInfo.address,
                connected: false,
                dataChannel: null,
                capabilities: null,
                version: null,
                latency: null,
                lastSeen: Date.now(),
                lastPing: null,
                handshakeSent: false,
                connection: null
            };

            state.peers.set(peerId, peer);
            console.log(`[OblivionFilter] Added peer: ${peerId}`);

            // Attempt connection if under connection limit
            if (state.statistics.connectedPeers < config.maxConnections) {
                this.connectToPeer(peerId);
            }

            return true;
        },

        // Connect to specific peer
        connectToPeer: function(peerId) {
            const peer = state.peers.get(peerId);
            if (!peer || peer.connected) {
                return false;
            }

            try {
                const peerConnection = WebRTCManager.createPeerConnection(peerId);
                if (!peerConnection) {
                    return false;
                }

                peer.connection = peerConnection;
                
                // Create data channel
                const dataChannel = WebRTCManager.createDataChannel(peerConnection, peerId);
                
                // Create offer
                peerConnection.createOffer().then(offer => {
                    return peerConnection.setLocalDescription(offer);
                }).then(() => {
                    // Send offer through signaling
                    WebRTCManager.sendSignalingMessage(peerId, {
                        type: 'offer',
                        offer: peerConnection.localDescription
                    });
                }).catch(error => {
                    console.error(`[OblivionFilter] Failed to create offer for peer ${peerId}:`, error);
                });

                return true;
            } catch (error) {
                console.error(`[OblivionFilter] Failed to connect to peer ${peerId}:`, error);
                return false;
            }
        },

        // Reconnect to peer
        reconnectToPeer: function(peerId) {
            const peer = state.peers.get(peerId);
            if (peer && !peer.connected) {
                console.log(`[OblivionFilter] Attempting to reconnect to peer ${peerId}`);
                this.connectToPeer(peerId);
            }
        },

        // Perform general discovery
        performDiscovery: function() {
            // Clean up disconnected peers
            this.cleanupDisconnectedPeers();
            
            // Attempt to reach target number of connections
            this.maintainConnections();
            
            // Send ping to all connected peers
            this.pingAllPeers();
        },

        // Clean up disconnected peers
        cleanupDisconnectedPeers: function() {
            const now = Date.now();
            const timeout = 300000; // 5 minutes
            
            state.peers.forEach((peer, peerId) => {
                if (!peer.connected && (now - peer.lastSeen) > timeout) {
                    console.log(`[OblivionFilter] Removing stale peer: ${peerId}`);
                    state.peers.delete(peerId);
                }
            });
        },

        // Maintain target number of connections
        maintainConnections: function() {
            const connectedCount = Array.from(state.peers.values()).filter(p => p.connected).length;
            const targetConnections = Math.min(config.maxConnections, state.peers.size);
            
            if (connectedCount < targetConnections) {
                const disconnectedPeers = Array.from(state.peers.entries())
                    .filter(([id, peer]) => !peer.connected)
                    .slice(0, targetConnections - connectedCount);
                
                disconnectedPeers.forEach(([peerId, peer]) => {
                    this.connectToPeer(peerId);
                });
            }
        },

        // Send ping to all connected peers
        pingAllPeers: function() {
            state.peers.forEach((peer, peerId) => {
                if (peer.connected) {
                    WebRTCManager.sendPing(peerId);
                }
            });
        }
    };

    /******************************************************************************/

    // DHT (Distributed Hash Table) Manager
    const DHTManager = {
        
        // Initialize DHT
        initialize: function() {
            if (!config.dht.enabled) return;
            
            console.log('[OblivionFilter] Initializing DHT...');
            
            // Set up periodic maintenance
            setInterval(() => {
                this.performMaintenance();
            }, config.dht.refreshInterval);
        },

        // Store data in DHT
        store: function(key, value, ttl = config.dht.ttl) {
            const hash = CryptoUtils.hash(key);
            const entry = {
                key: key,
                value: value,
                timestamp: Date.now(),
                ttl: ttl,
                nodeId: state.nodeId
            };

            state.dhtData.set(hash, entry);
            
            // Replicate to closest peers
            this.replicateData(hash, entry);
            
            return hash;
        },

        // Retrieve data from DHT
        retrieve: function(key) {
            const hash = CryptoUtils.hash(key);
            const local = state.dhtData.get(hash);
            
            if (local && this.isEntryValid(local)) {
                return local.value;
            }

            // Query network for data
            return this.queryNetwork(hash);
        },

        // Query network for data
        queryNetwork: function(hash) {
            return new Promise((resolve, reject) => {
                const query = {
                    type: 'dht-query',
                    hash: hash,
                    timestamp: Date.now(),
                    queryId: CryptoUtils.generateNodeId().substring(0, 8)
                };

                let responseCount = 0;
                const maxResponses = 3;
                const timeout = 10000;

                const responseHandler = (response) => {
                    if (response.queryId === query.queryId && response.data) {
                        resolve(response.data);
                    }
                };

                // Send query to connected peers
                state.peers.forEach((peer, peerId) => {
                    if (peer.connected && responseCount < maxResponses) {
                        WebRTCManager.sendMessage(peerId, query);
                        responseCount++;
                    }
                });

                // Timeout handling
                setTimeout(() => {
                    reject(new Error('DHT query timeout'));
                }, timeout);
            });
        },

        // Handle DHT query
        handleQuery: function(peerId, message) {
            const entry = state.dhtData.get(message.hash);
            
            if (entry && this.isEntryValid(entry)) {
                const response = {
                    type: 'dht-response',
                    hash: message.hash,
                    data: entry.value,
                    timestamp: Date.now(),
                    queryId: message.queryId
                };

                WebRTCManager.sendMessage(peerId, response);
            }
        },

        // Handle DHT response
        handleResponse: function(peerId, message) {
            // Store received data locally for caching
            if (message.data) {
                const entry = {
                    key: message.hash,
                    value: message.data,
                    timestamp: Date.now(),
                    ttl: config.dht.ttl,
                    nodeId: peerId
                };

                state.dhtData.set(message.hash, entry);
            }
        },

        // Replicate data to peers
        replicateData: function(hash, entry) {
            const replication = {
                type: 'dht-store',
                hash: hash,
                data: entry,
                timestamp: Date.now()
            };

            // Send to closest peers (simplified - would use XOR distance in real DHT)
            let replicationCount = 0;
            const maxReplications = 3;

            state.peers.forEach((peer, peerId) => {
                if (peer.connected && replicationCount < maxReplications) {
                    WebRTCManager.sendMessage(peerId, replication);
                    replicationCount++;
                }
            });
        },

        // Check if DHT entry is still valid
        isEntryValid: function(entry) {
            return (Date.now() - entry.timestamp) < entry.ttl;
        },

        // Perform DHT maintenance
        performMaintenance: function() {
            // Remove expired entries
            state.dhtData.forEach((entry, hash) => {
                if (!this.isEntryValid(entry)) {
                    state.dhtData.delete(hash);
                }
            });

            // Republish our data
            state.dhtData.forEach((entry, hash) => {
                if (entry.nodeId === state.nodeId) {
                    this.replicateData(hash, entry);
                }
            });
        }
    };

    /******************************************************************************/

    // Routing Manager for mesh network
    const RoutingManager = {
        
        // Add peer to routing table
        addPeer: function(peerId, peer) {
            state.routingTable.set(peerId, {
                nextHop: peerId,
                hopCount: 1,
                latency: peer.latency || 0,
                lastUpdate: Date.now()
            });

            this.updateRoutes();
        },

        // Remove peer from routing table
        removePeer: function(peerId) {
            state.routingTable.delete(peerId);
            
            // Remove routes that go through this peer
            state.routingTable.forEach((route, destination) => {
                if (route.nextHop === peerId) {
                    state.routingTable.delete(destination);
                }
            });

            this.updateRoutes();
        },

        // Update routing information
        updateRoutes: function() {
            if (!config.mesh.enabled) return;

            // Share routing table with peers
            const routingUpdate = {
                type: 'routing-update',
                routes: Array.from(state.routingTable.entries()),
                timestamp: Date.now()
            };

            state.peers.forEach((peer, peerId) => {
                if (peer.connected) {
                    WebRTCManager.sendMessage(peerId, routingUpdate);
                }
            });
        },

        // Find best route to destination
        findRoute: function(destination) {
            return state.routingTable.get(destination);
        },

        // Route message to destination
        routeMessage: function(destination, message) {
            const route = this.findRoute(destination);
            
            if (!route) {
                console.warn(`[OblivionFilter] No route to destination: ${destination}`);
                return false;
            }

            if (route.nextHop === destination) {
                // Direct connection
                return WebRTCManager.sendMessage(destination, message);
            } else {
                // Multi-hop routing
                const routedMessage = {
                    type: 'routed-message',
                    destination: destination,
                    payload: message,
                    hopCount: 0,
                    maxHops: config.mesh.maxHops
                };

                return WebRTCManager.sendMessage(route.nextHop, routedMessage);
            }
        }
    };

    /******************************************************************************/

    // Filter Distribution Manager
    const FilterDistribution = {
        
        // Request filter list from network
        requestFilterList: function(listName) {
            const request = {
                type: 'filter-request',
                listName: listName,
                timestamp: Date.now(),
                requestId: CryptoUtils.generateNodeId().substring(0, 8)
            };

            // Send request to all connected peers
            let requestsSent = 0;
            state.peers.forEach((peer, peerId) => {
                if (peer.connected && peer.capabilities?.filterSharing) {
                    WebRTCManager.sendMessage(peerId, request);
                    requestsSent++;
                }
            });

            console.log(`[OblivionFilter] Sent filter request for ${listName} to ${requestsSent} peers`);
            return requestsSent > 0;
        },

        // Handle filter request
        handleFilterRequest: function(peerId, message) {
            const cachedFilter = state.filterCache.get(message.listName);
            
            if (cachedFilter) {
                const response = {
                    type: 'filter-response',
                    listName: message.listName,
                    data: cachedFilter.data,
                    hash: cachedFilter.hash,
                    timestamp: Date.now(),
                    requestId: message.requestId
                };

                WebRTCManager.sendMessage(peerId, response);
                state.statistics.filtersSynced++;
            }
        },

        // Handle filter response
        handleFilterResponse: function(peerId, message) {
            if (config.filterDistribution.verificationEnabled) {
                // Verify filter integrity
                CryptoUtils.hash(message.data).then(hash => {
                    if (hash === message.hash) {
                        this.storeFilterList(message.listName, message.data, message.hash);
                        console.log(`[OblivionFilter] Received verified filter list: ${message.listName}`);
                    } else {
                        console.warn(`[OblivionFilter] Filter verification failed for: ${message.listName}`);
                    }
                });
            } else {
                this.storeFilterList(message.listName, message.data, message.hash);
            }
        },

        // Store filter list in cache
        storeFilterList: function(listName, data, hash) {
            const entry = {
                data: data,
                hash: hash,
                timestamp: Date.now(),
                size: data.length
            };

            state.filterCache.set(listName, entry);
            
            // Check cache size limit
            this.manageCacheSize();
            
            // Store in DHT for persistence
            if (config.dht.enabled) {
                DHTManager.store(`filter:${listName}`, entry);
            }
        },

        // Manage filter cache size
        manageCacheSize: function() {
            let totalSize = 0;
            const entries = Array.from(state.filterCache.entries());
            
            // Calculate total cache size
            entries.forEach(([name, entry]) => {
                totalSize += entry.size;
            });

            // Remove oldest entries if over limit
            if (totalSize > config.filterDistribution.cacheSize) {
                entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                
                while (totalSize > config.filterDistribution.cacheSize && entries.length > 0) {
                    const [name, entry] = entries.shift();
                    state.filterCache.delete(name);
                    totalSize -= entry.size;
                }
            }
        },

        // Sync all filter lists
        syncAllFilters: function() {
            const knownLists = ['easylist', 'easyprivacy', 'ublock-filters', 'oblivion-custom'];
            
            knownLists.forEach(listName => {
                this.requestFilterList(listName);
            });
        }
    };

    /******************************************************************************/

    // Main P2P Network Engine Interface
    const P2PNetworkEngine = {
        
        // Initialize P2P network
        initialize: async function() {
            if (state.isInitialized) return;

            console.log('[OblivionFilter] P2P Network Engine v2.0.0 initializing...');

            try {
                // Generate node ID
                state.nodeId = config.dht.nodeId || CryptoUtils.generateNodeId();
                state.startTime = Date.now();

                // Initialize components
                DHTManager.initialize();
                
                // Start peer discovery
                PeerDiscovery.startDiscovery();

                // Set up heartbeat
                setInterval(() => {
                    this.performHeartbeat();
                }, config.performance.heartbeatInterval);

                // Set up filter sync
                if (config.filterDistribution.enabled) {
                    setInterval(() => {
                        FilterDistribution.syncAllFilters();
                    }, config.filterDistribution.syncInterval);
                }

                state.isInitialized = true;
                console.log(`[OblivionFilter] P2P Network Engine v2.0.0 initialized with node ID: ${state.nodeId}`);
                console.log(`[OblivionFilter] Max peers: ${config.maxPeers}, Max connections: ${config.maxConnections}`);

            } catch (error) {
                console.error('[OblivionFilter] P2P Network initialization failed:', error);
                throw error;
            }
        },

        // Perform heartbeat operations
        performHeartbeat: function() {
            state.lastHeartbeat = Date.now();
            state.statistics.uptime = Date.now() - state.startTime;

            // Update statistics
            state.statistics.connectedPeers = Array.from(state.peers.values()).filter(p => p.connected).length;

            // Perform maintenance
            PeerDiscovery.performDiscovery();
            
            if (config.dht.enabled) {
                DHTManager.performMaintenance();
            }
        },

        // Connect to specific peer
        connectToPeer: function(peerId, peerInfo) {
            return PeerDiscovery.addPeer(peerId, peerInfo);
        },

        // Disconnect from peer
        disconnectFromPeer: function(peerId) {
            const peer = state.peers.get(peerId);
            if (peer) {
                if (peer.connection) {
                    peer.connection.close();
                }
                if (peer.dataChannel) {
                    peer.dataChannel.close();
                }
                state.peers.delete(peerId);
                RoutingManager.removePeer(peerId);
            }
        },

        // Broadcast message to all peers
        broadcast: function(message) {
            let sentCount = 0;
            state.peers.forEach((peer, peerId) => {
                if (peer.connected) {
                    if (WebRTCManager.sendMessage(peerId, message)) {
                        sentCount++;
                    }
                }
            });
            return sentCount;
        },

        // Send message to specific peer
        sendToPeer: function(peerId, message) {
            return WebRTCManager.sendMessage(peerId, message);
        },

        // Get filter list from network
        getFilterList: function(listName) {
            // Check local cache first
            const cached = state.filterCache.get(listName);
            if (cached) {
                return Promise.resolve(cached.data);
            }

            // Check DHT
            if (config.dht.enabled) {
                const dhtResult = DHTManager.retrieve(`filter:${listName}`);
                if (dhtResult instanceof Promise) {
                    return dhtResult.then(data => data?.data || null);
                } else if (dhtResult) {
                    return Promise.resolve(dhtResult.data);
                }
            }

            // Request from peers
            return new Promise((resolve, reject) => {
                if (FilterDistribution.requestFilterList(listName)) {
                    // Wait for response
                    const timeout = setTimeout(() => {
                        reject(new Error(`Filter request timeout for ${listName}`));
                    }, 30000);

                    const checkForFilter = () => {
                        const filter = state.filterCache.get(listName);
                        if (filter) {
                            clearTimeout(timeout);
                            resolve(filter.data);
                        } else {
                            setTimeout(checkForFilter, 1000);
                        }
                    };

                    checkForFilter();
                } else {
                    reject(new Error('No peers available for filter request'));
                }
            });
        },

        // Store filter list in network
        storeFilterList: function(listName, data) {
            return CryptoUtils.hash(data).then(hash => {
                FilterDistribution.storeFilterList(listName, data, hash);
                
                // Also store in DHT
                if (config.dht.enabled) {
                    DHTManager.store(`filter:${listName}`, { data, hash });
                }
                
                return hash;
            });
        },

        // Update configuration
        updateConfig: function(newConfig) {
            Object.assign(config, newConfig);
            console.log('[OblivionFilter] P2P network configuration updated');
        },

        // Get network statistics
        getStatistics: function() {
            const connectedPeers = Array.from(state.peers.values()).filter(p => p.connected);
            
            return {
                version: '2.0.0',
                isInitialized: state.isInitialized,
                nodeId: state.nodeId,
                statistics: {
                    ...state.statistics,
                    uptime: Date.now() - state.startTime
                },
                network: {
                    totalPeers: state.peers.size,
                    connectedPeers: connectedPeers.length,
                    averageLatency: state.statistics.networkLatency,
                    routingTableSize: state.routingTable.size,
                    dhtEntries: state.dhtData.size,
                    cachedFilters: state.filterCache.size
                },
                config: {
                    maxPeers: config.maxPeers,
                    maxConnections: config.maxConnections,
                    dhtEnabled: config.dht.enabled,
                    meshEnabled: config.mesh.enabled,
                    filterDistributionEnabled: config.filterDistribution.enabled
                }
            };
        },

        // Get connected peers
        getConnectedPeers: function() {
            return Array.from(state.peers.entries())
                .filter(([id, peer]) => peer.connected)
                .map(([id, peer]) => ({
                    id: id,
                    capabilities: peer.capabilities,
                    version: peer.version,
                    latency: peer.latency,
                    lastSeen: peer.lastSeen
                }));
        },

        // Cleanup and stop
        cleanup: function() {
            // Disconnect from all peers
            state.peers.forEach((peer, peerId) => {
                this.disconnectFromPeer(peerId);
            });

            // Clear state
            state.isInitialized = false;
            state.peers.clear();
            state.connections.clear();
            state.routingTable.clear();
            state.dhtData.clear();
            state.filterCache.clear();

            console.log('[OblivionFilter] P2P Network Engine cleaned up');
        }
    };

    // Export the engine
    return P2PNetworkEngine;

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    window.P2PNetworkEngine = P2PNetworkEngine;
}

/******************************************************************************/

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = P2PNetworkEngine;
}

/******************************************************************************/
