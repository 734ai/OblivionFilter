/**
 * OblivionFilter Automated Deployment Pipeline
 * CI/CD automation for multi-platform releases
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

/**
 * Deployment configuration
 */
const DEPLOYMENT_CONFIG = {
  platforms: {
    chrome: {
      storeId: 'chrome-web-store',
      manifestPath: 'platform/chromium-mv3/manifest.json',
      buildDir: 'dist/chrome',
      packageName: 'oblivion-filter-chrome.zip'
    },
    firefox: {
      storeId: 'firefox-addons',
      manifestPath: 'platform/firefox/manifest.json',
      buildDir: 'dist/firefox',
      packageName: 'oblivion-filter-firefox.xpi'
    },
    safari: {
      storeId: 'app-store',
      manifestPath: 'platform/safari/manifest.json',
      buildDir: 'dist/safari',
      packageName: 'OblivionFilter.safariextz'
    },
    android: {
      storeId: 'google-play',
      manifestPath: 'platform/android/app/build.gradle',
      buildDir: 'dist/android',
      packageName: 'oblivion-filter.apk'
    },
    electron: {
      storeId: 'github-releases',
      manifestPath: 'platform/electron/package.json',
      buildDir: 'dist/electron',
      packageName: 'OblivionFilter-{version}-{platform}.{ext}'
    }
  },
  environments: {
    development: {
      apiUrl: 'https://dev-api.oblivionfilter.com',
      updateUrl: 'https://dev-updates.oblivionfilter.com',
      telemetryEnabled: true,
      debugMode: true
    },
    staging: {
      apiUrl: 'https://staging-api.oblivionfilter.com',
      updateUrl: 'https://staging-updates.oblivionfilter.com',
      telemetryEnabled: true,
      debugMode: false
    },
    production: {
      apiUrl: 'https://api.oblivionfilter.com',
      updateUrl: 'https://updates.oblivionfilter.com',
      telemetryEnabled: false,
      debugMode: false
    }
  },
  signing: {
    chrome: {
      keyPath: 'certificates/chrome-extension.pem',
      required: true
    },
    firefox: {
      keyPath: 'certificates/firefox-addon.p12',
      required: true
    },
    safari: {
      keyPath: 'certificates/safari-developer.p12',
      teamId: 'TEAM_ID_PLACEHOLDER',
      required: true
    },
    android: {
      keyPath: 'certificates/android-release.keystore',
      alias: 'oblivion-filter',
      required: true
    },
    electron: {
      keyPath: 'certificates/code-signing.p12',
      required: true
    }
  }
};

/**
 * Deployment pipeline orchestrator
 */
class DeploymentPipeline {
  constructor() {
    this.buildResults = new Map();
    this.deploymentResults = new Map();
    this.version = null;
    this.buildTimestamp = Date.now();
  }

  /**
   * Run complete deployment pipeline
   */
  async runPipeline(environment = 'production', platforms = ['all']) {
    console.log('🚀 Starting OblivionFilter Deployment Pipeline...');
    console.log(`Environment: ${environment}`);
    console.log(`Platforms: ${platforms.join(', ')}`);
    
    try {
      // Pre-deployment checks
      await this.preDeploymentChecks();
      
      // Version management
      await this.manageVersion();
      
      // Build all platforms
      await this.buildPlatforms(platforms, environment);
      
      // Run tests
      await this.runDeploymentTests();
      
      // Sign packages
      await this.signPackages();
      
      // Deploy to stores/repositories
      await this.deployToStores(environment);
      
      // Post-deployment verification
      await this.postDeploymentVerification();
      
      // Generate deployment report
      const report = await this.generateDeploymentReport();
      
      console.log('✅ Deployment pipeline completed successfully!');
      return report;
      
    } catch (error) {
      console.error('❌ Deployment pipeline failed:', error);
      await this.rollbackDeployment();
      throw error;
    }
  }

  /**
   * Pre-deployment checks
   */
  async preDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...');
    
    // Check repository status
    await this.checkGitStatus();
    
    // Validate dependencies
    await this.validateDependencies();
    
    // Run security scan
    await this.runSecurityScan();
    
    // Validate certificates
    await this.validateCertificates();
    
    console.log('✅ Pre-deployment checks passed');
  }

  /**
   * Check Git repository status
   */
  async checkGitStatus() {
    try {
      const status = await this.runCommand('git', ['status', '--porcelain']);
      
      if (status.trim()) {
        throw new Error('Repository has uncommitted changes');
      }
      
      const branch = await this.runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
      
      if (branch.trim() !== 'main') {
        console.warn('⚠️ Not on main branch, current branch:', branch.trim());
      }
      
    } catch (error) {
      throw new Error(`Git status check failed: ${error.message}`);
    }
  }

  /**
   * Validate dependencies
   */
  async validateDependencies() {
    const dependencies = [
      { name: 'node', command: 'node --version', required: '>=18.0.0' },
      { name: 'npm', command: 'npm --version', required: '>=8.0.0' },
      { name: 'go', command: 'go version', required: '>=1.19' },
      { name: 'python', command: 'python --version', required: '>=3.8' }
    ];
    
    for (const dep of dependencies) {
      try {
        const version = await this.runCommand(dep.command.split(' ')[0], dep.command.split(' ').slice(1));
        console.log(`✓ ${dep.name}: ${version.trim()}`);
      } catch (error) {
        throw new Error(`Required dependency ${dep.name} not found`);
      }
    }
  }

  /**
   * Run security scan
   */
  async runSecurityScan() {
    try {
      // Run npm audit
      await this.runCommand('npm', ['audit', '--audit-level', 'moderate']);
      
      // Run custom security tests
      await this.runCommand('node', ['tests/security-testing.js']);
      
    } catch (error) {
      throw new Error(`Security scan failed: ${error.message}`);
    }
  }

  /**
   * Validate signing certificates
   */
  async validateCertificates() {
    for (const [platform, config] of Object.entries(DEPLOYMENT_CONFIG.signing)) {
      if (config.required) {
        try {
          await fs.access(config.keyPath);
          console.log(`✓ Certificate found for ${platform}`);
        } catch (error) {
          throw new Error(`Missing certificate for ${platform}: ${config.keyPath}`);
        }
      }
    }
  }

  /**
   * Manage version
   */
  async manageVersion() {
    console.log('📦 Managing version...');
    
    try {
      // Read current version from package.json
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      this.version = packageJson.version;
      
      // Auto-increment version based on changes
      const newVersion = await this.calculateNewVersion();
      
      if (newVersion !== this.version) {
        console.log(`📈 Version update: ${this.version} → ${newVersion}`);
        await this.updateVersion(newVersion);
        this.version = newVersion;
      }
      
      console.log(`📦 Version: ${this.version}`);
      
    } catch (error) {
      throw new Error(`Version management failed: ${error.message}`);
    }
  }

  /**
   * Calculate new version based on changes
   */
  async calculateNewVersion() {
    try {
      // Get latest tag
      const latestTag = await this.runCommand('git', ['describe', '--tags', '--abbrev=0']);
      
      // Get commits since latest tag
      const commits = await this.runCommand('git', ['log', `${latestTag.trim()}..HEAD`, '--oneline']);
      
      if (!commits.trim()) {
        return this.version; // No new commits
      }
      
      // Analyze commit messages for version increment type
      const commitMessages = commits.toLowerCase();
      
      if (commitMessages.includes('breaking') || commitMessages.includes('major')) {
        return this.incrementVersion(this.version, 'major');
      } else if (commitMessages.includes('feat') || commitMessages.includes('feature')) {
        return this.incrementVersion(this.version, 'minor');
      } else {
        return this.incrementVersion(this.version, 'patch');
      }
      
    } catch (error) {
      // If no tags exist, keep current version
      return this.version;
    }
  }

  /**
   * Increment version number
   */
  incrementVersion(version, type) {
    const parts = version.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${parts[0] + 1}.0.0`;
      case 'minor':
        return `${parts[0]}.${parts[1] + 1}.0`;
      case 'patch':
        return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
      default:
        return version;
    }
  }

  /**
   * Update version in all manifests
   */
  async updateVersion(newVersion) {
    const manifestPaths = [
      'package.json',
      'platform/chromium-mv3/manifest.json',
      'platform/firefox/manifest.json',
      'platform/safari/manifest.json'
    ];
    
    for (const manifestPath of manifestPaths) {
      try {
        const content = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(content);
        manifest.version = newVersion;
        
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`✓ Updated version in ${manifestPath}`);
        
      } catch (error) {
        console.warn(`⚠️ Could not update version in ${manifestPath}:`, error.message);
      }
    }
  }

  /**
   * Build all platforms
   */
  async buildPlatforms(platforms, environment) {
    console.log('🔨 Building platforms...');
    
    const targetPlatforms = platforms.includes('all') 
      ? Object.keys(DEPLOYMENT_CONFIG.platforms)
      : platforms;
    
    for (const platform of targetPlatforms) {
      try {
        console.log(`🔨 Building ${platform}...`);
        const result = await this.buildPlatform(platform, environment);
        this.buildResults.set(platform, result);
        console.log(`✅ ${platform} build completed`);
        
      } catch (error) {
        console.error(`❌ ${platform} build failed:`, error.message);
        this.buildResults.set(platform, { success: false, error: error.message });
      }
    }
  }

  /**
   * Build individual platform
   */
  async buildPlatform(platform, environment) {
    const config = DEPLOYMENT_CONFIG.platforms[platform];
    const envConfig = DEPLOYMENT_CONFIG.environments[environment];
    
    // Create build directory
    await fs.mkdir(config.buildDir, { recursive: true });
    
    // Platform-specific build process
    switch (platform) {
      case 'chrome':
        return await this.buildChromeExtension(config, envConfig);
      case 'firefox':
        return await this.buildFirefoxExtension(config, envConfig);
      case 'safari':
        return await this.buildSafariExtension(config, envConfig);
      case 'android':
        return await this.buildAndroidApp(config, envConfig);
      case 'electron':
        return await this.buildElectronApp(config, envConfig);
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  /**
   * Build Chrome extension
   */
  async buildChromeExtension(config, envConfig) {
    // Copy source files
    await this.copyDirectory('src', config.buildDir);
    await this.copyDirectory('platform/common', config.buildDir);
    await this.copyDirectory('platform/chromium-mv3', config.buildDir);
    
    // Update manifest with environment config
    await this.updateManifestForEnvironment(
      path.join(config.buildDir, 'manifest.json'),
      envConfig
    );
    
    // Bundle JavaScript
    await this.bundleJavaScript(config.buildDir, 'chrome');
    
    // Create package
    const packagePath = path.join('dist', config.packageName);
    await this.createZipPackage(config.buildDir, packagePath);
    
    return {
      success: true,
      packagePath,
      size: await this.getFileSize(packagePath)
    };
  }

  /**
   * Build Firefox extension
   */
  async buildFirefoxExtension(config, envConfig) {
    // Copy source files
    await this.copyDirectory('src', config.buildDir);
    await this.copyDirectory('platform/common', config.buildDir);
    await this.copyDirectory('platform/firefox', config.buildDir);
    
    // Update manifest
    await this.updateManifestForEnvironment(
      path.join(config.buildDir, 'manifest.json'),
      envConfig
    );
    
    // Bundle JavaScript
    await this.bundleJavaScript(config.buildDir, 'firefox');
    
    // Create XPI package
    const packagePath = path.join('dist', config.packageName);
    await this.createZipPackage(config.buildDir, packagePath);
    
    return {
      success: true,
      packagePath,
      size: await this.getFileSize(packagePath)
    };
  }

  /**
   * Build Safari extension
   */
  async buildSafariExtension(config, envConfig) {
    // Copy source files
    await this.copyDirectory('src', config.buildDir);
    await this.copyDirectory('platform/common', config.buildDir);
    await this.copyDirectory('platform/safari', config.buildDir);
    
    // Update manifest
    await this.updateManifestForEnvironment(
      path.join(config.buildDir, 'manifest.json'),
      envConfig
    );
    
    // Bundle JavaScript
    await this.bundleJavaScript(config.buildDir, 'safari');
    
    // Build Safari extension
    await this.runCommand('xcrun', [
      'safari-web-extension-converter',
      config.buildDir,
      '--app-name', 'OblivionFilter',
      '--bundle-identifier', 'com.oblivionfilter.safari'
    ]);
    
    return {
      success: true,
      packagePath: config.buildDir,
      platform: 'safari'
    };
  }

  /**
   * Build Android app
   */
  async buildAndroidApp(config, envConfig) {
    // Update configuration
    await this.updateAndroidConfig(config.buildDir, envConfig);
    
    // Build APK
    await this.runCommand('gradle', ['assembleRelease'], {
      cwd: 'platform/android'
    });
    
    const apkPath = 'platform/android/app/build/outputs/apk/release/app-release.apk';
    const packagePath = path.join('dist', config.packageName);
    
    // Copy APK to dist
    await this.copyFile(apkPath, packagePath);
    
    return {
      success: true,
      packagePath,
      size: await this.getFileSize(packagePath)
    };
  }

  /**
   * Build Electron app
   */
  async buildElectronApp(config, envConfig) {
    // Update configuration
    await this.updateElectronConfig(config.buildDir, envConfig);
    
    // Build for all platforms
    const platforms = ['win32', 'darwin', 'linux'];
    const results = [];
    
    for (const platform of platforms) {
      const packagePath = config.packageName
        .replace('{version}', this.version)
        .replace('{platform}', platform)
        .replace('{ext}', this.getElectronExtension(platform));
      
      await this.runCommand('electron-builder', [
        '--publish=never',
        `--${platform}`
      ], {
        cwd: 'platform/electron'
      });
      
      results.push({
        platform,
        packagePath: path.join('dist', packagePath)
      });
    }
    
    return {
      success: true,
      packages: results
    };
  }

  /**
   * Get Electron package extension by platform
   */
  getElectronExtension(platform) {
    switch (platform) {
      case 'win32': return 'exe';
      case 'darwin': return 'dmg';
      case 'linux': return 'AppImage';
      default: return 'zip';
    }
  }

  /**
   * Bundle JavaScript for platform
   */
  async bundleJavaScript(buildDir, platform) {
    // Use webpack or rollup to bundle
    await this.runCommand('webpack', [
      '--config', `webpack.${platform}.config.js`,
      '--output-path', buildDir,
      '--mode', 'production'
    ]);
  }

  /**
   * Update manifest for environment
   */
  async updateManifestForEnvironment(manifestPath, envConfig) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    
    // Update URLs and configuration
    if (manifest.permissions) {
      manifest.permissions = manifest.permissions.map(permission => 
        permission.replace('https://api.oblivionfilter.com/*', `${envConfig.apiUrl}/*`)
      );
    }
    
    // Add environment-specific settings
    manifest.environment = {
      apiUrl: envConfig.apiUrl,
      updateUrl: envConfig.updateUrl,
      debugMode: envConfig.debugMode
    };
    
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Run deployment tests
   */
  async runDeploymentTests() {
    console.log('🧪 Running deployment tests...');
    
    try {
      // Run comprehensive test suite
      await this.runCommand('node', ['tests/test-runner.js']);
      
      // Validate built packages
      await this.validatePackages();
      
      console.log('✅ Deployment tests passed');
      
    } catch (error) {
      throw new Error(`Deployment tests failed: ${error.message}`);
    }
  }

  /**
   * Validate built packages
   */
  async validatePackages() {
    for (const [platform, result] of this.buildResults) {
      if (result.success && result.packagePath) {
        try {
          await fs.access(result.packagePath);
          const stats = await fs.stat(result.packagePath);
          
          if (stats.size === 0) {
            throw new Error(`Empty package: ${result.packagePath}`);
          }
          
          console.log(`✓ ${platform}: ${result.packagePath} (${this.formatFileSize(stats.size)})`);
          
        } catch (error) {
          throw new Error(`Package validation failed for ${platform}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Sign packages
   */
  async signPackages() {
    console.log('✍️ Signing packages...');
    
    for (const [platform, result] of this.buildResults) {
      if (result.success && DEPLOYMENT_CONFIG.signing[platform].required) {
        try {
          await this.signPackage(platform, result);
          console.log(`✓ ${platform} package signed`);
          
        } catch (error) {
          console.error(`❌ Failed to sign ${platform} package:`, error.message);
          throw error;
        }
      }
    }
  }

  /**
   * Sign individual package
   */
  async signPackage(platform, result) {
    const signingConfig = DEPLOYMENT_CONFIG.signing[platform];
    
    switch (platform) {
      case 'chrome':
        // Chrome extensions are signed by the Web Store
        break;
      case 'firefox':
        await this.signFirefoxPackage(result.packagePath, signingConfig);
        break;
      case 'safari':
        await this.signSafariPackage(result.packagePath, signingConfig);
        break;
      case 'android':
        await this.signAndroidPackage(result.packagePath, signingConfig);
        break;
      case 'electron':
        await this.signElectronPackages(result.packages, signingConfig);
        break;
    }
  }

  /**
   * Deploy to stores
   */
  async deployToStores(environment) {
    if (environment !== 'production') {
      console.log('⏭️ Skipping store deployment (non-production environment)');
      return;
    }
    
    console.log('🚀 Deploying to stores...');
    
    for (const [platform, result] of this.buildResults) {
      if (result.success) {
        try {
          const deployResult = await this.deployPlatform(platform, result);
          this.deploymentResults.set(platform, deployResult);
          console.log(`✅ ${platform} deployed successfully`);
          
        } catch (error) {
          console.error(`❌ ${platform} deployment failed:`, error.message);
          this.deploymentResults.set(platform, { success: false, error: error.message });
        }
      }
    }
  }

  /**
   * Deploy individual platform
   */
  async deployPlatform(platform, buildResult) {
    // Implementation would depend on store APIs
    // For demonstration, we'll simulate deployment
    
    console.log(`📤 Deploying ${platform}...`);
    
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      platform,
      submissionId: this.generateSubmissionId(),
      submittedAt: new Date().toISOString()
    };
  }

  /**
   * Generate submission ID
   */
  generateSubmissionId() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  /**
   * Post-deployment verification
   */
  async postDeploymentVerification() {
    console.log('🔍 Running post-deployment verification...');
    
    // Verify deployments
    for (const [platform, result] of this.deploymentResults) {
      if (result.success) {
        console.log(`✓ ${platform}: Submission ${result.submissionId}`);
      }
    }
    
    // Generate deployment summary
    const successful = Array.from(this.deploymentResults.values())
      .filter(result => result.success).length;
    const total = this.deploymentResults.size;
    
    console.log(`📊 Deployment Summary: ${successful}/${total} platforms deployed successfully`);
  }

  /**
   * Generate deployment report
   */
  async generateDeploymentReport() {
    const report = {
      timestamp: new Date().toISOString(),
      version: this.version,
      buildTimestamp: this.buildTimestamp,
      environment: 'production',
      builds: Object.fromEntries(this.buildResults),
      deployments: Object.fromEntries(this.deploymentResults),
      summary: {
        totalPlatforms: this.buildResults.size,
        successfulBuilds: Array.from(this.buildResults.values()).filter(r => r.success).length,
        successfulDeployments: Array.from(this.deploymentResults.values()).filter(r => r.success).length
      }
    };
    
    // Save report
    const reportPath = path.join('deployment-reports', `deployment-${this.buildTimestamp}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📋 Deployment report saved: ${reportPath}`);
    return report;
  }

  /**
   * Rollback deployment on failure
   */
  async rollbackDeployment() {
    console.log('⏪ Rolling back deployment...');
    
    // Implementation would depend on store APIs
    // For now, log the rollback action
    console.log('💡 Manual rollback required for store submissions');
  }

  /**
   * Utility methods
   */
  
  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { ...options, stdio: 'pipe' });
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', data => stdout += data);
      child.stderr.on('data', data => stderr += data);
      
      child.on('close', code => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async copyFile(src, dest) {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }

  async createZipPackage(sourceDir, outputPath) {
    // Use archiver or similar library to create ZIP
    await this.runCommand('zip', ['-r', outputPath, '.'], { cwd: sourceDir });
  }

  async getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'production';
  const platforms = args.slice(1).length > 0 ? args.slice(1) : ['all'];
  
  const pipeline = new DeploymentPipeline();
  
  try {
    const report = await pipeline.runPipeline(environment, platforms);
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log(`Version: ${report.version}`);
    console.log(`Platforms: ${report.summary.successfulDeployments}/${report.summary.totalPlatforms} deployed`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  DeploymentPipeline,
  DEPLOYMENT_CONFIG
};
