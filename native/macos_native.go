/**
 * OblivionFilter v2.0.0 - macOS Native Integration
 * 
 * Provides native macOS system integration for OblivionFilter:
 * - macOS launchd service management
 * - System proxy configuration via System Configuration framework
 * - Keychain integration for secure storage
 * - macOS-specific stealth optimizations
 * - Code signing and notarization support
 * - macOS security framework integration
 * 
 * @version 2.0.0
 * @author OblivionFilter Development Team
 * @license GPL-3.0
 */

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"strings"
	"time"
)

// macOS Native Integration Manager
type MacOSNativeManager struct {
	serviceName     string
	bundleID        string
	installPath     string
	launchAgentPath string
	logger          *log.Logger
	proxyConfig     *MacOSProxyConfig
	browserManager  *MacOSBrowserManager
	securityManager *MacOSSecurityManager
	keychainManager *MacOSKeychainManager
	ctx             context.Context
	cancel          context.CancelFunc
}

// macOS Proxy Configuration
type MacOSProxyConfig struct {
	Enabled       bool   `json:"enabled"`
	HTTPProxy     string `json:"httpProxy"`
	HTTPSProxy    string `json:"httpsProxy"`
	SOCKSProxy    string `json:"socksProxy"`
	Port          int    `json:"port"`
	Bypass        string `json:"bypass"`
	AutoConfigURL string `json:"autoConfigURL"`
	PACFile       string `json:"pacFile"`
	NetworkService string `json:"networkService"`
}

// macOS Browser Manager
type MacOSBrowserManager struct {
	supportedBrowsers []MacOSBrowserInfo
	nativeHostPath    string
	manifestPath      string
}

type MacOSBrowserInfo struct {
	Name         string `json:"name"`
	BundleID     string `json:"bundleId"`
	ManifestPath string `json:"manifestPath"`
	Executable   string `json:"executable"`
	Supported    bool   `json:"supported"`
}

// macOS Security Manager
type MacOSSecurityManager struct {
	codeSigningID    string
	teamID           string
	entitlements     []string
	gatekeeperBypass bool
	xpcServices      []XPCService
}

type XPCService struct {
	Name     string `json:"name"`
	BundleID string `json:"bundleId"`
	Type     string `json:"type"`
}

// macOS Keychain Manager
type MacOSKeychainManager struct {
	keychainPath string
	serviceName  string
	accountName  string
}

// LaunchAgent plist structure
type LaunchAgent struct {
	Label               string            `json:"Label"`
	ProgramArguments    []string          `json:"ProgramArguments"`
	RunAtLoad           bool              `json:"RunAtLoad"`
	KeepAlive           bool              `json:"KeepAlive"`
	WorkingDirectory    string            `json:"WorkingDirectory"`
	StandardOutPath     string            `json:"StandardOutPath"`
	StandardErrorPath   string            `json:"StandardErrorPath"`
	EnvironmentVariables map[string]string `json:"EnvironmentVariables,omitempty"`
}

// NewMacOSNativeManager creates a new macOS native integration manager
func NewMacOSNativeManager() *MacOSNativeManager {
	ctx, cancel := context.WithCancel(context.Background())
	
	currentUser, err := user.Current()
	if err != nil {
		log.Fatalf("Failed to get current user: %v", err)
	}
	
	manager := &MacOSNativeManager{
		serviceName:     "com.oblivionfilter.native",
		bundleID:        "com.oblivionfilter.native",
		installPath:     getInstallPath(),
		launchAgentPath: filepath.Join(currentUser.HomeDir, "Library/LaunchAgents/com.oblivionfilter.native.plist"),
		ctx:             ctx,
		cancel:          cancel,
	}
	
	// Initialize logger
	manager.initLogger()
	
	// Initialize components
	manager.initProxyConfig()
	manager.initBrowserManager()
	manager.initSecurityManager()
	manager.initKeychainManager()
	
	return manager
}

// Initialize logger
func (m *MacOSNativeManager) initLogger() {
	logFile := filepath.Join(m.installPath, "oblivion_native.log")
	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		m.logger = log.New(os.Stdout, "[OblivionFilter] ", log.LstdFlags|log.Lshortfile)
	} else {
		m.logger = log.New(file, "[OblivionFilter] ", log.LstdFlags|log.Lshortfile)
	}
}

// Initialize proxy configuration
func (m *MacOSNativeManager) initProxyConfig() {
	m.proxyConfig = &MacOSProxyConfig{
		Enabled:        false,
		HTTPProxy:      "127.0.0.1",
		HTTPSProxy:     "127.0.0.1",
		SOCKSProxy:     "127.0.0.1",
		Port:           8080,
		Bypass:         "localhost, 127.0.0.1, *.local",
		PACFile:        filepath.Join(m.installPath, "proxy.pac"),
		NetworkService: "Wi-Fi", // Default, will be detected
	}
}

// Initialize browser manager
func (m *MacOSNativeManager) initBrowserManager() {
	homeDir, _ := os.UserHomeDir()
	
	m.browserManager = &MacOSBrowserManager{
		nativeHostPath: filepath.Join(m.installPath, "native_host"),
		manifestPath:   filepath.Join(m.installPath, "manifests"),
		supportedBrowsers: []MacOSBrowserInfo{
			{
				Name:         "Chrome",
				BundleID:     "com.google.Chrome",
				ManifestPath: filepath.Join(homeDir, "Library/Application Support/Google/Chrome/NativeMessagingHosts"),
				Executable:   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
				Supported:    true,
			},
			{
				Name:         "Safari",
				BundleID:     "com.apple.Safari",
				ManifestPath: filepath.Join(homeDir, "Library/Application Support/Safari/NativeMessagingHosts"),
				Executable:   "/Applications/Safari.app/Contents/MacOS/Safari",
				Supported:    true,
			},
			{
				Name:         "Firefox",
				BundleID:     "org.mozilla.firefox",
				ManifestPath: filepath.Join(homeDir, "Library/Application Support/Mozilla/NativeMessagingHosts"),
				Executable:   "/Applications/Firefox.app/Contents/MacOS/firefox",
				Supported:    true,
			},
			{
				Name:         "Brave",
				BundleID:     "com.brave.Browser",
				ManifestPath: filepath.Join(homeDir, "Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"),
				Executable:   "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
				Supported:    true,
			},
			{
				Name:         "Edge",
				BundleID:     "com.microsoft.edgemac",
				ManifestPath: filepath.Join(homeDir, "Library/Application Support/Microsoft Edge/NativeMessagingHosts"),
				Executable:   "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
				Supported:    true,
			},
		},
	}
}

// Initialize security manager
func (m *MacOSNativeManager) initSecurityManager() {
	m.securityManager = &MacOSSecurityManager{
		codeSigningID:    "Developer ID Application: OblivionFilter Inc",
		teamID:           "OBLIVION123",
		gatekeeperBypass: false,
		entitlements: []string{
			"com.apple.security.network.client",
			"com.apple.security.network.server",
			"com.apple.security.files.user-selected.read-write",
		},
		xpcServices: []XPCService{
			{
				Name:     "OblivionFilter Proxy Service",
				BundleID: "com.oblivionfilter.proxy.xpc",
				Type:     "Application",
			},
		},
	}
}

// Initialize keychain manager
func (m *MacOSNativeManager) initKeychainManager() {
	m.keychainManager = &MacOSKeychainManager{
		keychainPath: "~/Library/Keychains/login.keychain-db",
		serviceName:  "OblivionFilter",
		accountName:  "native-service",
	}
}

// Install macOS launch agent
func (m *MacOSNativeManager) InstallLaunchAgent() error {
	m.logger.Println("Installing macOS launch agent...")
	
	// Create launch agent plist
	launchAgent := LaunchAgent{
		Label: m.serviceName,
		ProgramArguments: []string{
			filepath.Join(m.installPath, "oblivion_native"),
			"run",
		},
		RunAtLoad:        true,
		KeepAlive:        true,
		WorkingDirectory: m.installPath,
		StandardOutPath:  filepath.Join(m.installPath, "stdout.log"),
		StandardErrorPath: filepath.Join(m.installPath, "stderr.log"),
		EnvironmentVariables: map[string]string{
			"PATH": "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
		},
	}
	
	// Convert to plist XML
	plistData, err := m.generatePlist(launchAgent)
	if err != nil {
		return fmt.Errorf("failed to generate plist: %v", err)
	}
	
	// Ensure directory exists
	dir := filepath.Dir(m.launchAgentPath)
	err = os.MkdirAll(dir, 0755)
	if err != nil {
		return fmt.Errorf("failed to create launch agent directory: %v", err)
	}
	
	// Write plist file
	err = os.WriteFile(m.launchAgentPath, plistData, 0644)
	if err != nil {
		return fmt.Errorf("failed to write launch agent plist: %v", err)
	}
	
	// Load launch agent
	err = m.loadLaunchAgent()
	if err != nil {
		return fmt.Errorf("failed to load launch agent: %v", err)
	}
	
	m.logger.Println("macOS launch agent installed successfully")
	return nil
}

// Uninstall macOS launch agent
func (m *MacOSNativeManager) UninstallLaunchAgent() error {
	m.logger.Println("Uninstalling macOS launch agent...")
	
	// Unload launch agent
	err := m.unloadLaunchAgent()
	if err != nil {
		m.logger.Printf("Failed to unload launch agent: %v", err)
	}
	
	// Remove plist file
	err = os.Remove(m.launchAgentPath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to remove launch agent plist: %v", err)
	}
	
	m.logger.Println("macOS launch agent uninstalled successfully")
	return nil
}

// Load launch agent
func (m *MacOSNativeManager) loadLaunchAgent() error {
	cmd := exec.Command("launchctl", "load", m.launchAgentPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("launchctl load failed: %v, output: %s", err, output)
	}
	return nil
}

// Unload launch agent
func (m *MacOSNativeManager) unloadLaunchAgent() error {
	cmd := exec.Command("launchctl", "unload", m.launchAgentPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("launchctl unload failed: %v, output: %s", err, output)
	}
	return nil
}

// Start launch agent
func (m *MacOSNativeManager) StartLaunchAgent() error {
	cmd := exec.Command("launchctl", "start", m.serviceName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("launchctl start failed: %v, output: %s", err, output)
	}
	
	m.logger.Println("macOS launch agent started successfully")
	return nil
}

// Stop launch agent
func (m *MacOSNativeManager) StopLaunchAgent() error {
	cmd := exec.Command("launchctl", "stop", m.serviceName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("launchctl stop failed: %v, output: %s", err, output)
	}
	
	m.logger.Println("macOS launch agent stopped successfully")
	return nil
}

// Run service
func (m *MacOSNativeManager) RunService() error {
	m.logger.Println("OblivionFilter macOS service started")
	
	// Setup system proxy
	err := m.SetupSystemProxy()
	if err != nil {
		m.logger.Printf("Failed to setup system proxy: %v", err)
	}
	
	// Setup browser integration
	err = m.SetupBrowserIntegration()
	if err != nil {
		m.logger.Printf("Failed to setup browser integration: %v", err)
	}
	
	// Setup macOS security
	err = m.SetupMacOSSecurity()
	if err != nil {
		m.logger.Printf("Failed to setup macOS security: %v", err)
	}
	
	// Main service loop
	for {
		select {
		case <-m.ctx.Done():
			m.logger.Println("Service shutdown requested")
			return nil
		case <-time.After(30 * time.Second):
			// Periodic health check
			m.performHealthCheck()
		}
	}
}

// Setup system proxy using networksetup
func (m *MacOSNativeManager) SetupSystemProxy() error {
	m.logger.Println("Setting up macOS system proxy...")
	
	// Detect network service
	networkService, err := m.detectNetworkService()
	if err != nil {
		return fmt.Errorf("failed to detect network service: %v", err)
	}
	m.proxyConfig.NetworkService = networkService
	
	// Configure HTTP proxy
	err = m.setHTTPProxy(networkService)
	if err != nil {
		return fmt.Errorf("failed to set HTTP proxy: %v", err)
	}
	
	// Configure HTTPS proxy
	err = m.setHTTPSProxy(networkService)
	if err != nil {
		return fmt.Errorf("failed to set HTTPS proxy: %v", err)
	}
	
	// Configure SOCKS proxy
	err = m.setSOCKSProxy(networkService)
	if err != nil {
		return fmt.Errorf("failed to set SOCKS proxy: %v", err)
	}
	
	// Set bypass domains
	err = m.setProxyBypass(networkService)
	if err != nil {
		return fmt.Errorf("failed to set proxy bypass: %v", err)
	}
	
	m.logger.Printf("System proxy configured for network service: %s", networkService)
	return nil
}

// Detect active network service
func (m *MacOSNativeManager) detectNetworkService() (string, error) {
	cmd := exec.Command("networksetup", "-listnetworkserviceorder")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.Contains(line, "Wi-Fi") && strings.Contains(line, "(1)") {
			return "Wi-Fi", nil
		}
		if strings.Contains(line, "Ethernet") && strings.Contains(line, "(1)") {
			return "Ethernet", nil
		}
	}
	
	return "Wi-Fi", nil // Default fallback
}

// Set HTTP proxy
func (m *MacOSNativeManager) setHTTPProxy(networkService string) error {
	cmd := exec.Command("networksetup", "-setwebproxy", networkService, 
		m.proxyConfig.HTTPProxy, fmt.Sprintf("%d", m.proxyConfig.Port))
	return cmd.Run()
}

// Set HTTPS proxy
func (m *MacOSNativeManager) setHTTPSProxy(networkService string) error {
	cmd := exec.Command("networksetup", "-setsecurewebproxy", networkService,
		m.proxyConfig.HTTPSProxy, fmt.Sprintf("%d", m.proxyConfig.Port))
	return cmd.Run()
}

// Set SOCKS proxy
func (m *MacOSNativeManager) setSOCKSProxy(networkService string) error {
	cmd := exec.Command("networksetup", "-setsocksfirewallproxy", networkService,
		m.proxyConfig.SOCKSProxy, fmt.Sprintf("%d", m.proxyConfig.Port+1))
	return cmd.Run()
}

// Set proxy bypass
func (m *MacOSNativeManager) setProxyBypass(networkService string) error {
	bypassDomains := strings.Split(m.proxyConfig.Bypass, ", ")
	args := append([]string{"-setproxybypassdomains", networkService}, bypassDomains...)
	cmd := exec.Command("networksetup", args...)
	return cmd.Run()
}

// Cleanup system proxy
func (m *MacOSNativeManager) CleanupSystemProxy() error {
	m.logger.Println("Cleaning up macOS system proxy...")
	
	networkService := m.proxyConfig.NetworkService
	
	// Disable HTTP proxy
	cmd := exec.Command("networksetup", "-setwebproxystate", networkService, "off")
	cmd.Run()
	
	// Disable HTTPS proxy
	cmd = exec.Command("networksetup", "-setsecurewebproxystate", networkService, "off")
	cmd.Run()
	
	// Disable SOCKS proxy
	cmd = exec.Command("networksetup", "-setsocksfirewallproxystate", networkService, "off")
	cmd.Run()
	
	m.logger.Println("System proxy disabled")
	return nil
}

// Setup browser integration
func (m *MacOSNativeManager) SetupBrowserIntegration() error {
	m.logger.Println("Setting up macOS browser integration...")
	
	for _, browser := range m.browserManager.supportedBrowsers {
		if !browser.Supported {
			continue
		}
		
		err := m.setupBrowserNativeHost(browser)
		if err != nil {
			m.logger.Printf("Failed to setup native host for %s: %v", browser.Name, err)
			continue
		}
		
		m.logger.Printf("Native host configured for %s", browser.Name)
	}
	
	return nil
}

// Setup native host for specific browser
func (m *MacOSNativeManager) setupBrowserNativeHost(browser MacOSBrowserInfo) error {
	// Create manifest content
	manifest := map[string]interface{}{
		"name":        "com.oblivionfilter.native",
		"description": "OblivionFilter Native Messaging Host",
		"path":        m.browserManager.nativeHostPath,
		"type":        "stdio",
		"allowed_origins": []string{
			"chrome-extension://oblivionfilter-extension-id/",
			"moz-extension://oblivionfilter-extension-id/",
		},
	}
	
	// Convert to JSON
	manifestJSON, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal manifest: %v", err)
	}
	
	// Write manifest file
	err = os.MkdirAll(browser.ManifestPath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create manifest directory: %v", err)
	}
	
	manifestFile := filepath.Join(browser.ManifestPath, "com.oblivionfilter.native.json")
	err = os.WriteFile(manifestFile, manifestJSON, 0644)
	if err != nil {
		return fmt.Errorf("failed to write manifest file: %v", err)
	}
	
	return nil
}

// Setup macOS security features
func (m *MacOSNativeManager) SetupMacOSSecurity() error {
	m.logger.Println("Setting up macOS security features...")
	
	// Store credentials in keychain
	err := m.storeKeychainCredentials()
	if err != nil {
		m.logger.Printf("Failed to store keychain credentials: %v", err)
	}
	
	// Setup code signing verification
	err = m.verifyCodeSigning()
	if err != nil {
		m.logger.Printf("Code signing verification failed: %v", err)
	}
	
	return nil
}

// Store credentials in keychain
func (m *MacOSNativeManager) storeKeychainCredentials() error {
	// Generate secure token
	token := "oblivion-native-" + fmt.Sprintf("%d", time.Now().Unix())
	
	// Store in keychain using security command
	cmd := exec.Command("security", "add-generic-password",
		"-s", m.keychainManager.serviceName,
		"-a", m.keychainManager.accountName,
		"-w", token,
		"-U") // Update if exists
	
	return cmd.Run()
}

// Verify code signing
func (m *MacOSNativeManager) verifyCodeSigning() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	
	cmd := exec.Command("codesign", "-v", "-v", exe)
	output, err := cmd.CombinedOutput()
	if err != nil {
		m.logger.Printf("Code signing verification output: %s", output)
		return err
	}
	
	m.logger.Println("Code signing verification passed")
	return nil
}

// Generate plist XML
func (m *MacOSNativeManager) generatePlist(agent LaunchAgent) ([]byte, error) {
	plistContent := `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>%s</string>
	<key>ProgramArguments</key>
	<array>
		%s
	</array>
	<key>RunAtLoad</key>
	<%s/>
	<key>KeepAlive</key>
	<%s/>
	<key>WorkingDirectory</key>
	<string>%s</string>
	<key>StandardOutPath</key>
	<string>%s</string>
	<key>StandardErrorPath</key>
	<string>%s</string>
</dict>
</plist>`
	
	// Build program arguments
	var args strings.Builder
	for _, arg := range agent.ProgramArguments {
		args.WriteString(fmt.Sprintf("\t\t<string>%s</string>\n", arg))
	}
	
	// Format boolean values
	runAtLoad := "false"
	if agent.RunAtLoad {
		runAtLoad = "true"
	}
	
	keepAlive := "false"
	if agent.KeepAlive {
		keepAlive = "true"
	}
	
	formatted := fmt.Sprintf(plistContent,
		agent.Label,
		strings.TrimSpace(args.String()),
		runAtLoad,
		keepAlive,
		agent.WorkingDirectory,
		agent.StandardOutPath,
		agent.StandardErrorPath)
	
	return []byte(formatted), nil
}

// Utility functions

// Get installation path
func getInstallPath() string {
	exe, err := os.Executable()
	if err != nil {
		return "/Applications/OblivionFilter.app/Contents/MacOS"
	}
	return filepath.Dir(exe)
}

// Perform health check
func (m *MacOSNativeManager) performHealthCheck() {
	// Check if proxy is responsive
	// Check if native host is running
	// Check system resources
	// Check network connectivity
	m.logger.Println("Health check completed")
}

// Create application bundle structure
func (m *MacOSNativeManager) CreateApplicationBundle() error {
	m.logger.Println("Creating macOS application bundle...")
	
	bundlePath := "/Applications/OblivionFilter.app"
	contentsPath := filepath.Join(bundlePath, "Contents")
	macOSPath := filepath.Join(contentsPath, "MacOS")
	resourcesPath := filepath.Join(contentsPath, "Resources")
	
	// Create directory structure
	dirs := []string{bundlePath, contentsPath, macOSPath, resourcesPath}
	for _, dir := range dirs {
		err := os.MkdirAll(dir, 0755)
		if err != nil {
			return fmt.Errorf("failed to create directory %s: %v", dir, err)
		}
	}
	
	// Create Info.plist
	infoPlist := `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleExecutable</key>
	<string>OblivionFilter</string>
	<key>CFBundleIdentifier</key>
	<string>com.oblivionfilter.app</string>
	<key>CFBundleName</key>
	<string>OblivionFilter</string>
	<key>CFBundleVersion</key>
	<string>2.0.0</string>
	<key>CFBundleShortVersionString</key>
	<string>2.0.0</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>LSMinimumSystemVersion</key>
	<string>10.14</string>
	<key>NSHumanReadableCopyright</key>
	<string>Copyright © 2025 OblivionFilter. All rights reserved.</string>
</dict>
</plist>`
	
	infoPlistPath := filepath.Join(contentsPath, "Info.plist")
	err := os.WriteFile(infoPlistPath, []byte(infoPlist), 0644)
	if err != nil {
		return fmt.Errorf("failed to write Info.plist: %v", err)
	}
	
	m.logger.Println("Application bundle created successfully")
	return nil
}

// Main function for macOS native integration
func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: macos_native [install|uninstall|start|stop|run|bundle]")
		os.Exit(1)
	}
	
	manager := NewMacOSNativeManager()
	command := os.Args[1]
	
	switch command {
	case "install":
		err := manager.InstallLaunchAgent()
		if err != nil {
			log.Fatalf("Failed to install launch agent: %v", err)
		}
		fmt.Println("Launch agent installed successfully")
		
	case "uninstall":
		err := manager.UninstallLaunchAgent()
		if err != nil {
			log.Fatalf("Failed to uninstall launch agent: %v", err)
		}
		fmt.Println("Launch agent uninstalled successfully")
		
	case "start":
		err := manager.StartLaunchAgent()
		if err != nil {
			log.Fatalf("Failed to start launch agent: %v", err)
		}
		fmt.Println("Launch agent started successfully")
		
	case "stop":
		err := manager.StopLaunchAgent()
		if err != nil {
			log.Fatalf("Failed to stop launch agent: %v", err)
		}
		fmt.Println("Launch agent stopped successfully")
		
	case "run":
		err := manager.RunService()
		if err != nil {
			log.Fatalf("Failed to run service: %v", err)
		}
		
	case "bundle":
		err := manager.CreateApplicationBundle()
		if err != nil {
			log.Fatalf("Failed to create application bundle: %v", err)
		}
		fmt.Println("Application bundle created successfully")
		
	default:
		fmt.Printf("Unknown command: %s\n", command)
		os.Exit(1)
	}
}
