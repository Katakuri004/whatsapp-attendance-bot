const User = require('../models/User');
const Subject = require('../models/Subject');
const AttendanceRecord = require('../models/AttendanceRecord');
const Helpers = require('../utils/helpers');
const { ATTENDANCE_RESPONSES } = require('../utils/constants');

class MessageHandler {
    constructor() {
        this.pendingAttendanceResponses = new Map(); // Store pending attendance confirmations
    }

    async handleMessage(message, client) {
        const userId = message.from.replace('@c.us', '');
        const messageBody = message.body.trim().toLowerCase();

        // Get user from database
        let user = await User.findByWhatsAppId(userId);

        // Handle registration flow
        if (!user || !user.isFullyRegistered()) {
            await this.handleRegistrationFlow(message, client, user, messageBody);
            return;
        }

        // Handle attendance responses
        if (this.isAttendanceResponse(messageBody)) {
            await this.handleAttendanceResponse(message, client, user, messageBody);
            return;
        }

        // Handle general conversation
        await this.handleGeneralMessage(message, client, user, messageBody);
    }

    async handleRegistrationFlow(message, client, user, messageBody) {
        const userId = message.from.replace('@c.us', '');

        if (!user) {
            // Create new user if doesn't exist
            user = User.createNewUser(userId);
        }

        switch (user.registrationStep) {
            case 'name':
                if (messageBody.length < 2 || messageBody.length > 50) {
                    await message.reply(
                        '❌ Please enter a valid name (2-50 characters).\n\n' +
                        'What\'s your name?'
                    );
                    return;
                }

                user.name = Helpers.capitalizeWords(messageBody);
                user.registrationStep = 'timezone';
                await user.save();

                await message.reply(
                    `Nice to meet you, ${user.name}! 👋\n\n` +
                    'Now, what\'s your timezone? This helps me send reminders at the right time.\n\n' +
                    'Examples:\n' +
                    '• Asia/Kolkata (for India)\n' +
                    '• America/New_York (for EST)\n' +
                    '• Europe/London (for UK)\n\n' +
                    'Or just type "india" if you\'re in India.'
                );
                break;

            case 'timezone':
                let timezone = messageBody.trim();
                
                // Handle common shortcuts
                if (timezone === 'india' || timezone === 'indian') {
                    timezone = 'Asia/Kolkata';
                } else if (timezone === 'usa' || timezone === 'america') {
                    timezone = 'America/New_York';
                } else if (timezone === 'uk' || timezone === 'britain') {
                    timezone = 'Europe/London';
                }

                try {
                    // Validate timezone using moment
                    const moment = require('moment-timezone');
                    if (!moment.tz.zone(timezone)) {
                        throw new Error('Invalid timezone');
                    }

                    user.timezone = timezone;
                    user.isRegistered = true;
                    user.registrationStep = 'completed';
                    await user.save();

                    await message.reply(
                        `🎉 *Registration Complete!*\n\n` +
                        `Welcome to AttendanceBot, ${user.name}!\n\n` +
                        `✅ Name: ${user.name}\n` +
                        `🌍 Timezone: ${timezone}\n\n` +
                        `🚀 *What's next?*\n` +
                        `• Add your subjects with */add*\n` +
                        `• Type */help* to see all commands\n\n` +
                        `Let's add your first subject! Use:\n` +
                        `*/add <subject> on <day> at <time> for <hours>*\n\n` +
                        `Example: /add Mathematics on Monday at 10:00 for 2`
                    );

                } catch (error) {
                    await message.reply(
                        `❌ "${timezone}" is not a valid timezone.\n\n` +
                        'Please try again with a valid timezone like:\n' +
                        '• Asia/Kolkata\n' +
                        '• America/New_York\n' +
                        '• Europe/London\n\n' +
                        'Or type "india" for Indian timezone.'
                    );
                }
                break;

            default:
                // Shouldn't reach here, but handle gracefully
                await message.reply(
                    'Something went wrong with registration. Please type */start* to begin again.'
                );
        }
    }

    async handleAttendanceResponse(message, client, user, messageBody) {
        try {
            // Find pending attendance records for this user
            const pendingRecords = await AttendanceRecord.find({
                userId: user._id,
                status: 'pending'
            }).populate('subjectId').sort({ scheduledTime: -1 }).limit(5);

            if (pendingRecords.length === 0) {
                await message.reply(
                    '🤔 I don\'t have any pending attendance confirmations for you.\n\n' +
                    'If you think this is a mistake, please contact support.'
                );
                return;
            }

            // Get the most recent pending record (likely the one they're responding to)
            const record = pendingRecords[0];
            const isPresent = this.parseAttendanceResponse(messageBody);

            if (isPresent) {
                await record.markPresent();
                await record.subjectId.markAttendance(true);

                await message.reply(
                    `✅ *Attendance Marked: Present*\n\n` +
                    `📚 Subject: ${record.subjectId.subjectName}\n` +
                    `📅 Date: ${record.date.toDateString()}\n\n` +
                    `Current attendance: ${record.subjectId.attendancePercentage}% ` +
                    `(${record.subjectId.attendedClasses}/${record.subjectId.totalClasses})`
                );
            } else {
                await record.markAbsent(false);
                await record.subjectId.markAttendance(false);

                let response = `❌ *Attendance Marked: Absent*\n\n` +
                    `📚 Subject: ${record.subjectId.subjectName}\n` +
                    `📅 Date: ${record.date.toDateString()}\n\n` +
                    `Current attendance: ${record.subjectId.attendancePercentage}% ` +
                    `(${record.subjectId.attendedClasses}/${record.subjectId.totalClasses})`;

                // Check for low attendance warning
                if (record.subjectId.attendancePercentage < 75) {
                    response += `\n\n⚠️ *Low Attendance Warning!*\n`;
                    response += `Your attendance is below 75%. Please attend more classes.`;
                }

                await message.reply(response);
            }

        } catch (error) {
            console.error('Error handling attendance response:', error);
            await message.reply(
                '❌ Sorry, there was an error recording your attendance. Please try again.'
            );
        }
    }

    async handleGeneralMessage(message, client, user, messageBody) {
        // Handle common queries and provide helpful responses
        const responses = {
            'hi': '👋 Hello! Type */help* to see what I can do.',
            'hello': '👋 Hi there! Type */help* to see available commands.',
            'help': 'Type */help* to see all available commands.',
            'thanks': '😊 You\'re welcome! Happy to help with your attendance.',
            'thank you': '😊 You\'re welcome! Let me know if you need anything else.',
            'attendance': 'Type */show attendance* to view your attendance overview.',
            'subjects': 'Type */list* to see all your subjects.',
            'how': 'Type */help* to see how to use this bot.',
            'what': 'I\'m an attendance tracking bot! Type */help* to learn more.'
        };

        // Check for partial matches
        for (const [key, response] of Object.entries(responses)) {
            if (messageBody.includes(key)) {
                await message.reply(response);
                return;
            }
        }

        // Default response for unrecognized messages
        await message.reply(
            '🤔 I didn\'t understand that.\n\n' +
            'Type */help* to see available commands, or use */add* to add a subject.'
        );
    }

    isAttendanceResponse(messageBody) {
        const allResponses = [...ATTENDANCE_RESPONSES.POSITIVE, ...ATTENDANCE_RESPONSES.NEGATIVE];
        
        return allResponses.some(response => 
            messageBody === response || 
            messageBody.includes(response)
        );
    }

    parseAttendanceResponse(messageBody) {
        return ATTENDANCE_RESPONSES.POSITIVE.some(response => 
            messageBody === response || 
            messageBody.includes(response)
        );
    }


}

module.exports = MessageHandler;