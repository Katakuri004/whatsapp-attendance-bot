const User = require('../models/User');
const Subject = require('../models/Subject');
const AttendanceRecord = require('../models/AttendanceRecord');
const Helpers = require('../utils/helpers');
const { MESSAGE_TEMPLATES, VALIDATION } = require('../utils/constants');
const compromise = require('compromise');
const moment = require('moment-timezone');

class CommandHandler {
    constructor() {
        this.commands = {
            '/start': this.handleStart.bind(this),
            '/help': this.handleHelp.bind(this),
            '/add': this.handleAdd.bind(this),
            '/drop': this.handleDrop.bind(this),
            '/show': this.handleShow.bind(this),
            '/list': this.handleList.bind(this),
            '/timezone': this.handleTimezone.bind(this),
            '/settings': this.handleSettings.bind(this)
        };
    }

    async handleCommand(message, client) {
        const userId = message.from.replace('@c.us', '');
        const messageBody = message.body.trim();
        const [command, ...args] = messageBody.split(' ');

        // Check if user exists and is registered
        let user = await User.findByWhatsAppId(userId);
        
        // Handle registration flow for non-registered users
        if (!user || !user.isFullyRegistered()) {
            if (command !== '/start') {
                await message.reply(
                    '👋 Welcome! You need to register first to use this bot.\n\n' +
                    'Please type */start* to begin registration.'
                );
                return;
            }
        }

        const handler = this.commands[command.toLowerCase()];
        if (handler) {
            await handler(message, client, args, user);
        } else {
            await this.handleUnknownCommand(message, client);
        }
    }

    async handleStart(message, client, args, user) {
        const userId = message.from.replace('@c.us', '');
        
        if (user && user.isFullyRegistered()) {
            await message.reply(
                `👋 Hello ${user.getDisplayName()}!\n\n` +
                'You are already registered. Type */help* to see available commands.'
            );
            return;
        }

        if (!user) {
            user = User.createNewUser(userId);
            await user.save();
        }

        await message.reply(
            '🎓 *Welcome to AttendanceBot!*\n\n' +
            'I\'ll help you track your class attendance. Let\'s get you set up!\n\n' +
            'First, what\'s your name?'
        );
    }

    async handleHelp(message, client) {
        const helpText = `
🤖 *AttendanceBot Help*

📚 *Subject Management:*
• */add <subject> on <day> at <time> for <hours>*
  Example: /add Mathematics on Monday at 10:00 for 2

• */drop <subject>* - Remove a subject
• */list* - Show all your subjects

📊 *Attendance:*
• */show attendance* - View all attendance
• */show <subject>* - View specific subject attendance

⚙️ *Settings:*
• */timezone <timezone>* - Set your timezone
• */settings* - View/change preferences

💡 *Tips:*
- I'll remind you 10 minutes before each class
- Reply "yes" or "no" to attendance confirmations
- If you don't reply within 2 hours, you'll be marked absent
- I'll alert you if attendance drops below 75%
        `.trim();

        await message.reply(helpText);
    }

    async handleAdd(message, client, args, user) {
        const fullCommand = args.join(' ');
        
        if (!fullCommand) {
            await message.reply(
                '📝 *Add a Subject*\n\n' +
                'Format: */add <subject> on <day> at <time> for <hours>*\n\n' +
                'Examples:\n' +
                '• /add Mathematics on Monday at 10:00 for 2\n' +
                '• /add Physics on Wed at 2pm for 1.5\n' +
                '• /add Computer Science on Friday at 09:30 for 3'
            );
            return;
        }

        try {
            const parsed = this.parseAddCommand(fullCommand);
            
            if (!parsed) {
                await message.reply(
                    '❌ I couldn\'t understand that format.\n\n' +
                    'Please use: */add <subject> on <day> at <time> for <hours>*\n\n' +
                    'Example: /add Mathematics on Monday at 10:00 for 2'
                );
                return;
            }

            const { subjectName, day, time, duration } = parsed;

            // Check if subject already exists
            const existingSubject = await Subject.findByUserAndName(user._id, subjectName);
            if (existingSubject) {
                await message.reply(`❌ You already have a subject called "${subjectName}".`);
                return;
            }

            // Create new subject
            const subject = new Subject({
                userId: user._id,
                subjectName,
                schedule: { day, time, duration }
            });

            await subject.save();

            await message.reply(
                `✅ *Subject Added Successfully!*\n\n` +
                `📚 Subject: ${subjectName}\n` +
                `📅 Day: ${day}\n` +
                `⏰ Time: ${time}\n` +
                `⌛ Duration: ${duration} hour(s)\n\n` +
                `I'll remind you 10 minutes before each class! 🔔`
            );

        } catch (error) {
            console.error('Error adding subject:', error);
            await message.reply('❌ Sorry, there was an error adding the subject. Please try again.');
        }
    }

    async handleDrop(message, client, args, user) {
        const subjectName = args.join(' ').trim();
        
        if (!subjectName) {
            await message.reply(
                '📝 *Drop a Subject*\n\n' +
                'Format: */drop <subject name>*\n\n' +
                'Example: /drop Mathematics'
            );
            return;
        }

        try {
            const subject = await Subject.findByUserAndName(user._id, subjectName);
            
            if (!subject) {
                await message.reply(`❌ Subject "${subjectName}" not found.`);
                return;
            }

            subject.isActive = false;
            await subject.save();

            await message.reply(
                `✅ *Subject Dropped*\n\n` +
                `📚 "${subject.subjectName}" has been removed from your schedule.\n\n` +
                `Your attendance history has been preserved.`
            );

        } catch (error) {
            console.error('Error dropping subject:', error);
            await message.reply('❌ Sorry, there was an error dropping the subject. Please try again.');
        }
    }

    async handleShow(message, client, args, user) {
        const parameter = args.join(' ').trim().toLowerCase();
        
        try {
            if (parameter === 'attendance' || parameter === '') {
                await this.showAllAttendance(message, user);
            } else {
                await this.showSubjectAttendance(message, user, parameter);
            }
        } catch (error) {
            console.error('Error showing attendance:', error);
            await message.reply('❌ Sorry, there was an error retrieving attendance data.');
        }
    }

    async showAllAttendance(message, user) {
        const subjects = await Subject.findActiveByUser(user._id);
        
        if (subjects.length === 0) {
            await message.reply(
                '📚 *No Subjects Found*\n\n' +
                'You haven\'t added any subjects yet.\n' +
                'Use */add* to add your first subject!'
            );
            return;
        }

        let response = '📊 *Your Attendance Overview*\n\n';
        
        for (const subject of subjects) {
            const percentage = subject.attendancePercentage;
            const status = Helpers.getAttendanceEmoji(percentage);
            
            response += `${status} *${subject.subjectName}*\n`;
            response += `   ${subject.attendedClasses}/${subject.totalClasses} classes (${percentage}%)\n\n`;
        }

        response += '_💡 Type /show <subject name> for detailed view_';
        
        await message.reply(response);
    }

    async showSubjectAttendance(message, user, subjectName) {
        const subject = await Subject.findByUserAndName(user._id, subjectName);
        
        if (!subject) {
            await message.reply(`❌ Subject "${subjectName}" not found.`);
            return;
        }

        const percentage = subject.attendancePercentage;
        const status = Helpers.getAttendanceEmoji(percentage);
        const nextClass = subject.getNextClassTime(user.timezone);

        let response = `📊 *${subject.subjectName} - Detailed View*\n\n`;
        response += `${status} *Attendance: ${percentage}%*\n`;
        response += `✅ Present: ${subject.attendedClasses} classes\n`;
        response += `❌ Total: ${subject.totalClasses} classes\n\n`;
        
        response += `📅 *Schedule:* ${subject.schedule.day}s at ${subject.schedule.time}\n`;
        response += `⏱️ *Duration:* ${subject.schedule.duration} hour(s)\n\n`;
        
        response += `🗓️ *Next Class:* ${nextClass.format('dddd, MMM Do [at] h:mm A')}\n\n`;

        if (percentage < 75) {
            const classesNeeded = Helpers.calculateClassesNeeded(subject.attendedClasses, subject.totalClasses, 75);
            response += `⚠️ *Low Attendance Alert!*\n`;
            response += `You need to attend ${classesNeeded} more classes to reach 75%`;
        }

        await message.reply(response);
    }

    async handleList(message, client, args, user) {
        const subjects = await Subject.findActiveByUser(user._id);
        
        if (subjects.length === 0) {
            await message.reply(
                '📚 *No Subjects Found*\n\n' +
                'You haven\'t added any subjects yet.\n' +
                'Use */add* to add your first subject!'
            );
            return;
        }

        let response = '📚 *Your Subjects*\n\n';
        
        subjects.forEach((subject, index) => {
            response += `${index + 1}. *${subject.subjectName}*\n`;
            response += `   📅 ${subject.schedule.day}s at ${subject.schedule.time}\n`;
            response += `   ⏱️ ${subject.schedule.duration} hour(s)\n\n`;
        });

        await message.reply(response);
    }

    async handleTimezone(message, client, args, user) {
        const timezone = args.join(' ').trim();
        
        if (!timezone) {
            await message.reply(
                `🌍 *Current Timezone*\n\n` +
                `Your timezone: ${user.timezone}\n\n` +
                `To change it, use: */timezone <timezone>*\n` +
                `Example: /timezone America/New_York`
            );
            return;
        }

        try {
            // Validate timezone
            moment.tz.zone(timezone);
            
            user.timezone = timezone;
            await user.save();
            
            await message.reply(
                `✅ *Timezone Updated*\n\n` +
                `Your timezone has been set to: ${timezone}\n` +
                `Current time: ${moment().tz(timezone).format('LLLL')}`
            );
            
        } catch (error) {
            await message.reply(
                `❌ Invalid timezone "${timezone}"\n\n` +
                `Please use a valid timezone like:\n` +
                `• Asia/Kolkata\n` +
                `• America/New_York\n` +
                `• Europe/London`
            );
        }
    }

    async handleSettings(message, client, args, user) {
        const response = `⚙️ *Your Settings*\n\n` +
            `👤 Name: ${user.name}\n` +
            `🌍 Timezone: ${user.timezone}\n` +
            `🔔 Reminders: ${user.preferences.reminderEnabled ? 'Enabled' : 'Disabled'}\n` +
            `⚠️ Low Attendance Alerts: ${user.preferences.lowAttendanceAlerts ? 'Enabled' : 'Disabled'}\n\n` +
            `_To change timezone: /timezone <timezone>_`;

        await message.reply(response);
    }

    async handleUnknownCommand(message, client) {
        await message.reply(
            '❓ Unknown command.\n\n' +
            'Type */help* to see all available commands.'
        );
    }

    parseAddCommand(input) {
        try {
            // Normalize the input
            const normalizedInput = input.toLowerCase().trim();
            
            // Use multiple regex patterns to handle various formats
            const patterns = [
                // Pattern 1: "subject on day at time for duration"
                /^(.+?)\s+on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d{1,2}:?\d{0,2}(?:am|pm)?)\s+for\s+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)?$/i,
                // Pattern 2: "subject day time duration"
                /^(.+?)\s+(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d{1,2}:?\d{0,2}(?:am|pm)?)\s+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)?$/i
            ];

            for (const pattern of patterns) {
                const match = normalizedInput.match(pattern);
                if (match) {
                    const [, subjectName, day, time, duration] = match;
                    
                    return {
                        subjectName: Helpers.capitalizeWords(subjectName.trim()),
                        day: Helpers.normalizeDayName(day),
                        time: Helpers.normalizeTime(time),
                        duration: parseFloat(duration)
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error parsing add command:', error);
            return null;
        }
    }


}

module.exports = CommandHandler;