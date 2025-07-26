import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for OblivionFilter
 * Cross-browser testing configuration with comprehensive coverage
 */

export default defineConfig({
  testDir: './integration',
  outputDir: './reports/playwright-results',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: './reports/playwright-html' }],
    ['json', { outputFile: './reports/playwright-results.json' }],
    ['junit', { outputFile: './reports/playwright-junit.xml' }],
    ['list']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:8080',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Global timeout for each test
    actionTimeout: 30000,
    
    // Timeout for navigation
    navigationTimeout: 30000,
    
    // Accept downloads
    acceptDownloads: true,
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // User agent
    userAgent: 'OblivionFilter-Test-Agent/2.0',
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'X-Test-Source': 'OblivionFilter-Playwright'
    }
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome-specific configuration
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific configuration
        launchOptions: {
          firefoxUserPrefs: {
            'security.tls.insecure_fallback_hosts': 'localhost',
            'security.tls.min_version': 1,
            'network.cookie.sameSite.laxByDefault': false
          }
        }
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // WebKit-specific configuration
      },
    },

    // Test against mobile viewports
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
      },
    },

    // Test against branded browsers
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
    },
    {
      name: 'Google Chrome',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'chrome' 
      },
    },
  ],

  // Global setup/teardown
  globalSetup: require.resolve('./integration/global-setup.ts'),
  globalTeardown: require.resolve('./integration/global-teardown.ts'),

  // Test timeout
  timeout: 60000,
  
  // Expect timeout
  expect: {
    timeout: 10000,
    
    // Custom matchers timeout
    toHaveScreenshot: { 
      threshold: 0.2,
      mode: 'strict'
    },
    
    toMatchAriaSnapshot: {
      mode: 'strict'
    }
  },

  // Web server configuration for local development
  webServer: {
    command: 'npm run start:test',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test'
    }
  },

  // Test metadata
  metadata: {
    project: 'OblivionFilter',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'test',
    testSuite: 'Integration Tests'
  }
});
