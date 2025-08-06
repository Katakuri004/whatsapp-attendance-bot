const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const cron = require('node-cron');
require('dotenv').config();

const CommandHandler = require('./handlers/commandHandler');
const MessageHandler = require('./handlers/messageHandler');
const SchedulerService = require('./services/schedulerService');
const DatabaseService = require('./services/databaseService');
const RateLimiter = require('./middleware/rateLimiter');
const InputValidator = require('./middleware/inputValidator');
const SecurityManager = require('./middleware/securityManager');
const ErrorHandler = require('./middleware/errorHandler');
const { getLogger } = require('./utils/logger');

class AttendanceBot {
    constructor() {
        // Initialize logger first
        this.logger = getLogger();
        this.logger.info('🚀 Initializing WhatsApp Attendance Bot');

        // Initialize security and middleware
        this.rateLimiter = new RateLimiter({
            commandsPerMinute: 10,
            messagesPerMinute: 20,
            registrationsPerHour: 5,
            subjectsPerHour: 20
        });
        
        this.inputValidator = new InputValidator();
        this.securityManager = new SecurityManager();
        this.errorHandler = new ErrorHandler();

        // Initialize WhatsApp client with security configurations
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "attendance-bot"
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });

        // Initialize handlers with security middleware
        this.commandHandler = new CommandHandler();
        this.messageHandler = new MessageHandler();
        this.schedulerService = new SchedulerService();
        this.databaseService = new DatabaseService();

        // Security monitoring
        this.startSecurityMonitoring();
        
        this.initializeBot();
    }

    initializeBot() {
        // Generate QR code for WhatsApp Web authentication
        this.client.on('qr', (qr) => {
            console.log('🔗 Scan the QR code below to authenticate:');
            qrcode.generate(qr, { small: true });
        });

        // Bot ready event
        this.client.on('ready', async () => {
            console.log('✅ WhatsApp Attendance Bot is ready!');
            console.log(`📱 Bot Number: ${this.client.info.wid.user}`);
            
            // Initialize database connection
            await this.databaseService.connect();
            
            // Initialize scheduler service with WhatsApp client
            await this.schedulerService.initialize();
            this.schedulerService.setWhatsAppClient(this.client);
            
            console.log('🎯 Bot is now fully operational!');
        });

        // Handle incoming messages with comprehensive security
        this.client.on('message', async (message) => {
            const startTime = Date.now();
            let userId = null;
            
            try {
                // Ignore group messages
                if (message.from.includes('@g.us')) {
                    this.logger.debug('Ignored group message', { from: message.from });
                    return;
                }
                
                userId = message.from.replace('@c.us', '');
                
                // Validate message structure
                const messageValidation = this.inputValidator.validateWhatsAppMessage(message);
                if (!messageValidation.isValid) {
                    this.logger.security('INVALID_MESSAGE_STRUCTURE', { 
                        userId, 
                        error: messageValidation.error 
                    });
                    return;
                }

                // Check if user is blocked
                const blockStatus = this.securityManager.isUserBlocked(userId);
                if (blockStatus.isBlocked) {
                    this.logger.security('BLOCKED_USER_ATTEMPT', { 
                        userId, 
                        reason: blockStatus.reason,
                        remainingTime: blockStatus.remainingTime
                    });
                    
                    if (blockStatus.remainingTime > 60000) { // Only notify if > 1 minute remaining
                        await message.reply(
                            `🚫 Your account is temporarily blocked.\n` +
                            `Reason: ${blockStatus.reason}\n` +
                            `Try again in ${Math.ceil(blockStatus.remainingTime / 60000)} minutes.`
                        );
                    }
                    return;
                }

                // Rate limiting check
                const messageType = message.body.startsWith('/') ? 'commands' : 'messages';
                if (this.rateLimiter.isRateLimited(userId, messageType)) {
                    this.logger.security('RATE_LIMIT_EXCEEDED', { 
                        userId, 
                        type: messageType,
                        remaining: this.rateLimiter.getRemainingRequests(userId, messageType)
                    });
                    
                    const resetTime = this.rateLimiter.getResetTime(userId, messageType);
                    await message.reply(
                        `⏳ Rate limit exceeded. Please wait ${resetTime} seconds before sending more ${messageType}.`
                    );
                    return;
                }

                // Input validation and sanitization
                const inputValidation = this.inputValidator.securityCheck(message.body, { 
                    type: 'message',
                    userId 
                });
                
                if (!inputValidation.isSecure) {
                    this.logger.security('MALICIOUS_INPUT_DETECTED', { 
                        userId, 
                        warnings: inputValidation.warnings,
                        originalInput: message.body
                    });
                    
                    // Block user for security violations
                    this.securityManager.blockUser(userId, 'Malicious input detected', 30 * 60 * 1000);
                    
                    await message.reply(
                        '🚫 Your message contains invalid content. Your account has been temporarily restricted.'
                    );
                    return;
                }

                // Use sanitized input
                const sanitizedMessage = { 
                    ...message, 
                    body: inputValidation.sanitized 
                };

                // Log user activity
                this.logger.userActivity(userId, messageType.toUpperCase(), {
                    messageLength: sanitizedMessage.body.length,
                    hasCommand: sanitizedMessage.body.startsWith('/')
                });

                // Process message
                if (sanitizedMessage.body.startsWith('/')) {
                    await this.commandHandler.handleCommand(sanitizedMessage, this.client, {
                        rateLimiter: this.rateLimiter,
                        validator: this.inputValidator,
                        security: this.securityManager,
                        logger: this.logger
                    });
                } else {
                    await this.messageHandler.handleMessage(sanitizedMessage, this.client, {
                        rateLimiter: this.rateLimiter,
                        validator: this.inputValidator,
                        security: this.securityManager,
                        logger: this.logger
                    });
                }

                // Performance logging
                const duration = Date.now() - startTime;
                this.logger.performance('MESSAGE_PROCESSING', duration, { 
                    userId, 
                    messageType,
                    messageLength: sanitizedMessage.body.length
                });

            } catch (error) {
                const duration = Date.now() - startTime;
                
                // Handle error with comprehensive error handler
                const errorResult = await this.errorHandler.handleError(error, {
                    operation: 'MESSAGE_PROCESSING',
                    userId,
                    messageBody: message?.body?.substring(0, 100), // First 100 chars for context
                    duration
                });

                this.logger.error('Message handling error', error, {
                    userId,
                    operation: 'MESSAGE_PROCESSING',
                    handled: errorResult.handled,
                    recovery: errorResult.recovery
                });

                // Send user-friendly error message
                if (message && message.reply) {
                    try {
                        const userMessage = errorResult.recovery?.success 
                            ? 'Processing your request, please wait...'
                            : this.errorHandler.getUserFriendlyMessage(errorResult.errorInfo || {});
                            
                        await message.reply(userMessage);
                    } catch (replyError) {
                        this.logger.error('Failed to send error reply', replyError, { userId });
                    }
                }
            }
        });

        // Handle authentication events
        this.client.on('authenticated', () => {
            console.log('✅ Authentication successful!');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('❌ Authentication failed:', msg);
        });

        this.client.on('disconnected', (reason) => {
            console.log('📴 WhatsApp client disconnected:', reason);
        });

        // Initialize the client
        this.client.initialize();
    }

    /**
     * Start security monitoring and health checks
     */
    startSecurityMonitoring() {
        // Security metrics collection every 5 minutes
        setInterval(async () => {
            try {
                const securityReport = this.securityManager.generateSecurityReport();
                const rateLimiterStats = this.rateLimiter.getStats();
                const errorStats = this.errorHandler.getErrorStats();
                
                this.logger.info('Security metrics collected', {
                    type: 'security_metrics',
                    security: securityReport,
                    rateLimit: rateLimiterStats,
                    errors: errorStats
                });

                // Alert on high threat levels
                if (securityReport?.securityMetrics?.threatLevel >= 3) {
                    this.logger.critical('High threat level detected', {
                        threatLevel: securityReport.securityMetrics.threatLevel,
                        report: securityReport
                    });
                }
            } catch (error) {
                this.logger.error('Error collecting security metrics', error);
            }
        }, 5 * 60 * 1000);

        // Health check every 10 minutes
        setInterval(async () => {
            try {
                const health = await this.performHealthCheck();
                this.logger.info('Health check completed', { health });
                
                if (!health.overall) {
                    this.logger.warn('System health check failed', { health });
                }
            } catch (error) {
                this.logger.error('Health check error', error);
            }
        }, 10 * 60 * 1000);
    }

    /**
     * Comprehensive health check
     */
    async performHealthCheck() {
        try {
            const health = {
                timestamp: Date.now(),
                database: await this.databaseService.healthCheck(),
                logger: await this.logger.healthCheck(),
                whatsapp: {
                    status: this.client.info ? 'connected' : 'disconnected',
                    info: this.client.info
                },
                security: {
                    activeSessions: this.securityManager.activeSessions.size,
                    blockedUsers: this.securityManager.blockedUsers.size,
                    threatLevel: this.securityManager.calculateOverallThreatLevel()
                },
                rateLimit: this.rateLimiter.getStats(),
                memory: process.memoryUsage(),
                uptime: process.uptime()
            };

            health.overall = health.database.status === 'healthy' && 
                           health.logger.status === 'healthy' && 
                           health.whatsapp.status === 'connected';

            return health;
        } catch (error) {
            this.logger.error('Health check failed', error);
            return { overall: false, error: error.message };
        }
    }

    async stop() {
        console.log('🛑 Stopping bot...');
        this.schedulerService.stop();
        await this.client.destroy();
        await this.databaseService.disconnect();
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Received SIGINT. Shutting down gracefully...');
    if (global.attendanceBot) {
        await global.attendanceBot.stop();
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Received SIGTERM. Shutting down gracefully...');
    if (global.attendanceBot) {
        await global.attendanceBot.stop();
    }
});

// Start the bot
console.log('🚀 Starting WhatsApp Attendance Bot...');
global.attendanceBot = new AttendanceBot();