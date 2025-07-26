import { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell, session } from 'electron';
import { autoUpdater } from 'electron-updater';
import electronLog from 'electron-log';
import Store from 'electron-store';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as sudo from 'sudo-prompt';

/**
 * OblivionFilter Desktop - Main Process
 * Electron wrapper for comprehensive privacy filtering
 * Integrates native proxy servers and system-wide filtering
 */

// Configuration
const isDev = process.env.NODE_ENV === 'development';
const platform = os.platform();

// Store for persistent settings
const store = new Store({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    filteringEnabled: false,
    stealthMode: true,
    torEnabled: false,
    filterLevel: 'standard',
    autoStart: false,
    minimizeToTray: true,
    showNotifications: true,
    proxyPort: 8080,
    socksPort: 9050
  }
});

// Global references
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let proxyProcess: ChildProcess | null = null;
let mitmproxyProcess: ChildProcess | null = null;
let isQuitting = false;

// Logging configuration
electronLog.transports.file.level = 'info';
electronLog.transports.console.level = 'debug';

class OblivionDesktop {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private proxyProcesses: Map<string, ChildProcess> = new Map();
  private isFilteringActive: boolean = false;

  constructor() {
    this.setupApp();
    this.setupIPC();
    this.setupAutoUpdater();
  }

  /**
   * Setup Electron app events and security
   */
  private setupApp(): void {
    // App event handlers
    app.whenReady().then(() => {
      this.createMainWindow();
      this.createTray();
      this.setupSecurityPolicies();
      
      // Initialize native components
      this.initializeNativeComponents();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.on('before-quit', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        this.gracefulShutdown();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (event, contents) => {
      contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      });

      contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== 'http://localhost:3000' && !isDev) {
          event.preventDefault();
        }
      });
    });
  }

  /**
   * Create main application window
   */
  private createMainWindow(): void {
    const { width, height } = store.get('windowBounds') as any;

    this.mainWindow = new BrowserWindow({
      width,
      height,
      minWidth: 800,
      minHeight: 600,
      icon: this.getAppIcon(),
      title: 'OblivionFilter Desktop',
      titleBarStyle: 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      show: false
    });

    // Load the app
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Window event handlers
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      if (isDev) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    this.mainWindow.on('close', (event) => {
      if (!isQuitting && store.get('minimizeToTray')) {
        event.preventDefault();
        this.mainWindow?.hide();
      } else {
        this.saveWindowBounds();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    mainWindow = this.mainWindow;
  }

  /**
   * Create system tray
   */
  private createTray(): void {
    const trayIcon = this.getTrayIcon();
    this.tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show OblivionFilter',
        click: () => {
          this.showMainWindow();
        }
      },
      { type: 'separator' },
      {
        label: 'Enable Filtering',
        type: 'checkbox',
        checked: this.isFilteringActive,
        click: (menuItem) => {
          this.toggleFiltering(menuItem.checked);
        }
      },
      {
        label: 'Stealth Mode',
        type: 'checkbox',
        checked: store.get('stealthMode') as boolean,
        click: (menuItem) => {
          store.set('stealthMode', menuItem.checked);
          this.updateConfiguration();
        }
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          this.showMainWindow();
          this.mainWindow?.webContents.send('navigate', '/settings');
        }
      },
      {
        label: 'About',
        click: () => {
          this.showAboutDialog();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit OblivionFilter',
        click: () => {
          this.gracefulShutdown();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('OblivionFilter - Privacy Protection');

    this.tray.on('click', () => {
      this.showMainWindow();
    });

    tray = this.tray;
  }

  /**
   * Setup IPC handlers for renderer communication
   */
  private setupIPC(): void {
    // Filtering control
    ipcMain.handle('toggle-filtering', async (event, enabled: boolean) => {
      return this.toggleFiltering(enabled);
    });

    ipcMain.handle('get-filtering-status', () => {
      return this.isFilteringActive;
    });

    // Configuration management
    ipcMain.handle('get-config', () => {
      return store.store;
    });

    ipcMain.handle('update-config', (event, config: any) => {
      Object.keys(config).forEach(key => {
        store.set(key, config[key]);
      });
      this.updateConfiguration();
      return true;
    });

    // Native proxy control
    ipcMain.handle('start-proxy', async (event, type: string, config: any) => {
      return this.startProxyService(type, config);
    });

    ipcMain.handle('stop-proxy', async (event, type: string) => {
      return this.stopProxyService(type);
    });

    // System integration
    ipcMain.handle('request-admin-privileges', async () => {
      return this.requestAdminPrivileges();
    });

    ipcMain.handle('install-certificates', async () => {
      return this.installCertificates();
    });

    // File operations
    ipcMain.handle('select-file', async (event, options: any) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, options);
      return result.filePaths;
    });

    ipcMain.handle('save-file', async (event, options: any, content: string) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, options);
      if (!result.canceled && result.filePath) {
        await fs.promises.writeFile(result.filePath, content);
        return result.filePath;
      }
      return null;
    });

    // External links
    ipcMain.handle('open-external', (event, url: string) => {
      shell.openExternal(url);
    });

    // App control
    ipcMain.handle('restart-app', () => {
      app.relaunch();
      app.exit();
    });

    ipcMain.handle('quit-app', () => {
      this.gracefulShutdown();
    });
  }

  /**
   * Setup auto-updater
   */
  private setupAutoUpdater(): void {
    autoUpdater.logger = electronLog;
    
    autoUpdater.on('checking-for-update', () => {
      electronLog.info('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      electronLog.info('Update available:', info);
      this.mainWindow?.webContents.send('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      electronLog.info('Update not available:', info);
    });

    autoUpdater.on('error', (err) => {
      electronLog.error('Auto updater error:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.mainWindow?.webContents.send('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      electronLog.info('Update downloaded:', info);
      this.mainWindow?.webContents.send('update-downloaded', info);
    });

    // Check for updates on startup (not in development)
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }

  /**
   * Setup security policies
   */
  private setupSecurityPolicies(): void {
    // Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' ws: wss: https:;"
          ]
        }
      });
    });

    // Block certain URLs
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url;
      
      // Block tracking and analytics
      const blockedDomains = [
        'google-analytics.com',
        'googletagmanager.com',
        'doubleclick.net',
        'facebook.com/tr'
      ];

      const shouldBlock = blockedDomains.some(domain => url.includes(domain));
      
      callback({ cancel: shouldBlock });
    });
  }

  /**
   * Initialize native proxy components
   */
  private async initializeNativeComponents(): Promise<void> {
    try {
      electronLog.info('Initializing native components...');

      // Check for native binaries
      const nativePath = this.getNativePath();
      const goProxyPath = path.join(nativePath, this.getProxyExecutable());
      const pythonProxyPath = path.join(nativePath, 'oblivion-mitmproxy.py');

      // Verify native components exist
      if (!fs.existsSync(goProxyPath)) {
        electronLog.warn('Go proxy binary not found:', goProxyPath);
      }

      if (!fs.existsSync(pythonProxyPath)) {
        electronLog.warn('Python proxy script not found:', pythonProxyPath);
      }

      electronLog.info('Native components initialized');
    } catch (error) {
      electronLog.error('Failed to initialize native components:', error);
    }
  }

  /**
   * Toggle filtering on/off
   */
  private async toggleFiltering(enabled: boolean): Promise<boolean> {
    try {
      if (enabled) {
        await this.startFiltering();
      } else {
        await this.stopFiltering();
      }

      this.isFilteringActive = enabled;
      store.set('filteringEnabled', enabled);

      // Update tray menu
      this.updateTrayMenu();

      // Notify renderer
      this.mainWindow?.webContents.send('filtering-status-changed', enabled);

      return true;
    } catch (error) {
      electronLog.error('Failed to toggle filtering:', error);
      return false;
    }
  }

  /**
   * Start filtering services
   */
  private async startFiltering(): Promise<void> {
    electronLog.info('Starting filtering services...');

    // Start Go proxy server
    await this.startProxyService('go-proxy', {
      port: store.get('proxyPort'),
      stealthMode: store.get('stealthMode')
    });

    // Start Python mitmproxy if enabled
    if (store.get('torEnabled')) {
      await this.startProxyService('mitmproxy', {
        port: store.get('socksPort')
      });
    }

    // Configure system proxy settings
    await this.configureSystemProxy(true);

    electronLog.info('Filtering services started');
  }

  /**
   * Stop filtering services
   */
  private async stopFiltering(): Promise<void> {
    electronLog.info('Stopping filtering services...');

    // Stop all proxy processes
    for (const [type, process] of this.proxyProcesses) {
      await this.stopProxyService(type);
    }

    // Restore system proxy settings
    await this.configureSystemProxy(false);

    electronLog.info('Filtering services stopped');
  }

  /**
   * Start proxy service
   */
  private async startProxyService(type: string, config: any): Promise<boolean> {
    try {
      const nativePath = this.getNativePath();
      let command: string;
      let args: string[] = [];

      switch (type) {
        case 'go-proxy':
          command = path.join(nativePath, this.getProxyExecutable());
          args = [
            '--port', config.port.toString(),
            '--stealth', config.stealthMode ? 'true' : 'false'
          ];
          break;

        case 'mitmproxy':
          command = 'python3';
          args = [
            path.join(nativePath, 'oblivion-mitmproxy.py'),
            '--port', config.port.toString()
          ];
          break;

        default:
          throw new Error(`Unknown proxy type: ${type}`);
      }

      // Check if already running
      if (this.proxyProcesses.has(type)) {
        electronLog.warn(`Proxy service ${type} already running`);
        return true;
      }

      // Start process
      const process = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      // Handle process events
      process.stdout?.on('data', (data) => {
        electronLog.info(`[${type}] ${data.toString().trim()}`);
      });

      process.stderr?.on('data', (data) => {
        electronLog.error(`[${type}] ${data.toString().trim()}`);
      });

      process.on('exit', (code) => {
        electronLog.info(`Proxy service ${type} exited with code ${code}`);
        this.proxyProcesses.delete(type);
      });

      process.on('error', (error) => {
        electronLog.error(`Proxy service ${type} error:`, error);
        this.proxyProcesses.delete(type);
      });

      this.proxyProcesses.set(type, process);
      electronLog.info(`Started proxy service: ${type}`);

      return true;
    } catch (error) {
      electronLog.error(`Failed to start proxy service ${type}:`, error);
      return false;
    }
  }

  /**
   * Stop proxy service
   */
  private async stopProxyService(type: string): Promise<boolean> {
    try {
      const process = this.proxyProcesses.get(type);
      if (!process) {
        return true;
      }

      process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 5000);

      this.proxyProcesses.delete(type);
      electronLog.info(`Stopped proxy service: ${type}`);

      return true;
    } catch (error) {
      electronLog.error(`Failed to stop proxy service ${type}:`, error);
      return false;
    }
  }

  /**
   * Configure system proxy settings
   */
  private async configureSystemProxy(enable: boolean): Promise<void> {
    const proxyPort = store.get('proxyPort') as number;
    const proxyUrl = `http://127.0.0.1:${proxyPort}`;

    try {
      switch (platform) {
        case 'win32':
          await this.configureWindowsProxy(enable, proxyUrl);
          break;
        case 'darwin':
          await this.configureMacOSProxy(enable, proxyUrl);
          break;
        case 'linux':
          await this.configureLinuxProxy(enable, proxyUrl);
          break;
      }
    } catch (error) {
      electronLog.error('Failed to configure system proxy:', error);
    }
  }

  /**
   * Request administrator privileges
   */
  private async requestAdminPrivileges(): Promise<boolean> {
    return new Promise((resolve) => {
      const options = {
        name: 'OblivionFilter Desktop',
        icns: this.getAppIcon()
      };

      sudo.exec('echo "Admin privileges granted"', options, (error) => {
        if (error) {
          electronLog.error('Failed to get admin privileges:', error);
          resolve(false);
        } else {
          electronLog.info('Admin privileges granted');
          resolve(true);
        }
      });
    });
  }

  /**
   * Install root certificates for HTTPS filtering
   */
  private async installCertificates(): Promise<boolean> {
    try {
      // Implementation depends on platform
      // This would install the mitmproxy certificates
      electronLog.info('Installing certificates...');
      
      // Platform-specific certificate installation
      switch (platform) {
        case 'win32':
          // Use certmgr.exe or PowerShell
          break;
        case 'darwin':
          // Use security command
          break;
        case 'linux':
          // Update ca-certificates
          break;
      }

      return true;
    } catch (error) {
      electronLog.error('Failed to install certificates:', error);
      return false;
    }
  }

  // Helper methods

  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    } else {
      this.createMainWindow();
    }
  }

  private saveWindowBounds(): void {
    if (this.mainWindow) {
      store.set('windowBounds', this.mainWindow.getBounds());
    }
  }

  private updateTrayMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show OblivionFilter',
        click: () => this.showMainWindow()
      },
      { type: 'separator' },
      {
        label: 'Enable Filtering',
        type: 'checkbox',
        checked: this.isFilteringActive,
        click: (menuItem) => this.toggleFiltering(menuItem.checked)
      },
      {
        label: 'Stealth Mode',
        type: 'checkbox',
        checked: store.get('stealthMode') as boolean,
        click: (menuItem) => {
          store.set('stealthMode', menuItem.checked);
          this.updateConfiguration();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit OblivionFilter',
        click: () => this.gracefulShutdown()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  private updateConfiguration(): void {
    // Send updated configuration to renderer
    this.mainWindow?.webContents.send('config-updated', store.store);
  }

  private showAboutDialog(): void {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'About OblivionFilter Desktop',
      message: 'OblivionFilter Desktop v2.0.0',
      detail: 'Enterprise-grade privacy filtering application\n\n' +
              'Built with Electron and native components\n' +
              'System-wide filtering with advanced stealth capabilities',
      buttons: ['OK']
    });
  }

  private async gracefulShutdown(): Promise<void> {
    isQuitting = true;
    
    try {
      electronLog.info('Starting graceful shutdown...');
      
      // Stop filtering
      if (this.isFilteringActive) {
        await this.stopFiltering();
      }

      // Cleanup
      await this.cleanup();

      electronLog.info('Graceful shutdown complete');
      app.quit();
    } catch (error) {
      electronLog.error('Error during shutdown:', error);
      app.quit();
    }
  }

  private async cleanup(): Promise<void> {
    // Stop all proxy processes
    for (const [type, process] of this.proxyProcesses) {
      try {
        process.kill('SIGTERM');
      } catch (error) {
        electronLog.error(`Error stopping ${type}:`, error);
      }
    }

    // Clear process map
    this.proxyProcesses.clear();

    // Destroy tray
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  // Platform-specific helpers

  private getAppIcon(): string {
    switch (platform) {
      case 'win32':
        return path.join(__dirname, '../resources/icon.ico');
      case 'darwin':
        return path.join(__dirname, '../resources/icon.icns');
      default:
        return path.join(__dirname, '../resources/icon.png');
    }
  }

  private getTrayIcon(): string {
    switch (platform) {
      case 'darwin':
        return path.join(__dirname, '../resources/trayTemplate.png');
      default:
        return path.join(__dirname, '../resources/tray.png');
    }
  }

  private getNativePath(): string {
    return path.join(process.resourcesPath, 'native');
  }

  private getProxyExecutable(): string {
    return platform === 'win32' ? 'oblivion-proxy.exe' : 'oblivion-proxy';
  }

  private async configureWindowsProxy(enable: boolean, proxyUrl: string): Promise<void> {
    // Windows registry-based proxy configuration
    const { exec } = require('child_process');
    const command = enable
      ? `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f && reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${proxyUrl}" /f`
      : `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`;
    
    exec(command, (error: any) => {
      if (error) {
        electronLog.error('Windows proxy configuration error:', error);
      }
    });
  }

  private async configureMacOSProxy(enable: boolean, proxyUrl: string): Promise<void> {
    // macOS networksetup-based proxy configuration
    const { exec } = require('child_process');
    const [host, port] = proxyUrl.replace('http://', '').split(':');
    
    const command = enable
      ? `networksetup -setwebproxy "Wi-Fi" ${host} ${port} && networksetup -setsecurewebproxy "Wi-Fi" ${host} ${port}`
      : `networksetup -setwebproxystate "Wi-Fi" off && networksetup -setsecurewebproxystate "Wi-Fi" off`;
    
    exec(command, (error: any) => {
      if (error) {
        electronLog.error('macOS proxy configuration error:', error);
      }
    });
  }

  private async configureLinuxProxy(enable: boolean, proxyUrl: string): Promise<void> {
    // Linux environment variable-based proxy configuration
    const proxyEnv = enable ? proxyUrl : '';
    
    process.env.http_proxy = proxyEnv;
    process.env.https_proxy = proxyEnv;
    process.env.HTTP_PROXY = proxyEnv;
    process.env.HTTPS_PROXY = proxyEnv;
  }
}

// Initialize the application
const oblivionDesktop = new OblivionDesktop();
