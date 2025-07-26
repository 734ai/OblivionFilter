/**
 * OblivionFilter CI/CD Pipeline Configuration
 * Automated testing and deployment pipeline
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * CI/CD Pipeline Configuration
 */
const PIPELINE_CONFIG = {
  stages: {
    lint: {
      name: 'Code Quality & Linting',
      commands: [
        'npm run lint',
        'npm run format-check',
        'npm run type-check'
      ],
      parallel: true,
      continueOnError: false
    },
    test: {
      name: 'Automated Testing',
      commands: [
        'npm run test:unit',
        'npm run test:integration',
        'npm run test:coverage'
      ],
      parallel: false,
      continueOnError: false,
      artifacts: ['coverage/', 'test-results/']
    },
    security: {
      name: 'Security Testing',
      commands: [
        'npm run test:security',
        'npm audit --audit-level=high',
        'npm run vulnerability-scan'
      ],
      parallel: true,
      continueOnError: false,
      artifacts: ['security-reports/']
    },
    performance: {
      name: 'Performance Testing',
      commands: [
        'npm run test:load',
        'npm run benchmark',
        'npm run performance-audit'
      ],
      parallel: true,
      continueOnError: false,
      artifacts: ['performance-reports/']
    },
    build: {
      name: 'Build & Package',
      commands: [
        'npm run build:all',
        'npm run package:chrome',
        'npm run package:firefox',
        'npm run package:safari'
      ],
      parallel: false,
      continueOnError: false,
      artifacts: ['dist/', 'packages/']
    },
    deploy: {
      name: 'Deployment',
      commands: [
        'npm run deploy:staging',
        'npm run deploy:production'
      ],
      parallel: false,
      continueOnError: false,
      requiresApproval: true
    }
  },
  notifications: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK,
      channels: ['#oblivion-ci', '#dev-notifications']
    },
    email: {
      recipients: ['dev-team@oblivionfilter.com'],
      onFailure: true,
      onSuccess: false
    }
  },
  environments: {
    development: {
      branch: 'develop',
      autoTrigger: true,
      stages: ['lint', 'test', 'security']
    },
    staging: {
      branch: 'main',
      autoTrigger: true,
      stages: ['lint', 'test', 'security', 'performance', 'build']
    },
    production: {
      branch: 'release',
      autoTrigger: false,
      stages: ['lint', 'test', 'security', 'performance', 'build', 'deploy'],
      requiresApproval: true
    }
  }
};

/**
 * CI/CD Pipeline Runner
 */
class CIPipeline {
  constructor(environment = 'development') {
    this.environment = environment;
    this.config = PIPELINE_CONFIG.environments[environment];
    this.results = {
      pipeline: {
        id: this.generatePipelineId(),
        environment,
        startTime: null,
        endTime: null,
        duration: 0,
        status: 'PENDING',
        branch: process.env.GIT_BRANCH || 'unknown'
      },
      stages: {},
      artifacts: [],
      notifications: []
    };
  }

  /**
   * Run complete CI/CD pipeline
   */
  async runPipeline() {
    console.log(`🚀 Starting CI/CD Pipeline for ${this.environment} environment`);
    console.log(`📋 Pipeline ID: ${this.results.pipeline.id}`);
    console.log(`🌿 Branch: ${this.results.pipeline.branch}`);
    
    this.results.pipeline.startTime = Date.now();
    this.results.pipeline.status = 'RUNNING';

    try {
      // Run stages sequentially
      for (const stageName of this.config.stages) {
        await this.runStage(stageName);
        
        // Stop on stage failure if continueOnError is false
        if (this.results.stages[stageName].status === 'FAILED' && 
            !PIPELINE_CONFIG.stages[stageName].continueOnError) {
          throw new Error(`Stage ${stageName} failed and continueOnError is false`);
        }
      }

      this.results.pipeline.status = 'SUCCESS';
      console.log('✅ Pipeline completed successfully');

    } catch (error) {
      this.results.pipeline.status = 'FAILED';
      console.error('❌ Pipeline failed:', error.message);
      throw error;

    } finally {
      this.results.pipeline.endTime = Date.now();
      this.results.pipeline.duration = this.results.pipeline.endTime - this.results.pipeline.startTime;
      
      // Generate pipeline report
      await this.generatePipelineReport();
      
      // Send notifications
      await this.sendNotifications();
    }

    return this.results;
  }

  /**
   * Run individual pipeline stage
   */
  async runStage(stageName) {
    const stageConfig = PIPELINE_CONFIG.stages[stageName];
    if (!stageConfig) {
      throw new Error(`Unknown stage: ${stageName}`);
    }

    console.log(`\n📦 Running stage: ${stageConfig.name}`);
    
    const stageResult = {
      name: stageName,
      displayName: stageConfig.name,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      status: 'RUNNING',
      commands: [],
      artifacts: []
    };

    this.results.stages[stageName] = stageResult;

    try {
      if (stageConfig.parallel) {
        // Run commands in parallel
        const commandPromises = stageConfig.commands.map(command => 
          this.runCommand(command, stageName)
        );
        const commandResults = await Promise.allSettled(commandPromises);
        
        // Check if any command failed
        const failedCommands = commandResults.filter(result => 
          result.status === 'rejected' || 
          (result.value && result.value.exitCode !== 0)
        );
        
        if (failedCommands.length > 0) {
          throw new Error(`${failedCommands.length} commands failed in parallel execution`);
        }
        
        stageResult.commands = commandResults.map(result => result.value);
        
      } else {
        // Run commands sequentially
        for (const command of stageConfig.commands) {
          const commandResult = await this.runCommand(command, stageName);
          stageResult.commands.push(commandResult);
          
          if (commandResult.exitCode !== 0) {
            throw new Error(`Command failed: ${command}`);
          }
        }
      }

      // Collect artifacts
      if (stageConfig.artifacts) {
        for (const artifactPath of stageConfig.artifacts) {
          const artifacts = await this.collectArtifacts(artifactPath);
          stageResult.artifacts.push(...artifacts);
          this.results.artifacts.push(...artifacts);
        }
      }

      stageResult.status = 'SUCCESS';
      console.log(`✅ Stage completed: ${stageConfig.name}`);

    } catch (error) {
      stageResult.status = 'FAILED';
      stageResult.error = error.message;
      console.error(`❌ Stage failed: ${stageConfig.name} - ${error.message}`);
      
      if (!stageConfig.continueOnError) {
        throw error;
      }

    } finally {
      stageResult.endTime = Date.now();
      stageResult.duration = stageResult.endTime - stageResult.startTime;
    }
  }

  /**
   * Run individual command
   */
  runCommand(command, stageName) {
    return new Promise((resolve, reject) => {
      console.log(`  🔧 Executing: ${command}`);
      
      const startTime = Date.now();
      const child = spawn('bash', ['-c', command], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true', STAGE: stageName }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        const endTime = Date.now();
        const result = {
          command,
          exitCode,
          duration: endTime - startTime,
          stdout: stdout.substring(0, 10000), // Limit output size
          stderr: stderr.substring(0, 10000),
          timestamp: new Date().toISOString()
        };

        if (exitCode === 0) {
          console.log(`    ✅ Command succeeded (${result.duration}ms)`);
          resolve(result);
        } else {
          console.log(`    ❌ Command failed with exit code ${exitCode}`);
          resolve(result); // Don't reject, let stage handle the failure
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
    });
  }

  /**
   * Collect artifacts from specified paths
   */
  async collectArtifacts(artifactPath) {
    const artifacts = [];
    
    try {
      const stats = await fs.stat(artifactPath);
      
      if (stats.isDirectory()) {
        // Collect all files in directory
        const files = await this.getAllFiles(artifactPath);
        artifacts.push(...files.map(file => ({
          type: 'file',
          path: file,
          size: 0, // Size will be calculated if needed
          timestamp: new Date().toISOString()
        })));
      } else {
        // Single file
        artifacts.push({
          type: 'file',
          path: artifactPath,
          size: stats.size,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn(`⚠️ Could not collect artifacts from ${artifactPath}: ${error.message}`);
    }
    
    return artifacts;
  }

  /**
   * Get all files recursively from directory
   */
  async getAllFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }

  /**
   * Generate pipeline report
   */
  async generatePipelineReport() {
    const report = {
      pipeline: this.results.pipeline,
      stages: this.results.stages,
      artifacts: this.results.artifacts,
      summary: this.generateSummary(),
      recommendations: this.generateRecommendations()
    };

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const reportPath = path.join('ci-reports', `pipeline-${this.results.pipeline.id}.html`);
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, htmlReport);

    // Generate JSON report for API consumption
    const jsonPath = path.join('ci-reports', `pipeline-${this.results.pipeline.id}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    console.log(`📊 Pipeline report generated: ${reportPath}`);
  }

  /**
   * Generate pipeline summary
   */
  generateSummary() {
    const stages = Object.values(this.results.stages);
    const successfulStages = stages.filter(stage => stage.status === 'SUCCESS').length;
    const failedStages = stages.filter(stage => stage.status === 'FAILED').length;
    const totalCommands = stages.reduce((acc, stage) => acc + stage.commands.length, 0);
    const failedCommands = stages.reduce((acc, stage) => 
      acc + stage.commands.filter(cmd => cmd.exitCode !== 0).length, 0
    );

    return {
      totalStages: stages.length,
      successfulStages,
      failedStages,
      totalCommands,
      failedCommands,
      totalArtifacts: this.results.artifacts.length,
      overallSuccess: this.results.pipeline.status === 'SUCCESS'
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const summary = this.generateSummary();

    if (summary.failedStages > 0) {
      recommendations.push('Review and fix failed stages before proceeding');
    }

    if (summary.failedCommands > 0) {
      recommendations.push('Investigate command failures and update CI configuration');
    }

    if (this.results.pipeline.duration > 1800000) { // 30 minutes
      recommendations.push('Consider optimizing pipeline performance - duration exceeds 30 minutes');
    }

    if (recommendations.length === 0) {
      recommendations.push('Pipeline executed successfully - no issues detected');
    }

    return recommendations;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    const statusEmoji = {
      'SUCCESS': '✅',
      'FAILED': '❌',
      'RUNNING': '🔄',
      'PENDING': '⏳'
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <title>CI/CD Pipeline Report - ${report.pipeline.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stage { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; }
        .stage.failed { border-left-color: #dc3545; }
        .command { background: #e9ecef; margin: 5px 0; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
        .command.failed { background: #f8d7da; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { background: #e7f3ff; padding: 15px; text-align: center; border-radius: 8px; }
        .artifacts { margin: 20px 0; }
        .artifact { display: inline-block; margin: 5px; padding: 8px 12px; background: #007bff; color: white; border-radius: 4px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 CI/CD Pipeline Report</h1>
            <p><strong>Pipeline ID:</strong> ${report.pipeline.id}</p>
            <p><strong>Environment:</strong> ${report.pipeline.environment}</p>
            <p><strong>Branch:</strong> ${report.pipeline.branch}</p>
            <p><strong>Status:</strong> ${statusEmoji[report.pipeline.status]} ${report.pipeline.status}</p>
            <p><strong>Duration:</strong> ${(report.pipeline.duration / 1000).toFixed(2)} seconds</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div style="font-size: 2em; font-weight: bold; color: #007bff;">${report.summary.totalStages}</div>
                <div>Total Stages</div>
            </div>
            <div class="metric">
                <div style="font-size: 2em; font-weight: bold; color: #28a745;">${report.summary.successfulStages}</div>
                <div>Successful</div>
            </div>
            <div class="metric">
                <div style="font-size: 2em; font-weight: bold; color: #dc3545;">${report.summary.failedStages}</div>
                <div>Failed</div>
            </div>
            <div class="metric">
                <div style="font-size: 2em; font-weight: bold; color: #6f42c1;">${report.summary.totalArtifacts}</div>
                <div>Artifacts</div>
            </div>
        </div>

        <h2>📦 Pipeline Stages</h2>
        ${Object.values(report.stages).map(stage => `
            <div class="stage ${stage.status.toLowerCase()}">
                <h3>${statusEmoji[stage.status]} ${stage.displayName}</h3>
                <p><strong>Duration:</strong> ${(stage.duration / 1000).toFixed(2)}s</p>
                
                <h4>Commands:</h4>
                ${stage.commands.map(cmd => `
                    <div class="command ${cmd.exitCode !== 0 ? 'failed' : ''}">
                        <strong>$</strong> ${cmd.command}
                        <br><small>Exit Code: ${cmd.exitCode}, Duration: ${cmd.duration}ms</small>
                    </div>
                `).join('')}
                
                ${stage.artifacts.length > 0 ? `
                    <h4>Artifacts:</h4>
                    <div class="artifacts">
                        ${stage.artifacts.map(artifact => `
                            <span class="artifact">${artifact.path}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('')}

        <h2>💡 Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>
    `;
  }

  /**
   * Send notifications
   */
  async sendNotifications() {
    const notifications = PIPELINE_CONFIG.notifications;
    
    // Send Slack notification
    if (notifications.slack.webhook) {
      await this.sendSlackNotification();
    }
    
    // Send email notification
    if (notifications.email.recipients.length > 0) {
      await this.sendEmailNotification();
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification() {
    const emoji = this.results.pipeline.status === 'SUCCESS' ? ':white_check_mark:' : ':x:';
    const color = this.results.pipeline.status === 'SUCCESS' ? 'good' : 'danger';
    
    const message = {
      text: `${emoji} CI/CD Pipeline ${this.results.pipeline.status}`,
      attachments: [{
        color,
        fields: [
          { title: 'Pipeline ID', value: this.results.pipeline.id, short: true },
          { title: 'Environment', value: this.results.pipeline.environment, short: true },
          { title: 'Branch', value: this.results.pipeline.branch, short: true },
          { title: 'Duration', value: `${(this.results.pipeline.duration / 1000).toFixed(2)}s`, short: true }
        ]
      }]
    };

    // Here you would actually send to Slack webhook
    console.log('📱 Slack notification sent (simulated)');
  }

  /**
   * Send email notification
   */
  async sendEmailNotification() {
    const shouldSend = (
      (this.results.pipeline.status === 'FAILED' && PIPELINE_CONFIG.notifications.email.onFailure) ||
      (this.results.pipeline.status === 'SUCCESS' && PIPELINE_CONFIG.notifications.email.onSuccess)
    );

    if (shouldSend) {
      // Here you would actually send email
      console.log('📧 Email notification sent (simulated)');
    }
  }

  /**
   * Generate unique pipeline ID
   */
  generatePipelineId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${this.environment}-${timestamp}-${random}`;
  }
}

// CLI interface
async function main() {
  const environment = process.argv[2] || 'development';
  const pipeline = new CIPipeline(environment);
  
  try {
    const results = await pipeline.runPipeline();
    
    console.log('\n🎉 Pipeline Summary:');
    console.log(`Status: ${results.pipeline.status}`);
    console.log(`Duration: ${(results.pipeline.duration / 1000).toFixed(2)}s`);
    console.log(`Stages: ${results.summary.successfulStages}/${results.summary.totalStages} successful`);
    console.log(`Artifacts: ${results.summary.totalArtifacts} collected`);
    
    process.exit(results.pipeline.status === 'SUCCESS' ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Pipeline execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  CIPipeline,
  PIPELINE_CONFIG
};
