# OblivionFilter Build System
# Advanced content blocker with stealth and censorship resistance

SHELL := /bin/bash
.PHONY: all clean build chromium-mv2 chromium-mv3 firefox package help

# Version and build info
VERSION := 1.0.0
BUILD := stealth
TIMESTAMP := $(shell date +%Y%m%d_%H%M%S)

# Directories
SRC_DIR := src
DIST_DIR := dist
BUILD_DIR := $(DIST_DIR)/build
PLATFORM_DIR := platform

# Source files
SOURCES := $(shell find $(SRC_DIR) -type f)
MANIFEST_FILES := $(wildcard $(PLATFORM_DIR)/*/manifest.json)

# Default target
all: chromium-mv2 chromium-mv3 firefox

help:
	@echo "OblivionFilter Build System"
	@echo "=========================="
	@echo ""
	@echo "Available targets:"
	@echo "  all            - Build all platform versions"
	@echo "  chromium-mv2   - Build Chromium Manifest V2 version"
	@echo "  chromium-mv3   - Build Chromium Manifest V3 version"
	@echo "  firefox        - Build Firefox version"
	@echo "  package        - Create distribution packages"
	@echo "  clean          - Clean build artifacts"
	@echo "  help           - Show this help"
	@echo ""
	@echo "Build info:"
	@echo "  Version: $(VERSION)"
	@echo "  Build:   $(BUILD)"
	@echo ""

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf $(DIST_DIR)
	@echo "✅ Clean complete"

# Create build directories
$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

# Build Chromium Manifest V2 version
chromium-mv2: $(BUILD_DIR)
	@echo "🔨 Building OblivionFilter for Chromium (Manifest V2)..."
	
	# Create build directory
	mkdir -p $(BUILD_DIR)/OblivionFilter.chromium-mv2
	
	# Copy source files
	cp -r $(SRC_DIR)/* $(BUILD_DIR)/OblivionFilter.chromium-mv2/
	
	# Copy platform-specific manifest
	cp $(PLATFORM_DIR)/chromium-mv2/manifest.json $(BUILD_DIR)/OblivionFilter.chromium-mv2/
	
	# Create version info
	echo "$(VERSION)-$(BUILD)-mv2-$(TIMESTAMP)" > $(BUILD_DIR)/OblivionFilter.chromium-mv2/version.txt
	
	# Update manifest version
	sed -i 's/"version": "1.0.0"/"version": "$(VERSION)"/' $(BUILD_DIR)/OblivionFilter.chromium-mv2/manifest.json
	
	@echo "✅ Chromium MV2 build complete: $(BUILD_DIR)/OblivionFilter.chromium-mv2"

# Build Chromium Manifest V3 version
chromium-mv3: $(BUILD_DIR)
	@echo "🔨 Building OblivionFilter for Chromium (Manifest V3)..."
	
	# Create build directory
	mkdir -p $(BUILD_DIR)/OblivionFilter.chromium-mv3
	
	# Copy source files
	cp -r $(SRC_DIR)/* $(BUILD_DIR)/OblivionFilter.chromium-mv3/
	
	# Copy platform-specific manifest
	cp $(PLATFORM_DIR)/chromium-mv3/manifest.json $(BUILD_DIR)/OblivionFilter.chromium-mv3/
	
	# Remove background.html for MV3 (uses service worker)
	rm -f $(BUILD_DIR)/OblivionFilter.chromium-mv3/background.html
	
	# Create version info
	echo "$(VERSION)-$(BUILD)-mv3-$(TIMESTAMP)" > $(BUILD_DIR)/OblivionFilter.chromium-mv3/version.txt
	
	# Update manifest version
	sed -i 's/"version": "1.0.0"/"version": "$(VERSION)"/' $(BUILD_DIR)/OblivionFilter.chromium-mv3/manifest.json
	
	# Create declarative net request rulesets directory
	mkdir -p $(BUILD_DIR)/OblivionFilter.chromium-mv3/rulesets
	echo '[]' > $(BUILD_DIR)/OblivionFilter.chromium-mv3/rulesets/default.json
	echo '[]' > $(BUILD_DIR)/OblivionFilter.chromium-mv3/rulesets/stealth.json
	
	@echo "✅ Chromium MV3 build complete: $(BUILD_DIR)/OblivionFilter.chromium-mv3"

# Build Firefox version
firefox: $(BUILD_DIR)
	@echo "🔨 Building OblivionFilter for Firefox..."
	
	# Create build directory
	mkdir -p $(BUILD_DIR)/OblivionFilter.firefox
	
	# Copy source files
	cp -r $(SRC_DIR)/* $(BUILD_DIR)/OblivionFilter.firefox/
	
	# Copy platform-specific manifest
	cp $(PLATFORM_DIR)/firefox/manifest.json $(BUILD_DIR)/OblivionFilter.firefox/
	
	# Create version info
	echo "$(VERSION)-$(BUILD)-firefox-$(TIMESTAMP)" > $(BUILD_DIR)/OblivionFilter.firefox/version.txt
	
	# Update manifest version
	sed -i 's/"version": "1.0.0"/"version": "$(VERSION)"/' $(BUILD_DIR)/OblivionFilter.firefox/manifest.json
	
	@echo "✅ Firefox build complete: $(BUILD_DIR)/OblivionFilter.firefox"

# Create distribution packages
package: all
	@echo "📦 Creating distribution packages..."
	
	# Create packages directory
	mkdir -p $(DIST_DIR)/packages
	
	# Package Chromium MV2
	if [ -d "$(BUILD_DIR)/OblivionFilter.chromium-mv2" ]; then \
		cd $(BUILD_DIR) && zip -r ../packages/OblivionFilter-$(VERSION)-chromium-mv2.zip OblivionFilter.chromium-mv2; \
		echo "✅ Created: OblivionFilter-$(VERSION)-chromium-mv2.zip"; \
	fi
	
	# Package Chromium MV3
	if [ -d "$(BUILD_DIR)/OblivionFilter.chromium-mv3" ]; then \
		cd $(BUILD_DIR) && zip -r ../packages/OblivionFilter-$(VERSION)-chromium-mv3.zip OblivionFilter.chromium-mv3; \
		echo "✅ Created: OblivionFilter-$(VERSION)-chromium-mv3.zip"; \
	fi
	
	# Package Firefox
	if [ -d "$(BUILD_DIR)/OblivionFilter.firefox" ]; then \
		cd $(BUILD_DIR) && zip -r ../packages/OblivionFilter-$(VERSION)-firefox.xpi OblivionFilter.firefox; \
		echo "✅ Created: OblivionFilter-$(VERSION)-firefox.xpi"; \
	fi
	
	@echo "📦 All packages created in $(DIST_DIR)/packages/"

# Development server (for testing)
dev-server:
	@echo "🚀 Starting development server..."
	@if command -v python3 >/dev/null 2>&1; then \
		echo "Starting HTTP server on http://localhost:8000"; \
		cd $(BUILD_DIR) && python3 -m http.server 8000; \
	elif command -v python >/dev/null 2>&1; then \
		echo "Starting HTTP server on http://localhost:8000"; \
		cd $(BUILD_DIR) && python -m SimpleHTTPServer 8000; \
	else \
		echo "Error: Python not found. Please install Python to use dev server."; \
	fi

# Lint JavaScript files
lint:
	@echo "🔍 Linting JavaScript files..."
	@if command -v eslint >/dev/null 2>&1; then \
		eslint $(SRC_DIR)/js/**/*.js; \
	else \
		echo "ESLint not found. Skipping lint check."; \
		echo "Install with: npm install -g eslint"; \
	fi

# Check for TODO items
todo:
	@echo "📝 Searching for TODO items..."
	@grep -r "TODO\|FIXME\|XXX" $(SRC_DIR) --include="*.js" --include="*.html" --include="*.css" || echo "No TODO items found"

# Show build information
info:
	@echo "OblivionFilter Build Information"
	@echo "==============================="
	@echo "Version:    $(VERSION)"
	@echo "Build:      $(BUILD)"
	@echo "Timestamp:  $(TIMESTAMP)"
	@echo "Source Dir: $(SRC_DIR)"
	@echo "Dist Dir:   $(DIST_DIR)"
	@echo ""
	@echo "Platform Support:"
	@echo "  ✅ Chromium MV2 (Full features)"
	@echo "  ⚠️  Chromium MV3 (Limited by manifest)"
	@echo "  ✅ Firefox (Full features)"
	@echo ""
	@echo "Key Features:"
	@echo "  🛡️  Anti-Adblock Bypass"
	@echo "  🔄 Manifest V3 Resistance" 
	@echo "  🌐 Decentralized Updates"
	@echo "  🚀 High Performance"
	@echo "  🔐 Zero Telemetry"
	@echo "  💼 Sideloadable"

# Install development dependencies
deps:
	@echo "📦 Installing development dependencies..."
	@if command -v npm >/dev/null 2>&1; then \
		npm init -y 2>/dev/null || true; \
		npm install --save-dev eslint; \
		echo "✅ Development dependencies installed"; \
	else \
		echo "npm not found. Please install Node.js and npm first."; \
	fi

# Watch for changes and rebuild (requires inotify-tools)
watch:
	@echo "👀 Watching for changes..."
	@if command -v inotifywait >/dev/null 2>&1; then \
		while inotifywait -r -e modify,create,delete $(SRC_DIR) $(PLATFORM_DIR); do \
			echo "🔄 Changes detected, rebuilding..."; \
			$(MAKE) all; \
		done; \
	else \
		echo "inotifywait not found. Install with: sudo apt-get install inotify-tools"; \
	fi

# Check system requirements
check:
	@echo "🔍 Checking system requirements..."
	@echo -n "Bash: "; bash --version | head -1 || echo "❌ Not found"
	@echo -n "Make: "; make --version | head -1 || echo "❌ Not found"
	@echo -n "Zip: "; zip --version | head -1 || echo "❌ Not found"
	@echo -n "Python: "; python3 --version 2>/dev/null || python --version 2>/dev/null || echo "❌ Not found"
	@echo -n "Node.js: "; node --version 2>/dev/null || echo "⚠️  Not found (optional)"
	@echo -n "ESLint: "; eslint --version 2>/dev/null || echo "⚠️  Not found (optional)"
	@echo ""
	@echo "✅ System check complete"
