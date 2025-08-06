const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    _id: {
        type: String, // WhatsApp user ID (phone number without @c.us)
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    isRegistered: {
        type: Boolean,
        default: false
    },
    timezone: {
        type: String,
        default: 'Asia/Kolkata'
    },
    registrationStep: {
        type: String,
        enum: ['name', 'timezone', 'completed'],
        default: 'name'
    },
    preferences: {
        reminderEnabled: {
            type: Boolean,
            default: true
        },
        lowAttendanceAlerts: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Instance methods
userSchema.methods.isFullyRegistered = function() {
    return this.isRegistered && this.registrationStep === 'completed';
};

userSchema.methods.getDisplayName = function() {
    return this.name || `User ${this._id.substring(0, 4)}****`;
};

// Static methods
userSchema.statics.findByWhatsAppId = function(whatsappId) {
    return this.findById(whatsappId);
};

userSchema.statics.createNewUser = function(whatsappId, name = null) {
    return new this({
        _id: whatsappId,
        name: name,
        isRegistered: !name, // If name is provided, mark as registered
        registrationStep: name ? 'timezone' : 'name'
    });
};

module.exports = mongoose.model('User', userSchema);