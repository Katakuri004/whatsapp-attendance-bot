const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    subjectName: {
        type: String,
        required: true,
        trim: true
    },
    schedule: {
        day: {
            type: String,
            required: true,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        time: {
            type: String,
            required: true,
            match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
        },
        duration: {
            type: Number,
            required: true,
            min: 0.5,
            max: 8 // Max 8 hours per class
        }
    },
    totalClasses: {
        type: Number,
        default: 0,
        min: 0
    },
    attendedClasses: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Virtual for attendance percentage
subjectSchema.virtual('attendancePercentage').get(function() {
    if (this.totalClasses === 0) return 0;
    return Math.round((this.attendedClasses / this.totalClasses) * 100);
});

// Ensure virtual fields are included in JSON output
subjectSchema.set('toJSON', { virtuals: true });
subjectSchema.set('toObject', { virtuals: true });

// Instance methods
subjectSchema.methods.markAttendance = function(isPresent = true) {
    this.totalClasses += 1;
    if (isPresent) {
        this.attendedClasses += 1;
    }
    return this.save();
};

subjectSchema.methods.getAttendanceStatus = function() {
    const percentage = this.attendancePercentage;
    if (percentage >= 75) return 'good';
    if (percentage >= 60) return 'warning';
    return 'critical';
};

subjectSchema.methods.getNextClassTime = function(timezone = 'Asia/Kolkata') {
    const moment = require('moment-timezone');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const now = moment().tz(timezone);
    const targetDay = days.indexOf(this.schedule.day);
    const [hours, minutes] = this.schedule.time.split(':').map(Number);
    
    let nextClass = now.clone().day(targetDay).hour(hours).minute(minutes).second(0);
    
    // If the class time has passed today, schedule for next week
    if (nextClass.isSameOrBefore(now)) {
        nextClass.add(1, 'week');
    }
    
    return nextClass;
};

// Static methods
subjectSchema.statics.findByUserAndName = function(userId, subjectName) {
    return this.findOne({ 
        userId, 
        subjectName: new RegExp(`^${subjectName}$`, 'i'),
        isActive: true 
    });
};

subjectSchema.statics.findActiveByUser = function(userId) {
    return this.find({ userId, isActive: true }).sort({ 'schedule.day': 1, 'schedule.time': 1 });
};

subjectSchema.statics.findLowAttendance = function(userId, threshold = 75) {
    return this.find({
        userId,
        isActive: true,
        totalClasses: { $gt: 0 }
    }).then(subjects => {
        return subjects.filter(subject => subject.attendancePercentage < threshold);
    });
};

// Compound index for efficient queries
subjectSchema.index({ userId: 1, subjectName: 1, isActive: 1 });
subjectSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Subject', subjectSchema);