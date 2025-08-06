const mongoose = require('mongoose');
require('dotenv').config();

class DatabaseService {
    constructor() {
        this.connection = null;
        this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_bot';
    }

    async connect() {
        try {
            console.log('🔌 Connecting to MongoDB...');
            


            this.connection = await mongoose.connect(this.mongoUri);
            
            console.log('✅ Connected to MongoDB successfully');
            console.log(`📍 Database: ${this.connection.connection.name}`);
            console.log(`🌐 Host: ${this.connection.connection.host}:${this.connection.connection.port}`);

            // Handle connection events
            this.setupEventHandlers();

            // Create indexes for better performance
            await this.createIndexes();

            return this.connection;
        } catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error.message);
            
            if (error.message.includes('ECONNREFUSED')) {
                console.log('💡 Make sure MongoDB is running on your system');
                console.log('   - Install MongoDB: https://docs.mongodb.com/manual/installation/');
                console.log('   - Start MongoDB service');
                console.log('   - Or use MongoDB Atlas (cloud): https://cloud.mongodb.com/');
            }
            
            throw error;
        }
    }

    setupEventHandlers() {
        const db = mongoose.connection;

        db.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
        });

        db.on('disconnected', () => {
            console.log('📴 MongoDB disconnected');
        });

        db.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected');
        });

        // Handle app termination
        process.on('SIGINT', () => {
            this.disconnect();
        });

        process.on('SIGTERM', () => {
            this.disconnect();
        });
    }

    async createIndexes() {
        try {
            console.log('📊 Creating database indexes...');

            // Import models to ensure they're registered
            const User = require('../models/User');
            const Subject = require('../models/Subject');
            const AttendanceRecord = require('../models/AttendanceRecord');

            // Create indexes for better query performance
            await User.createIndexes();
            await Subject.createIndexes();
            await AttendanceRecord.createIndexes();

            console.log('✅ Database indexes created successfully');
        } catch (error) {
            console.error('❌ Error creating indexes:', error);
            // Don't throw error, as indexes are not critical for basic functionality
        }
    }

    async disconnect() {
        try {
            if (this.connection) {
                await mongoose.disconnect();
                console.log('🔌 Disconnected from MongoDB');
            }
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error);
        }
    }

    async healthCheck() {
        try {
            const isConnected = mongoose.connection.readyState === 1;
            
            if (isConnected) {
                // Test with a simple operation
                await mongoose.connection.db.admin().ping();
                return {
                    status: 'healthy',
                    connected: true,
                    database: mongoose.connection.name,
                    host: mongoose.connection.host,
                    port: mongoose.connection.port
                };
            } else {
                return {
                    status: 'unhealthy',
                    connected: false,
                    error: 'Not connected to database'
                };
            }
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message
            };
        }
    }

    async getStats() {
        try {
            if (mongoose.connection.readyState !== 1) {
                throw new Error('Database not connected');
            }

            const User = require('../models/User');
            const Subject = require('../models/Subject');
            const AttendanceRecord = require('../models/AttendanceRecord');

            const stats = {
                users: await User.countDocuments(),
                registeredUsers: await User.countDocuments({ isRegistered: true }),
                activeSubjects: await Subject.countDocuments({ isActive: true }),
                totalSubjects: await Subject.countDocuments(),
                attendanceRecords: await AttendanceRecord.countDocuments(),
                pendingAttendance: await AttendanceRecord.countDocuments({ status: 'pending' })
            };

            return stats;
        } catch (error) {
            console.error('Error getting database stats:', error);
            throw error;
        }
    }

    async cleanup() {
        try {
            console.log('🧹 Running database cleanup...');

            const AttendanceRecord = require('../models/AttendanceRecord');
            
            // Clean up old pending records (older than 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const result = await AttendanceRecord.deleteMany({
                status: 'pending',
                createdAt: { $lt: sevenDaysAgo }
            });

            console.log(`✅ Cleaned up ${result.deletedCount} old pending records`);
            return result;
        } catch (error) {
            console.error('Error during cleanup:', error);
            throw error;
        }
    }

    isConnected() {
        return mongoose.connection.readyState === 1;
    }

    getConnectionState() {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        return states[mongoose.connection.readyState] || 'unknown';
    }
}

module.exports = DatabaseService;