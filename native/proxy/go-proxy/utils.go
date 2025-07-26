package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// FilterRule represents a single filter rule
type FilterRule struct {
	ID          string            `json:"id"`
	Pattern     string            `json:"pattern"`
	Type        string            `json:"type"` // "block", "allow", "redirect", "modify"
	Domain      string            `json:"domain"`
	Path        string            `json:"path"`
	Method      string            `json:"method"`
	Headers     map[string]string `json:"headers"`
	ContentType string            `json:"content_type"`
	Regex       *regexp.Regexp    `json:"-"`
	Priority    int               `json:"priority"`
	Enabled     bool              `json:"enabled"`
	Description string            `json:"description"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// RuleEngine provides advanced rule matching and processing
type RuleEngine struct {
	rules       []*FilterRule
	domainRules map[string][]*FilterRule
	pathRules   map[string][]*FilterRule
	regexRules  []*FilterRule
	cache       map[string]bool
	cacheTTL    time.Duration
	cacheExpiry map[string]time.Time
	mu          sync.RWMutex
}

// NewRuleEngine creates a new rule engine
func NewRuleEngine() *RuleEngine {
	return &RuleEngine{
		rules:       make([]*FilterRule, 0),
		domainRules: make(map[string][]*FilterRule),
		pathRules:   make(map[string][]*FilterRule),
		regexRules:  make([]*FilterRule, 0),
		cache:       make(map[string]bool),
		cacheTTL:    5 * time.Minute,
		cacheExpiry: make(map[string]time.Time),
	}
}

// AddRule adds a new filter rule
func (re *RuleEngine) AddRule(rule *FilterRule) error {
	re.mu.Lock()
	defer re.mu.Unlock()

	// Compile regex if pattern contains regex characters
	if strings.ContainsAny(rule.Pattern, ".*+?^${}()|[]\\") {
		regex, err := regexp.Compile(rule.Pattern)
		if err != nil {
			return fmt.Errorf("invalid regex pattern: %v", err)
		}
		rule.Regex = regex
		re.regexRules = append(re.regexRules, rule)
	}

	// Index by domain
	if rule.Domain != "" {
		re.domainRules[rule.Domain] = append(re.domainRules[rule.Domain], rule)
	}

	// Index by path
	if rule.Path != "" {
		re.pathRules[rule.Path] = append(re.pathRules[rule.Path], rule)
	}

	re.rules = append(re.rules, rule)

	// Clear cache
	re.cache = make(map[string]bool)
	re.cacheExpiry = make(map[string]time.Time)

	return nil
}

// LoadRulesFromFile loads rules from a JSON file
func (re *RuleEngine) LoadRulesFromFile(filename string) error {
	data, err := os.ReadFile(filename)
	if err != nil {
		return err
	}

	var rules []*FilterRule
	if err := json.Unmarshal(data, &rules); err != nil {
		return err
	}

	for _, rule := range rules {
		if err := re.AddRule(rule); err != nil {
			log.Printf("Failed to add rule %s: %v", rule.ID, err)
		}
	}

	return nil
}

// MatchRequest checks if a request matches any rules
func (re *RuleEngine) MatchRequest(req *http.Request) (*FilterRule, bool) {
	re.mu.RLock()
	defer re.mu.RUnlock()

	// Generate cache key
	cacheKey := fmt.Sprintf("%s://%s%s", req.URL.Scheme, req.URL.Host, req.URL.Path)

	// Check cache
	if result, exists := re.cache[cacheKey]; exists {
		if expiry, ok := re.cacheExpiry[cacheKey]; ok && time.Now().Before(expiry) {
			return nil, result
		}
	}

	// Check domain rules first
	if rules, exists := re.domainRules[req.URL.Host]; exists {
		for _, rule := range rules {
			if re.matchRule(rule, req) {
				re.updateCache(cacheKey, true)
				return rule, true
			}
		}
	}

	// Check path rules
	if rules, exists := re.pathRules[req.URL.Path]; exists {
		for _, rule := range rules {
			if re.matchRule(rule, req) {
				re.updateCache(cacheKey, true)
				return rule, true
			}
		}
	}

	// Check regex rules
	for _, rule := range re.regexRules {
		if re.matchRule(rule, req) {
			re.updateCache(cacheKey, true)
			return rule, true
		}
	}

	// Check all other rules
	for _, rule := range re.rules {
		if rule.Domain != "" || rule.Path != "" || rule.Regex != nil {
			continue // Already checked above
		}
		if re.matchRule(rule, req) {
			re.updateCache(cacheKey, true)
			return rule, true
		}
	}

	re.updateCache(cacheKey, false)
	return nil, false
}

// matchRule checks if a single rule matches the request
func (re *RuleEngine) matchRule(rule *FilterRule, req *http.Request) bool {
	if !rule.Enabled {
		return false
	}

	// Check method
	if rule.Method != "" && rule.Method != req.Method {
		return false
	}

	// Check domain
	if rule.Domain != "" && !strings.Contains(req.URL.Host, rule.Domain) {
		return false
	}

	// Check path
	if rule.Path != "" && !strings.Contains(req.URL.Path, rule.Path) {
		return false
	}

	// Check headers
	for key, value := range rule.Headers {
		if req.Header.Get(key) != value {
			return false
		}
	}

	// Check regex pattern
	if rule.Regex != nil {
		url := req.URL.String()
		return rule.Regex.MatchString(url)
	}

	// Check simple pattern
	if rule.Pattern != "" {
		url := req.URL.String()
		return strings.Contains(url, rule.Pattern)
	}

	return false
}

// updateCache updates the rule matching cache
func (re *RuleEngine) updateCache(key string, result bool) {
	re.cache[key] = result
	re.cacheExpiry[key] = time.Now().Add(re.cacheTTL)
}

// ContentProcessor handles content modification and injection
type ContentProcessor struct {
	config          *Config
	cosmeticRules   []string
	scriptletRules  []string
	modificationRules map[string]string
	mu              sync.RWMutex
}

// NewContentProcessor creates a new content processor
func NewContentProcessor(config *Config) *ContentProcessor {
	cp := &ContentProcessor{
		config:            config,
		cosmeticRules:     make([]string, 0),
		scriptletRules:    make([]string, 0),
		modificationRules: make(map[string]string),
	}

	cp.loadCosmeticRules()
	return cp
}

// loadCosmeticRules loads cosmetic filtering rules
func (cp *ContentProcessor) loadCosmeticRules() {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	// Default cosmetic rules
	cp.cosmeticRules = []string{
		".advertisement",
		".ad-banner",
		".ad-container",
		"[id*=\"ad\"]",
		"[class*=\"ad\"]",
		"[id*=\"banner\"]",
		"[class*=\"banner\"]",
		"#ads",
		".ads",
		".adsystem",
		".adnxs",
		".googlesyndication",
		".doubleclick",
		".googletagmanager",
		".facebook-tracking",
		".twitter-tracking",
		".analytics",
	}

	// Default scriptlet rules
	cp.scriptletRules = []string{
		"window.google_tag_manager = undefined;",
		"window.ga = function(){};",
		"window.gtag = function(){};",
		"window._gaq = [];",
		"window.GoogleAnalyticsObject = undefined;",
		"window.fbq = function(){};",
		"window._fbq = function(){};",
		"window.twq = function(){};",
		"console.log('[OblivionFilter] Blocked tracking script');",
	}
}

// ProcessHTML processes HTML content and applies cosmetic filtering
func (cp *ContentProcessor) ProcessHTML(content []byte, url string) []byte {
	if !cp.config.FilteringEnabled {
		return content
	}

	html := string(content)

	// Inject cosmetic CSS
	cosmeticCSS := cp.generateCosmeticCSS()
	if cosmeticCSS != "" {
		styleTag := fmt.Sprintf(`<style type="text/css">%s</style>`, cosmeticCSS)
		
		// Try to insert before closing head tag
		if strings.Contains(html, "</head>") {
			html = strings.Replace(html, "</head>", styleTag+"</head>", 1)
		} else {
			// Insert at the beginning of body
			html = strings.Replace(html, "<body", styleTag+"<body", 1)
		}
	}

	// Inject anti-tracking scripts
	scriptletJS := cp.generateScriptletJS()
	if scriptletJS != "" {
		scriptTag := fmt.Sprintf(`<script type="text/javascript">%s</script>`, scriptletJS)
		
		// Insert before closing body tag
		if strings.Contains(html, "</body>") {
			html = strings.Replace(html, "</body>", scriptTag+"</body>", 1)
		} else {
			html += scriptTag
		}
	}

	return []byte(html)
}

// generateCosmeticCSS generates CSS rules for hiding elements
func (cp *ContentProcessor) generateCosmeticCSS() string {
	cp.mu.RLock()
	defer cp.mu.RUnlock()

	if len(cp.cosmeticRules) == 0 {
		return ""
	}

	var cssRules []string
	for _, rule := range cp.cosmeticRules {
		cssRules = append(cssRules, fmt.Sprintf("%s { display: none !important; }", rule))
	}

	return strings.Join(cssRules, "\n")
}

// generateScriptletJS generates JavaScript for blocking tracking
func (cp *ContentProcessor) generateScriptletJS() string {
	cp.mu.RLock()
	defer cp.mu.RUnlock()

	if len(cp.scriptletRules) == 0 {
		return ""
	}

	return strings.Join(cp.scriptletRules, "\n")
}

// NetworkMonitor tracks network performance and connection health
type NetworkMonitor struct {
	connections     map[string]*ConnectionInfo
	bandwidth       *BandwidthMonitor
	latency         *LatencyMonitor
	errorRates      map[string]float64
	healthThreshold float64
	mu              sync.RWMutex
}

// ConnectionInfo stores information about a network connection
type ConnectionInfo struct {
	ID           string
	RemoteAddr   string
	StartTime    time.Time
	LastActivity time.Time
	BytesSent    int64
	BytesReceived int64
	ErrorCount   int
	RequestCount int
	Status       string
}

// BandwidthMonitor tracks bandwidth usage
type BandwidthMonitor struct {
	totalBytes     int64
	bytesPerSecond []int64
	windowSize     int
	currentIndex   int
	mu             sync.RWMutex
}

// LatencyMonitor tracks response latencies
type LatencyMonitor struct {
	samples    []time.Duration
	windowSize int
	mu         sync.RWMutex
}

// NewNetworkMonitor creates a new network monitor
func NewNetworkMonitor() *NetworkMonitor {
	return &NetworkMonitor{
		connections:     make(map[string]*ConnectionInfo),
		bandwidth:       NewBandwidthMonitor(60), // 60-second window
		latency:         NewLatencyMonitor(100),  // 100 samples
		errorRates:      make(map[string]float64),
		healthThreshold: 0.95, // 95% success rate
	}
}

// NewBandwidthMonitor creates a new bandwidth monitor
func NewBandwidthMonitor(windowSize int) *BandwidthMonitor {
	return &BandwidthMonitor{
		bytesPerSecond: make([]int64, windowSize),
		windowSize:     windowSize,
	}
}

// NewLatencyMonitor creates a new latency monitor
func NewLatencyMonitor(windowSize int) *LatencyMonitor {
	return &LatencyMonitor{
		samples:    make([]time.Duration, 0, windowSize),
		windowSize: windowSize,
	}
}

// TrackConnection adds a new connection to monitor
func (nm *NetworkMonitor) TrackConnection(id, remoteAddr string) {
	nm.mu.Lock()
	defer nm.mu.Unlock()

	nm.connections[id] = &ConnectionInfo{
		ID:           id,
		RemoteAddr:   remoteAddr,
		StartTime:    time.Now(),
		LastActivity: time.Now(),
		Status:       "active",
	}
}

// UpdateConnection updates connection statistics
func (nm *NetworkMonitor) UpdateConnection(id string, bytesSent, bytesReceived int64, hasError bool) {
	nm.mu.Lock()
	defer nm.mu.Unlock()

	if conn, exists := nm.connections[id]; exists {
		conn.LastActivity = time.Now()
		conn.BytesSent += bytesSent
		conn.BytesReceived += bytesReceived
		conn.RequestCount++

		if hasError {
			conn.ErrorCount++
		}

		// Update bandwidth monitor
		nm.bandwidth.RecordBytes(bytesSent + bytesReceived)
	}
}

// RecordLatency records a response latency
func (nm *NetworkMonitor) RecordLatency(duration time.Duration) {
	nm.latency.AddSample(duration)
}

// GetConnectionHealth returns the health status of connections
func (nm *NetworkMonitor) GetConnectionHealth() map[string]float64 {
	nm.mu.RLock()
	defer nm.mu.RUnlock()

	health := make(map[string]float64)

	for id, conn := range nm.connections {
		if conn.RequestCount > 0 {
			successRate := float64(conn.RequestCount-conn.ErrorCount) / float64(conn.RequestCount)
			health[id] = successRate
		}
	}

	return health
}

// RecordBytes records bandwidth usage
func (bm *BandwidthMonitor) RecordBytes(bytes int64) {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	bm.totalBytes += bytes
	bm.bytesPerSecond[bm.currentIndex] += bytes
}

// GetCurrentBandwidth returns current bandwidth usage
func (bm *BandwidthMonitor) GetCurrentBandwidth() int64 {
	bm.mu.RLock()
	defer bm.mu.RUnlock()

	var total int64
	for _, bytes := range bm.bytesPerSecond {
		total += bytes
	}

	return total / int64(bm.windowSize)
}

// AddSample adds a latency sample
func (lm *LatencyMonitor) AddSample(duration time.Duration) {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	if len(lm.samples) >= lm.windowSize {
		// Remove oldest sample
		lm.samples = lm.samples[1:]
	}

	lm.samples = append(lm.samples, duration)
}

// GetAverageLatency returns average latency
func (lm *LatencyMonitor) GetAverageLatency() time.Duration {
	lm.mu.RLock()
	defer lm.mu.RUnlock()

	if len(lm.samples) == 0 {
		return 0
	}

	var total time.Duration
	for _, sample := range lm.samples {
		total += sample
	}

	return total / time.Duration(len(lm.samples))
}

// SecurityManager handles security-related features
type SecurityManager struct {
	config              *Config
	blockedIPs          map[string]time.Time
	suspiciousPatterns  []*regexp.Regexp
	malwareSignatures   []string
	securityHeaders     map[string]string
	csrfTokens          map[string]string
	rateLimitExceeded   map[string]int
	intrusion_detection bool
	mu                  sync.RWMutex
}

// NewSecurityManager creates a new security manager
func NewSecurityManager(config *Config) *SecurityManager {
	sm := &SecurityManager{
		config:              config,
		blockedIPs:          make(map[string]time.Time),
		suspiciousPatterns:  make([]*regexp.Regexp, 0),
		malwareSignatures:   make([]string, 0),
		securityHeaders:     make(map[string]string),
		csrfTokens:          make(map[string]string),
		rateLimitExceeded:   make(map[string]int),
		intrusion_detection: true,
	}

	sm.initializeSecurityFeatures()
	return sm
}

// initializeSecurityFeatures sets up security patterns and headers
func (sm *SecurityManager) initializeSecurityFeatures() {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Suspicious patterns
	patterns := []string{
		`(?i)(<script.*?>.*?</script>)`,                    // XSS attempts
		`(?i)(javascript:)`,                                // JavaScript protocol
		`(?i)(vbscript:)`,                                  // VBScript protocol
		`(?i)(on\w+\s*=)`,                                  // Event handlers
		`(?i)(union.*select)`,                              // SQL injection
		`(?i)(drop\s+table)`,                               // SQL injection
		`(?i)(exec\s*\()`,                                  // Command injection
		`(?i)(\.\./)`,                                      // Directory traversal
		`(?i)(\.\.\\)`,                                     // Directory traversal
		`(?i)(\|.*?(cat|ls|dir|type|echo|ping|curl|wget))`, // Command injection
	}

	for _, pattern := range patterns {
		if regex, err := regexp.Compile(pattern); err == nil {
			sm.suspiciousPatterns = append(sm.suspiciousPatterns, regex)
		}
	}

	// Security headers
	sm.securityHeaders = map[string]string{
		"X-Content-Type-Options":    "nosniff",
		"X-Frame-Options":           "DENY",
		"X-XSS-Protection":          "1; mode=block",
		"Referrer-Policy":           "strict-origin-when-cross-origin",
		"Permissions-Policy":        "geolocation=(), microphone=(), camera=()",
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
	}

	// Malware signatures (simplified)
	sm.malwareSignatures = []string{
		"eval(base64_decode(",
		"eval(gzinflate(",
		"system($_GET",
		"system($_POST",
		"exec($_GET",
		"exec($_POST",
		"shell_exec($_GET",
		"shell_exec($_POST",
		"passthru($_GET",
		"passthru($_POST",
	}
}

// ValidateRequest checks if a request is secure
func (sm *SecurityManager) ValidateRequest(req *http.Request) error {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	// Check if IP is blocked
	clientIP := sm.getClientIP(req)
	if blockTime, blocked := sm.blockedIPs[clientIP]; blocked {
		if time.Now().Before(blockTime.Add(24 * time.Hour)) {
			return fmt.Errorf("IP address is blocked: %s", clientIP)
		}
		// Remove expired blocks
		delete(sm.blockedIPs, clientIP)
	}

	// Check for suspicious patterns in URL
	url := req.URL.String()
	for _, pattern := range sm.suspiciousPatterns {
		if pattern.MatchString(url) {
			sm.blockIP(clientIP)
			return fmt.Errorf("suspicious pattern detected in URL")
		}
	}

	// Check headers for suspicious content
	for key, values := range req.Header {
		for _, value := range values {
			for _, pattern := range sm.suspiciousPatterns {
				if pattern.MatchString(value) {
					sm.blockIP(clientIP)
					return fmt.Errorf("suspicious pattern detected in header %s", key)
				}
			}
		}
	}

	// Check request body for malware signatures (if applicable)
	if req.Method == "POST" && req.Body != nil {
		bodyBytes, err := io.ReadAll(req.Body)
		if err == nil {
			req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			bodyStr := string(bodyBytes)

			for _, signature := range sm.malwareSignatures {
				if strings.Contains(bodyStr, signature) {
					sm.blockIP(clientIP)
					return fmt.Errorf("malware signature detected")
				}
			}
		}
	}

	return nil
}

// AddSecurityHeaders adds security headers to response
func (sm *SecurityManager) AddSecurityHeaders(w http.ResponseWriter) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	for key, value := range sm.securityHeaders {
		w.Header().Set(key, value)
	}
}

// blockIP blocks an IP address
func (sm *SecurityManager) blockIP(ip string) {
	sm.blockedIPs[ip] = time.Now()
}

// getClientIP extracts client IP from request
func (sm *SecurityManager) getClientIP(req *http.Request) string {
	// Check X-Forwarded-For header
	if xff := req.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.Split(xff, ",")[0]
	}

	// Check X-Real-IP header
	if xri := req.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Use remote address
	host, _, _ := net.SplitHostPort(req.RemoteAddr)
	return host
}

// CacheManager handles response caching
type CacheManager struct {
	cache    map[string]*CacheEntry
	maxSize  int64
	currentSize int64
	ttl      time.Duration
	mu       sync.RWMutex
}

// CacheEntry represents a cached response
type CacheEntry struct {
	Key        string
	Data       []byte
	Headers    http.Header
	StatusCode int
	CreatedAt  time.Time
	AccessedAt time.Time
	Size       int64
}

// NewCacheManager creates a new cache manager
func NewCacheManager(maxSize int64, ttl time.Duration) *CacheManager {
	cm := &CacheManager{
		cache:   make(map[string]*CacheEntry),
		maxSize: maxSize,
		ttl:     ttl,
	}

	// Start cleanup goroutine
	go cm.cleanup()

	return cm
}

// Get retrieves a cached response
func (cm *CacheManager) Get(key string) (*CacheEntry, bool) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	entry, exists := cm.cache[key]
	if !exists {
		return nil, false
	}

	// Check if expired
	if time.Now().After(entry.CreatedAt.Add(cm.ttl)) {
		return nil, false
	}

	entry.AccessedAt = time.Now()
	return entry, true
}

// Set stores a response in cache
func (cm *CacheManager) Set(key string, data []byte, headers http.Header, statusCode int) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	size := int64(len(data))

	// Check if we need to make space
	for cm.currentSize+size > cm.maxSize && len(cm.cache) > 0 {
		cm.evictLRU()
	}

	entry := &CacheEntry{
		Key:        key,
		Data:       data,
		Headers:    headers,
		StatusCode: statusCode,
		CreatedAt:  time.Now(),
		AccessedAt: time.Now(),
		Size:       size,
	}

	cm.cache[key] = entry
	cm.currentSize += size
}

// evictLRU removes the least recently used entry
func (cm *CacheManager) evictLRU() {
	var oldestKey string
	var oldestTime time.Time

	for key, entry := range cm.cache {
		if oldestKey == "" || entry.AccessedAt.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.AccessedAt
		}
	}

	if oldestKey != "" {
		entry := cm.cache[oldestKey]
		cm.currentSize -= entry.Size
		delete(cm.cache, oldestKey)
	}
}

// cleanup removes expired entries
func (cm *CacheManager) cleanup() {
	ticker := time.NewTicker(cm.ttl / 2)
	defer ticker.Stop()

	for range ticker.C {
		cm.mu.Lock()
		now := time.Now()

		for key, entry := range cm.cache {
			if now.After(entry.CreatedAt.Add(cm.ttl)) {
				cm.currentSize -= entry.Size
				delete(cm.cache, key)
			}
		}
		cm.mu.Unlock()
	}
}

// GenerateRandomString generates a random string for tokens
func GenerateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	bytes := make([]byte, length)
	rand.Read(bytes)
	for i, b := range bytes {
		bytes[i] = charset[b%byte(len(charset))]
	}
	return string(bytes)
}

// EncodeBasicAuth properly encodes basic authentication
func EncodeBasicAuth(username, password string) string {
	auth := username + ":" + password
	return base64.StdEncoding.EncodeToString([]byte(auth))
}

// ParseBasicAuth parses basic authentication header
func ParseBasicAuth(auth string) (username, password string, ok bool) {
	const prefix = "Basic "
	if !strings.HasPrefix(auth, prefix) {
		return "", "", false
	}

	decoded, err := base64.StdEncoding.DecodeString(auth[len(prefix):])
	if err != nil {
		return "", "", false
	}

	s := string(decoded)
	if i := strings.IndexByte(s, ':'); i >= 0 {
		return s[:i], s[i+1:], true
	}

	return "", "", false
}

// IsValidDomain checks if a domain name is valid
func IsValidDomain(domain string) bool {
	if len(domain) == 0 || len(domain) > 253 {
		return false
	}

	labels := strings.Split(domain, ".")
	for _, label := range labels {
		if len(label) == 0 || len(label) > 63 {
			return false
		}
		if !regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$`).MatchString(label) {
			return false
		}
	}

	return true
}

// IsPrivateIP checks if an IP address is private
func IsPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}

	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
	}

	for _, cidr := range privateRanges {
		_, network, _ := net.ParseCIDR(cidr)
		if network.Contains(ip) {
			return true
		}
	}

	return false
}

// FormatBytes formats byte count in human readable format
func FormatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}

	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}

	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

// FormatDuration formats duration in human readable format
func FormatDuration(d time.Duration) string {
	if d < time.Microsecond {
		return fmt.Sprintf("%.1fns", float64(d.Nanoseconds()))
	} else if d < time.Millisecond {
		return fmt.Sprintf("%.1fμs", float64(d.Nanoseconds())/1000)
	} else if d < time.Second {
		return fmt.Sprintf("%.1fms", float64(d.Nanoseconds())/1000000)
	} else if d < time.Minute {
		return fmt.Sprintf("%.1fs", d.Seconds())
	} else if d < time.Hour {
		return fmt.Sprintf("%.1fm", d.Minutes())
	}
	return fmt.Sprintf("%.1fh", d.Hours())
}

// CreateTLSConfig creates a TLS configuration
func CreateTLSConfig(certFile, keyFile string) (*tls.Config, error) {
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return nil, err
	}

	return &tls.Config{
		Certificates: []tls.Certificate{cert},
		NextProtos:   []string{"h2", "http/1.1"},
		MinVersion:   tls.VersionTLS12,
		CipherSuites: []uint16{
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		},
	}, nil
}

// LogRequest logs HTTP request details
func LogRequest(logger *Logger, req *http.Request, statusCode int, responseSize int64, duration time.Duration) {
	clientIP := req.Header.Get("X-Forwarded-For")
	if clientIP == "" {
		clientIP = req.RemoteAddr
	}

	logger.Access("%s - \"%s %s %s\" %d %s %v \"%s\" \"%s\"",
		clientIP,
		req.Method,
		req.URL.Path,
		req.Proto,
		statusCode,
		FormatBytes(responseSize),
		FormatDuration(duration),
		req.Referer(),
		req.UserAgent(),
	)
}
