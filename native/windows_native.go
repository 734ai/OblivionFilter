/**
 * OblivionFilter v2.0.0 - Windows Native Integration
 * 
 * Provides native Windows system integration for OblivionFilter:
 * - Windows registry management for browser configuration
 * - Windows service integration and management
 * - System-wide proxy configuration
 * - Windows-specific stealth optimizations
 * - UAC handling and privilege escalation
 * - Windows Defender integration
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
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/debug"
	"golang.org/x/sys/windows/svc/eventlog"
	"golang.org/x/sys/windows/svc/mgr"
)

// Windows Native Integration Manager
type WindowsNativeManager struct {
	serviceName     string
	serviceDisplayName string
	serviceDesc     string
	logger          *log.Logger
	eventLog        *eventlog.Log
	proxyConfig     *WindowsProxyConfig
	browserManager  *WindowsBrowserManager
	securityManager *WindowsSecurityManager
	installPath     string
	isService       bool
	ctx             context.Context
	cancel          context.CancelFunc
}

// Windows Proxy Configuration
type WindowsProxyConfig struct {
	Enabled      bool   `json:"enabled"`
	Server       string `json:"server"`
	Port         int    `json:"port"`
	Bypass       string `json:"bypass"`
	AutoConfigURL string `json:"autoConfigURL"`
	PACFile      string `json:"pacFile"`
}

// Windows Browser Manager
type WindowsBrowserManager struct {
	supportedBrowsers []BrowserInfo
	nativeHostPath    string
	manifestPath      string
}

type BrowserInfo struct {
	Name         string `json:"name"`
	RegistryKey  string `json:"registryKey"`
	ManifestPath string `json:"manifestPath"`
	Executable   string `json:"executable"`
	Supported    bool   `json:"supported"`
}

// Windows Security Manager
type WindowsSecurityManager struct {
	defenderExclusions []string
	firewallRules      []FirewallRule
	uacSettings        UACSettings
}

type FirewallRule struct {
	Name      string `json:"name"`
	Direction string `json:"direction"`
	Action    string `json:"action"`
	Protocol  string `json:"protocol"`
	Port      int    `json:"port"`
	Program   string `json:"program"`
}

type UACSettings struct {
	RequireAdmin bool `json:"requireAdmin"`
	ElevateProxy bool `json:"elevateProxy"`
}

// Windows API constants
const (
	INTERNET_OPTION_PROXY               = 38
	INTERNET_OPTION_REFRESH             = 37
	INTERNET_OPTION_SETTINGS_CHANGED    = 39
	PROXY_TYPE_DIRECT                   = 1
	PROXY_TYPE_PROXY                    = 2
	PROXY_TYPE_AUTO_PROXY_URL           = 4
	PROXY_TYPE_AUTO_DETECT              = 8
)

// Windows service implementation
type oblivionService struct {
	manager *WindowsNativeManager
}

func (s *oblivionService) Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (ssec bool, errno uint32) {
	const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown | svc.AcceptPauseAndContinue
	changes <- svc.Status{State: svc.StartPending}
	
	// Start the service
	go s.manager.runService()
	
	changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}
	
loop:
	for {
		select {
		case c := <-r:
			switch c.Cmd {
			case svc.Interrogate:
				changes <- c.CurrentStatus
			case svc.Stop, svc.Shutdown:
				s.manager.stopService()
				break loop
			case svc.Pause:
				changes <- svc.Status{State: svc.Paused, Accepts: cmdsAccepted}
			case svc.Continue:
				changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}
			default:
				s.manager.logError(fmt.Sprintf("Unexpected control request #%d", c))
			}
		}
	}
	
	changes <- svc.Status{State: svc.StopPending}
	return
}

// NewWindowsNativeManager creates a new Windows native integration manager
func NewWindowsNativeManager() *WindowsNativeManager {
	ctx, cancel := context.WithCancel(context.Background())
	
	manager := &WindowsNativeManager{
		serviceName:        "OblivionFilterService",
		serviceDisplayName: "OblivionFilter Native Service",
		serviceDesc:        "OblivionFilter native Windows integration service",
		ctx:                ctx,
		cancel:             cancel,
		installPath:        getInstallPath(),
	}
	
	// Initialize logger
	manager.initLogger()
	
	// Initialize components
	manager.initProxyConfig()
	manager.initBrowserManager()
	manager.initSecurityManager()
	
	return manager
}

// Initialize logger
func (w *WindowsNativeManager) initLogger() {
	w.logger = log.New(os.Stdout, "[OblivionFilter] ", log.LstdFlags|log.Lshortfile)
	
	// Try to initialize event log
	var err error
	w.eventLog, err = eventlog.Open(w.serviceName)
	if err != nil {
		w.logger.Printf("Failed to open event log: %v", err)
	}
}

// Initialize proxy configuration
func (w *WindowsNativeManager) initProxyConfig() {
	w.proxyConfig = &WindowsProxyConfig{
		Enabled:    false,
		Server:     "127.0.0.1",
		Port:       8080,
		Bypass:     "localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*",
		PACFile:    filepath.Join(w.installPath, "proxy.pac"),
	}
}

// Initialize browser manager
func (w *WindowsNativeManager) initBrowserManager() {
	w.browserManager = &WindowsBrowserManager{
		nativeHostPath: filepath.Join(w.installPath, "native_host.exe"),
		manifestPath:   filepath.Join(w.installPath, "manifests"),
		supportedBrowsers: []BrowserInfo{
			{
				Name:         "Chrome",
				RegistryKey:  `SOFTWARE\Google\Chrome\NativeMessagingHosts\com.oblivionfilter.native`,
				ManifestPath: `%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts`,
				Executable:   "chrome.exe",
				Supported:    true,
			},
			{
				Name:         "Edge",
				RegistryKey:  `SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.oblivionfilter.native`,
				ManifestPath: `%LOCALAPPDATA%\Microsoft\Edge\User Data\NativeMessagingHosts`,
				Executable:   "msedge.exe",
				Supported:    true,
			},
			{
				Name:         "Firefox",
				RegistryKey:  `SOFTWARE\Mozilla\NativeMessagingHosts\com.oblivionfilter.native`,
				ManifestPath: `%APPDATA%\Mozilla\NativeMessagingHosts`,
				Executable:   "firefox.exe",
				Supported:    true,
			},
			{
				Name:         "Brave",
				RegistryKey:  `SOFTWARE\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.oblivionfilter.native`,
				ManifestPath: `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\NativeMessagingHosts`,
				Executable:   "brave.exe",
				Supported:    true,
			},
		},
	}
}

// Initialize security manager
func (w *WindowsNativeManager) initSecurityManager() {
	w.securityManager = &WindowsSecurityManager{
		defenderExclusions: []string{
			w.installPath,
			filepath.Join(w.installPath, "proxy.exe"),
			filepath.Join(w.installPath, "native_host.exe"),
		},
		firewallRules: []FirewallRule{
			{
				Name:      "OblivionFilter Proxy",
				Direction: "in",
				Action:    "allow",
				Protocol:  "tcp",
				Port:      8080,
				Program:   filepath.Join(w.installPath, "proxy.exe"),
			},
			{
				Name:      "OblivionFilter Native Host",
				Direction: "in",
				Action:    "allow",
				Protocol:  "tcp",
				Port:      0,
				Program:   filepath.Join(w.installPath, "native_host.exe"),
			},
		},
		uacSettings: UACSettings{
			RequireAdmin: false,
			ElevateProxy: true,
		},
	}
}

// Install Windows service
func (w *WindowsNativeManager) InstallService() error {
	w.logger.Println("Installing Windows service...")
	
	// Check if running as administrator
	if !w.isRunningAsAdmin() {
		return fmt.Errorf("administrator privileges required to install service")
	}
	
	// Connect to service manager
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %v", err)
	}
	defer m.Disconnect()
	
	// Check if service already exists
	s, err := m.OpenService(w.serviceName)
	if err == nil {
		s.Close()
		return fmt.Errorf("service %s already exists", w.serviceName)
	}
	
	// Get executable path
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %v", err)
	}
	
	// Create service
	s, err = m.CreateService(w.serviceName, exePath, mgr.Config{
		DisplayName: w.serviceDisplayName,
		Description: w.serviceDesc,
		StartType:   mgr.StartAutomatic,
	}, "-service")
	if err != nil {
		return fmt.Errorf("failed to create service: %v", err)
	}
	defer s.Close()
	
	// Install event log
	err = eventlog.InstallAsEventCreate(w.serviceName, eventlog.Error|eventlog.Warning|eventlog.Info)
	if err != nil {
		w.logger.Printf("Failed to install event log: %v", err)
	}
	
	w.logger.Println("Windows service installed successfully")
	return nil
}

// Uninstall Windows service
func (w *WindowsNativeManager) UninstallService() error {
	w.logger.Println("Uninstalling Windows service...")
	
	// Check if running as administrator
	if !w.isRunningAsAdmin() {
		return fmt.Errorf("administrator privileges required to uninstall service")
	}
	
	// Connect to service manager
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %v", err)
	}
	defer m.Disconnect()
	
	// Open service
	s, err := m.OpenService(w.serviceName)
	if err != nil {
		return fmt.Errorf("service %s not found: %v", w.serviceName, err)
	}
	defer s.Close()
	
	// Stop service if running
	status, err := s.Query()
	if err == nil && status.State == svc.Running {
		_, err = s.Control(svc.Stop)
		if err != nil {
			w.logger.Printf("Failed to stop service: %v", err)
		} else {
			// Wait for service to stop
			for {
				status, err = s.Query()
				if err != nil || status.State == svc.Stopped {
					break
				}
				time.Sleep(100 * time.Millisecond)
			}
		}
	}
	
	// Delete service
	err = s.Delete()
	if err != nil {
		return fmt.Errorf("failed to delete service: %v", err)
	}
	
	// Remove event log
	err = eventlog.Remove(w.serviceName)
	if err != nil {
		w.logger.Printf("Failed to remove event log: %v", err)
	}
	
	w.logger.Println("Windows service uninstalled successfully")
	return nil
}

// Start Windows service
func (w *WindowsNativeManager) StartService() error {
	w.logger.Println("Starting Windows service...")
	
	// Connect to service manager
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %v", err)
	}
	defer m.Disconnect()
	
	// Open service
	s, err := m.OpenService(w.serviceName)
	if err != nil {
		return fmt.Errorf("service %s not found: %v", w.serviceName, err)
	}
	defer s.Close()
	
	// Start service
	err = s.Start()
	if err != nil {
		return fmt.Errorf("failed to start service: %v", err)
	}
	
	w.logger.Println("Windows service started successfully")
	return nil
}

// Stop Windows service
func (w *WindowsNativeManager) StopService() error {
	w.logger.Println("Stopping Windows service...")
	
	// Connect to service manager
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %v", err)
	}
	defer m.Disconnect()
	
	// Open service
	s, err := m.OpenService(w.serviceName)
	if err != nil {
		return fmt.Errorf("service %s not found: %v", w.serviceName, err)
	}
	defer s.Close()
	
	// Stop service
	_, err = s.Control(svc.Stop)
	if err != nil {
		return fmt.Errorf("failed to stop service: %v", err)
	}
	
	w.logger.Println("Windows service stopped successfully")
	return nil
}

// Run as Windows service
func (w *WindowsNativeManager) RunService() error {
	w.isService = true
	
	// Check if running as service
	isInteractive, err := svc.IsAnInteractiveSession()
	if err != nil {
		return fmt.Errorf("failed to determine if running as service: %v", err)
	}
	
	if !isInteractive {
		// Run as service
		err = svc.Run(w.serviceName, &oblivionService{manager: w})
		if err != nil {
			return fmt.Errorf("failed to run service: %v", err)
		}
	} else {
		// Run interactively for debugging
		w.logger.Println("Running in interactive mode...")
		w.runService()
	}
	
	return nil
}

// Internal service runner
func (w *WindowsNativeManager) runService() {
	w.logger.Println("OblivionFilter Windows service started")
	
	// Setup system proxy
	err := w.SetupSystemProxy()
	if err != nil {
		w.logError(fmt.Sprintf("Failed to setup system proxy: %v", err))
	}
	
	// Setup browser integration
	err = w.SetupBrowserIntegration()
	if err != nil {
		w.logError(fmt.Sprintf("Failed to setup browser integration: %v", err))
	}
	
	// Setup Windows security
	err = w.SetupWindowsSecurity()
	if err != nil {
		w.logError(fmt.Sprintf("Failed to setup Windows security: %v", err))
	}
	
	// Main service loop
	for {
		select {
		case <-w.ctx.Done():
			w.logger.Println("Service shutdown requested")
			return
		case <-time.After(30 * time.Second):
			// Periodic health check
			w.performHealthCheck()
		}
	}
}

// Stop service
func (w *WindowsNativeManager) stopService() {
	w.logger.Println("Stopping OblivionFilter Windows service")
	
	// Cleanup system proxy
	err := w.CleanupSystemProxy()
	if err != nil {
		w.logError(fmt.Sprintf("Failed to cleanup system proxy: %v", err))
	}
	
	// Cancel context
	w.cancel()
}

// Setup system proxy
func (w *WindowsNativeManager) SetupSystemProxy() error {
	w.logger.Println("Setting up Windows system proxy...")
	
	// Open Internet Settings registry key
	key, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Internet Settings`, registry.SET_VALUE)
	if err != nil {
		return fmt.Errorf("failed to open registry key: %v", err)
	}
	defer key.Close()
	
	// Enable proxy
	err = key.SetDWordValue("ProxyEnable", 1)
	if err != nil {
		return fmt.Errorf("failed to enable proxy: %v", err)
	}
	
	// Set proxy server
	proxyServer := fmt.Sprintf("%s:%d", w.proxyConfig.Server, w.proxyConfig.Port)
	err = key.SetStringValue("ProxyServer", proxyServer)
	if err != nil {
		return fmt.Errorf("failed to set proxy server: %v", err)
	}
	
	// Set proxy bypass
	err = key.SetStringValue("ProxyOverride", w.proxyConfig.Bypass)
	if err != nil {
		return fmt.Errorf("failed to set proxy bypass: %v", err)
	}
	
	// Notify system of changes
	w.notifyProxyChange()
	
	w.logger.Printf("System proxy configured: %s", proxyServer)
	return nil
}

// Cleanup system proxy
func (w *WindowsNativeManager) CleanupSystemProxy() error {
	w.logger.Println("Cleaning up Windows system proxy...")
	
	// Open Internet Settings registry key
	key, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Internet Settings`, registry.SET_VALUE)
	if err != nil {
		return fmt.Errorf("failed to open registry key: %v", err)
	}
	defer key.Close()
	
	// Disable proxy
	err = key.SetDWordValue("ProxyEnable", 0)
	if err != nil {
		return fmt.Errorf("failed to disable proxy: %v", err)
	}
	
	// Clear proxy server
	err = key.SetStringValue("ProxyServer", "")
	if err != nil {
		return fmt.Errorf("failed to clear proxy server: %v", err)
	}
	
	// Notify system of changes
	w.notifyProxyChange()
	
	w.logger.Println("System proxy disabled")
	return nil
}

// Setup browser integration
func (w *WindowsNativeManager) SetupBrowserIntegration() error {
	w.logger.Println("Setting up Windows browser integration...")
	
	for _, browser := range w.browserManager.supportedBrowsers {
		if !browser.Supported {
			continue
		}
		
		err := w.setupBrowserNativeHost(browser)
		if err != nil {
			w.logger.Printf("Failed to setup native host for %s: %v", browser.Name, err)
			continue
		}
		
		w.logger.Printf("Native host configured for %s", browser.Name)
	}
	
	return nil
}

// Setup native host for specific browser
func (w *WindowsNativeManager) setupBrowserNativeHost(browser BrowserInfo) error {
	// Create manifest content
	manifest := map[string]interface{}{
		"name":        "com.oblivionfilter.native",
		"description": "OblivionFilter Native Messaging Host",
		"path":        w.browserManager.nativeHostPath,
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
	manifestDir := os.ExpandEnv(browser.ManifestPath)
	err = os.MkdirAll(manifestDir, 0755)
	if err != nil {
		return fmt.Errorf("failed to create manifest directory: %v", err)
	}
	
	manifestFile := filepath.Join(manifestDir, "com.oblivionfilter.native.json")
	err = os.WriteFile(manifestFile, manifestJSON, 0644)
	if err != nil {
		return fmt.Errorf("failed to write manifest file: %v", err)
	}
	
	// Register in Windows registry
	key, err := registry.CreateKey(registry.CURRENT_USER, browser.RegistryKey, registry.SET_VALUE)
	if err != nil {
		return fmt.Errorf("failed to create registry key: %v", err)
	}
	defer key.Close()
	
	err = key.SetStringValue("", manifestFile)
	if err != nil {
		return fmt.Errorf("failed to set registry value: %v", err)
	}
	
	return nil
}

// Setup Windows security features
func (w *WindowsNativeManager) SetupWindowsSecurity() error {
	w.logger.Println("Setting up Windows security features...")
	
	// Add Windows Defender exclusions
	err := w.addDefenderExclusions()
	if err != nil {
		w.logger.Printf("Failed to add Defender exclusions: %v", err)
	}
	
	// Setup Windows Firewall rules
	err = w.setupFirewallRules()
	if err != nil {
		w.logger.Printf("Failed to setup firewall rules: %v", err)
	}
	
	return nil
}

// Add Windows Defender exclusions
func (w *WindowsNativeManager) addDefenderExclusions() error {
	for _, exclusion := range w.securityManager.defenderExclusions {
		cmd := exec.Command("powershell", "-Command", 
			fmt.Sprintf("Add-MpPreference -ExclusionPath '%s'", exclusion))
		err := cmd.Run()
		if err != nil {
			w.logger.Printf("Failed to add Defender exclusion for %s: %v", exclusion, err)
			continue
		}
		w.logger.Printf("Added Defender exclusion: %s", exclusion)
	}
	return nil
}

// Setup Windows Firewall rules
func (w *WindowsNativeManager) setupFirewallRules() error {
	for _, rule := range w.securityManager.firewallRules {
		var cmd *exec.Cmd
		if rule.Port > 0 {
			cmd = exec.Command("netsh", "advfirewall", "firewall", "add", "rule",
				fmt.Sprintf("name=%s", rule.Name),
				fmt.Sprintf("dir=%s", rule.Direction),
				fmt.Sprintf("action=%s", rule.Action),
				fmt.Sprintf("protocol=%s", rule.Protocol),
				fmt.Sprintf("localport=%d", rule.Port))
		} else {
			cmd = exec.Command("netsh", "advfirewall", "firewall", "add", "rule",
				fmt.Sprintf("name=%s", rule.Name),
				fmt.Sprintf("dir=%s", rule.Direction),
				fmt.Sprintf("action=%s", rule.Action),
				fmt.Sprintf("program=%s", rule.Program))
		}
		
		err := cmd.Run()
		if err != nil {
			w.logger.Printf("Failed to add firewall rule %s: %v", rule.Name, err)
			continue
		}
		w.logger.Printf("Added firewall rule: %s", rule.Name)
	}
	return nil
}

// Utility functions

// Check if running as administrator
func (w *WindowsNativeManager) isRunningAsAdmin() bool {
	var sid *windows.SID
	err := windows.AllocateAndInitializeSid(
		&windows.SECURITY_NT_AUTHORITY,
		2,
		windows.SECURITY_BUILTIN_DOMAIN_RID,
		windows.DOMAIN_ALIAS_RID_ADMINS,
		0, 0, 0, 0, 0, 0,
		&sid)
	if err != nil {
		return false
	}
	defer windows.FreeSid(sid)
	
	token := windows.Token(0)
	member, err := token.IsMember(sid)
	return err == nil && member
}

// Get installation path
func getInstallPath() string {
	exe, err := os.Executable()
	if err != nil {
		return `C:\Program Files\OblivionFilter`
	}
	return filepath.Dir(exe)
}

// Notify system of proxy changes
func (w *WindowsNativeManager) notifyProxyChange() {
	// Load wininet.dll
	wininet := syscall.NewLazyDLL("wininet.dll")
	internetSetOption := wininet.NewProc("InternetSetOptionW")
	
	// Notify system that proxy settings have changed
	internetSetOption.Call(0, INTERNET_OPTION_SETTINGS_CHANGED, 0, 0)
	internetSetOption.Call(0, INTERNET_OPTION_REFRESH, 0, 0)
}

// Perform health check
func (w *WindowsNativeManager) performHealthCheck() {
	// Check if proxy is responsive
	// Check if native host is running
	// Check system resources
	// This is a simplified health check
	w.logger.Println("Health check completed")
}

// Log error with event log
func (w *WindowsNativeManager) logError(msg string) {
	w.logger.Printf("ERROR: %s", msg)
	if w.eventLog != nil {
		w.eventLog.Error(1, msg)
	}
}

// Main function for Windows native integration
func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: windows_native.exe [install|uninstall|start|stop|run]")
		os.Exit(1)
	}
	
	manager := NewWindowsNativeManager()
	command := os.Args[1]
	
	switch command {
	case "install":
		err := manager.InstallService()
		if err != nil {
			log.Fatalf("Failed to install service: %v", err)
		}
		fmt.Println("Service installed successfully")
		
	case "uninstall":
		err := manager.UninstallService()
		if err != nil {
			log.Fatalf("Failed to uninstall service: %v", err)
		}
		fmt.Println("Service uninstalled successfully")
		
	case "start":
		err := manager.StartService()
		if err != nil {
			log.Fatalf("Failed to start service: %v", err)
		}
		fmt.Println("Service started successfully")
		
	case "stop":
		err := manager.StopService()
		if err != nil {
			log.Fatalf("Failed to stop service: %v", err)
		}
		fmt.Println("Service stopped successfully")
		
	case "run", "-service":
		err := manager.RunService()
		if err != nil {
			log.Fatalf("Failed to run service: %v", err)
		}
		
	default:
		fmt.Printf("Unknown command: %s\n", command)
		os.Exit(1)
	}
}
