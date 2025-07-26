/**
 * OblivionFilter Load Testing Framework
 * Comprehensive performance and stress testing
 * Simulates high-traffic scenarios and measures system performance
 */

const http = require('http');
const https = require('https');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Load testing configuration
const LOAD_TEST_CONFIG = {
  scenarios: {
    light: { concurrent: 10, duration: 60000, requestsPerSecond: 5 },
    medium: { concurrent: 50, duration: 300000, requestsPerSecond: 20 },
    heavy: { concurrent: 100, duration: 600000, requestsPerSecond: 50 },
    stress: { concurrent: 500, duration: 300000, requestsPerSecond: 100 },
    spike: { concurrent: 1000, duration: 60000, requestsPerSecond: 200 }
  },
  endpoints: [
    'http://localhost:8080/health',
    'http://localhost:8080/stats',
    'http://localhost:8080/config',
    'https://example.com',
    'https://httpbin.org/get',
    'https://httpbin.org/json'
  ],
  metrics: {
    responseTime: [],
    throughput: 0,
    errorRate: 0,
    memoryUsage: [],
    cpuUsage: [],
    concurrentConnections: 0
  }
};

/**
 * Load testing orchestrator
 */
class LoadTestOrchestrator {
  constructor() {
    this.workers = [];
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      memoryUsage: [],
      cpuUsage: []
    };
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Run load test scenario
   */
  async runScenario(scenarioName) {
    const scenario = LOAD_TEST_CONFIG.scenarios[scenarioName];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }

    console.log(`🚀 Starting ${scenarioName} load test scenario...`);
    console.log(`Concurrent users: ${scenario.concurrent}`);
    console.log(`Duration: ${scenario.duration / 1000}s`);
    console.log(`Target RPS: ${scenario.requestsPerSecond}`);

    this.startTime = Date.now();
    
    // Start system monitoring
    const monitoringInterval = this.startSystemMonitoring();

    // Create worker threads for concurrent load generation
    const workerPromises = [];
    const workersCount = Math.min(scenario.concurrent, os.cpus().length * 2);
    const usersPerWorker = Math.ceil(scenario.concurrent / workersCount);

    for (let i = 0; i < workersCount; i++) {
      const workerPromise = this.createLoadWorker({
        workerId: i,
        concurrent: usersPerWorker,
        duration: scenario.duration,
        requestsPerSecond: Math.ceil(scenario.requestsPerSecond / workersCount),
        endpoints: LOAD_TEST_CONFIG.endpoints
      });
      workerPromises.push(workerPromise);
    }

    // Wait for all workers to complete
    const workerResults = await Promise.all(workerPromises);

    // Stop monitoring
    clearInterval(monitoringInterval);
    this.endTime = Date.now();

    // Aggregate results
    this.aggregateResults(workerResults);

    // Generate report
    const report = await this.generateReport(scenarioName);
    
    console.log(`✅ Load test completed in ${(this.endTime - this.startTime) / 1000}s`);
    return report;
  }

  /**
   * Create load testing worker
   */
  createLoadWorker(config) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { isWorker: true, config }
      });

      worker.on('message', (result) => {
        resolve(result);
      });

      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      this.workers.push(worker);
    });
  }

  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    return setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      this.results.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
        heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
        external: memUsage.external / 1024 / 1024, // MB
        rss: memUsage.rss / 1024 / 1024 // MB
      });

      this.results.cpuUsage.push({
        timestamp: Date.now(),
        user: cpuUsage.user / 1000, // ms
        system: cpuUsage.system / 1000 // ms
      });
    }, 1000);
  }

  /**
   * Aggregate results from all workers
   */
  aggregateResults(workerResults) {
    let totalResponseTime = 0;
    let responseTimes = [];

    for (const result of workerResults) {
      this.results.totalRequests += result.totalRequests;
      this.results.successfulRequests += result.successfulRequests;
      this.results.failedRequests += result.failedRequests;
      
      totalResponseTime += result.totalResponseTime;
      responseTimes = responseTimes.concat(result.responseTimes);
      
      this.results.minResponseTime = Math.min(this.results.minResponseTime, result.minResponseTime);
      this.results.maxResponseTime = Math.max(this.results.maxResponseTime, result.maxResponseTime);
    }

    this.results.averageResponseTime = totalResponseTime / this.results.totalRequests;
    this.results.errorRate = (this.results.failedRequests / this.results.totalRequests) * 100;
    
    const testDurationSeconds = (this.endTime - this.startTime) / 1000;
    this.results.throughput = this.results.successfulRequests / testDurationSeconds;

    // Calculate percentiles
    responseTimes.sort((a, b) => a - b);
    this.results.percentiles = {
      p50: this.calculatePercentile(responseTimes, 50),
      p75: this.calculatePercentile(responseTimes, 75),
      p90: this.calculatePercentile(responseTimes, 90),
      p95: this.calculatePercentile(responseTimes, 95),
      p99: this.calculatePercentile(responseTimes, 99)
    };
  }

  /**
   * Calculate percentile from response times
   */
  calculatePercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index] || 0;
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(scenarioName) {
    const report = {
      scenario: scenarioName,
      timestamp: new Date().toISOString(),
      duration: this.endTime - this.startTime,
      results: this.results,
      summary: {
        totalRequests: this.results.totalRequests,
        successRate: ((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2),
        errorRate: this.results.errorRate.toFixed(2),
        averageResponseTime: this.results.averageResponseTime.toFixed(2),
        throughput: this.results.throughput.toFixed(2),
        maxMemoryUsage: Math.max(...this.results.memoryUsage.map(m => m.heapUsed)).toFixed(2)
      }
    };

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    
    // Save report
    const reportPath = path.join(__dirname, `../reports/load-test-${scenarioName}-${Date.now()}.md`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, markdownReport);

    console.log(`📊 Load test report saved: ${reportPath}`);
    return report;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    return `
# OblivionFilter Load Test Report - ${report.scenario}

**Generated:** ${report.timestamp}  
**Duration:** ${(report.duration / 1000).toFixed(2)} seconds

## Summary

| Metric | Value |
|--------|-------|
| Total Requests | ${report.results.totalRequests} |
| Successful Requests | ${report.results.successfulRequests} |
| Failed Requests | ${report.results.failedRequests} |
| Success Rate | ${report.summary.successRate}% |
| Error Rate | ${report.summary.errorRate}% |
| Throughput | ${report.summary.throughput} req/s |

## Response Time Statistics

| Metric | Value (ms) |
|--------|------------|
| Average | ${report.results.averageResponseTime.toFixed(2)} |
| Minimum | ${report.results.minResponseTime} |
| Maximum | ${report.results.maxResponseTime} |
| 50th Percentile | ${report.results.percentiles.p50} |
| 75th Percentile | ${report.results.percentiles.p75} |
| 90th Percentile | ${report.results.percentiles.p90} |
| 95th Percentile | ${report.results.percentiles.p95} |
| 99th Percentile | ${report.results.percentiles.p99} |

## Resource Usage

### Memory Usage
- Maximum Heap Used: ${report.summary.maxMemoryUsage} MB
- Average Heap Used: ${(report.results.memoryUsage.reduce((acc, m) => acc + m.heapUsed, 0) / report.results.memoryUsage.length).toFixed(2)} MB

### CPU Usage
- Total User Time: ${report.results.cpuUsage.reduce((acc, c) => acc + c.user, 0).toFixed(2)} ms
- Total System Time: ${report.results.cpuUsage.reduce((acc, c) => acc + c.system, 0).toFixed(2)} ms

## Performance Benchmarks

### Acceptable Thresholds
- ✅ Error Rate < 1%: ${report.summary.errorRate < 1 ? 'PASS' : 'FAIL'}
- ✅ Average Response Time < 1000ms: ${report.results.averageResponseTime < 1000 ? 'PASS' : 'FAIL'}
- ✅ 95th Percentile < 2000ms: ${report.results.percentiles.p95 < 2000 ? 'PASS' : 'FAIL'}
- ✅ Memory Usage < 512MB: ${report.summary.maxMemoryUsage < 512 ? 'PASS' : 'FAIL'}

## Recommendations

${this.generateRecommendations(report)}

---
*Generated by OblivionFilter Load Testing Framework*
    `;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(report) {
    const recommendations = [];

    if (report.summary.errorRate > 1) {
      recommendations.push('- **High Error Rate**: Investigate failing requests and improve error handling');
    }

    if (report.results.averageResponseTime > 1000) {
      recommendations.push('- **High Response Time**: Optimize request processing and consider caching');
    }

    if (report.summary.maxMemoryUsage > 512) {
      recommendations.push('- **High Memory Usage**: Investigate memory leaks and optimize memory allocation');
    }

    if (report.results.percentiles.p95 > 2000) {
      recommendations.push('- **High 95th Percentile**: Optimize worst-case scenarios and reduce variance');
    }

    if (recommendations.length === 0) {
      recommendations.push('- ✅ **Excellent Performance**: All metrics are within acceptable thresholds');
    }

    return recommendations.join('\n');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.workers.forEach(worker => {
      worker.terminate();
    });
    this.workers = [];
  }
}

/**
 * Worker thread implementation for load generation
 */
class LoadTestWorker {
  constructor(config) {
    this.config = config;
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      responseTimes: [],
      minResponseTime: Infinity,
      maxResponseTime: 0
    };
  }

  /**
   * Execute load test
   */
  async execute() {
    const endTime = Date.now() + this.config.duration;
    const requestInterval = 1000 / this.config.requestsPerSecond;
    
    const promises = [];
    
    // Generate load for specified duration
    while (Date.now() < endTime) {
      const startTime = Date.now();
      
      // Create concurrent requests
      for (let i = 0; i < this.config.concurrent && Date.now() < endTime; i++) {
        const endpoint = this.config.endpoints[Math.floor(Math.random() * this.config.endpoints.length)];
        promises.push(this.makeRequest(endpoint));
      }

      // Wait for request interval
      const elapsedTime = Date.now() - startTime;
      const waitTime = Math.max(0, requestInterval - elapsedTime);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Wait for all requests to complete
    await Promise.allSettled(promises);

    return this.results;
  }

  /**
   * Make HTTP request and measure performance
   */
  async makeRequest(url) {
    const startTime = Date.now();
    
    try {
      await this.httpRequest(url);
      
      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime);
    } catch (error) {
      this.recordFailure();
    }
  }

  /**
   * Make HTTP request
   */
  httpRequest(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'OblivionFilter Load Test/2.0'
        }
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Record successful request
   */
  recordSuccess(responseTime) {
    this.results.totalRequests++;
    this.results.successfulRequests++;
    this.results.totalResponseTime += responseTime;
    this.results.responseTimes.push(responseTime);
    this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
  }

  /**
   * Record failed request
   */
  recordFailure() {
    this.results.totalRequests++;
    this.results.failedRequests++;
  }
}

// Worker thread entry point
if (!isMainThread && workerData?.isWorker) {
  (async () => {
    const worker = new LoadTestWorker(workerData.config);
    const results = await worker.execute();
    parentPort.postMessage(results);
  })().catch(error => {
    console.error('Worker error:', error);
    process.exit(1);
  });
}

// CLI interface
if (require.main === module) {
  const scenario = process.argv[2] || 'light';
  const orchestrator = new LoadTestOrchestrator();
  
  orchestrator.runScenario(scenario)
    .then(report => {
      console.log('\n📊 Load Test Results:');
      console.log(`Success Rate: ${report.summary.successRate}%`);
      console.log(`Error Rate: ${report.summary.errorRate}%`);
      console.log(`Throughput: ${report.summary.throughput} req/s`);
      console.log(`Average Response Time: ${report.summary.averageResponseTime}ms`);
      
      orchestrator.cleanup();
      process.exit(0);
    })
    .catch(error => {
      console.error('Load test failed:', error);
      orchestrator.cleanup();
      process.exit(1);
    });
}

module.exports = {
  LoadTestOrchestrator,
  LoadTestWorker,
  LOAD_TEST_CONFIG
};
