#!/bin/bash

# OblivionFilter Python Proxy Bridge Installation Script
# Installs dependencies and sets up the Python proxy server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROXY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROXY_DIR/venv"
CONFIG_DIR="$HOME/.config/oblivion-filter"
SERVICE_NAME="oblivion-proxy"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    print_status "Checking system dependencies..."
    
    # Check Python 3.8+
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not installed"
        exit 1
    fi
    
    python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    required_version="3.8"
    
    if [[ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]]; then
        print_error "Python $required_version or higher is required (found $python_version)"
        exit 1
    fi
    
    print_success "Python $python_version found"
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        print_error "pip3 is required but not installed"
        exit 1
    fi
    
    # Check for development tools
    if ! command -v gcc &> /dev/null && ! command -v clang &> /dev/null; then
        print_warning "No C compiler found. Installing build-essential..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y build-essential python3-dev
        elif command -v yum &> /dev/null; then
            sudo yum groupinstall -y "Development Tools" && sudo yum install -y python3-devel
        elif command -v pacman &> /dev/null; then
            sudo pacman -S --noconfirm base-devel python
        else
            print_warning "Please install development tools manually"
        fi
    fi
}

setup_virtual_environment() {
    print_status "Setting up Python virtual environment..."
    
    if [[ -d "$VENV_DIR" ]]; then
        print_warning "Virtual environment already exists. Removing..."
        rm -rf "$VENV_DIR"
    fi
    
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    
    # Upgrade pip
    pip install --upgrade pip wheel setuptools
    
    print_success "Virtual environment created"
}

install_dependencies() {
    print_status "Installing Python dependencies..."
    
    source "$VENV_DIR/bin/activate"
    
    # Install from requirements.txt
    pip install -r "$PROXY_DIR/requirements.txt"
    
    print_success "Dependencies installed"
}

create_configuration() {
    print_status "Creating configuration files..."
    
    mkdir -p "$CONFIG_DIR"
    
    # Create main configuration file
    cat > "$CONFIG_DIR/config.yaml" << 'EOF'
# OblivionFilter Python Proxy Configuration

# Server settings
listen_host: "127.0.0.1"
listen_port: 8080
upstream_proxy: null
ssl_cert: null
ssl_key: null

# Logging
log_level: "INFO"
log_file: null

# Filtering
filter_config: null
cache_enabled: true
cache_size: 104857600  # 100MB

# Features
stealth_mode: true
block_malware: true
inject_cosmetic_filters: true

# Performance
max_connections: 1000
connection_timeout: 30
request_timeout: 60

# Security
enable_https_inspection: false
block_suspicious_patterns: true
rate_limit_enabled: true
rate_limit_requests: 100
rate_limit_window: 60
EOF

    # Create filter rules configuration
    cat > "$CONFIG_DIR/filters.yaml" << 'EOF'
# OblivionFilter Rule Configuration

# Domain whitelists and blacklists
whitelist_domains:
  - "localhost"
  - "127.0.0.1"

blacklist_domains: []

# Filtering rules
rules:
  # Ad networks
  - pattern: "doubleclick.net"
    action: "block"
    description: "Google DoubleClick"
    enabled: true
    priority: 10

  - pattern: "googlesyndication.com"
    action: "block"
    description: "Google AdSense"
    enabled: true
    priority: 10

  - pattern: "googletagmanager.com"
    action: "block"
    description: "Google Tag Manager"
    enabled: true
    priority: 10

  - pattern: "google-analytics.com"
    action: "block"
    description: "Google Analytics"
    enabled: true
    priority: 10

  - pattern: "facebook.com/tr"
    action: "block"
    description: "Facebook Tracking"
    enabled: true
    priority: 10

  - pattern: "connect.facebook.net"
    action: "block"
    description: "Facebook Connect"
    enabled: true
    priority: 10

  # Social media tracking
  - pattern: "platform.twitter.com"
    action: "block"
    description: "Twitter Platform"
    enabled: true
    priority: 10

  - pattern: "apis.google.com/js/plusone"
    action: "block"
    description: "Google+ Button"
    enabled: true
    priority: 10

  # Analytics platforms
  - pattern: "hotjar.com"
    action: "block"
    description: "Hotjar Analytics"
    enabled: true
    priority: 10

  - pattern: "mixpanel.com"
    action: "block"
    description: "Mixpanel Analytics"
    enabled: true
    priority: 10

  - pattern: "segment.com"
    action: "block"
    description: "Segment Analytics"
    enabled: true
    priority: 10

  # Malware domains (examples)
  - pattern: ".*\\.tk$"
    action: "block"
    description: "Suspicious .tk domains"
    enabled: true
    priority: 20

  - pattern: ".*\\.ml$"
    action: "block"
    description: "Suspicious .ml domains"
    enabled: true
    priority: 20
EOF

    # Create startup script
    cat > "$PROXY_DIR/start.sh" << 'EOF'
#!/bin/bash

PROXY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROXY_DIR/venv"
CONFIG_DIR="$HOME/.config/oblivion-filter"

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Start the proxy
exec python3 "$PROXY_DIR/main.py" \
    --config "$CONFIG_DIR/config.yaml" \
    --filter-config "$CONFIG_DIR/filters.yaml" \
    "$@"
EOF

    chmod +x "$PROXY_DIR/start.sh"
    
    print_success "Configuration files created in $CONFIG_DIR"
}

create_systemd_service() {
    print_status "Creating systemd service..."
    
    cat > "/tmp/$SERVICE_NAME.service" << EOF
[Unit]
Description=OblivionFilter Python Proxy Bridge
After=network.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$PROXY_DIR
ExecStart=$PROXY_DIR/start.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=PATH=$VENV_DIR/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

    print_status "To install the systemd service, run:"
    echo "  sudo cp /tmp/$SERVICE_NAME.service /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable $SERVICE_NAME"
    echo "  sudo systemctl start $SERVICE_NAME"
}

create_desktop_entry() {
    print_status "Creating desktop entry..."
    
    mkdir -p "$HOME/.local/share/applications"
    
    cat > "$HOME/.local/share/applications/oblivion-proxy.desktop" << EOF
[Desktop Entry]
Name=OblivionFilter Proxy
Comment=Advanced privacy-focused proxy server
Exec=$PROXY_DIR/start.sh --host 0.0.0.0 --port 8080
Icon=network-proxy
Terminal=true
Type=Application
Categories=Network;Security;
Keywords=proxy;privacy;filter;ad-blocker;
EOF

    print_success "Desktop entry created"
}

generate_certificates() {
    print_status "Generating SSL certificates..."
    
    CERT_DIR="$CONFIG_DIR/certs"
    mkdir -p "$CERT_DIR"
    
    # Generate private key
    openssl genrsa -out "$CERT_DIR/proxy.key" 2048
    
    # Generate certificate
    openssl req -new -x509 -key "$CERT_DIR/proxy.key" -out "$CERT_DIR/proxy.crt" -days 365 -subj "/C=US/ST=State/L=City/O=OblivionFilter/CN=localhost"
    
    # Update configuration to use certificates
    sed -i "s|ssl_cert: null|ssl_cert: \"$CERT_DIR/proxy.crt\"|" "$CONFIG_DIR/config.yaml"
    sed -i "s|ssl_key: null|ssl_key: \"$CERT_DIR/proxy.key\"|" "$CONFIG_DIR/config.yaml"
    
    print_success "SSL certificates generated"
}

show_usage() {
    print_status "Installation complete!"
    echo
    echo "Usage:"
    echo "  Direct execution:     $PROXY_DIR/start.sh"
    echo "  With custom port:     $PROXY_DIR/start.sh --port 3128"
    echo "  Generate PAC file:    $PROXY_DIR/start.sh --generate-pac proxy.pac"
    echo "  Debug mode:           $PROXY_DIR/start.sh --log-level DEBUG"
    echo
    echo "Configuration files:"
    echo "  Main config:          $CONFIG_DIR/config.yaml"
    echo "  Filter rules:         $CONFIG_DIR/filters.yaml"
    echo
    echo "Browser configuration:"
    echo "  HTTP Proxy:           127.0.0.1:8080"
    echo "  HTTPS Proxy:          127.0.0.1:8080"
    echo "  PAC URL:              file://$(pwd)/proxy.pac"
    echo
    echo "To start as a service:"
    echo "  sudo systemctl start $SERVICE_NAME"
    echo "  sudo systemctl status $SERVICE_NAME"
}

main() {
    print_status "Starting OblivionFilter Python Proxy installation..."
    echo
    
    check_dependencies
    setup_virtual_environment
    install_dependencies
    create_configuration
    create_systemd_service
    create_desktop_entry
    
    # Ask if user wants SSL certificates
    read -p "Generate SSL certificates for HTTPS inspection? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v openssl &> /dev/null; then
            generate_certificates
        else
            print_warning "OpenSSL not found. Skipping certificate generation."
        fi
    fi
    
    show_usage
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            echo "OblivionFilter Python Proxy Installation Script"
            echo
            echo "Usage: $0 [options]"
            echo
            echo "Options:"
            echo "  --help, -h          Show this help message"
            echo "  --no-venv           Skip virtual environment creation"
            echo "  --no-service        Skip systemd service creation"
            echo "  --no-desktop        Skip desktop entry creation"
            echo "  --cert-only         Only generate SSL certificates"
            exit 0
            ;;
        --no-venv)
            SKIP_VENV=1
            shift
            ;;
        --no-service)
            SKIP_SERVICE=1
            shift
            ;;
        --no-desktop)
            SKIP_DESKTOP=1
            shift
            ;;
        --cert-only)
            CERT_ONLY=1
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Handle special modes
if [[ "$CERT_ONLY" == "1" ]]; then
    generate_certificates
    exit 0
fi

# Run main installation
main
