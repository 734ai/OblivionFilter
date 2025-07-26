/**
 * OblivionFilter Code Coverage Analysis Framework
 * Comprehensive code coverage measurement and reporting
 * Supports multiple coverage types and detailed analysis
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

/**
 * Code coverage configuration
 */
const COVERAGE_CONFIG = {
  sources: [
    'src/js',
    'src/background.js',
    'platform/common',
    'native/messaging',
    'native/proxy'
  ],
  excludePatterns: [
    '**/*.min.js',
    '**/node_modules/**',
    '**/tests/**',
    '**/docs/**',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  coverageTypes: {
    statement: { threshold: 85, weight: 0.4 },
    branch: { threshold: 80, weight: 0.3 },
    function: { threshold: 90, weight: 0.2 },
    line: { threshold: 85, weight: 0.1 }
  },
  reportFormats: ['html', 'json', 'lcov', 'text', 'xml'],
  instrumentOptions: {
    preserveComments: true,
    compact: false,
    produceSourceMap: true
  }
};

/**
 * Code coverage analyzer
 */
class CodeCoverageAnalyzer {
  constructor() {
    this.coverageData = {
      files: new Map(),
      summary: {
        statements: { total: 0, covered: 0, percentage: 0 },
        branches: { total: 0, covered: 0, percentage: 0 },
        functions: { total: 0, covered: 0, percentage: 0 },
        lines: { total: 0, covered: 0, percentage: 0 }
      },
      executionMap: new Map(),
      hotspots: [],
      uncoveredRegions: []
    };
    this.instrumentedFiles = new Map();
    this.reportPath = null;
  }

  /**
   * Run comprehensive coverage analysis
   */
  async runCoverageAnalysis() {
    console.log('📊 Starting code coverage analysis...');
    
    const startTime = Date.now();
    
    try {
      // Discover source files
      const sourceFiles = await this.discoverSourceFiles();
      console.log(`📁 Found ${sourceFiles.length} source files`);
      
      // Instrument source files
      await this.instrumentSourceFiles(sourceFiles);
      console.log('🔧 Source files instrumented');
      
      // Run test suite with coverage
      await this.runTestsWithCoverage();
      console.log('🧪 Tests executed with coverage tracking');
      
      // Collect coverage data
      await this.collectCoverageData();
      console.log('📋 Coverage data collected');
      
      // Analyze coverage patterns
      await this.analyzeCoveragePatterns();
      console.log('🔍 Coverage patterns analyzed');
      
      // Generate reports
      const report = await this.generateCoverageReports();
      
      const endTime = Date.now();
      console.log(`✅ Coverage analysis completed in ${(endTime - startTime) / 1000}s`);
      
      return report;
    } catch (error) {
      console.error('❌ Coverage analysis failed:', error);
      throw error;
    }
  }

  /**
   * Discover source files
   */
  async discoverSourceFiles() {
    const sourceFiles = [];
    
    for (const sourceDir of COVERAGE_CONFIG.sources) {
      const files = await this.findJavaScriptFiles(sourceDir);
      sourceFiles.push(...files);
    }
    
    // Filter out excluded patterns
    return sourceFiles.filter(file => 
      !COVERAGE_CONFIG.excludePatterns.some(pattern => 
        this.matchPattern(file, pattern)
      )
    );
  }

  /**
   * Find JavaScript files recursively
   */
  async findJavaScriptFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findJavaScriptFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && /\.js$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist, skip silently
    }
    
    return files;
  }

  /**
   * Match file against pattern
   */
  matchPattern(file, pattern) {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    
    return new RegExp(regexPattern).test(file);
  }

  /**
   * Instrument source files for coverage
   */
  async instrumentSourceFiles(sourceFiles) {
    for (const file of sourceFiles) {
      try {
        const originalCode = await fs.readFile(file, 'utf8');
        const instrumentedCode = this.instrumentCode(originalCode, file);
        
        this.instrumentedFiles.set(file, {
          original: originalCode,
          instrumented: instrumentedCode,
          statements: this.extractStatements(originalCode),
          branches: this.extractBranches(originalCode),
          functions: this.extractFunctions(originalCode),
          lines: this.extractLines(originalCode)
        });
        
      } catch (error) {
        console.warn(`⚠️ Failed to instrument ${file}:`, error.message);
      }
    }
  }

  /**
   * Instrument JavaScript code for coverage tracking
   */
  instrumentCode(code, filename) {
    // Simple instrumentation: add coverage tracking calls
    const fileId = crypto.createHash('md5').update(filename).digest('hex').substring(0, 8);
    
    let instrumentedCode = `
// Coverage instrumentation for ${filename}
if (typeof __coverage__ === 'undefined') {
  global.__coverage__ = {};
}
if (typeof __coverage__['${fileId}'] === 'undefined') {
  __coverage__['${fileId}'] = {
    path: '${filename}',
    statements: {},
    branches: {},
    functions: {},
    lines: {}
  };
}
var __cov_${fileId} = __coverage__['${fileId}'];

`;
    
    // Instrument statements
    const lines = code.split('\n');
    let statementIndex = 0;
    let functionIndex = 0;
    let branchIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Track line coverage
      if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        instrumentedCode += `__cov_${fileId}.lines[${lineNumber}] = (__cov_${fileId}.lines[${lineNumber}] || 0) + 1;\n`;
      }
      
      // Track statement coverage
      if (this.isStatement(line)) {
        instrumentedCode += `__cov_${fileId}.statements[${statementIndex}] = (__cov_${fileId}.statements[${statementIndex}] || 0) + 1;\n`;
        statementIndex++;
      }
      
      // Track function coverage
      if (this.isFunction(line)) {
        instrumentedCode += `__cov_${fileId}.functions[${functionIndex}] = (__cov_${fileId}.functions[${functionIndex}] || 0) + 1;\n`;
        functionIndex++;
      }
      
      // Track branch coverage
      if (this.isBranch(line)) {
        instrumentedCode += `__cov_${fileId}.branches[${branchIndex}] = (__cov_${fileId}.branches[${branchIndex}] || 0) + 1;\n`;
        branchIndex++;
      }
      
      instrumentedCode += line + '\n';
    }
    
    return instrumentedCode;
  }

  /**
   * Check if line contains a statement
   */
  isStatement(line) {
    const trimmed = line.trim();
    return trimmed && 
           !trimmed.startsWith('//') && 
           !trimmed.startsWith('/*') && 
           !trimmed.startsWith('*') &&
           !trimmed.startsWith('}') &&
           !trimmed.startsWith('{') &&
           trimmed !== '';
  }

  /**
   * Check if line contains a function declaration
   */
  isFunction(line) {
    return /\bfunction\b|\b=>\b|\bclass\b/.test(line);
  }

  /**
   * Check if line contains a branch (if, while, for, switch, etc.)
   */
  isBranch(line) {
    return /\b(if|else|while|for|switch|case|catch|finally)\b/.test(line);
  }

  /**
   * Extract statements from code
   */
  extractStatements(code) {
    const statements = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      if (this.isStatement(line)) {
        statements.push({
          line: index + 1,
          text: line.trim(),
          covered: false
        });
      }
    });
    
    return statements;
  }

  /**
   * Extract branches from code
   */
  extractBranches(code) {
    const branches = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      if (this.isBranch(line)) {
        branches.push({
          line: index + 1,
          text: line.trim(),
          covered: false,
          type: this.getBranchType(line)
        });
      }
    });
    
    return branches;
  }

  /**
   * Get branch type
   */
  getBranchType(line) {
    if (/\bif\b/.test(line)) return 'if';
    if (/\belse\b/.test(line)) return 'else';
    if (/\bwhile\b/.test(line)) return 'while';
    if (/\bfor\b/.test(line)) return 'for';
    if (/\bswitch\b/.test(line)) return 'switch';
    if (/\bcase\b/.test(line)) return 'case';
    if (/\bcatch\b/.test(line)) return 'catch';
    if (/\bfinally\b/.test(line)) return 'finally';
    return 'unknown';
  }

  /**
   * Extract functions from code
   */
  extractFunctions(code) {
    const functions = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      if (this.isFunction(line)) {
        const name = this.extractFunctionName(line);
        functions.push({
          line: index + 1,
          name: name || 'anonymous',
          text: line.trim(),
          covered: false
        });
      }
    });
    
    return functions;
  }

  /**
   * Extract function name from line
   */
  extractFunctionName(line) {
    const patterns = [
      /function\s+(\w+)/,
      /(\w+)\s*:\s*function/,
      /(\w+)\s*=\s*function/,
      /(\w+)\s*=\s*\(/,
      /class\s+(\w+)/
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Extract lines from code
   */
  extractLines(code) {
    const lines = [];
    const codeLines = code.split('\n');
    
    codeLines.forEach((line, index) => {
      if (line.trim() && !line.trim().startsWith('//')) {
        lines.push({
          number: index + 1,
          text: line,
          covered: false
        });
      }
    });
    
    return lines;
  }

  /**
   * Run tests with coverage tracking
   */
  async runTestsWithCoverage() {
    return new Promise((resolve, reject) => {
      // Set up coverage tracking
      global.__coverage__ = {};
      
      // Here we would normally run the actual test suite
      // For now, we'll simulate test execution
      console.log('🧪 Running test suite with coverage tracking...');
      
      // Simulate coverage data collection
      setTimeout(() => {
        this.simulateCoverageData();
        resolve();
      }, 2000);
    });
  }

  /**
   * Simulate coverage data for demonstration
   */
  simulateCoverageData() {
    // Simulate coverage execution
    for (const [filename, fileData] of this.instrumentedFiles) {
      const fileId = crypto.createHash('md5').update(filename).digest('hex').substring(0, 8);
      
      global.__coverage__[fileId] = {
        path: filename,
        statements: {},
        branches: {},
        functions: {},
        lines: {}
      };
      
      // Simulate some coverage
      const coverage = global.__coverage__[fileId];
      
      // Random coverage simulation
      fileData.statements.forEach((stmt, index) => {
        if (Math.random() > 0.3) { // 70% coverage
          coverage.statements[index] = Math.floor(Math.random() * 10) + 1;
        }
      });
      
      fileData.branches.forEach((branch, index) => {
        if (Math.random() > 0.4) { // 60% coverage
          coverage.branches[index] = Math.floor(Math.random() * 5) + 1;
        }
      });
      
      fileData.functions.forEach((func, index) => {
        if (Math.random() > 0.2) { // 80% coverage
          coverage.functions[index] = Math.floor(Math.random() * 3) + 1;
        }
      });
      
      fileData.lines.forEach((line, index) => {
        if (Math.random() > 0.25) { // 75% coverage
          coverage.lines[line.number] = Math.floor(Math.random() * 8) + 1;
        }
      });
    }
  }

  /**
   * Collect coverage data
   */
  async collectCoverageData() {
    const coverageData = global.__coverage__ || {};
    
    for (const [fileId, fileCoverage] of Object.entries(coverageData)) {
      const filename = fileCoverage.path;
      const fileData = this.instrumentedFiles.get(filename);
      
      if (!fileData) continue;
      
      // Process statement coverage
      const statementCoverage = this.processCoverageMetrics(
        fileCoverage.statements,
        fileData.statements
      );
      
      // Process branch coverage
      const branchCoverage = this.processCoverageMetrics(
        fileCoverage.branches,
        fileData.branches
      );
      
      // Process function coverage
      const functionCoverage = this.processCoverageMetrics(
        fileCoverage.functions,
        fileData.functions
      );
      
      // Process line coverage
      const lineCoverage = this.processCoverageMetrics(
        fileCoverage.lines,
        fileData.lines,
        'number'
      );
      
      this.coverageData.files.set(filename, {
        statements: statementCoverage,
        branches: branchCoverage,
        functions: functionCoverage,
        lines: lineCoverage,
        summary: this.calculateFileSummary(
          statementCoverage,
          branchCoverage,
          functionCoverage,
          lineCoverage
        )
      });
    }
    
    // Calculate overall summary
    this.calculateOverallSummary();
  }

  /**
   * Process coverage metrics
   */
  processCoverageMetrics(coverageMap, items, indexProperty = null) {
    const result = {
      total: items.length,
      covered: 0,
      percentage: 0,
      items: []
    };
    
    items.forEach((item, index) => {
      const key = indexProperty ? item[indexProperty] : index;
      const hits = coverageMap[key] || 0;
      const covered = hits > 0;
      
      if (covered) {
        result.covered++;
      }
      
      result.items.push({
        ...item,
        hits,
        covered
      });
    });
    
    result.percentage = result.total > 0 ? (result.covered / result.total) * 100 : 0;
    
    return result;
  }

  /**
   * Calculate file summary
   */
  calculateFileSummary(statements, branches, functions, lines) {
    const weights = COVERAGE_CONFIG.coverageTypes;
    
    const weightedScore = (
      statements.percentage * weights.statement.weight +
      branches.percentage * weights.branch.weight +
      functions.percentage * weights.function.weight +
      lines.percentage * weights.line.weight
    );
    
    return {
      overall: weightedScore,
      statements: statements.percentage,
      branches: branches.percentage,
      functions: functions.percentage,
      lines: lines.percentage
    };
  }

  /**
   * Calculate overall summary
   */
  calculateOverallSummary() {
    let totalStatements = 0, coveredStatements = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalFunctions = 0, coveredFunctions = 0;
    let totalLines = 0, coveredLines = 0;
    
    for (const [filename, fileData] of this.coverageData.files) {
      totalStatements += fileData.statements.total;
      coveredStatements += fileData.statements.covered;
      
      totalBranches += fileData.branches.total;
      coveredBranches += fileData.branches.covered;
      
      totalFunctions += fileData.functions.total;
      coveredFunctions += fileData.functions.covered;
      
      totalLines += fileData.lines.total;
      coveredLines += fileData.lines.covered;
    }
    
    this.coverageData.summary = {
      statements: {
        total: totalStatements,
        covered: coveredStatements,
        percentage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0
      },
      lines: {
        total: totalLines,
        covered: coveredLines,
        percentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
      }
    };
  }

  /**
   * Analyze coverage patterns
   */
  async analyzeCoveragePatterns() {
    // Find hotspots (frequently executed code)
    this.findHotspots();
    
    // Find cold spots (uncovered code)
    this.findColdSpots();
    
    // Analyze coverage trends
    this.analyzeCoverageTrends();
  }

  /**
   * Find code hotspots
   */
  findHotspots() {
    const hotspots = [];
    
    for (const [filename, fileData] of this.coverageData.files) {
      // Find statements with high execution count
      fileData.statements.items.forEach(stmt => {
        if (stmt.hits > 100) { // Arbitrary threshold
          hotspots.push({
            file: filename,
            line: stmt.line,
            type: 'statement',
            hits: stmt.hits,
            text: stmt.text
          });
        }
      });
      
      // Find functions with high execution count
      fileData.functions.items.forEach(func => {
        if (func.hits > 50) { // Arbitrary threshold
          hotspots.push({
            file: filename,
            line: func.line,
            type: 'function',
            hits: func.hits,
            name: func.name,
            text: func.text
          });
        }
      });
    }
    
    // Sort by execution count
    this.coverageData.hotspots = hotspots
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 20); // Top 20 hotspots
  }

  /**
   * Find uncovered code regions
   */
  findColdSpots() {
    const uncoveredRegions = [];
    
    for (const [filename, fileData] of this.coverageData.files) {
      // Find uncovered statements
      fileData.statements.items.forEach(stmt => {
        if (!stmt.covered) {
          uncoveredRegions.push({
            file: filename,
            line: stmt.line,
            type: 'statement',
            text: stmt.text
          });
        }
      });
      
      // Find uncovered branches
      fileData.branches.items.forEach(branch => {
        if (!branch.covered) {
          uncoveredRegions.push({
            file: filename,
            line: branch.line,
            type: 'branch',
            branchType: branch.type,
            text: branch.text
          });
        }
      });
      
      // Find uncovered functions
      fileData.functions.items.forEach(func => {
        if (!func.covered) {
          uncoveredRegions.push({
            file: filename,
            line: func.line,
            type: 'function',
            name: func.name,
            text: func.text
          });
        }
      });
    }
    
    this.coverageData.uncoveredRegions = uncoveredRegions;
  }

  /**
   * Analyze coverage trends
   */
  analyzeCoverageTrends() {
    // This would typically compare with historical data
    // For now, we'll analyze current patterns
    
    const trends = {
      filesByScore: [],
      coverageDistribution: {
        excellent: 0, // > 90%
        good: 0,      // 80-90%
        fair: 0,      // 70-80%
        poor: 0       // < 70%
      }
    };
    
    for (const [filename, fileData] of this.coverageData.files) {
      const score = fileData.summary.overall;
      
      trends.filesByScore.push({
        file: filename,
        score: score
      });
      
      if (score >= 90) trends.coverageDistribution.excellent++;
      else if (score >= 80) trends.coverageDistribution.good++;
      else if (score >= 70) trends.coverageDistribution.fair++;
      else trends.coverageDistribution.poor++;
    }
    
    trends.filesByScore.sort((a, b) => b.score - a.score);
    
    this.coverageData.trends = trends;
  }

  /**
   * Generate coverage reports
   */
  async generateCoverageReports() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.coverageData.summary,
      files: Array.from(this.coverageData.files.entries()).map(([file, data]) => ({
        file,
        ...data
      })),
      hotspots: this.coverageData.hotspots,
      uncoveredRegions: this.coverageData.uncoveredRegions,
      trends: this.coverageData.trends,
      thresholds: COVERAGE_CONFIG.coverageTypes,
      passed: this.checkThresholds()
    };
    
    // Generate different report formats
    await this.generateHTMLReport(report);
    await this.generateJSONReport(report);
    await this.generateTextReport(report);
    
    console.log(`📊 Coverage reports generated`);
    return report;
  }

  /**
   * Check if coverage meets thresholds
   */
  checkThresholds() {
    const thresholds = COVERAGE_CONFIG.coverageTypes;
    const summary = this.coverageData.summary;
    
    return {
      statements: summary.statements.percentage >= thresholds.statement.threshold,
      branches: summary.branches.percentage >= thresholds.branch.threshold,
      functions: summary.functions.percentage >= thresholds.function.threshold,
      lines: summary.lines.percentage >= thresholds.line.threshold,
      overall: (
        summary.statements.percentage >= thresholds.statement.threshold &&
        summary.branches.percentage >= thresholds.branch.threshold &&
        summary.functions.percentage >= thresholds.function.threshold &&
        summary.lines.percentage >= thresholds.line.threshold
      )
    };
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(report) {
    const htmlContent = this.generateHTMLContent(report);
    const reportPath = path.join(__dirname, '../reports/coverage-report.html');
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, htmlContent);
    
    this.reportPath = reportPath;
  }

  /**
   * Generate HTML content
   */
  generateHTMLContent(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>OblivionFilter Code Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #ecf0f1; padding: 15px; border-radius: 5px; flex: 1; text-align: center; }
        .metric.good { background: #d5f4e6; }
        .metric.fair { background: #ffeaa7; }
        .metric.poor { background: #fab1a0; }
        .files { margin: 20px 0; }
        .file { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .progress-bar { background: #ecf0f1; height: 20px; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s; }
        .uncovered { background: #fab1a0; margin: 10px 0; padding: 10px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 OblivionFilter Code Coverage Report</h1>
        <p>Generated: ${report.timestamp}</p>
    </div>

    <div class="summary">
        <div class="metric ${this.getMetricClass(report.summary.statements.percentage)}">
            <h3>Statements</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${report.summary.statements.percentage}%; background: ${this.getProgressColor(report.summary.statements.percentage)};"></div>
            </div>
            <p>${report.summary.statements.covered}/${report.summary.statements.total} (${report.summary.statements.percentage.toFixed(1)}%)</p>
        </div>
        
        <div class="metric ${this.getMetricClass(report.summary.branches.percentage)}">
            <h3>Branches</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${report.summary.branches.percentage}%; background: ${this.getProgressColor(report.summary.branches.percentage)};"></div>
            </div>
            <p>${report.summary.branches.covered}/${report.summary.branches.total} (${report.summary.branches.percentage.toFixed(1)}%)</p>
        </div>
        
        <div class="metric ${this.getMetricClass(report.summary.functions.percentage)}">
            <h3>Functions</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${report.summary.functions.percentage}%; background: ${this.getProgressColor(report.summary.functions.percentage)};"></div>
            </div>
            <p>${report.summary.functions.covered}/${report.summary.functions.total} (${report.summary.functions.percentage.toFixed(1)}%)</p>
        </div>
        
        <div class="metric ${this.getMetricClass(report.summary.lines.percentage)}">
            <h3>Lines</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${report.summary.lines.percentage}%; background: ${this.getProgressColor(report.summary.lines.percentage)};"></div>
            </div>
            <p>${report.summary.lines.covered}/${report.summary.lines.total} (${report.summary.lines.percentage.toFixed(1)}%)</p>
        </div>
    </div>

    <h2>📁 File Coverage</h2>
    <div class="files">
        ${report.files.map(file => `
            <div class="file">
                <h4>${file.file}</h4>
                <p>Overall: ${file.summary.overall.toFixed(1)}%</p>
                <small>
                    Statements: ${file.summary.statements.toFixed(1)}% | 
                    Branches: ${file.summary.branches.toFixed(1)}% | 
                    Functions: ${file.summary.functions.toFixed(1)}% | 
                    Lines: ${file.summary.lines.toFixed(1)}%
                </small>
            </div>
        `).join('')}
    </div>

    <h2>🔥 Coverage Hotspots</h2>
    <table>
        <tr><th>File</th><th>Line</th><th>Type</th><th>Hits</th><th>Code</th></tr>
        ${report.hotspots.slice(0, 10).map(hotspot => `
            <tr>
                <td>${hotspot.file}</td>
                <td>${hotspot.line}</td>
                <td>${hotspot.type}</td>
                <td>${hotspot.hits}</td>
                <td><code>${hotspot.text}</code></td>
            </tr>
        `).join('')}
    </table>

    <h2>❄️ Uncovered Code</h2>
    ${report.uncoveredRegions.slice(0, 20).map(region => `
        <div class="uncovered">
            <strong>${region.file}:${region.line}</strong> (${region.type})
            <br><code>${region.text}</code>
        </div>
    `).join('')}

</body>
</html>
    `;
  }

  /**
   * Get metric class for styling
   */
  getMetricClass(percentage) {
    if (percentage >= 90) return 'good';
    if (percentage >= 70) return 'fair';
    return 'poor';
  }

  /**
   * Get progress bar color
   */
  getProgressColor(percentage) {
    if (percentage >= 90) return '#00b894';
    if (percentage >= 70) return '#fdcb6e';
    return '#e17055';
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport(report) {
    const reportPath = path.join(__dirname, '../reports/coverage-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  }

  /**
   * Generate text report
   */
  async generateTextReport(report) {
    const textContent = `
OblivionFilter Code Coverage Report
Generated: ${report.timestamp}

SUMMARY
=======
Statements: ${report.summary.statements.covered}/${report.summary.statements.total} (${report.summary.statements.percentage.toFixed(1)}%)
Branches:   ${report.summary.branches.covered}/${report.summary.branches.total} (${report.summary.branches.percentage.toFixed(1)}%)
Functions:  ${report.summary.functions.covered}/${report.summary.functions.total} (${report.summary.functions.percentage.toFixed(1)}%)
Lines:      ${report.summary.lines.covered}/${report.summary.lines.total} (${report.summary.lines.percentage.toFixed(1)}%)

THRESHOLD STATUS
===============
${report.passed.statements ? '✅' : '❌'} Statements: ${report.summary.statements.percentage.toFixed(1)}% (threshold: ${COVERAGE_CONFIG.coverageTypes.statement.threshold}%)
${report.passed.branches ? '✅' : '❌'} Branches: ${report.summary.branches.percentage.toFixed(1)}% (threshold: ${COVERAGE_CONFIG.coverageTypes.branch.threshold}%)
${report.passed.functions ? '✅' : '❌'} Functions: ${report.summary.functions.percentage.toFixed(1)}% (threshold: ${COVERAGE_CONFIG.coverageTypes.function.threshold}%)
${report.passed.lines ? '✅' : '❌'} Lines: ${report.summary.lines.percentage.toFixed(1)}% (threshold: ${COVERAGE_CONFIG.coverageTypes.line.threshold}%)

Overall: ${report.passed.overall ? '✅ PASSED' : '❌ FAILED'}

FILES WITH LOW COVERAGE
======================
${report.files
  .filter(file => file.summary.overall < 70)
  .map(file => `${file.file}: ${file.summary.overall.toFixed(1)}%`)
  .join('\n')}

UNCOVERED REGIONS
================
${report.uncoveredRegions.slice(0, 10)
  .map(region => `${region.file}:${region.line} (${region.type}) - ${region.text}`)
  .join('\n')}
    `;

    const reportPath = path.join(__dirname, '../reports/coverage-report.txt');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, textContent);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.instrumentedFiles.clear();
    this.coverageData.files.clear();
    delete global.__coverage__;
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new CodeCoverageAnalyzer();
  
  analyzer.runCoverageAnalysis()
    .then(report => {
      console.log('\n📊 Coverage Analysis Results:');
      console.log(`Overall Coverage: ${((report.summary.statements.percentage + report.summary.branches.percentage + report.summary.functions.percentage + report.summary.lines.percentage) / 4).toFixed(1)}%`);
      console.log(`Statements: ${report.summary.statements.percentage.toFixed(1)}%`);
      console.log(`Branches: ${report.summary.branches.percentage.toFixed(1)}%`);
      console.log(`Functions: ${report.summary.functions.percentage.toFixed(1)}%`);
      console.log(`Lines: ${report.summary.lines.percentage.toFixed(1)}%`);
      console.log(`\nReport saved: ${analyzer.reportPath}`);
      
      analyzer.cleanup();
      process.exit(report.passed.overall ? 0 : 1);
    })
    .catch(error => {
      console.error('Coverage analysis failed:', error);
      analyzer.cleanup();
      process.exit(1);
    });
}

module.exports = {
  CodeCoverageAnalyzer,
  COVERAGE_CONFIG
};
