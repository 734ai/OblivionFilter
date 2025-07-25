# 🕶️ OblivionFilter

> **Browse in silence. Filter in stealth.**

**OblivionFilter** is a state-of-the-art, privacy-respecting, anti-censorship content blocker designed for **Manifest V3 resistance**, airgapped operations, red team environments, and censorship-heavy regions. OblivionFilter offers robust filtering power **without reliance on centralized APIs or extension store ecosystems.**

This project ensures users retain full control over what their browsers execute, block, and render — all while remaining stealthy, performant, and up-to-date.

---

## 🔥 Features

| Capability                | Description                                                                 |
| ------------------------- | --------------------------------------------------------------------------- |
| 🔄 Manifest V3 Resistance | Hybrid fallback using Manifest V2 + native proxy or PAC routing             |
| 🧠 Smart Filtering        | Dynamic regex-based filtering, ML heuristic DOM-based blocking              |
| 🛡️ Anti-Adblock Bypass   | Stealth injection to fool anti-adblock scripts                              |
| 💣 Native Mode            | Native Go/Python proxy bridge for out-of-browser rule enforcement           |
| 🌐 Decentralized Updates  | Filter lists and rules fetched via GitHub raw or IPFS (optional)            |
| 🚀 Turbo Performance      | Built-in caching, parallel selector eval, fast CSS injection                |
| 💼 Sideloadable           | Packaged as `.crx`, `.zip`, and `unpacked/` source for any Chromium/Fx fork |

---

## 🧰 Project Structure

```
OblivionFilter/
├── src/
│   ├── js/
│   │   ├── background.js         # Core filtering logic & service worker
│   │   ├── contentscript.js      # DOM filtering & stealth injection
│   │   ├── vapi.js              # API abstraction layer
│   │   ├── vapi-client.js       # Client-side API implementation
│   │   ├── filtering/           # Filtering engines
│   │   ├── stealth/             # Anti-detection mechanisms
│   │   └── storage/             # Data persistence layer
│   ├── css/
│   │   ├── common.css           # Shared styles
│   │   ├── popup.css            # Popup interface styles
│   │   └── themes/              # Dark/light themes
│   ├── html/
│   │   ├── popup.html           # Extension popup interface
│   │   ├── options.html         # Settings page
│   │   └── background.html      # Background page (MV2)
│   └── img/                     # Icons and images
├── platform/
│   ├── chromium-mv2/           # Manifest V2 for Chromium
│   ├── chromium-mv3/           # Manifest V3 for Chromium
│   ├── firefox/                # Firefox-specific code
│   └── common/                 # Shared platform code
├── native/
│   ├── proxy/                  # Native proxy implementations
│   │   ├── go-proxy/           # Go-based proxy server
│   │   └── python-proxy/       # Python mitmproxy integration
│   └── messaging/              # Native messaging hosts
├── tools/
│   ├── build/                  # Build scripts and tools
│   ├── filters/                # Filter list management
│   └── deploy/                 # Deployment utilities
├── dist/                       # Built extension packages
├── docs/                       # Documentation
├── tests/                      # Test suites
├── Makefile                    # Build system
├── package.json                # Node.js dependencies
└── README.md                   # This file
```

---

## 🚀 Quick Start

### Build from Source

```bash
# Clone the repository
git clone https://github.com/734ai/OblivionFilter.git
cd OblivionFilter

# Build all platform versions
make all

# Or build specific platforms
make chromium-mv2    # Full-featured Chromium MV2
make chromium-mv3    # Limited Chromium MV3
make firefox         # Full-featured Firefox

# Create distribution packages
make package
```

### Installation

#### Chromium (Chrome, Brave, Edge, Ungoogled)

1. Navigate to `chrome://extensions`
2. Enable "Developer Mode"
3. Click "Load unpacked"
4. Select `dist/build/OblivionFilter.chromium-mv2/` or `OblivionFilter.chromium-mv3/`

#### Firefox

1. Go to `about:debugging`
2. Choose "Load Temporary Add-on"
3. Select `dist/build/OblivionFilter.firefox/manifest.json`

---

## 🛠️ Development

### Build System

OblivionFilter uses a comprehensive Makefile-based build system:

```bash
make help           # Show all available commands
make info           # Display project information
make clean          # Clean build artifacts
make lint           # Lint JavaScript code
make watch          # Watch for changes and rebuild
```

### Project Configuration

Key configuration files:
- `Makefile` - Build system and automation
- `package.json` - Node.js dependencies and scripts
- `platform/*/manifest.json` - Platform-specific manifests

### Development Workflow

1. **Setup**: Clone repo and run `make deps` to install dependencies
2. **Build**: Use `make all` to build all platforms
3. **Test**: Load unpacked extension in browser
4. **Iterate**: Use `make watch` for automatic rebuilds

---

## 🔐 Security & Privacy Features

### Zero Telemetry
- No data collection or remote analytics
- All processing happens locally
- No phone-home functionality

### Stealth Operations
- Anti-detection mechanisms
- Behavioral mimicry
- Randomized timing patterns
- Signature obfuscation

### Censorship Resistance
- Decentralized filter updates
- IPFS integration capability
- Local-only operation mode
- Multiple fallback mechanisms

---

## 📡 Advanced Features

### Native Proxy Mode

For enhanced stealth and system-wide filtering:

```bash
# Python mitmproxy integration (coming soon)
pip install mitmproxy
python native/proxy_blocker.py

# Go native proxy (planned)
go run native/proxy.go
```

### Decentralized Updates

Configure alternative update sources:
- GitHub raw URLs
- IPFS gateways
- Local file mirrors
- Custom endpoints

---

## 🎯 Platform Compatibility

| Browser | MV2 | MV3 | Native | Status |
|---------|-----|-----|--------|--------|
| Chrome  | ✅   | ⚠️   | ✅      | Full   |
| Firefox | ✅   | ❌   | ✅      | Full   |
| Safari  | ❌   | ⚠️   | ✅      | Planned|
| Edge    | ✅   | ⚠️   | ✅      | Full   |
| Brave   | ✅   | ⚠️   | ✅      | Full   |

**Legend:**
- ✅ Full support
- ⚠️ Limited by platform
- ❌ Not supported

---

## 📚 Documentation

- [Installation Guide](docs/installation.md)
- [Configuration Manual](docs/configuration.md)
- [API Reference](docs/api.md)
- [Security Guide](docs/security.md)
- [Troubleshooting](docs/troubleshooting.md)

---

## 🤝 Contributing

OblivionFilter is an open-source project focused on privacy and censorship resistance. We welcome contributions from security researchers, developers, and privacy advocates.

### Development Setup

```bash
git clone https://github.com/734ai/OblivionFilter.git
cd OblivionFilter
make deps          # Install dependencies
make info          # Verify setup
make chromium-mv2  # Build for testing
```

### Code Guidelines

- Follow existing code style and patterns
- Prioritize security and privacy in all implementations
- Test thoroughly across different browsers
- Document security-sensitive features

---

## 📜 License

**GPL v3** © 2025 Muzan Sano & contributors

OblivionFilter is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

---

## ⚠️ Disclaimer

OblivionFilter is designed for legitimate privacy protection and research purposes. Users are responsible for compliance with applicable laws and regulations in their jurisdiction. The developers assume no liability for misuse.

---

**🕶️ Browse in silence. Filter in stealth.**
