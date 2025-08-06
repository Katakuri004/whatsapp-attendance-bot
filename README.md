# 🎓 WhatsApp Attendance Tracker Bot

A comprehensive WhatsApp bot that helps students track their class attendance, receive reminders, and monitor their attendance percentage.

## 📋 Features

### Core Functionality
- **User Registration**: Simple onboarding process for new users
- **Subject Management**: Add and remove subjects with flexible scheduling
- **Automated Reminders**: Get notified 10 minutes before each class
- **Attendance Tracking**: Confirm attendance after classes
- **Smart Reports**: View detailed attendance statistics
- **Low Attendance Alerts**: Get warned when attendance drops below 75%

### Commands
- `/start` - Register as a new user
- `/add <subject> on <day> at <time> for <hours>` - Add a new subject
- `/drop <subject>` - Remove a subject
- `/list` - Show all your subjects
- `/show attendance` - View attendance overview
- `/show <subject>` - View detailed subject attendance
- `/timezone <timezone>` - Set your timezone
- `/settings` - View your settings
- `/help` - Show help information

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- WhatsApp account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whatsapp-attendance-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/attendance_bot
   BOT_NAME=AttendanceBot
   DEFAULT_TIMEZONE=Asia/Kolkata
   SESSION_PATH=./whatsapp-session
   NODE_ENV=development
   PORT=3000
   REMINDER_MINUTES_BEFORE=10
   CONFIRMATION_MINUTES_AFTER=10
   ABSENCE_TIMEOUT_HOURS=2
   LOW_ATTENDANCE_THRESHOLD=75
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the bot**
   ```bash
   npm start
   ```
   or for development:
   ```bash
   npm run dev
   ```

6. **Authenticate WhatsApp**
   Scan the QR code that appears in your terminal with WhatsApp on your phone.

## 📱 Usage Examples

### Adding a Subject
```
/add Mathematics on Monday at 10:00 for 2
/add Physics on Wed at 2pm for 1.5
/add Computer Science on Friday at 09:30 for 3
```

### Viewing Attendance
```
/show attendance          # View all subjects
/show Mathematics         # View specific subject
```

### Managing Subjects
```
/list                     # Show all subjects
/drop Mathematics         # Remove a subject
```

## 🏗️ Project Structure

```
src/
├── index.js              # Main application entry point
├── handlers/
│   ├── commandHandler.js # Handles bot commands
│   └── messageHandler.js # Handles general messages
├── models/
│   ├── User.js           # User data model
│   ├── Subject.js        # Subject data model
│   └── AttendanceRecord.js # Attendance record model
├── services/
│   ├── databaseService.js # Database connection and operations
│   └── schedulerService.js # Cron jobs and reminders
└── utils/
    ├── constants.js      # Application constants
    └── helpers.js        # Utility functions
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/attendance_bot` |
| `DEFAULT_TIMEZONE` | Default timezone for users | `Asia/Kolkata` |
| `REMINDER_MINUTES_BEFORE` | Minutes before class to send reminder | `10` |
| `CONFIRMATION_MINUTES_AFTER` | Minutes after class to ask for attendance | `10` |
| `ABSENCE_TIMEOUT_HOURS` | Hours to wait before marking absent | `2` |
| `LOW_ATTENDANCE_THRESHOLD` | Percentage below which to send alerts | `75` |

### Database Schema

#### Users Collection
```javascript
{
  "_id": "whatsapp_user_id",
  "name": "User Name",
  "isRegistered": true,
  "timezone": "Asia/Kolkata",
  "preferences": {
    "reminderEnabled": true,
    "lowAttendanceAlerts": true
  }
}
```

#### Subjects Collection
```javascript
{
  "userId": "whatsapp_user_id",
  "subjectName": "Mathematics",
  "schedule": {
    "day": "Monday",
    "time": "10:00",
    "duration": 2
  },
  "totalClasses": 20,
  "attendedClasses": 15,
  "isActive": true
}
```

#### Attendance Records Collection
```javascript
{
  "userId": "whatsapp_user_id",
  "subjectId": "subject_object_id",
  "date": "2024-01-15",
  "scheduledTime": "2024-01-15T10:00:00Z",
  "status": "present", // present, absent, pending
  "reminderSent": true,
  "confirmationSent": true,
  "autoMarked": false
}
```

## 🤖 Bot Workflow

### Registration Flow
1. User sends `/start`
2. Bot asks for name
3. Bot asks for timezone
4. Registration complete

### Class Reminder Flow
1. Bot checks for upcoming classes every minute
2. Sends reminder 10 minutes before class
3. Sends attendance confirmation 10 minutes after class starts
4. Waits for user response (yes/no)
5. If no response in 2 hours, marks as absent

### Attendance Tracking
- Users respond with "yes", "no", or similar phrases
- Bot supports multiple languages (English, Hindi)
- Automatic percentage calculation
- Low attendance alerts when below 75%

## 🛠️ Development

### Available Scripts
- `npm start` - Start the bot in production mode
- `npm run dev` - Start with nodemon for development
- `npm test` - Run tests (if configured)

### Adding New Features
1. Create new handlers in `src/handlers/`
2. Add new models in `src/models/`
3. Update constants in `src/utils/constants.js`
4. Add helper functions in `src/utils/helpers.js`

## 🚀 Deployment

### Heroku Deployment
1. Create a Heroku app
2. Add MongoDB Atlas as database
3. Set environment variables
4. Deploy:
   ```bash
   git push heroku main
   ```

### Docker Deployment
```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Common Issues

**Bot doesn't start**
- Check if MongoDB is running
- Verify environment variables
- Check Node.js version

**QR code doesn't work**
- Make sure WhatsApp is not open on another browser
- Try restarting the bot
- Check internet connection

**Reminders not working**
- Verify timezone settings
- Check if subjects are added correctly
- Ensure bot is running continuously

### Logs
The bot provides detailed logging for debugging:
- Connection status
- User interactions
- Scheduler activities
- Error messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) for WhatsApp integration
- [node-cron](https://github.com/node-cron/node-cron) for scheduling
- [mongoose](https://mongoosejs.com/) for MongoDB integration
- [moment-timezone](https://momentjs.com/timezone/) for timezone handling

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Review the logs for error messages
3. Create an issue on GitHub
4. Contact the development team

---

Made with ❤️ for students to track their attendance efficiently!