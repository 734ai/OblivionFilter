package com.oblivionfilter.android.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import com.oblivionfilter.android.R
import com.oblivionfilter.android.core.FilterEngine
import com.oblivionfilter.android.core.NetworkInterceptor
import com.oblivionfilter.android.core.ProxyManager
import com.oblivionfilter.android.core.StealthEngine
import com.oblivionfilter.android.core.TorManager
import com.oblivionfilter.android.ui.main.MainActivity
import com.oblivionfilter.android.util.Logger
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetSocketAddress
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject

/**
 * OblivionFilter VPN Service
 * Provides system-wide filtering through Android VPN interface
 * Integrates all core filtering, stealth, and censorship resistance components
 */
@AndroidEntryPoint
class OblivionVpnService : VpnService() {

    @Inject
    lateinit var filterEngine: FilterEngine
    
    @Inject
    lateinit var networkInterceptor: NetworkInterceptor
    
    @Inject
    lateinit var proxyManager: ProxyManager
    
    @Inject
    lateinit var stealthEngine: StealthEngine
    
    @Inject
    lateinit var torManager: TorManager
    
    @Inject
    lateinit var logger: Logger

    private var vpnInterface: ParcelFileDescriptor? = null
    private var serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isRunning = AtomicBoolean(false)
    private var packetProcessor: PacketProcessor? = null

    companion object {
        private const val VPN_NOTIFICATION_ID = 1001
        private const val NOTIFICATION_CHANNEL_ID = "oblivion_vpn_channel"
        private const val VPN_ADDRESS = "10.0.0.2"
        private const val VPN_ROUTE = "0.0.0.0"
        private const val DNS_SERVER_PRIMARY = "1.1.1.1"
        private const val DNS_SERVER_SECONDARY = "8.8.8.8"
        private const val MTU = 1500

        const val ACTION_START_VPN = "com.oblivionfilter.START_VPN"
        const val ACTION_STOP_VPN = "com.oblivionfilter.STOP_VPN"
        const val ACTION_UPDATE_CONFIG = "com.oblivionfilter.UPDATE_CONFIG"
    }

    override fun onCreate() {
        super.onCreate()
        logger.d("OblivionVpnService", "Service created")
        createNotificationChannel()
        
        // Initialize core components
        serviceScope.launch {
            initializeCoreComponents()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        logger.d("OblivionVpnService", "onStartCommand: ${intent?.action}")

        when (intent?.action) {
            ACTION_START_VPN -> startVpnConnection()
            ACTION_STOP_VPN -> stopVpnConnection()
            ACTION_UPDATE_CONFIG -> updateConfiguration()
            else -> startVpnConnection()
        }

        return START_STICKY
    }

    override fun onDestroy() {
        logger.d("OblivionVpnService", "Service destroying")
        stopVpnConnection()
        serviceScope.cancel()
        super.onDestroy()
    }

    /**
     * Initialize all core filtering and stealth components
     */
    private suspend fun initializeCoreComponents() {
        try {
            logger.i("OblivionVpnService", "Initializing core components...")

            // Initialize filter engine
            filterEngine.initialize()

            // Initialize stealth engine with anti-detection
            stealthEngine.initialize()

            // Initialize Tor integration
            torManager.initialize()

            // Initialize proxy manager
            proxyManager.initialize()

            // Initialize network interceptor
            networkInterceptor.initialize()

            logger.i("OblivionVpnService", "Core components initialized successfully")
        } catch (e: Exception) {
            logger.e("OblivionVpnService", "Failed to initialize core components", e)
        }
    }

    /**
     * Start VPN connection with system-wide filtering
     */
    private fun startVpnConnection() {
        if (isRunning.get()) {
            logger.w("OblivionVpnService", "VPN already running")
            return
        }

        serviceScope.launch {
            try {
                logger.i("OblivionVpnService", "Starting VPN connection...")

                // Create VPN interface
                val builder = Builder()
                    .setSession("OblivionFilter VPN")
                    .addAddress(VPN_ADDRESS, 32)
                    .addRoute(VPN_ROUTE, 0)
                    .addDnsServer(DNS_SERVER_PRIMARY)
                    .addDnsServer(DNS_SERVER_SECONDARY)
                    .setMtu(MTU)
                    .setBlocking(false)

                // Configure applications
                configureApplicationFiltering(builder)

                // Establish VPN interface
                vpnInterface = builder.establish()

                if (vpnInterface != null) {
                    isRunning.set(true)
                    startForeground(VPN_NOTIFICATION_ID, createVpnNotification())

                    // Start packet processing
                    startPacketProcessing()

                    // Start core services
                    startCoreServices()

                    logger.i("OblivionVpnService", "VPN connection established successfully")
                } else {
                    logger.e("OblivionVpnService", "Failed to establish VPN interface")
                    stopSelf()
                }

            } catch (e: Exception) {
                logger.e("OblivionVpnService", "Failed to start VPN connection", e)
                stopSelf()
            }
        }
    }

    /**
     * Configure application filtering for VPN
     */
    private fun configureApplicationFiltering(builder: Builder) {
        try {
            // Allow OblivionFilter app itself
            builder.addAllowedApplication(packageName)

            // Configure based on user settings
            val settings = getSharedPreferences("oblivion_settings", MODE_PRIVATE)
            val filterMode = settings.getString("filter_mode", "all_apps")

            when (filterMode) {
                "all_apps" -> {
                    // Filter all applications (default)
                    logger.d("OblivionVpnService", "Filtering all applications")
                }
                "selected_apps" -> {
                    // Filter only selected applications
                    val selectedApps = settings.getStringSet("selected_apps", emptySet()) ?: emptySet()
                    selectedApps.forEach { packageName ->
                        try {
                            builder.addAllowedApplication(packageName)
                            logger.d("OblivionVpnService", "Added allowed app: $packageName")
                        } catch (e: Exception) {
                            logger.w("OblivionVpnService", "Failed to add allowed app: $packageName", e)
                        }
                    }
                }
                "exclude_apps" -> {
                    // Exclude selected applications from filtering
                    val excludedApps = settings.getStringSet("excluded_apps", emptySet()) ?: emptySet()
                    excludedApps.forEach { packageName ->
                        try {
                            builder.addDisallowedApplication(packageName)
                            logger.d("OblivionVpnService", "Added disallowed app: $packageName")
                        } catch (e: Exception) {
                            logger.w("OblivionVpnService", "Failed to add disallowed app: $packageName", e)
                        }
                    }
                }
            }

        } catch (e: Exception) {
            logger.e("OblivionVpnService", "Failed to configure application filtering", e)
        }
    }

    /**
     * Start packet processing for VPN traffic
     */
    private fun startPacketProcessing() {
        vpnInterface?.let { vpnFd ->
            packetProcessor = PacketProcessor(vpnFd, filterEngine, networkInterceptor, logger)
            serviceScope.launch {
                packetProcessor?.startProcessing()
            }
            logger.i("OblivionVpnService", "Packet processing started")
        }
    }

    /**
     * Start core filtering and stealth services
     */
    private suspend fun startCoreServices() {
        try {
            // Start filter engine
            filterEngine.start()

            // Start stealth engine
            stealthEngine.start()

            // Start Tor if enabled
            val settings = getSharedPreferences("oblivion_settings", MODE_PRIVATE)
            if (settings.getBoolean("tor_enabled", false)) {
                torManager.start()
            }

            // Start proxy manager
            proxyManager.start()

            logger.i("OblivionVpnService", "Core services started successfully")
        } catch (e: Exception) {
            logger.e("OblivionVpnService", "Failed to start core services", e)
        }
    }

    /**
     * Stop VPN connection and cleanup
     */
    private fun stopVpnConnection() {
        if (!isRunning.get()) {
            logger.w("OblivionVpnService", "VPN not running")
            return
        }

        serviceScope.launch {
            try {
                logger.i("OblivionVpnService", "Stopping VPN connection...")

                isRunning.set(false)

                // Stop packet processing
                packetProcessor?.stopProcessing()
                packetProcessor = null

                // Stop core services
                stopCoreServices()

                // Close VPN interface
                vpnInterface?.close()
                vpnInterface = null

                // Stop foreground service
                stopForeground(STOP_FOREGROUND_REMOVE)

                logger.i("OblivionVpnService", "VPN connection stopped successfully")
                stopSelf()

            } catch (e: Exception) {
                logger.e("OblivionVpnService", "Error stopping VPN connection", e)
            }
        }
    }

    /**
     * Stop core services
     */
    private suspend fun stopCoreServices() {
        try {
            torManager.stop()
            proxyManager.stop()
            stealthEngine.stop()
            filterEngine.stop()
            logger.i("OblivionVpnService", "Core services stopped")
        } catch (e: Exception) {
            logger.e("OblivionVpnService", "Error stopping core services", e)
        }
    }

    /**
     * Update VPN configuration without restart
     */
    private fun updateConfiguration() {
        serviceScope.launch {
            try {
                logger.i("OblivionVpnService", "Updating VPN configuration...")

                // Update filter engine configuration
                filterEngine.updateConfiguration()

                // Update stealth engine configuration
                stealthEngine.updateConfiguration()

                // Update Tor configuration
                torManager.updateConfiguration()

                // Update proxy configuration
                proxyManager.updateConfiguration()

                logger.i("OblivionVpnService", "VPN configuration updated successfully")
            } catch (e: Exception) {
                logger.e("OblivionVpnService", "Failed to update VPN configuration", e)
            }
        }
    }

    /**
     * Create notification channel for VPN service
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "OblivionFilter VPN",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "OblivionFilter VPN Service notifications"
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Create VPN service notification
     */
    private fun createVpnNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, OblivionVpnService::class.java).apply {
            action = ACTION_STOP_VPN
        }
        
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("OblivionFilter VPN Active")
            .setContentText("System-wide privacy filtering enabled")
            .setSmallIcon(R.drawable.ic_shield)
            .setContentIntent(pendingIntent)
            .addAction(R.drawable.ic_stop, "Stop", stopPendingIntent)
            .setOngoing(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    /**
     * Packet processor for VPN traffic
     */
    private class PacketProcessor(
        private val vpnInterface: ParcelFileDescriptor,
        private val filterEngine: FilterEngine,
        private val networkInterceptor: NetworkInterceptor,
        private val logger: Logger
    ) {
        private var isProcessing = AtomicBoolean(false)
        private var processingJob: Job? = null

        suspend fun startProcessing() {
            if (isProcessing.get()) return

            isProcessing.set(true)
            processingJob = CoroutineScope(Dispatchers.IO).launch {
                try {
                    processPackets()
                } catch (e: Exception) {
                    logger.e("PacketProcessor", "Packet processing error", e)
                }
            }
        }

        fun stopProcessing() {
            isProcessing.set(false)
            processingJob?.cancel()
        }

        private suspend fun processPackets() {
            val inputStream = FileInputStream(vpnInterface.fileDescriptor)
            val outputStream = FileOutputStream(vpnInterface.fileDescriptor)
            val packetBuffer = ByteBuffer.allocate(MTU)

            logger.i("PacketProcessor", "Starting packet processing...")

            while (isProcessing.get()) {
                try {
                    // Read packet from VPN interface
                    packetBuffer.clear()
                    val bytesRead = inputStream.read(packetBuffer.array())
                    
                    if (bytesRead > 0) {
                        packetBuffer.limit(bytesRead)
                        
                        // Process packet through filter engine
                        val result = filterEngine.processPacket(packetBuffer)
                        
                        when (result.action) {
                            FilterEngine.PacketAction.ALLOW -> {
                                // Forward packet to network
                                networkInterceptor.forwardPacket(packetBuffer, outputStream)
                            }
                            FilterEngine.PacketAction.BLOCK -> {
                                // Drop packet silently
                                logger.d("PacketProcessor", "Blocked packet: ${result.reason}")
                            }
                            FilterEngine.PacketAction.REDIRECT -> {
                                // Redirect packet through proxy/Tor
                                networkInterceptor.redirectPacket(packetBuffer, result.redirectTarget, outputStream)
                            }
                            FilterEngine.PacketAction.MODIFY -> {
                                // Modify packet headers/content
                                val modifiedPacket = networkInterceptor.modifyPacket(packetBuffer, result.modifications)
                                outputStream.write(modifiedPacket.array(), 0, modifiedPacket.limit())
                            }
                        }
                    }

                    // Yield to prevent blocking
                    yield()

                } catch (e: Exception) {
                    if (isProcessing.get()) {
                        logger.e("PacketProcessor", "Error processing packet", e)
                        delay(100) // Brief delay on error
                    }
                }
            }

            logger.i("PacketProcessor", "Packet processing stopped")
        }
    }
}
