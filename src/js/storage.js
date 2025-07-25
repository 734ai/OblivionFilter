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

// Storage Layer for OblivionFilter
// Enhanced secure storage with encryption, compression, and stealth features

const storageEngine = (function() {

    // Storage backends
    let activeBackend = null;
    const backends = new Map();
    
    // Encryption and compression
    const crypto = {
        enabled: true,
        key: null,
        algorithm: 'AES-GCM'
    };

    // Stealth configuration
    const stealthConfig = {
        obfuscateKeys: true,
        compressData: true,
        fragmentLargeData: true,
        maxFragmentSize: 8192, // 8KB
        decoyEntries: true
    };

    // Performance metrics
    let readOperations = 0;
    let writeOperations = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    // In-memory cache
    const cache = new Map();
    const cacheConfig = {
        enabled: true,
        maxSize: 100,
        ttl: 300000 // 5 minutes
    };

    /**************************************************************************/

    const StorageBackend = class {
        constructor(name, api) {
            this.name = name;
            this.api = api;
            this.available = false;
            this.encrypted = false;
        }

        async initialize() {
            try {
                // Test availability
                await this.api.set({ 'oblivion-test': 'test' });
                await this.api.remove(['oblivion-test']);
                this.available = true;
                return true;
            } catch (e) {
                console.warn(`OblivionFilter: Storage backend ${this.name} unavailable:`, e);
                this.available = false;
                return false;
            }
        }

        async get(keys) {
            if (!this.available) throw new Error(`Backend ${this.name} not available`);
            return await this.api.get(keys);
        }

        async set(data) {
            if (!this.available) throw new Error(`Backend ${this.name} not available`);
            return await this.api.set(data);
        }

        async remove(keys) {
            if (!this.available) throw new Error(`Backend ${this.name} not available`);
            return await this.api.remove(keys);
        }

        async clear() {
            if (!this.available) throw new Error(`Backend ${this.name} not available`);
            return await this.api.clear();
        }
    };

    /**************************************************************************/

    const ExtensionStorageBackend = class extends StorageBackend {
        constructor() {
            // Use different storage areas based on data type
            const api = {
                local: chrome.storage?.local || browser.storage?.local,
                sync: chrome.storage?.sync || browser.storage?.sync,
                session: chrome.storage?.session || browser.storage?.session
            };

            super('extension', api.local);
            this.syncApi = api.sync;
            this.sessionApi = api.session;
        }

        async get(keys, area = 'local') {
            const api = this.getApi(area);
            if (!api) throw new Error(`Storage area ${area} not available`);
            
            return new Promise((resolve, reject) => {
                api.get(keys, (result) => {
                    if (chrome.runtime?.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(result);
                    }
                });
            });
        }

        async set(data, area = 'local') {
            const api = this.getApi(area);
            if (!api) throw new Error(`Storage area ${area} not available`);
            
            return new Promise((resolve, reject) => {
                api.set(data, () => {
                    if (chrome.runtime?.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            });
        }

        async remove(keys, area = 'local') {
            const api = this.getApi(area);
            if (!api) throw new Error(`Storage area ${area} not available`);
            
            return new Promise((resolve, reject) => {
                api.remove(keys, () => {
                    if (chrome.runtime?.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            });
        }

        getApi(area) {
            switch (area) {
                case 'sync': return this.syncApi;
                case 'session': return this.sessionApi;
                case 'local':
                default: return this.api;
            }
        }
    };

    /**************************************************************************/

    const IndexedDBBackend = class extends StorageBackend {
        constructor() {
            super('indexeddb', null);
            this.db = null;
            this.dbName = 'OblivionFilterDB';
            this.version = 1;
            this.stores = ['settings', 'filters', 'cache', 'logs'];
        }

        async initialize() {
            try {
                this.db = await this.openDatabase();
                this.available = true;
                return true;
            } catch (e) {
                console.warn('OblivionFilter: IndexedDB unavailable:', e);
                this.available = false;
                return false;
            }
        }

        openDatabase() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    for (const storeName of this.stores) {
                        if (!db.objectStoreNames.contains(storeName)) {
                            const store = db.createObjectStore(storeName, { keyPath: 'key' });
                            store.createIndex('timestamp', 'timestamp', { unique: false });
                        }
                    }
                };
            });
        }

        async get(keys, storeName = 'settings') {
            if (!this.available) throw new Error('IndexedDB not available');
            
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const result = {};
            
            const keyArray = Array.isArray(keys) ? keys : [keys];
            
            for (const key of keyArray) {
                const request = store.get(key);
                const value = await this.promisifyRequest(request);
                if (value) {
                    result[key] = value.data;
                }
            }
            
            return result;
        }

        async set(data, storeName = 'settings') {
            if (!this.available) throw new Error('IndexedDB not available');
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            for (const [key, value] of Object.entries(data)) {
                const record = {
                    key: key,
                    data: value,
                    timestamp: Date.now()
                };
                store.put(record);
            }
            
            return this.promisifyTransaction(transaction);
        }

        async remove(keys, storeName = 'settings') {
            if (!this.available) throw new Error('IndexedDB not available');
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const keyArray = Array.isArray(keys) ? keys : [keys];
            
            for (const key of keyArray) {
                store.delete(key);
            }
            
            return this.promisifyTransaction(transaction);
        }

        promisifyRequest(request) {
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        promisifyTransaction(transaction) {
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        }
    };

    /**************************************************************************/

    const LocalStorageBackend = class extends StorageBackend {
        constructor() {
            super('localstorage', {
                get: (keys) => this.get(keys),
                set: (data) => this.set(data),
                remove: (keys) => this.remove(keys),
                clear: () => this.clear()
            });
        }

        async initialize() {
            try {
                localStorage.setItem('oblivion-test', 'test');
                localStorage.removeItem('oblivion-test');
                this.available = true;
                return true;
            } catch (e) {
                console.warn('OblivionFilter: localStorage unavailable:', e);
                this.available = false;
                return false;
            }
        }

        async get(keys) {
            const result = {};
            const keyArray = Array.isArray(keys) ? keys : [keys];
            
            for (const key of keyArray) {
                const value = localStorage.getItem(this.prefixKey(key));
                if (value !== null) {
                    try {
                        result[key] = JSON.parse(value);
                    } catch (e) {
                        result[key] = value;
                    }
                }
            }
            
            return result;
        }

        async set(data) {
            for (const [key, value] of Object.entries(data)) {
                const serialized = typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(this.prefixKey(key), serialized);
            }
        }

        async remove(keys) {
            const keyArray = Array.isArray(keys) ? keys : [keys];
            
            for (const key of keyArray) {
                localStorage.removeItem(this.prefixKey(key));
            }
        }

        async clear() {
            const keysToRemove = [];
            const prefix = this.prefixKey('');
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            for (const key of keysToRemove) {
                localStorage.removeItem(key);
            }
        }

        prefixKey(key) {
            return `oblivion-filter-${key}`;
        }
    };

    /**************************************************************************/

    const DataProcessor = class {
        constructor() {
            this.encoder = new TextEncoder();
            this.decoder = new TextDecoder();
        }

        // Enhanced data processing with encryption and compression
        async processForStorage(key, data) {
            let processed = data;
            
            // Serialize if needed
            if (typeof processed !== 'string') {
                processed = JSON.stringify(processed);
            }

            // Compress if enabled
            if (stealthConfig.compressData) {
                processed = await this.compress(processed);
            }

            // Encrypt if enabled
            if (crypto.enabled && crypto.key) {
                processed = await this.encrypt(processed);
            }

            // Fragment if data is too large
            if (stealthConfig.fragmentLargeData && processed.length > stealthConfig.maxFragmentSize) {
                return this.fragment(key, processed);
            }

            // Obfuscate key if enabled
            const processedKey = stealthConfig.obfuscateKeys ? this.obfuscateKey(key) : key;

            return { [processedKey]: processed };
        }

        async processFromStorage(key, data) {
            let processed = data;

            // Handle fragmented data
            if (this.isFragmented(processed)) {
                processed = await this.defragment(key, processed);
            }

            // Decrypt if encrypted
            if (crypto.enabled && crypto.key && this.isEncrypted(processed)) {
                processed = await this.decrypt(processed);
            }

            // Decompress if compressed
            if (stealthConfig.compressData && this.isCompressed(processed)) {
                processed = await this.decompress(processed);
            }

            // Parse if JSON
            try {
                return JSON.parse(processed);
            } catch (e) {
                return processed;
            }
        }

        async compress(data) {
            // Simple compression using native APIs
            if (typeof CompressionStream !== 'undefined') {
                const stream = new CompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                writer.write(this.encoder.encode(data));
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) chunks.push(value);
                }
                
                return btoa(String.fromCharCode(...new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))));
            }
            
            // Fallback: simple string compression
            return btoa(encodeURIComponent(data));
        }

        async decompress(data) {
            try {
                if (typeof DecompressionStream !== 'undefined') {
                    const compressed = new Uint8Array(atob(data).split('').map(c => c.charCodeAt(0)));
                    const stream = new DecompressionStream('gzip');
                    const writer = stream.writable.getWriter();
                    const reader = stream.readable.getReader();
                    
                    writer.write(compressed);
                    writer.close();
                    
                    const chunks = [];
                    let done = false;
                    
                    while (!done) {
                        const { value, done: readerDone } = await reader.read();
                        done = readerDone;
                        if (value) chunks.push(value);
                    }
                    
                    return this.decoder.decode(new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [])));
                }
                
                // Fallback
                return decodeURIComponent(atob(data));
            } catch (e) {
                return data; // Return as-is if decompression fails
            }
        }

        async encrypt(data) {
            if (!crypto.key) return data;
            
            try {
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const encoded = this.encoder.encode(data);
                
                const encrypted = await crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv: iv },
                    crypto.key,
                    encoded
                );
                
                const combined = new Uint8Array(iv.length + encrypted.byteLength);
                combined.set(iv);
                combined.set(new Uint8Array(encrypted), iv.length);
                
                return btoa(String.fromCharCode(...combined));
            } catch (e) {
                console.warn('OblivionFilter: Encryption failed:', e);
                return data;
            }
        }

        async decrypt(data) {
            if (!crypto.key) return data;
            
            try {
                const combined = new Uint8Array(atob(data).split('').map(c => c.charCodeAt(0)));
                const iv = combined.slice(0, 12);
                const encrypted = combined.slice(12);
                
                const decrypted = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: iv },
                    crypto.key,
                    encrypted
                );
                
                return this.decoder.decode(decrypted);
            } catch (e) {
                console.warn('OblivionFilter: Decryption failed:', e);
                return data;
            }
        }

        fragment(key, data) {
            const fragments = {};
            const fragmentSize = stealthConfig.maxFragmentSize;
            const totalFragments = Math.ceil(data.length / fragmentSize);
            
            for (let i = 0; i < totalFragments; i++) {
                const start = i * fragmentSize;
                const end = Math.min(start + fragmentSize, data.length);
                const fragmentKey = `${key}_fragment_${i}`;
                
                fragments[fragmentKey] = {
                    data: data.slice(start, end),
                    index: i,
                    total: totalFragments,
                    fragmented: true
                };
            }
            
            // Add metadata
            fragments[`${key}_meta`] = {
                fragments: totalFragments,
                originalKey: key,
                fragmented: true
            };
            
            return fragments;
        }

        async defragment(key, fragmentedData) {
            const meta = fragmentedData[`${key}_meta`];
            if (!meta || !meta.fragmented) return fragmentedData;
            
            const fragments = [];
            
            for (let i = 0; i < meta.fragments; i++) {
                const fragmentKey = `${key}_fragment_${i}`;
                const fragment = fragmentedData[fragmentKey];
                
                if (fragment && fragment.fragmented) {
                    fragments[fragment.index] = fragment.data;
                }
            }
            
            return fragments.join('');
        }

        obfuscateKey(key) {
            // Simple key obfuscation to avoid pattern detection
            const hash = this.simpleHash(key);
            return `obf_${hash}_${key.length}`;
        }

        simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash).toString(36);
        }

        isFragmented(data) {
            return typeof data === 'object' && data.fragmented === true;
        }

        isEncrypted(data) {
            // Simple check for encrypted data format
            return typeof data === 'string' && data.length > 20 && /^[A-Za-z0-9+/]+=*$/.test(data);
        }

        isCompressed(data) {
            // Simple check for compressed data format
            return typeof data === 'string' && /^[A-Za-z0-9+/]+=*$/.test(data);
        }
    };

    /**************************************************************************/

    const StorageManager = class {
        constructor() {
            this.backends = new Map();
            this.activeBackend = null;
            this.processor = new DataProcessor();
            this.cache = new Map();
            this.cacheTimestamps = new Map();
        }

        async initialize() {
            // Initialize available backends
            const extensionBackend = new ExtensionStorageBackend();
            const indexedDBBackend = new IndexedDBBackend();
            const localStorageBackend = new LocalStorageBackend();

            // Test each backend
            for (const backend of [extensionBackend, indexedDBBackend, localStorageBackend]) {
                const available = await backend.initialize();
                if (available) {
                    this.backends.set(backend.name, backend);
                    if (!this.activeBackend) {
                        this.activeBackend = backend;
                    }
                }
            }

            if (!this.activeBackend) {
                throw new Error('No storage backend available');
            }

            // Initialize encryption if supported
            await this.initializeEncryption();

            return this.activeBackend.name;
        }

        async initializeEncryption() {
            if (!crypto.enabled || !window.crypto?.subtle) return;

            try {
                // Generate or retrieve encryption key
                const keyData = await this.getEncryptionKey();
                crypto.key = await window.crypto.subtle.importKey(
                    'raw',
                    keyData,
                    { name: 'AES-GCM' },
                    false,
                    ['encrypt', 'decrypt']
                );
            } catch (e) {
                console.warn('OblivionFilter: Encryption initialization failed:', e);
                crypto.enabled = false;
            }
        }

        async getEncryptionKey() {
            // Try to get existing key
            const existingKey = await this.getRaw('encryption-key');
            if (existingKey) {
                return new Uint8Array(existingKey);
            }

            // Generate new key
            const keyData = window.crypto.getRandomValues(new Uint8Array(32));
            await this.setRaw('encryption-key', Array.from(keyData));
            return keyData;
        }

        // Public API methods
        async get(key) {
            readOperations++;

            // Check cache first
            if (cacheConfig.enabled && this.isCacheValid(key)) {
                cacheHits++;
                return this.cache.get(key);
            }

            cacheMisses++;

            try {
                const processedKey = stealthConfig.obfuscateKeys ? this.processor.obfuscateKey(key) : key;
                const rawData = await this.activeBackend.get(processedKey);
                
                if (rawData && rawData[processedKey] !== undefined) {
                    const processed = await this.processor.processFromStorage(key, rawData[processedKey]);
                    
                    // Update cache
                    if (cacheConfig.enabled) {
                        this.updateCache(key, processed);
                    }
                    
                    return processed;
                }
                
                return null;
            } catch (e) {
                console.warn('OblivionFilter: Storage get error:', e);
                return null;
            }
        }

        async set(key, value) {
            writeOperations++;

            try {
                const processedData = await this.processor.processForStorage(key, value);
                await this.activeBackend.set(processedData);
                
                // Update cache
                if (cacheConfig.enabled) {
                    this.updateCache(key, value);
                }
                
                // Add decoy entries occasionally
                if (stealthConfig.decoyEntries && Math.random() < 0.05) {
                    await this.addDecoyEntries();
                }
                
                return true;
            } catch (e) {
                console.warn('OblivionFilter: Storage set error:', e);
                return false;
            }
        }

        async remove(key) {
            try {
                const processedKey = stealthConfig.obfuscateKeys ? this.processor.obfuscateKey(key) : key;
                await this.activeBackend.remove(processedKey);
                
                // Remove from cache
                this.cache.delete(key);
                this.cacheTimestamps.delete(key);
                
                return true;
            } catch (e) {
                console.warn('OblivionFilter: Storage remove error:', e);
                return false;
            }
        }

        async clear() {
            try {
                await this.activeBackend.clear();
                this.cache.clear();
                this.cacheTimestamps.clear();
                return true;
            } catch (e) {
                console.warn('OblivionFilter: Storage clear error:', e);
                return false;
            }
        }

        // Raw storage methods (for internal use)
        async getRaw(key) {
            const data = await this.activeBackend.get(key);
            return data[key];
        }

        async setRaw(key, value) {
            return await this.activeBackend.set({ [key]: value });
        }

        // Cache management
        updateCache(key, value) {
            if (this.cache.size >= cacheConfig.maxSize) {
                // Remove oldest entry
                const oldestKey = this.cache.keys().next().value;
                this.cache.delete(oldestKey);
                this.cacheTimestamps.delete(oldestKey);
            }
            
            this.cache.set(key, value);
            this.cacheTimestamps.set(key, Date.now());
        }

        isCacheValid(key) {
            if (!this.cache.has(key)) return false;
            
            const timestamp = this.cacheTimestamps.get(key);
            return (Date.now() - timestamp) < cacheConfig.ttl;
        }

        // Stealth features
        async addDecoyEntries() {
            const decoys = [
                'user-preferences',
                'ui-settings',
                'last-update-check',
                'performance-metrics'
            ];
            
            for (const decoy of decoys) {
                if (Math.random() < 0.3) {
                    const fakeData = this.generateFakeData();
                    await this.setRaw(`decoy-${decoy}`, fakeData);
                }
            }
        }

        generateFakeData() {
            const fakeTypes = [
                { enabled: true, value: Math.random() },
                { timestamp: Date.now(), count: Math.floor(Math.random() * 1000) },
                { settings: { theme: 'dark', language: 'en' } }
            ];
            
            return fakeTypes[Math.floor(Math.random() * fakeTypes.length)];
        }

        // Statistics and diagnostics
        getStats() {
            return {
                backend: this.activeBackend?.name,
                backends: Array.from(this.backends.keys()),
                operations: {
                    reads: readOperations,
                    writes: writeOperations
                },
                cache: {
                    hits: cacheHits,
                    misses: cacheMisses,
                    size: this.cache.size,
                    hitRate: readOperations > 0 ? (cacheHits / readOperations) : 0
                },
                encryption: crypto.enabled,
                compression: stealthConfig.compressData
            };
        }
    };

    /**************************************************************************/

    // Public API
    return {
        StorageManager,
        StorageBackend,
        ExtensionStorageBackend,
        IndexedDBBackend,
        LocalStorageBackend,
        DataProcessor,
        
        // Factory method
        create() {
            return new StorageManager();
        },

        // Configuration
        configure(config) {
            Object.assign(stealthConfig, config);
            Object.assign(cacheConfig, config.cache || {});
            Object.assign(crypto, config.crypto || {});
        },

        getConfig() {
            return { 
                stealth: { ...stealthConfig },
                cache: { ...cacheConfig },
                crypto: { ...crypto }
            };
        }
    };

})();

/******************************************************************************/

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = storageEngine;
} else if (typeof window !== 'undefined') {
    window.storageEngine = storageEngine;
}
