# OblivionFilter Native Messaging Integration
# Enables communication between browser extensions and native proxy servers

import json
import struct
import sys
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import subprocess

class NativeMessagingHost:
    """Native messaging host for browser communication"""
    
    def __init__(self, proxy_controller):
        self.proxy_controller = proxy_controller
        self.logger = logging.getLogger(__name__)
        
    def read_message(self) -> Optional[Dict[str, Any]]:
        """Read a message from stdin"""
        try:
            # Read the message length (4 bytes)
            raw_length = sys.stdin.buffer.read(4)
            if not raw_length:
                return None
                
            message_length = struct.unpack('I', raw_length)[0]
            
            # Read the message
            message = sys.stdin.buffer.read(message_length)
            if not message:
                return None
                
            return json.loads(message.decode('utf-8'))
            
        except Exception as e:
            self.logger.error(f"Error reading message: {e}")
            return None
    
    def send_message(self, message: Dict[str, Any]) -> None:
        """Send a message to stdout"""
        try:
            encoded_message = json.dumps(message).encode('utf-8')
            message_length = len(encoded_message)
            
            # Send length first
            sys.stdout.buffer.write(struct.pack('I', message_length))
            # Send message
            sys.stdout.buffer.write(encoded_message)
            sys.stdout.buffer.flush()
            
        except Exception as e:
            self.logger.error(f"Error sending message: {e}")
    
    def handle_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming message and return response"""
        try:
            action = message.get('action')
            
            if action == 'get_status':
                return {
                    'success': True,
                    'data': self.proxy_controller.get_status()
                }
            
            elif action == 'update_filters':
                filter_rules = message.get('filters', [])
                success = self.proxy_controller.update_filters(filter_rules)
                return {
                    'success': success,
                    'message': 'Filters updated' if success else 'Failed to update filters'
                }
            
            elif action == 'toggle_filtering':
                enabled = message.get('enabled', True)
                success = self.proxy_controller.toggle_filtering(enabled)
                return {
                    'success': success,
                    'message': f'Filtering {"enabled" if enabled else "disabled"}'
                }
            
            elif action == 'get_stats':
                return {
                    'success': True,
                    'data': self.proxy_controller.get_stats()
                }
            
            elif action == 'whitelist_domain':
                domain = message.get('domain')
                if domain:
                    success = self.proxy_controller.whitelist_domain(domain)
                    return {
                        'success': success,
                        'message': f'Domain {"whitelisted" if success else "failed to whitelist"}'
                    }
                
            elif action == 'blacklist_domain':
                domain = message.get('domain')
                if domain:
                    success = self.proxy_controller.blacklist_domain(domain)
                    return {
                        'success': success,
                        'message': f'Domain {"blacklisted" if success else "failed to blacklist"}'
                    }
            
            elif action == 'generate_pac':
                pac_content = self.proxy_controller.generate_pac_file()
                return {
                    'success': True,
                    'data': {'pac_content': pac_content}
                }
            
            else:
                return {
                    'success': False,
                    'error': f'Unknown action: {action}'
                }
                
        except Exception as e:
            self.logger.error(f"Error handling message: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def run(self) -> None:
        """Run the native messaging host"""
        self.logger.info("Native messaging host started")
        
        try:
            while True:
                message = self.read_message()
                if message is None:
                    break
                
                response = self.handle_message(message)
                self.send_message(response)
                
        except KeyboardInterrupt:
            self.logger.info("Native messaging host stopped")
        except Exception as e:
            self.logger.error(f"Native messaging host error: {e}")

class ProxyController:
    """Controller for managing proxy operations"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path
        self.proxy_process = None
        self.proxy_port = 8080
        self.filtering_enabled = True
        self.logger = logging.getLogger(__name__)
        
    def get_status(self) -> Dict[str, Any]:
        """Get proxy status"""
        return {
            'running': self.proxy_process is not None and self.proxy_process.poll() is None,
            'port': self.proxy_port,
            'filtering_enabled': self.filtering_enabled,
            'version': '2.0.0'
        }
    
    def start_proxy(self) -> bool:
        """Start the proxy server"""
        try:
            if self.proxy_process and self.proxy_process.poll() is None:
                return True  # Already running
            
            # Start Go proxy server
            go_proxy_path = Path(__file__).parent.parent / 'go-proxy' / 'bin' / 'oblivion-proxy'
            if go_proxy_path.exists():
                self.proxy_process = subprocess.Popen([
                    str(go_proxy_path),
                    '--port', str(self.proxy_port)
                ])
                return True
            
            # Fallback to Python proxy
            python_proxy_path = Path(__file__).parent.parent / 'python-proxy' / 'start.sh'
            if python_proxy_path.exists():
                self.proxy_process = subprocess.Popen([
                    str(python_proxy_path),
                    '--port', str(self.proxy_port)
                ])
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to start proxy: {e}")
            return False
    
    def stop_proxy(self) -> bool:
        """Stop the proxy server"""
        try:
            if self.proxy_process:
                self.proxy_process.terminate()
                self.proxy_process.wait(timeout=10)
                self.proxy_process = None
            return True
        except Exception as e:
            self.logger.error(f"Failed to stop proxy: {e}")
            return False
    
    def update_filters(self, filter_rules: list) -> bool:
        """Update filter rules"""
        try:
            # In a real implementation, this would update the proxy's filter rules
            # For now, just log the update
            self.logger.info(f"Updating filters with {len(filter_rules)} rules")
            return True
        except Exception as e:
            self.logger.error(f"Failed to update filters: {e}")
            return False
    
    def toggle_filtering(self, enabled: bool) -> bool:
        """Toggle filtering on/off"""
        try:
            self.filtering_enabled = enabled
            # In a real implementation, this would send a signal to the proxy
            self.logger.info(f"Filtering {'enabled' if enabled else 'disabled'}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to toggle filtering: {e}")
            return False
    
    def whitelist_domain(self, domain: str) -> bool:
        """Add domain to whitelist"""
        try:
            # In a real implementation, this would update the proxy's whitelist
            self.logger.info(f"Whitelisting domain: {domain}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to whitelist domain: {e}")
            return False
    
    def blacklist_domain(self, domain: str) -> bool:
        """Add domain to blacklist"""
        try:
            # In a real implementation, this would update the proxy's blacklist
            self.logger.info(f"Blacklisting domain: {domain}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to blacklist domain: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get proxy statistics"""
        return {
            'requests_processed': 0,
            'requests_blocked': 0,
            'bytes_transferred': 0,
            'uptime': 0,
            'filter_rules': 0
        }
    
    def generate_pac_file(self) -> str:
        """Generate PAC file content"""
        return f'''function FindProxyForURL(url, host) {{
    // OblivionFilter Proxy Auto-Configuration
    
    // Direct connections for localhost and private networks
    if (isPlainHostName(host) ||
        shExpMatch(host, "*.local") ||
        isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
        isInNet(dnsResolve(host), "172.16.0.0", "255.240.0.0") ||
        isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0") ||
        isInNet(dnsResolve(host), "127.0.0.0", "255.255.255.0")) {{
        return "DIRECT";
    }}
    
    // Use OblivionFilter proxy for all other connections
    return "PROXY 127.0.0.1:{self.proxy_port}; DIRECT";
}}'''

def install_native_messaging_host():
    """Install native messaging host for browsers"""
    script_dir = Path(__file__).parent
    
    # Chrome/Chromium manifest
    chrome_manifest = {
        "name": "com.oblivionfilter.native",
        "description": "OblivionFilter Native Messaging Host",
        "path": str(script_dir / "native_host.py"),
        "type": "stdio",
        "allowed_origins": [
            "chrome-extension://oblivionfilter-extension-id/"
        ]
    }
    
    # Firefox manifest
    firefox_manifest = {
        "name": "com.oblivionfilter.native",
        "description": "OblivionFilter Native Messaging Host",
        "path": str(script_dir / "native_host.py"),
        "type": "stdio",
        "allowed_extensions": [
            "oblivionfilter@extension.id"
        ]
    }
    
    # Install for Chrome/Chromium
    chrome_dir = Path.home() / '.config' / 'google-chrome' / 'NativeMessagingHosts'
    chrome_dir.mkdir(parents=True, exist_ok=True)
    
    with open(chrome_dir / 'com.oblivionfilter.native.json', 'w') as f:
        json.dump(chrome_manifest, f, indent=2)
    
    # Install for Firefox
    firefox_dir = Path.home() / '.mozilla' / 'native-messaging-hosts'
    firefox_dir.mkdir(parents=True, exist_ok=True)
    
    with open(firefox_dir / 'com.oblivionfilter.native.json', 'w') as f:
        json.dump(firefox_manifest, f, indent=2)
    
    print("Native messaging host installed for Chrome and Firefox")

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="OblivionFilter Native Messaging Host")
    parser.add_argument('--install', action='store_true', 
                       help='Install native messaging host')
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--log-level', default='INFO',
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       help='Log level')
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('/tmp/oblivion-native.log'),
            logging.StreamHandler(sys.stderr)
        ]
    )
    
    if args.install:
        install_native_messaging_host()
        return
    
    # Run native messaging host
    proxy_controller = ProxyController(args.config)
    host = NativeMessagingHost(proxy_controller)
    host.run()

if __name__ == '__main__':
    main()
