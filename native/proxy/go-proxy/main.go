/*******************************************************************************

    OblivionFilter - Standalone Go Proxy Server v2.0.0
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
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    Home: https://github.com/734ai/OblivionFilter

*******************************************************************************/

package main

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Configuration for the proxy server
type ProxyConfig struct {
	// Server configuration
	ListenAddr     string `json:"listen_addr"`
	ListenPort     int    `json:"listen_port"`
	TLSEnabled     bool   `json:"tls_enabled"`
	CertFile       string `json:"cert_file"`
	KeyFile        string `json:"key_file"`
	
	// Proxy configuration
	ProxyMode      string `json:"proxy_mode"` // http, https, socks4, socks5, transparent
	UpstreamProxy  string `json:"upstream_proxy"`
	AuthRequired   bool   `json:"auth_required"`
	Username       string `json:"username"`
	Password       string `json:"password"`
	
	// Filtering configuration
	FilteringEnabled    bool     `json:"filtering_enabled"`
	FilterRules        []string `json:"filter_rules"`
	WhitelistDomains   []string `json:"whitelist_domains"`
	BlacklistDomains   []string `json:"blacklist_domains"`
	
	// Stealth configuration
	StealthMode        bool   `json:"stealth_mode"`
	UserAgentRotation  bool   `json:"user_agent_rotation"`
	HeaderObfuscation  bool   `json:"header_obfuscation"`
	TimingRandomization bool  `json:"timing_randomization"`
	
	// Performance configuration
	MaxConnections     int           `json:"max_connections"`
	ReadTimeout        time.Duration `json:"read_timeout"`
	WriteTimeout       time.Duration `json:"write_timeout"`
	IdleTimeout        time.Duration `json:"idle_timeout"`
	BufferSize         int           `json:"buffer_size"`
	
	// Logging configuration
	LogLevel           string `json:"log_level"`
	LogFile            string `json:"log_file"`
	AccessLogEnabled   bool   `json:"access_log_enabled"`
	ErrorLogEnabled    bool   `json:"error_log_enabled"`
}

// Default configuration
func DefaultConfig() *ProxyConfig {
	return &ProxyConfig{
		ListenAddr:          "127.0.0.1",
		ListenPort:          8080,
		TLSEnabled:          false,
		ProxyMode:           "http",
		FilteringEnabled:    true,
		StealthMode:         true,
		UserAgentRotation:   true,
		HeaderObfuscation:   true,
		TimingRandomization: true,
		MaxConnections:      1000,
		ReadTimeout:         30 * time.Second,
		WriteTimeout:        30 * time.Second,
		IdleTimeout:         60 * time.Second,
		BufferSize:          32768,
		LogLevel:            "info",
		AccessLogEnabled:    true,
		ErrorLogEnabled:     true,
		FilterRules: []string{
			"||doubleclick.net^",
			"||googlesyndication.com^",
			"||googletagmanager.com^",
			"||facebook.com/tr*",
			"||google-analytics.com^",
			"##.advertisement",
			"##.ad-banner",
			"##[id*=\"ad\"]",
		},
	}
}

// Filter engine for request/response filtering
type FilterEngine struct {
	rules           []FilterRule
	compiledRules   []*regexp.Regexp
	whitelistDomains map[string]bool
	blacklistDomains map[string]bool
	mutex           sync.RWMutex
}

// Filter rule types
type FilterRule struct {
	Type    string `json:"type"`    // block, allow, modify
	Pattern string `json:"pattern"` // URL pattern or CSS selector
	Action  string `json:"action"`  // block, redirect, remove, etc.
	Target  string `json:"target"`  // url, header, body, etc.
}

// Stealth engine for anti-detection
type StealthEngine struct {
	userAgents      []string
	headerProfiles  []map[string]string
	timingVariation time.Duration
	mutex           sync.RWMutex
}

// Connection pool for upstream connections
type ConnectionPool struct {
	connections map[string][]*http.Client
	maxIdle     int
	maxPerHost  int
	mutex       sync.Mutex
}

// Statistics and metrics
type ProxyStats struct {
	TotalRequests     int64     `json:"total_requests"`
	BlockedRequests   int64     `json:"blocked_requests"`
	ModifiedRequests  int64     `json:"modified_requests"`
	BytesTransferred  int64     `json:"bytes_transferred"`
	ActiveConnections int32     `json:"active_connections"`
	Uptime           time.Duration `json:"uptime"`
	StartTime        time.Time     `json:"start_time"`
	mutex            sync.RWMutex
}

// Main proxy server structure
type ProxyServer struct {
	config        *ProxyConfig
	filterEngine  *FilterEngine
	stealthEngine *StealthEngine
	connPool      *ConnectionPool
	stats         *ProxyStats
	server        *http.Server
	listener      net.Listener
	ctx           context.Context
	cancel        context.CancelFunc
	wg            sync.WaitGroup
}

// Initialize a new proxy server
func NewProxyServer(config *ProxyConfig) *ProxyServer {
	ctx, cancel := context.WithCancel(context.Background())
	
	server := &ProxyServer{
		config:        config,
		filterEngine:  NewFilterEngine(config),
		stealthEngine: NewStealthEngine(),
		connPool:      NewConnectionPool(),
		stats:         &ProxyStats{StartTime: time.Now()},
		ctx:           ctx,
		cancel:        cancel,
	}
	
	return server
}

// Initialize filter engine
func NewFilterEngine(config *ProxyConfig) *FilterEngine {
	engine := &FilterEngine{
		whitelistDomains: make(map[string]bool),
		blacklistDomains: make(map[string]bool),
	}
	
	// Parse filter rules
	for _, rule := range config.FilterRules {
		engine.AddRule(rule)
	}
	
	// Setup domain lists
	for _, domain := range config.WhitelistDomains {
		engine.whitelistDomains[domain] = true
	}
	
	for _, domain := range config.BlacklistDomains {
		engine.blacklistDomains[domain] = true
	}
	
	return engine
}

// Add filter rule
func (fe *FilterEngine) AddRule(ruleStr string) {
	fe.mutex.Lock()
	defer fe.mutex.Unlock()
	
	var rule FilterRule
	
	if strings.HasPrefix(ruleStr, "||") && strings.HasSuffix(ruleStr, "^") {
		// Network block rule: ||example.com^
		domain := strings.TrimPrefix(strings.TrimSuffix(ruleStr, "^"), "||")
		rule = FilterRule{
			Type:    "block",
			Pattern: domain,
			Action:  "block",
			Target:  "url",
		}
		
		// Compile regex for domain matching
		pattern := regexp.QuoteMeta(domain)
		pattern = strings.ReplaceAll(pattern, "\\*", ".*")
		compiled, err := regexp.Compile(pattern)
		if err == nil {
			fe.compiledRules = append(fe.compiledRules, compiled)
		}
	} else if strings.HasPrefix(ruleStr, "##") {
		// Cosmetic rule: ##.class or ##[attribute]
		selector := strings.TrimPrefix(ruleStr, "##")
		rule = FilterRule{
			Type:    "cosmetic",
			Pattern: selector,
			Action:  "remove",
			Target:  "body",
		}
	} else if strings.Contains(ruleStr, "*") {
		// Wildcard rule
		rule = FilterRule{
			Type:    "block",
			Pattern: ruleStr,
			Action:  "block",
			Target:  "url",
		}
		
		// Compile regex for wildcard matching
		pattern := regexp.QuoteMeta(ruleStr)
		pattern = strings.ReplaceAll(pattern, "\\*", ".*")
		compiled, err := regexp.Compile(pattern)
		if err == nil {
			fe.compiledRules = append(fe.compiledRules, compiled)
		}
	}
	
	fe.rules = append(fe.rules, rule)
}

// Check if request should be blocked
func (fe *FilterEngine) ShouldBlock(req *http.Request) bool {
	fe.mutex.RLock()
	defer fe.mutex.RUnlock()
	
	url := req.URL.String()
	host := req.URL.Host
	
	// Check whitelist first
	if fe.whitelistDomains[host] {
		return false
	}
	
	// Check blacklist
	if fe.blacklistDomains[host] {
		return true
	}
	
	// Check compiled rules
	for _, compiled := range fe.compiledRules {
		if compiled.MatchString(url) || compiled.MatchString(host) {
			return true
		}
	}
	
	return false
}

// Initialize stealth engine
func NewStealthEngine() *StealthEngine {
	return &StealthEngine{
		userAgents: []string{
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0",
		},
		headerProfiles: []map[string]string{
			{
				"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate, br",
				"DNT":             "1",
				"Connection":      "keep-alive",
				"Upgrade-Insecure-Requests": "1",
			},
			{
				"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9",
				"Accept-Encoding": "gzip, deflate",
				"Connection":      "keep-alive",
			},
		},
		timingVariation: 500 * time.Millisecond,
	}
}

// Apply stealth modifications to request
func (se *StealthEngine) ModifyRequest(req *http.Request) {
	se.mutex.RLock()
	defer se.mutex.RUnlock()
	
	// Rotate User-Agent
	if len(se.userAgents) > 0 {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(se.userAgents))))
		req.Header.Set("User-Agent", se.userAgents[n.Int64()])
	}
	
	// Apply header profile
	if len(se.headerProfiles) > 0 {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(se.headerProfiles))))
		profile := se.headerProfiles[n.Int64()]
		
		for key, value := range profile {
			if req.Header.Get(key) == "" {
				req.Header.Set(key, value)
			}
		}
	}
	
	// Remove identifying headers
	req.Header.Del("X-Forwarded-For")
	req.Header.Del("X-Real-IP")
	req.Header.Del("X-Requested-With")
	
	// Add timing randomization
	if se.timingVariation > 0 {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(se.timingVariation)))
		time.Sleep(time.Duration(n.Int64()))
	}
}

// Initialize connection pool
func NewConnectionPool() *ConnectionPool {
	return &ConnectionPool{
		connections: make(map[string][]*http.Client),
		maxIdle:     100,
		maxPerHost:  10,
	}
}

// Get connection from pool
func (cp *ConnectionPool) GetClient(host string) *http.Client {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()
	
	clients := cp.connections[host]
	if len(clients) > 0 {
		client := clients[len(clients)-1]
		cp.connections[host] = clients[:len(clients)-1]
		return client
	}
	
	// Create new client
	return &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: false,
			},
			MaxIdleConns:       100,
			IdleConnTimeout:    90 * time.Second,
			DisableCompression: false,
		},
	}
}

// Return connection to pool
func (cp *ConnectionPool) ReturnClient(host string, client *http.Client) {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()
	
	clients := cp.connections[host]
	if len(clients) < cp.maxPerHost {
		cp.connections[host] = append(clients, client)
	}
}

// Start the proxy server
func (ps *ProxyServer) Start() error {
	addr := fmt.Sprintf("%s:%d", ps.config.ListenAddr, ps.config.ListenPort)
	
	// Create HTTP server
	ps.server = &http.Server{
		Addr:         addr,
		Handler:      ps,
		ReadTimeout:  ps.config.ReadTimeout,
		WriteTimeout: ps.config.WriteTimeout,
		IdleTimeout:  ps.config.IdleTimeout,
	}
	
	// Create listener
	var err error
	ps.listener, err = net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to create listener: %v", err)
	}
	
	log.Printf("OblivionFilter Proxy Server starting on %s", addr)
	log.Printf("Proxy mode: %s", ps.config.ProxyMode)
	log.Printf("Filtering enabled: %v", ps.config.FilteringEnabled)
	log.Printf("Stealth mode: %v", ps.config.StealthMode)
	
	// Start server
	ps.wg.Add(1)
	go func() {
		defer ps.wg.Done()
		
		if ps.config.TLSEnabled {
			err = ps.server.ServeTLS(ps.listener, ps.config.CertFile, ps.config.KeyFile)
		} else {
			err = ps.server.Serve(ps.listener)
		}
		
		if err != nil && err != http.ErrServerClosed {
			log.Printf("Server error: %v", err)
		}
	}()
	
	return nil
}

// Stop the proxy server
func (ps *ProxyServer) Stop() error {
	log.Println("Stopping OblivionFilter Proxy Server...")
	
	ps.cancel()
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	if err := ps.server.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
		return err
	}
	
	ps.wg.Wait()
	log.Println("OblivionFilter Proxy Server stopped")
	
	return nil
}

// HTTP handler for proxy requests
func (ps *ProxyServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ps.stats.mutex.Lock()
	ps.stats.TotalRequests++
	ps.stats.mutex.Unlock()
	
	// Handle different proxy modes
	switch ps.config.ProxyMode {
	case "http", "https":
		ps.handleHTTPProxy(w, r)
	case "socks4", "socks5":
		ps.handleSOCKSProxy(w, r)
	case "transparent":
		ps.handleTransparentProxy(w, r)
	default:
		ps.handleHTTPProxy(w, r)
	}
}

// Handle HTTP/HTTPS proxy requests
func (ps *ProxyServer) handleHTTPProxy(w http.ResponseWriter, r *http.Request) {
	// Check authentication
	if ps.config.AuthRequired {
		if !ps.checkAuth(r) {
			w.Header().Set("Proxy-Authenticate", "Basic realm=\"OblivionFilter Proxy\"")
			http.Error(w, "Proxy Authentication Required", http.StatusProxyAuthRequired)
			return
		}
	}
	
	// Apply filtering
	if ps.config.FilteringEnabled && ps.filterEngine.ShouldBlock(r) {
		ps.stats.mutex.Lock()
		ps.stats.BlockedRequests++
		ps.stats.mutex.Unlock()
		
		ps.sendBlockedResponse(w, r)
		return
	}
	
	// Handle CONNECT method for HTTPS
	if r.Method == "CONNECT" {
		ps.handleConnect(w, r)
		return
	}
	
	// Apply stealth modifications
	if ps.config.StealthMode {
		ps.stealthEngine.ModifyRequest(r)
	}
	
	// Forward request
	ps.forwardRequest(w, r)
}

// Handle CONNECT method for HTTPS tunneling
func (ps *ProxyServer) handleConnect(w http.ResponseWriter, r *http.Request) {
	// Extract host and port
	host := r.URL.Host
	if !strings.Contains(host, ":") {
		host = host + ":443"
	}
	
	// Create connection to target
	targetConn, err := net.DialTimeout("tcp", host, 10*time.Second)
	if err != nil {
		http.Error(w, "Cannot reach destination server", http.StatusBadGateway)
		return
	}
	defer targetConn.Close()
	
	// Send 200 Connection Established
	w.WriteHeader(http.StatusOK)
	
	// Hijack the connection
	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "Hijacking not supported", http.StatusInternalServerError)
		return
	}
	
	clientConn, _, err := hijacker.Hijack()
	if err != nil {
		http.Error(w, "Hijacking failed", http.StatusInternalServerError)
		return
	}
	defer clientConn.Close()
	
	// Start bidirectional copy
	ps.wg.Add(2)
	go func() {
		defer ps.wg.Done()
		io.Copy(targetConn, clientConn)
	}()
	go func() {
		defer ps.wg.Done()
		io.Copy(clientConn, targetConn)
	}()
}

// Forward HTTP request
func (ps *ProxyServer) forwardRequest(w http.ResponseWriter, r *http.Request) {
	// Create new request
	reqURL := r.URL
	if reqURL.Scheme == "" {
		reqURL.Scheme = "http"
	}
	if reqURL.Host == "" {
		reqURL.Host = r.Host
	}
	
	outReq, err := http.NewRequest(r.Method, reqURL.String(), r.Body)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	
	// Copy headers
	for key, values := range r.Header {
		for _, value := range values {
			outReq.Header.Add(key, value)
		}
	}
	
	// Remove hop-by-hop headers
	ps.removeHopByHopHeaders(outReq.Header)
	
	// Get client from pool
	client := ps.connPool.GetClient(reqURL.Host)
	defer ps.connPool.ReturnClient(reqURL.Host, client)
	
	// Send request
	resp, err := client.Do(outReq)
	if err != nil {
		http.Error(w, "Cannot reach destination server", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	
	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	
	// Set status code
	w.WriteHeader(resp.StatusCode)
	
	// Copy response body with filtering
	if ps.config.FilteringEnabled && ps.isHTMLContent(resp) {
		ps.filterResponseBody(w, resp, r)
	} else {
		// Direct copy
		written, _ := io.Copy(w, resp.Body)
		ps.stats.mutex.Lock()
		ps.stats.BytesTransferred += written
		ps.stats.mutex.Unlock()
	}
}

// Filter response body for cosmetic filtering
func (ps *ProxyServer) filterResponseBody(w http.ResponseWriter, resp *http.Response, req *http.Request) {
	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Error reading response", http.StatusInternalServerError)
		return
	}
	
	// Decompress if needed
	if resp.Header.Get("Content-Encoding") == "gzip" {
		reader, err := gzip.NewReader(bytes.NewReader(body))
		if err == nil {
			decompressed, err := io.ReadAll(reader)
			if err == nil {
				body = decompressed
			}
			reader.Close()
		}
	}
	
	// Apply cosmetic filters
	bodyStr := string(body)
	modified := false
	
	ps.filterEngine.mutex.RLock()
	for _, rule := range ps.filterEngine.rules {
		if rule.Type == "cosmetic" && rule.Target == "body" {
			// Simple CSS selector removal (simplified implementation)
			if strings.Contains(rule.Pattern, ".") {
				// Class selector
				className := strings.TrimPrefix(rule.Pattern, ".")
				pattern := fmt.Sprintf(`<[^>]*class="[^"]*%s[^"]*"[^>]*>.*?</[^>]*>`, regexp.QuoteMeta(className))
				re := regexp.MustCompile(pattern)
				if re.MatchString(bodyStr) {
					bodyStr = re.ReplaceAllString(bodyStr, "")
					modified = true
				}
			} else if strings.Contains(rule.Pattern, "[") {
				// Attribute selector (simplified)
				pattern := `<[^>]*` + regexp.QuoteMeta(rule.Pattern[1:len(rule.Pattern)-1]) + `[^>]*>.*?</[^>]*>`
				re := regexp.MustCompile(pattern)
				if re.MatchString(bodyStr) {
					bodyStr = re.ReplaceAllString(bodyStr, "")
					modified = true
				}
			}
		}
	}
	ps.filterEngine.mutex.RUnlock()
	
	if modified {
		ps.stats.mutex.Lock()
		ps.stats.ModifiedRequests++
		ps.stats.mutex.Unlock()
		
		// Update content length
		w.Header().Set("Content-Length", strconv.Itoa(len(bodyStr)))
		w.Header().Del("Content-Encoding") // Remove compression header
	}
	
	// Write response
	written, _ := w.Write([]byte(bodyStr))
	ps.stats.mutex.Lock()
	ps.stats.BytesTransferred += int64(written)
	ps.stats.mutex.Unlock()
}

// Check if response is HTML content
func (ps *ProxyServer) isHTMLContent(resp *http.Response) bool {
	contentType := resp.Header.Get("Content-Type")
	return strings.Contains(contentType, "text/html") || strings.Contains(contentType, "application/xhtml")
}

// Remove hop-by-hop headers
func (ps *ProxyServer) removeHopByHopHeaders(header http.Header) {
	hopHeaders := []string{
		"Connection",
		"Keep-Alive",
		"Proxy-Authenticate",
		"Proxy-Authorization",
		"Te",
		"Trailers",
		"Transfer-Encoding",
		"Upgrade",
	}
	
	for _, h := range hopHeaders {
		header.Del(h)
	}
}

// Check proxy authentication
func (ps *ProxyServer) checkAuth(r *http.Request) bool {
	auth := r.Header.Get("Proxy-Authorization")
	if auth == "" {
		return false
	}
	
	if !strings.HasPrefix(auth, "Basic ") {
		return false
	}
	
	encoded := strings.TrimPrefix(auth, "Basic ")
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return false
	}
	
	credentials := strings.SplitN(string(decoded), ":", 2)
	if len(credentials) != 2 {
		return false
	}
	
	return credentials[0] == ps.config.Username && credentials[1] == ps.config.Password
}

// Send blocked response
func (ps *ProxyServer) sendBlockedResponse(w http.ResponseWriter, r *http.Request) {
	if strings.Contains(r.Header.Get("Accept"), "image/") {
		// Return 1x1 transparent pixel for image requests
		pixel, _ := base64.StdEncoding.DecodeString("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
		w.Header().Set("Content-Type", "image/gif")
		w.Header().Set("Content-Length", strconv.Itoa(len(pixel)))
		w.WriteHeader(http.StatusOK)
		w.Write(pixel)
	} else {
		// Return 204 No Content for other requests
		w.WriteHeader(http.StatusNoContent)
	}
}

// Handle SOCKS proxy (simplified implementation)
func (ps *ProxyServer) handleSOCKSProxy(w http.ResponseWriter, r *http.Request) {
	// SOCKS implementation would go here
	// This is a placeholder for SOCKS4/5 support
	http.Error(w, "SOCKS proxy not implemented", http.StatusNotImplemented)
}

// Handle transparent proxy
func (ps *ProxyServer) handleTransparentProxy(w http.ResponseWriter, r *http.Request) {
	// Transparent proxy implementation would go here
	// This requires iptables rules or similar for traffic interception
	ps.handleHTTPProxy(w, r)
}

// Get proxy statistics
func (ps *ProxyServer) GetStats() *ProxyStats {
	ps.stats.mutex.RLock()
	defer ps.stats.mutex.RUnlock()
	
	stats := *ps.stats
	stats.Uptime = time.Since(stats.StartTime)
	return &stats
}

// Main function
func main() {
	// Load configuration
	config := DefaultConfig()
	
	// Parse command line arguments
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "--port":
			if len(os.Args) > 2 {
				port, err := strconv.Atoi(os.Args[2])
				if err == nil {
					config.ListenPort = port
				}
			}
		case "--config":
			if len(os.Args) > 2 {
				// Load config from file
				configFile := os.Args[2]
				if data, err := os.ReadFile(configFile); err == nil {
					json.Unmarshal(data, config)
				}
			}
		case "--help":
			fmt.Println("OblivionFilter Proxy Server v2.0.0")
			fmt.Println("Usage:")
			fmt.Println("  oblivion-proxy [options]")
			fmt.Println("Options:")
			fmt.Println("  --port <port>     Set listen port (default: 8080)")
			fmt.Println("  --config <file>   Load configuration from file")
			fmt.Println("  --help           Show this help message")
			return
		}
	}
	
	// Create and start proxy server
	proxy := NewProxyServer(config)
	
	if err := proxy.Start(); err != nil {
		log.Fatalf("Failed to start proxy server: %v", err)
	}
	
	// Wait for interrupt signal
	select {
	case <-proxy.ctx.Done():
		break
	}
	
	// Stop server
	if err := proxy.Stop(); err != nil {
		log.Printf("Error stopping server: %v", err)
	}
}
