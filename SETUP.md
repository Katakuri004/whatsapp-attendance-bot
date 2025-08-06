# 🚀 Quick Setup Guide

Get your WhatsApp Attendance Bot running in just a few minutes!

## ⚡ Quick Start (Windows)

1. **Install Prerequisites**
   - Download and install [Node.js](https://nodejs.org/) (v14 or higher)
   - Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community)

2. **Clone and Setup**
   ```bash
   git clone <your-repo-url>
   cd whatsapp-attendance-bot
   npm install
   ```

3. **Configure Environment**
   - Copy `env.example` to `.env`
   - Edit `.env` with your settings (default settings work for local development)

4. **Start MongoDB**
   - Open MongoDB Compass or start MongoDB service
   - Or use the command: `mongod`

5. **Run the Bot**
   ```bash
   # Windows
   scripts\start.bat
   
   # Linux/Mac
   ./scripts/start.sh
   ```

6. **Authenticate WhatsApp**
   - Scan the QR code with your WhatsApp mobile app
   - Go to WhatsApp > Settings > Linked Devices > Link a Device

7. **Test the Bot**
   - Send a message to your own WhatsApp number: `/start`
   - Follow the registration process
   - Add your first subject: `/add Math on Monday at 10:00 for 2`

## 🐳 Docker Setup (Alternative)

If you prefer Docker:

```bash
cd deployment
docker-compose up -d
```

This will start both MongoDB and the bot in containers.

## 📱 Usage Examples

### Registration
```
/start
> Bot: What's your name?
John Doe
> Bot: What's your timezone?
Asia/Kolkata
> Bot: Registration complete!
```

### Adding Subjects
```
/add Mathematics on Monday at 10:00 for 2
/add Physics on Wednesday at 2pm for 1.5
/add Chemistry on Friday at 09:30 for 3
```

### Viewing Attendance
```
/show attendance          # All subjects overview
/show Mathematics         # Specific subject details
/list                     # List all subjects
```

## 🔧 Configuration Options

### Environment Variables (.env file)

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/attendance_bot` |
| `DEFAULT_TIMEZONE` | Default timezone for new users | `Asia/Kolkata` |
| `REMINDER_MINUTES_BEFORE` | Minutes before class to send reminder | `10` |
| `CONFIRMATION_MINUTES_AFTER` | Minutes after class to ask attendance | `10` |
| `ABSENCE_TIMEOUT_HOURS` | Hours to wait before auto-marking absent | `2` |
| `LOW_ATTENDANCE_THRESHOLD` | Percentage below which to send alerts | `75` |

### Common Timezones
- India: `Asia/Kolkata`
- USA East: `America/New_York`
- USA West: `America/Los_Angeles`
- UK: `Europe/London`
- Germany: `Europe/Berlin`
- Australia: `Australia/Sydney`

## 🤖 Bot Features

### Automatic Reminders
- 📢 **Class Reminder**: 10 minutes before each class
- ✅ **Attendance Check**: 10 minutes after class starts
- ⏰ **Auto-Mark Absent**: If no response within 2 hours

### Smart Attendance Tracking
- 🎯 **Percentage Calculation**: Automatic attendance percentage
- ⚠️ **Low Attendance Alerts**: Warning when below 75%
- 📊 **Detailed Reports**: Per-subject and overall statistics

### Multi-Language Support
- 🇺🇸 **English**: yes, no, present, absent
- 🇮🇳 **Hindi**: हां, नहीं, उपस्थित, अनुपस्थित

## 🐛 Troubleshooting

### Bot doesn't start
- **Check Node.js version**: `node --version` (must be 14+)
- **Check MongoDB**: Make sure MongoDB is running
- **Check dependencies**: Run `npm install` again

### QR code issues
- **Clear browser cache**: Close all WhatsApp Web tabs
- **Restart bot**: Stop and start the bot again
- **Check internet**: Ensure stable internet connection

### Reminders not working
- **Check timezone**: Verify user timezone is correct
- **Check subject schedule**: Ensure subjects are added properly
- **Check bot status**: Bot must be running continuously

### Database issues
```bash
# Check MongoDB status
mongosh
> show dbs
> use attendance_bot
> show collections
```

## 📞 Getting Help

1. **Check logs**: Bot provides detailed logging
2. **Review README**: Full documentation in README.md
3. **Check issues**: Look at existing GitHub issues
4. **Create issue**: Report bugs or request features

## 🚀 Production Deployment

For production use:

1. **Use cloud MongoDB**: [MongoDB Atlas](https://cloud.mongodb.com/)
2. **Deploy to cloud**: Heroku, AWS, Google Cloud, etc.
3. **Set production environment**: `NODE_ENV=production`
4. **Use process manager**: PM2 for Node.js apps
5. **Set up monitoring**: Health checks and error tracking

### Heroku Deployment
```bash
# Install Heroku CLI
heroku create your-attendance-bot
heroku addons:create mongolab
git push heroku main
```

### PM2 Deployment
```bash
npm install -g pm2
pm2 start src/index.js --name attendance-bot
pm2 startup
pm2 save
```

---

Need help? Check the full [README.md](README.md) or create an issue on GitHub! 🤝