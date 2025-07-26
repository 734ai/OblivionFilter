# OblivionFilter Go Proxy Server Makefile

.PHONY: all build clean install test run dev help

# Binary name
BINARY_NAME=oblivion-proxy
BINARY_PATH=bin/$(BINARY_NAME)

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod

# Build flags
BUILD_FLAGS=-ldflags="-s -w"
VERSION=$(shell git describe --tags --always --dirty 2>/dev/null || echo "unknown")
BUILD_TIME=$(shell date -u '+%Y-%m-%d_%H:%M:%S')
LDFLAGS=-ldflags="-s -w -X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME)"

# Default target
all: clean build

# Build the binary
build:
	@echo "Building OblivionFilter Go Proxy Server..."
	@mkdir -p bin
	$(GOBUILD) $(LDFLAGS) -o $(BINARY_PATH) .
	@echo "Binary built: $(BINARY_PATH)"

# Build for multiple platforms
build-all: clean
	@echo "Building for multiple platforms..."
	@mkdir -p bin
	
	# Linux amd64
	GOOS=linux GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o bin/$(BINARY_NAME)-linux-amd64 .
	
	# Linux arm64
	GOOS=linux GOARCH=arm64 $(GOBUILD) $(LDFLAGS) -o bin/$(BINARY_NAME)-linux-arm64 .
	
	# macOS amd64
	GOOS=darwin GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o bin/$(BINARY_NAME)-darwin-amd64 .
	
	# macOS arm64 (Apple Silicon)
	GOOS=darwin GOARCH=arm64 $(GOBUILD) $(LDFLAGS) -o bin/$(BINARY_NAME)-darwin-arm64 .
	
	# Windows amd64
	GOOS=windows GOARCH=amd64 $(GOBUILD) $(LDFLAGS) -o bin/$(BINARY_NAME)-windows-amd64.exe .
	
	@echo "Cross-platform builds completed in bin/ directory"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	$(GOCLEAN)
	@rm -rf bin/
	@echo "Clean completed"

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	$(GOMOD) download
	$(GOMOD) tidy
	@echo "Dependencies updated"

# Install the binary to system
install: build
	@echo "Installing $(BINARY_NAME) to /usr/local/bin/"
	@sudo cp $(BINARY_PATH) /usr/local/bin/
	@sudo chmod +x /usr/local/bin/$(BINARY_NAME)
	@echo "Installation completed"

# Uninstall the binary from system
uninstall:
	@echo "Uninstalling $(BINARY_NAME) from /usr/local/bin/"
	@sudo rm -f /usr/local/bin/$(BINARY_NAME)
	@echo "Uninstallation completed"

# Run tests
test:
	@echo "Running tests..."
	$(GOTEST) -v ./...

# Run with race detection
test-race:
	@echo "Running tests with race detection..."
	$(GOTEST) -race -v ./...

# Run benchmarks
benchmark:
	@echo "Running benchmarks..."
	$(GOTEST) -bench=. -benchmem ./...

# Run the proxy server in development mode
dev: build
	@echo "Starting OblivionFilter Proxy Server in development mode..."
	./$(BINARY_PATH) --port 8080

# Run with custom configuration
run-config: build
	@echo "Starting OblivionFilter Proxy Server with config file..."
	./$(BINARY_PATH) --config config.json

# Generate configuration template
config-template:
	@echo "Generating configuration template..."
	@cat > config.json << 'EOF'
{
  "listen_addr": "127.0.0.1",
  "listen_port": 8080,
  "tls_enabled": false,
  "cert_file": "",
  "key_file": "",
  "proxy_mode": "http",
  "upstream_proxy": "",
  "auth_required": false,
  "username": "",
  "password": "",
  "filtering_enabled": true,
  "filter_rules": [
    "||doubleclick.net^",
    "||googlesyndication.com^",
    "||googletagmanager.com^",
    "||facebook.com/tr*",
    "||google-analytics.com^",
    "##.advertisement",
    "##.ad-banner",
    "##[id*=\"ad\"]"
  ],
  "whitelist_domains": [],
  "blacklist_domains": [],
  "stealth_mode": true,
  "user_agent_rotation": true,
  "header_obfuscation": true,
  "timing_randomization": true,
  "max_connections": 1000,
  "read_timeout": "30s",
  "write_timeout": "30s",
  "idle_timeout": "60s",
  "buffer_size": 32768,
  "log_level": "info",
  "log_file": "",
  "access_log_enabled": true,
  "error_log_enabled": true
}
EOF
	@echo "Configuration template created: config.json"

# Create systemd service file
systemd-service:
	@echo "Creating systemd service file..."
	@cat > oblivion-proxy.service << 'EOF'
[Unit]
Description=OblivionFilter Proxy Server
After=network.target

[Service]
Type=simple
User=nobody
Group=nobody
ExecStart=/usr/local/bin/oblivion-proxy --config /etc/oblivion-proxy/config.json
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
	@echo "Systemd service file created: oblivion-proxy.service"
	@echo "To install:"
	@echo "  sudo cp oblivion-proxy.service /etc/systemd/system/"
	@echo "  sudo systemctl daemon-reload"
	@echo "  sudo systemctl enable oblivion-proxy"
	@echo "  sudo systemctl start oblivion-proxy"

# Create Docker image
docker-build:
	@echo "Building Docker image..."
	@cat > Dockerfile << 'EOF'
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o oblivion-proxy .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/oblivion-proxy .
COPY --from=builder /app/config.json .

EXPOSE 8080

CMD ["./oblivion-proxy", "--config", "config.json"]
EOF
	docker build -t oblivion-proxy:latest .
	@echo "Docker image built: oblivion-proxy:latest"

# Check code formatting
fmt:
	@echo "Checking code formatting..."
	@gofmt -l . | tee /tmp/gofmt.log
	@if [ -s /tmp/gofmt.log ]; then \
		echo "Code formatting issues found. Run 'gofmt -w .' to fix."; \
		exit 1; \
	fi
	@echo "Code formatting OK"

# Format code
fmt-fix:
	@echo "Formatting code..."
	@gofmt -w .
	@echo "Code formatted"

# Run static analysis
lint:
	@echo "Running static analysis..."
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run; \
	else \
		echo "golangci-lint not found. Install with: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; \
	fi

# Generate documentation
docs:
	@echo "Generating documentation..."
	@if command -v godoc >/dev/null 2>&1; then \
		echo "Documentation server starting at http://localhost:6060"; \
		godoc -http=:6060; \
	else \
		echo "godoc not found. Install with: go install golang.org/x/tools/cmd/godoc@latest"; \
	fi

# Security scan
security:
	@echo "Running security scan..."
	@if command -v gosec >/dev/null 2>&1; then \
		gosec ./...; \
	else \
		echo "gosec not found. Install with: go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest"; \
	fi

# Performance profile
profile: build
	@echo "Running with profiling enabled..."
	@echo "Access profiling at http://localhost:6060/debug/pprof/"
	./$(BINARY_PATH) --port 8080 --profile

# Check dependencies for vulnerabilities
vuln-check:
	@echo "Checking dependencies for vulnerabilities..."
	@if command -v govulncheck >/dev/null 2>&1; then \
		govulncheck ./...; \
	else \
		echo "govulncheck not found. Install with: go install golang.org/x/vuln/cmd/govulncheck@latest"; \
	fi

# Update dependencies
update-deps:
	@echo "Updating dependencies..."
	$(GOGET) -u ./...
	$(GOMOD) tidy
	@echo "Dependencies updated"

# Show version information
version: build
	./$(BINARY_PATH) --version

# Show help
help:
	@echo "OblivionFilter Go Proxy Server Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  build         Build the binary for current platform"
	@echo "  build-all     Build for multiple platforms"
	@echo "  clean         Clean build artifacts"
	@echo "  deps          Download and update dependencies"
	@echo "  install       Install binary to system (/usr/local/bin)"
	@echo "  uninstall     Remove binary from system"
	@echo "  test          Run tests"
	@echo "  test-race     Run tests with race detection"
	@echo "  benchmark     Run benchmarks"
	@echo "  dev           Run in development mode"
	@echo "  run-config    Run with configuration file"
	@echo "  config-template  Generate configuration template"
	@echo "  systemd-service  Create systemd service file"
	@echo "  docker-build  Build Docker image"
	@echo "  fmt           Check code formatting"
	@echo "  fmt-fix       Format code"
	@echo "  lint          Run static analysis"
	@echo "  docs          Generate documentation"
	@echo "  security      Run security scan"
	@echo "  profile       Run with profiling enabled"
	@echo "  vuln-check    Check dependencies for vulnerabilities"
	@echo "  update-deps   Update dependencies"
	@echo "  version       Show version information"
	@echo "  help          Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make build              # Build for current platform"
	@echo "  make dev                # Run in development mode"
	@echo "  make config-template    # Generate config file"
	@echo "  make install            # Install to system"
