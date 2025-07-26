# Contributing to OblivionFilter

Thank you for your interest in contributing to OblivionFilter! This document provides guidelines and information for contributors.

## 🌟 Ways to Contribute

### Code Contributions
- **Feature Development**: Implement new privacy and security features
- **Bug Fixes**: Help resolve issues and improve stability
- **Performance Optimization**: Enhance filtering speed and memory usage
- **Platform Support**: Add support for new browsers or platforms
- **Testing**: Write and improve test coverage

### Non-Code Contributions
- **Documentation**: Improve guides, API docs, and user manuals
- **Translation**: Help localize OblivionFilter for global users
- **Design**: Create UI/UX improvements and visual assets
- **Community Support**: Help users in discussions and issues
- **Security Research**: Responsible disclosure of security issues

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm/yarn
- **Go** 1.19+ for native components
- **Python** 3.9+ for utilities and testing
- **Git** for version control
- **Browser** for testing (Chrome, Firefox, Safari)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/OblivionFilter.git
   cd OblivionFilter
   ```

2. **Install Dependencies**
   ```bash
   npm install
   make install-deps
   ```

3. **Build for Development**
   ```bash
   make dev
   # Or for specific platform:
   make chrome-dev
   make firefox-dev
   ```

4. **Run Tests**
   ```bash
   npm test
   make test-all
   ```

### Project Structure

```
OblivionFilter/
├── src/                    # Core extension code
├── platform/               # Platform-specific manifests
├── native/                 # Native messaging components
├── tests/                  # Test suites
├── tools/                  # Build and deployment tools
├── docs/                   # Documentation
└── locales/                # Internationalization files
```

## 📋 Development Guidelines

### Code Style

#### JavaScript/TypeScript
```javascript
// Use modern ES6+ syntax
const filterEngine = new FilterEngine({
  enableOptimizations: true,
  memoryLimit: '256MB'
});

// Prefer async/await over Promises
async function loadFilters() {
  try {
    const filters = await fetchFilterLists();
    return processFilters(filters);
  } catch (error) {
    logger.error('Failed to load filters:', error);
    throw error;
  }
}

// Use destructuring and spread operators
const { hostname, protocol } = new URL(url);
const config = { ...defaultConfig, ...userConfig };
```

#### Go (Native Components)
```go
// Use proper Go formatting
func ProcessRequest(req *Request) (*Response, error) {
    if req == nil {
        return nil, errors.New("request cannot be nil")
    }
    
    // Use context for cancellation
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    return processWithContext(ctx, req)
}

// Proper error handling
func loadConfiguration() (*Config, error) {
    data, err := os.ReadFile("config.json")
    if err != nil {
        return nil, fmt.Errorf("failed to read config: %w", err)
    }
    
    var config Config
    if err := json.Unmarshal(data, &config); err != nil {
        return nil, fmt.Errorf("failed to parse config: %w", err)
    }
    
    return &config, nil
}
```

### Documentation Standards

#### Function Documentation
```javascript
/**
 * Parse and optimize filter rules for efficient matching
 * @param {string[]} rules - Array of raw filter rules
 * @param {Object} options - Optimization options
 * @param {boolean} options.enableCaching - Enable rule caching
 * @param {number} options.maxRules - Maximum number of rules
 * @returns {Promise<FilterSet>} Optimized filter set
 * @throws {Error} When rules are invalid or optimization fails
 * @example
 * const filters = await parseFilterRules([
 *   '@@example.com',
 *   'ads.com##.banner'
 * ], { enableCaching: true });
 */
async function parseFilterRules(rules, options = {}) {
  // Implementation
}
```

#### API Documentation
```javascript
/**
 * @typedef {Object} FilterOptions
 * @property {boolean} enableAdBlocking - Enable ad blocking
 * @property {boolean} enableTrackerBlocking - Enable tracker blocking
 * @property {string[]} whitelistedDomains - Domains to exclude from filtering
 * @property {number} maxMemoryUsage - Maximum memory usage in MB
 */

/**
 * @typedef {Object} FilterResult
 * @property {boolean} blocked - Whether request was blocked
 * @property {string} reason - Reason for blocking/allowing
 * @property {Object} metadata - Additional filtering metadata
 */
```

### Testing Requirements

#### Unit Tests
```javascript
// Use Jest for JavaScript testing
describe('FilterEngine', () => {
  let filterEngine;
  
  beforeEach(() => {
    filterEngine = new FilterEngine({
      testMode: true
    });
  });
  
  afterEach(() => {
    filterEngine.cleanup();
  });
  
  test('should block known ad domains', async () => {
    const result = await filterEngine.checkRequest({
      url: 'https://ads.example.com/banner.js',
      type: 'script'
    });
    
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('ad domain');
  });
  
  test('should allow whitelisted domains', async () => {
    filterEngine.addWhitelistDomain('trusted.com');
    
    const result = await filterEngine.checkRequest({
      url: 'https://trusted.com/script.js',
      type: 'script'
    });
    
    expect(result.blocked).toBe(false);
  });
});
```

#### Integration Tests
```javascript
// Use Playwright for browser testing
const { test, expect } = require('@playwright/test');

test('extension blocks ads on test page', async ({ page, context }) => {
  // Load extension
  await context.addInitScript(() => {
    window.oblivionFilter = { testMode: true };
  });
  
  // Navigate to test page
  await page.goto('https://test.example.com');
  
  // Verify ads are blocked
  const adElements = await page.locator('.ad-banner').count();
  expect(adElements).toBe(0);
  
  // Check network requests
  const requests = [];
  page.on('request', req => requests.push(req.url()));
  
  await page.reload();
  
  const blockedAds = requests.filter(url => url.includes('ads.'));
  expect(blockedAds.length).toBe(0);
});
```

### Performance Guidelines

#### Memory Management
```javascript
// Use WeakMap for object associations
const elementData = new WeakMap();

class FilterEngine {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 10000;
  }
  
  // Implement cache cleanup
  addToCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  // Clean up resources
  dispose() {
    this.cache.clear();
    // Clear other resources
  }
}
```

#### CPU Optimization
```javascript
// Use requestIdleCallback for non-critical work
function processLargeDataset(data) {
  const chunks = chunkArray(data, 100);
  
  function processChunk(index = 0) {
    if (index >= chunks.length) return Promise.resolve();
    
    return new Promise(resolve => {
      requestIdleCallback(() => {
        processData(chunks[index]);
        processChunk(index + 1).then(resolve);
      });
    });
  }
  
  return processChunk();
}

// Use Web Workers for heavy computation
class FilterWorker {
  constructor() {
    this.worker = new Worker('/js/filter-worker.js');
  }
  
  async processFilters(filters) {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({ type: 'PROCESS', filters });
      
      this.worker.onmessage = ({ data }) => {
        if (data.type === 'RESULT') {
          resolve(data.result);
        } else if (data.type === 'ERROR') {
          reject(new Error(data.error));
        }
      };
    });
  }
}
```

## 🐛 Issue Reporting

### Bug Reports

**Before reporting:**
- Search existing issues
- Test with latest version
- Check if reproducible

**Bug report template:**
```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OblivionFilter version: 
- Browser: 
- OS: 
- Website (if applicable): 

## Additional Context
Screenshots, logs, etc.
```

### Feature Requests

**Feature request template:**
```markdown
## Feature Description
Brief description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives Considered
Other solutions you've considered

## Additional Context
Mockups, examples, etc.
```

## 🔒 Security

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.

**Instead:**
- Email: security@oblivionfilter.org
- Use GitHub Security Advisories
- Include detailed description and reproduction steps

### Security Guidelines

#### Input Validation
```javascript
// Validate all external inputs
function validateFilterRule(rule) {
  if (typeof rule !== 'string') {
    throw new Error('Filter rule must be a string');
  }
  
  if (rule.length > MAX_RULE_LENGTH) {
    throw new Error('Filter rule too long');
  }
  
  // Prevent injection attacks
  if (rule.includes('<script>') || rule.includes('javascript:')) {
    throw new Error('Invalid filter rule content');
  }
  
  return sanitizeRule(rule);
}
```

#### Content Security Policy
```javascript
// Use CSP headers
const CSP_DIRECTIVES = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-eval'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data: https:",
  'connect-src': "'self' https:",
  'font-src': "'self' data:",
  'object-src': "'none'",
  'base-uri': "'self'"
};
```

#### Safe DOM Manipulation
```javascript
// Use safe DOM methods
function createFilterElement(text) {
  const element = document.createElement('div');
  element.textContent = text; // Safe - prevents XSS
  
  // DON'T use innerHTML with user content
  // element.innerHTML = userContent; // DANGEROUS
  
  return element;
}

// Sanitize URLs
function validateURL(url) {
  try {
    const parsed = new URL(url);
    
    // Only allow safe protocols
    if (!['http:', 'https:', 'ftp:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    
    return parsed.href;
  } catch (error) {
    throw new Error('Invalid URL');
  }
}
```

## 🌍 Internationalization

### Adding Translations

1. **Create locale file**: `locales/{language_code}/messages.json`
2. **Follow Chrome extension format**:
```json
{
  "extensionName": {
    "message": "OblivionFilter",
    "description": "Name of the extension"
  },
  "blockAds": {
    "message": "Block Advertisements",
    "description": "Option to block ads"
  },
  "settingsTitle": {
    "message": "OblivionFilter Settings",
    "description": "Title for settings page"
  }
}
```

3. **Use in code**:
```javascript
// Get localized message
const message = chrome.i18n.getMessage('blockAds');

// With substitutions
const message = chrome.i18n.getMessage('blockedCount', [count.toString()]);
```

### Translation Guidelines

- **Be concise**: UI space is limited
- **Use proper capitalization**: Follow platform conventions
- **Test with long text**: Some languages need more space
- **Consider context**: Same word may have different translations in different contexts
- **Include descriptions**: Help translators understand usage

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure all tests pass**
   ```bash
   npm test
   make test-all
   ```

2. **Check code style**
   ```bash
   npm run lint
   npm run format
   ```

3. **Update documentation** if needed

4. **Add/update tests** for new features

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation update
- [ ] Other (please describe)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Screenshots (if applicable)


## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or clearly documented)

## Related Issues
Fixes #(issue number)
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** on multiple platforms
4. **Documentation review** if applicable
5. **Final approval** and merge

## 🎯 Roadmap Participation

### Current Priorities
- **Performance optimization**: Faster filtering algorithms
- **Mobile support**: iOS and Android extensions
- **Privacy features**: Enhanced tracking protection
- **User experience**: Simplified setup and configuration
- **Enterprise features**: Centralized management and reporting

### How to Help
- **Pick up roadmap issues**: Look for "roadmap" label
- **Propose improvements**: Create detailed feature requests
- **Research and planning**: Help with technical research
- **Prototyping**: Create proof-of-concept implementations

## 🤝 Community Guidelines

### Code of Conduct

- **Be respectful**: Treat everyone with respect and kindness
- **Be constructive**: Provide helpful feedback and suggestions
- **Be inclusive**: Welcome people of all backgrounds and experience levels
- **Be collaborative**: Work together towards common goals
- **Be professional**: Maintain professional communication

### Getting Help

- **Documentation**: Check docs/ folder and wiki
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community Discord server
- **Stack Overflow**: Tag questions with `oblivion-filter`

### Recognition

Contributors are recognized in:
- **CONTRIBUTORS.md**: All contributors listed
- **Release notes**: Major contributions highlighted
- **Hall of Fame**: Top contributors featured
- **Swag**: Stickers and t-shirts for active contributors

## 📞 Contact

- **General questions**: discussions@oblivionfilter.org
- **Security issues**: security@oblivionfilter.org
- **Maintainers**: maintainers@oblivionfilter.org
- **Website**: https://oblivionfilter.org
- **Discord**: https://discord.gg/oblivionfilter

---

Thank you for contributing to OblivionFilter! Together, we're building a more private and secure web. 🚀
