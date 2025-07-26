#!/usr/bin/env python3
"""
OblivionFilter Python Proxy Bridge
Advanced HTTP/HTTPS proxy server with deep packet inspection and filtering
Integrates with mitmproxy for advanced traffic analysis
"""

import asyncio
import json
import logging
import os
import re
import ssl
import sys
import time
from typing import Dict, List, Optional, Set, Tuple, Union
from urllib.parse import urlparse
import argparse
from dataclasses import dataclass
from pathlib import Path

# Third-party imports
try:
    import aiohttp
    import mitmproxy
    from mitmproxy import http, options
    from mitmproxy.tools.dump import DumpMaster
    from mitmproxy.addons import core
    import yaml
    import uvloop  # High-performance event loop
except ImportError as e:
    print(f"Missing required dependency: {e}")
    print("Please install with: pip install aiohttp mitmproxy pyyaml uvloop")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('oblivion-proxy.log')
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class FilterRule:
    """Represents a filtering rule with metadata"""
    pattern: str
    action: str  # 'block', 'allow', 'redirect', 'modify'
    domain: Optional[str] = None
    path: Optional[str] = None
    method: Optional[str] = None
    content_type: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    priority: int = 0
    enabled: bool = True
    description: str = ""

class FilterEngine:
    """Advanced filtering engine with pattern matching and rule management"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.rules: List[FilterRule] = []
        self.domain_rules: Dict[str, List[FilterRule]] = {}
        self.path_rules: Dict[str, List[FilterRule]] = {}
        self.regex_rules: List[Tuple[re.Pattern, FilterRule]] = []
        self.whitelist_domains: Set[str] = set()
        self.blacklist_domains: Set[str] = set()
        self.cache: Dict[str, bool] = {}
        self.cache_ttl = 300  # 5 minutes
        self.cache_expiry: Dict[str, float] = {}
        
        if config_path:
            self.load_config(config_path)
        else:
            self.load_default_rules()
    
    def load_config(self, config_path: str) -> None:
        """Load filtering configuration from file"""
        try:
            with open(config_path, 'r') as f:
                if config_path.endswith('.yaml') or config_path.endswith('.yml'):
                    config = yaml.safe_load(f)
                else:
                    config = json.load(f)
            
            self.whitelist_domains = set(config.get('whitelist_domains', []))
            self.blacklist_domains = set(config.get('blacklist_domains', []))
            
            for rule_data in config.get('rules', []):
                rule = FilterRule(**rule_data)
                self.add_rule(rule)
                
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            self.load_default_rules()
    
    def load_default_rules(self) -> None:
        """Load default filtering rules"""
        default_rules = [
            # Ad networks
            FilterRule("doubleclick.net", "block", description="Google DoubleClick"),
            FilterRule("googlesyndication.com", "block", description="Google AdSense"),
            FilterRule("googletagmanager.com", "block", description="Google Tag Manager"),
            FilterRule("google-analytics.com", "block", description="Google Analytics"),
            FilterRule("googleadservices.com", "block", description="Google Ad Services"),
            FilterRule("adsystem.com", "block", description="Amazon Ad System"),
            FilterRule("amazon-adsystem.com", "block", description="Amazon Ads"),
            FilterRule("facebook.com/tr", "block", description="Facebook Tracking"),
            FilterRule("facebook.com/plugins", "block", description="Facebook Plugins"),
            FilterRule("twitter.com/i/adsct", "block", description="Twitter Ads"),
            FilterRule("ads.yahoo.com", "block", description="Yahoo Ads"),
            FilterRule("bing.com/maps/traffic", "block", description="Bing Tracking"),
            
            # Social media tracking
            FilterRule("connect.facebook.net", "block", description="Facebook Connect"),
            FilterRule("platform.twitter.com", "block", description="Twitter Platform"),
            FilterRule("platform.linkedin.com", "block", description="LinkedIn Platform"),
            FilterRule("apis.google.com/js/plusone", "block", description="Google+ Button"),
            
            # Analytics and metrics
            FilterRule("hotjar.com", "block", description="Hotjar Analytics"),
            FilterRule("mixpanel.com", "block", description="Mixpanel Analytics"),
            FilterRule("segment.com", "block", description="Segment Analytics"),
            FilterRule("amplitude.com", "block", description="Amplitude Analytics"),
            FilterRule("fullstory.com", "block", description="FullStory Analytics"),
            FilterRule("loggly.com", "block", description="Loggly Logging"),
            FilterRule("newrelic.com", "block", description="New Relic Monitoring"),
            
            # CDN and advertising
            FilterRule("cdn.ampproject.org", "block", description="AMP Project CDN"),
            FilterRule("pagead2.googlesyndication.com", "block", description="Google PageAd"),
            FilterRule("tpc.googlesyndication.com", "block", description="Google TPC"),
            FilterRule("stats.wp.com", "block", description="WordPress Stats"),
            FilterRule("scorecardresearch.com", "block", description="Scorecard Research"),
            FilterRule("quantserve.com", "block", description="Quantcast"),
            FilterRule("outbrain.com", "block", description="Outbrain Content"),
            FilterRule("taboola.com", "block", description="Taboola Content"),
            
            # Malware and suspicious domains
            FilterRule(".*\.tk$", "block", description="Suspicious .tk domains"),
            FilterRule(".*\.ml$", "block", description="Suspicious .ml domains"),
            FilterRule(".*\.ga$", "block", description="Suspicious .ga domains"),
            FilterRule(".*\.cf$", "block", description="Suspicious .cf domains"),
        ]
        
        for rule in default_rules:
            self.add_rule(rule)
    
    def add_rule(self, rule: FilterRule) -> None:
        """Add a filtering rule to the engine"""
        self.rules.append(rule)
        
        # Index by domain
        if rule.domain:
            if rule.domain not in self.domain_rules:
                self.domain_rules[rule.domain] = []
            self.domain_rules[rule.domain].append(rule)
        
        # Index by path
        if rule.path:
            if rule.path not in self.path_rules:
                self.path_rules[rule.path] = []
            self.path_rules[rule.path].append(rule)
        
        # Compile regex patterns
        try:
            if any(char in rule.pattern for char in '.*+?^${}()|[]\\'):
                regex = re.compile(rule.pattern, re.IGNORECASE)
                self.regex_rules.append((regex, rule))
        except re.error:
            logger.warning(f"Invalid regex pattern: {rule.pattern}")
    
    def should_block(self, url: str, method: str = "GET", 
                    headers: Optional[Dict[str, str]] = None,
                    content_type: Optional[str] = None) -> Tuple[bool, Optional[FilterRule]]:
        """Check if a request should be blocked"""
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        path = parsed.path
        
        # Check cache
        cache_key = f"{method}:{url}"
        if cache_key in self.cache:
            if time.time() < self.cache_expiry.get(cache_key, 0):
                return self.cache[cache_key], None
        
        # Check whitelist first
        if domain in self.whitelist_domains:
            self._update_cache(cache_key, False)
            return False, None
        
        # Check blacklist
        if domain in self.blacklist_domains:
            self._update_cache(cache_key, True)
            return True, None
        
        # Check domain rules
        if domain in self.domain_rules:
            for rule in self.domain_rules[domain]:
                if self._match_rule(rule, url, method, headers, content_type):
                    action = rule.action == "block"
                    self._update_cache(cache_key, action)
                    return action, rule
        
        # Check path rules
        if path in self.path_rules:
            for rule in self.path_rules[path]:
                if self._match_rule(rule, url, method, headers, content_type):
                    action = rule.action == "block"
                    self._update_cache(cache_key, action)
                    return action, rule
        
        # Check regex rules
        for regex, rule in self.regex_rules:
            if regex.search(url) and self._match_rule(rule, url, method, headers, content_type):
                action = rule.action == "block"
                self._update_cache(cache_key, action)
                return action, rule
        
        # Check all other rules
        for rule in self.rules:
            if (rule.domain or rule.path or 
                any(char in rule.pattern for char in '.*+?^${}()|[]\\')): 
                continue  # Already checked above
            
            if rule.pattern in url and self._match_rule(rule, url, method, headers, content_type):
                action = rule.action == "block"
                self._update_cache(cache_key, action)
                return action, rule
        
        self._update_cache(cache_key, False)
        return False, None
    
    def _match_rule(self, rule: FilterRule, url: str, method: str,
                   headers: Optional[Dict[str, str]], content_type: Optional[str]) -> bool:
        """Check if a rule matches the given request parameters"""
        if not rule.enabled:
            return False
        
        if rule.method and rule.method.upper() != method.upper():
            return False
        
        if rule.content_type and content_type and rule.content_type not in content_type:
            return False
        
        if rule.headers and headers:
            for key, value in rule.headers.items():
                if headers.get(key) != value:
                    return False
        
        return True
    
    def _update_cache(self, key: str, result: bool) -> None:
        """Update the rule matching cache"""
        self.cache[key] = result
        self.cache_expiry[key] = time.time() + self.cache_ttl

class ContentProcessor:
    """Processes and modifies HTTP response content"""
    
    def __init__(self):
        self.cosmetic_rules = [
            ".advertisement",
            ".ad-banner", 
            ".ad-container",
            "[id*='ad']",
            "[class*='ad']",
            "#ads",
            ".ads",
            ".adsystem",
            ".googlesyndication",
            ".doubleclick",
            ".googletagmanager",
            ".facebook-tracking",
            ".twitter-tracking",
            ".analytics"
        ]
        
        self.scriptlet_rules = [
            "window.google_tag_manager = undefined;",
            "window.ga = function(){};",
            "window.gtag = function(){};",
            "window._gaq = [];",
            "window.GoogleAnalyticsObject = undefined;",
            "window.fbq = function(){};",
            "window._fbq = function(){};",
            "window.twq = function(){};",
            "console.log('[OblivionFilter] Blocked tracking script');"
        ]
    
    def process_html(self, content: bytes, url: str) -> bytes:
        """Process HTML content and inject cosmetic filters"""
        try:
            html = content.decode('utf-8')
            
            # Inject cosmetic CSS
            cosmetic_css = self._generate_cosmetic_css()
            if cosmetic_css:
                style_tag = f'<style type="text/css">{cosmetic_css}</style>'
                
                if '</head>' in html:
                    html = html.replace('</head>', f'{style_tag}</head>', 1)
                elif '<body' in html:
                    html = html.replace('<body', f'{style_tag}<body', 1)
            
            # Inject anti-tracking scripts
            scriptlet_js = self._generate_scriptlet_js()
            if scriptlet_js:
                script_tag = f'<script type="text/javascript">{scriptlet_js}</script>'
                
                if '</body>' in html:
                    html = html.replace('</body>', f'{script_tag}</body>', 1)
                else:
                    html += script_tag
            
            return html.encode('utf-8')
            
        except UnicodeDecodeError:
            # Return original content if can't decode as UTF-8
            return content
    
    def _generate_cosmetic_css(self) -> str:
        """Generate CSS rules for hiding elements"""
        css_rules = []
        for rule in self.cosmetic_rules:
            css_rules.append(f"{rule} {{ display: none !important; }}")
        return '\n'.join(css_rules)
    
    def _generate_scriptlet_js(self) -> str:
        """Generate JavaScript for blocking tracking"""
        return '\n'.join(self.scriptlet_rules)

class NetworkMonitor:
    """Monitors network performance and connection health"""
    
    def __init__(self):
        self.connections: Dict[str, Dict] = {}
        self.bandwidth_usage = []
        self.response_times = []
        self.error_rates: Dict[str, float] = {}
        self.start_time = time.time()
    
    def track_request(self, request_id: str, url: str, method: str) -> None:
        """Track a new request"""
        self.connections[request_id] = {
            'url': url,
            'method': method,
            'start_time': time.time(),
            'bytes_sent': 0,
            'bytes_received': 0,
            'status': 'pending'
        }
    
    def track_response(self, request_id: str, status_code: int, 
                      response_size: int) -> None:
        """Track response for a request"""
        if request_id in self.connections:
            conn = self.connections[request_id]
            conn['status_code'] = status_code
            conn['response_size'] = response_size
            conn['response_time'] = time.time() - conn['start_time']
            conn['status'] = 'completed'
            
            # Track response time
            self.response_times.append(conn['response_time'])
            if len(self.response_times) > 1000:  # Keep last 1000 responses
                self.response_times = self.response_times[-1000:]
    
    def get_stats(self) -> Dict:
        """Get current network statistics"""
        now = time.time()
        uptime = now - self.start_time
        
        total_requests = len(self.connections)
        completed_requests = sum(1 for conn in self.connections.values() 
                               if conn['status'] == 'completed')
        
        avg_response_time = 0
        if self.response_times:
            avg_response_time = sum(self.response_times) / len(self.response_times)
        
        total_bytes = sum(conn.get('response_size', 0) 
                         for conn in self.connections.values())
        
        return {
            'uptime': uptime,
            'total_requests': total_requests,
            'completed_requests': completed_requests,
            'average_response_time': avg_response_time,
            'total_bytes_transferred': total_bytes,
            'requests_per_second': completed_requests / uptime if uptime > 0 else 0
        }

class OblivionFilterAddon:
    """mitmproxy addon for OblivionFilter functionality"""
    
    def __init__(self, filter_engine: FilterEngine, content_processor: ContentProcessor,
                 network_monitor: NetworkMonitor):
        self.filter_engine = filter_engine
        self.content_processor = content_processor
        self.network_monitor = network_monitor
        self.blocked_requests = 0
        self.total_requests = 0
    
    def request(self, flow: http.HTTPFlow) -> None:
        """Handle incoming requests"""
        self.total_requests += 1
        request_id = f"{id(flow)}"
        
        # Track request
        self.network_monitor.track_request(
            request_id, 
            flow.request.pretty_url, 
            flow.request.method
        )
        
        # Check if request should be blocked
        headers = dict(flow.request.headers)
        content_type = headers.get('content-type', '')
        
        should_block, rule = self.filter_engine.should_block(
            flow.request.pretty_url,
            flow.request.method,
            headers,
            content_type
        )
        
        if should_block:
            self.blocked_requests += 1
            logger.info(f"Blocked request: {flow.request.pretty_url}")
            if rule:
                logger.debug(f"Blocked by rule: {rule.description}")
            
            # Return a blocked response
            flow.response = http.Response.make(
                403,
                b"Request blocked by OblivionFilter",
                {"Content-Type": "text/plain"}
            )
            return
        
        # Add stealth headers
        self._add_stealth_headers(flow)
    
    def response(self, flow: http.HTTPFlow) -> None:
        """Handle responses"""
        request_id = f"{id(flow)}"
        
        if flow.response:
            # Track response
            self.network_monitor.track_response(
                request_id,
                flow.response.status_code,
                len(flow.response.content)
            )
            
            # Process HTML content
            content_type = flow.response.headers.get('content-type', '')
            if 'text/html' in content_type and flow.response.content:
                flow.response.content = self.content_processor.process_html(
                    flow.response.content,
                    flow.request.pretty_url
                )
            
            # Add security headers
            self._add_security_headers(flow)
    
    def _add_stealth_headers(self, flow: http.HTTPFlow) -> None:
        """Add headers to make requests less detectable"""
        # Remove proxy-related headers
        headers_to_remove = [
            'proxy-connection',
            'proxy-authorization', 
            'x-forwarded-for',
            'x-real-ip',
            'via'
        ]
        
        for header in headers_to_remove:
            if header in flow.request.headers:
                del flow.request.headers[header]
        
        # Add common browser headers
        if 'user-agent' not in flow.request.headers:
            flow.request.headers['user-agent'] = (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
        
        if 'accept' not in flow.request.headers:
            flow.request.headers['accept'] = (
                'text/html,application/xhtml+xml,application/xml;q=0.9,'
                'image/webp,*/*;q=0.8'
            )
        
        if 'accept-language' not in flow.request.headers:
            flow.request.headers['accept-language'] = 'en-US,en;q=0.5'
        
        if 'accept-encoding' not in flow.request.headers:
            flow.request.headers['accept-encoding'] = 'gzip, deflate'
        
        flow.request.headers['dnt'] = '1'
        flow.request.headers['connection'] = 'keep-alive'
        flow.request.headers['upgrade-insecure-requests'] = '1'
    
    def _add_security_headers(self, flow: http.HTTPFlow) -> None:
        """Add security headers to responses"""
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        }
        
        for header, value in security_headers.items():
            flow.response.headers[header] = value

class ProxyConfig:
    """Configuration management for the proxy server"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.listen_host = "127.0.0.1"
        self.listen_port = 8080
        self.upstream_proxy = None
        self.ssl_cert = None
        self.ssl_key = None
        self.log_level = "INFO"
        self.filter_config = None
        self.cache_enabled = True
        self.cache_size = 100 * 1024 * 1024  # 100MB
        self.stealth_mode = True
        self.block_malware = True
        self.inject_cosmetic_filters = True
        
        if config_file:
            self.load_from_file(config_file)
    
    def load_from_file(self, config_file: str) -> None:
        """Load configuration from file"""
        try:
            with open(config_file, 'r') as f:
                if config_file.endswith('.yaml') or config_file.endswith('.yml'):
                    config = yaml.safe_load(f)
                else:
                    config = json.load(f)
            
            self.listen_host = config.get('listen_host', self.listen_host)
            self.listen_port = config.get('listen_port', self.listen_port)
            self.upstream_proxy = config.get('upstream_proxy', self.upstream_proxy)
            self.ssl_cert = config.get('ssl_cert', self.ssl_cert)
            self.ssl_key = config.get('ssl_key', self.ssl_key)
            self.log_level = config.get('log_level', self.log_level)
            self.filter_config = config.get('filter_config', self.filter_config)
            self.cache_enabled = config.get('cache_enabled', self.cache_enabled)
            self.cache_size = config.get('cache_size', self.cache_size)
            self.stealth_mode = config.get('stealth_mode', self.stealth_mode)
            self.block_malware = config.get('block_malware', self.block_malware)
            self.inject_cosmetic_filters = config.get('inject_cosmetic_filters', 
                                                     self.inject_cosmetic_filters)
            
        except Exception as e:
            logger.error(f"Failed to load config file: {e}")

class OblivionProxy:
    """Main proxy server class"""
    
    def __init__(self, config: ProxyConfig):
        self.config = config
        self.filter_engine = FilterEngine(config.filter_config)
        self.content_processor = ContentProcessor()
        self.network_monitor = NetworkMonitor()
        self.addon = OblivionFilterAddon(
            self.filter_engine,
            self.content_processor, 
            self.network_monitor
        )
        self.master = None
    
    async def start(self) -> None:
        """Start the proxy server"""
        # Configure mitmproxy options
        opts = options.Options(
            listen_host=self.config.listen_host,
            listen_port=self.config.listen_port,
            upstream_auth=None,
            ssl_insecure=True,
            confdir="~/.mitmproxy"
        )
        
        if self.config.upstream_proxy:
            opts.mode = f"upstream:{self.config.upstream_proxy}"
        
        # Create and configure master
        self.master = DumpMaster(opts)
        self.master.addons.add(self.addon)
        
        logger.info(f"Starting OblivionFilter proxy on {self.config.listen_host}:{self.config.listen_port}")
        logger.info(f"Stealth mode: {self.config.stealth_mode}")
        logger.info(f"Cosmetic filtering: {self.config.inject_cosmetic_filters}")
        
        try:
            await self.master.run()
        except KeyboardInterrupt:
            logger.info("Proxy server stopped by user")
        except Exception as e:
            logger.error(f"Proxy server error: {e}")
        finally:
            await self.stop()
    
    async def stop(self) -> None:
        """Stop the proxy server"""
        if self.master:
            self.master.shutdown()
        logger.info("Proxy server stopped")
    
    def get_stats(self) -> Dict:
        """Get proxy statistics"""
        return {
            'network': self.network_monitor.get_stats(),
            'filtering': {
                'total_requests': self.addon.total_requests,
                'blocked_requests': self.addon.blocked_requests,
                'block_rate': (self.addon.blocked_requests / self.addon.total_requests 
                              if self.addon.total_requests > 0 else 0)
            }
        }

def generate_pac_file(proxy_host: str, proxy_port: int, output_file: str) -> None:
    """Generate PAC (Proxy Auto-Configuration) file"""
    pac_content = f'''function FindProxyForURL(url, host) {{
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
    return "PROXY {proxy_host}:{proxy_port}; DIRECT";
}}'''
    
    with open(output_file, 'w') as f:
        f.write(pac_content)
    
    logger.info(f"PAC file generated: {output_file}")

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="OblivionFilter Python Proxy Bridge")
    parser.add_argument('--config', '-c', help='Configuration file path')
    parser.add_argument('--host', default='127.0.0.1', help='Listen host')
    parser.add_argument('--port', '-p', type=int, default=8080, help='Listen port')
    parser.add_argument('--upstream', help='Upstream proxy URL')
    parser.add_argument('--log-level', default='INFO', 
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       help='Log level')
    parser.add_argument('--generate-pac', help='Generate PAC file and exit')
    parser.add_argument('--filter-config', help='Filter configuration file')
    parser.add_argument('--no-stealth', action='store_true', 
                       help='Disable stealth mode')
    parser.add_argument('--no-cosmetic', action='store_true',
                       help='Disable cosmetic filtering')
    
    args = parser.parse_args()
    
    # Set log level
    logging.getLogger().setLevel(getattr(logging, args.log_level))
    
    # Generate PAC file if requested
    if args.generate_pac:
        generate_pac_file(args.host, args.port, args.generate_pac)
        return
    
    # Create configuration
    config = ProxyConfig(args.config)
    
    # Override with command line arguments
    if args.host != '127.0.0.1':
        config.listen_host = args.host
    if args.port != 8080:
        config.listen_port = args.port
    if args.upstream:
        config.upstream_proxy = args.upstream
    if args.filter_config:
        config.filter_config = args.filter_config
    if args.no_stealth:
        config.stealth_mode = False
    if args.no_cosmetic:
        config.inject_cosmetic_filters = False
    
    # Set optimal event loop for better performance
    if sys.platform != 'win32':
        uvloop.install()
    
    # Create and start proxy
    proxy = OblivionProxy(config)
    
    try:
        await proxy.start()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
