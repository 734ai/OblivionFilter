# 🕶️ OblivionFilter - Development Agent Instructions

## Project Context
You are developing **OblivionFilter**, an advanced content blocker based on uBlock Origin with enhanced stealth, censorship resistance, and Manifest V3 compatibility features. This is a sophisticated privacy tool designed for red team operations, airgapped environments, and censorship-heavy regions.

## Development Guidelines

### Code Quality Standards
- **Clean Architecture**: Maintain clear separation of concerns
- **Performance First**: Optimize for speed and memory efficiency
- **Security Focus**: Implement zero-trust principles throughout
- **Stealth Priority**: Minimize detectable signatures and patterns

### Key Technical Principles

#### 1. Stealth & Anti-Detection
- Avoid predictable code patterns that anti-adblock systems detect
- Randomize timing, injection methods, and DOM interaction patterns
- Use native browser APIs whenever possible to avoid WebExtension signatures
- Implement dynamic code generation for filter rule application

#### 2. Censorship Resistance
- Design all external connections with fallback mechanisms
- Support multiple transport methods (HTTPS, Tor, IPFS)
- Implement robust offline functionality
- Use cryptographic verification for all external resources

#### 3. Performance Optimization
- Lazy load components only when needed
- Use efficient data structures (tries, bloom filters, hash maps)
- Implement proper caching strategies
- Minimize memory allocations and garbage collection

#### 4. Security Best Practices
- Validate all external inputs rigorously
- Use Content Security Policy (CSP) appropriately
- Implement proper error handling without information leakage
- Maintain strict separation between privileged and content contexts

## File Structure Guidelines

### Core Components
```
src/
├── background/          # Service worker / background page logic
├── content/            # Content script injection and DOM manipulation
├── ui/                 # User interface components
├── filtering/          # Core filtering engines
├── storage/            # Data persistence and caching
├── networking/         # Network request handling
├── stealth/            # Anti-detection mechanisms
├── native/             # Native messaging and proxy bridge
└── utils/              # Shared utilities and helpers
```

### Platform-Specific Code
```
platform/
├── chromium-mv2/       # Manifest V2 for Chromium
├── chromium-mv3/       # Manifest V3 for Chromium
├── firefox/            # Firefox-specific code
├── native-proxy/       # Standalone proxy implementation
└── common/             # Shared platform code
```

## Development Workflow

### 1. Foundation Phase (Current)
- Port core uBlock Origin functionality
- Establish basic filtering capabilities
- Create manifest files for different platforms
- Implement essential UI components

### 2. Enhancement Phase
- Add stealth and anti-detection features
- Implement decentralized update mechanisms
- Create native proxy bridge
- Add advanced filtering capabilities

### 3. Testing & Validation
- Test against anti-adblock systems
- Validate performance benchmarks
- Verify censorship resistance features
- Conduct security audits

## Code Style & Conventions

### JavaScript/TypeScript
- Use ES6+ features with appropriate polyfills
- Prefer const/let over var
- Use arrow functions for callbacks
- Implement proper error handling with try/catch
- Use JSDoc comments for all public functions

### CSS
- Use modern CSS features (Grid, Flexbox)
- Implement dark/light theme support
- Minimize inline styles
- Use CSS custom properties for theming

### HTML
- Use semantic HTML5 elements
- Implement proper ARIA attributes
- Ensure cross-browser compatibility
- Optimize for performance

## Security Considerations

### Content Security Policy
```javascript
// Strict CSP for extension pages
const CSP = {
    "default-src": "'self'",
    "script-src": "'self' 'unsafe-eval'",
    "style-src": "'self' 'unsafe-inline'",
    "connect-src": "'self' https: wss:",
    "img-src": "'self' data:",
    "font-src": "'self'"
};
```

### Permission Management
- Request minimal necessary permissions
- Use optional permissions when possible
- Implement proper permission validation
- Document all permission requirements

## Performance Targets

### Memory Usage
- Background script: < 50MB
- Content scripts: < 10MB per tab
- UI components: < 20MB
- Total extension: < 100MB typical usage

### Response Times
- Filter evaluation: < 1ms per request
- UI interactions: < 100ms response
- Filter list updates: < 5s for 100k rules
- Extension startup: < 500ms

## Testing Strategy

### Unit Testing
- Test all filtering algorithms
- Validate rule parsing logic
- Test UI component behavior
- Verify utility functions

### Integration Testing
- Test cross-component communication
- Validate manifest compatibility
- Test update mechanisms
- Verify storage operations

### Performance Testing
- Benchmark filtering performance
- Memory leak detection
- Startup time measurement
- Network request overhead

### Security Testing
- Anti-adblock evasion tests
- Permission boundary validation
- CSP compliance verification
- Input validation testing

## Documentation Requirements

### Code Documentation
- JSDoc comments for all public APIs
- Inline comments for complex logic
- Architecture decision records (ADRs)
- Performance optimization notes

### User Documentation
- Installation guides for all platforms
- Configuration instructions
- Troubleshooting guides
- Security and privacy information

### Developer Documentation
- Build and deployment procedures
- Contribution guidelines
- Code review checklist
- Release procedures

## Compliance & Legal

### Licensing
- Maintain GPL v3 compatibility with uBlock Origin
- Document all third-party dependencies
- Ensure clean-room implementation where required
- Respect trademark and copyright restrictions

### Privacy
- Implement zero data collection policy
- Document all data processing activities
- Ensure GDPR compliance where applicable
- Provide clear privacy statements

## Monitoring & Maintenance

### Error Reporting
- Implement non-identifying error logging
- Use local-only crash reporting
- Provide debugging modes for development
- Maintain error code documentation

### Update Mechanisms
- Implement automatic filter list updates
- Support manual update triggers
- Provide rollback capabilities
- Verify update integrity cryptographically

Remember: OblivionFilter is designed for high-stakes environments where privacy, security, and censorship resistance are paramount. Every design decision should consider these priorities.
