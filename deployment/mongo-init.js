// MongoDB initialization script
print('Initializing attendance_bot database...');

// Switch to the attendance_bot database
db = db.getSiblingDB('attendance_bot');

// Create collections with initial data structure
print('Creating collections...');

// Users collection
db.createCollection('users');
db.users.createIndex({ "_id": 1 }, { unique: true });
db.users.createIndex({ "isRegistered": 1 });

// Subjects collection
db.createCollection('subjects');
db.subjects.createIndex({ "userId": 1, "subjectName": 1, "isActive": 1 });
db.subjects.createIndex({ "userId": 1, "isActive": 1 });
db.subjects.createIndex({ "schedule.day": 1, "schedule.time": 1 });

// Attendance records collection
db.createCollection('attendancerecords');
db.attendancerecords.createIndex({ "userId": 1, "subjectId": 1, "date": -1 });
db.attendancerecords.createIndex({ "status": 1, "scheduledTime": 1 });
db.attendancerecords.createIndex({ "userId": 1, "status": 1 });

print('Database initialization completed successfully!');

// Create a sample user for testing (optional)
/*
db.users.insertOne({
    "_id": "1234567890",
    "name": "Test User",
    "isRegistered": true,
    "timezone": "Asia/Kolkata",
    "registrationStep": "completed",
    "preferences": {
        "reminderEnabled": true,
        "lowAttendanceAlerts": true
    },
    "createdAt": new Date(),
    "updatedAt": new Date()
});

print('Sample user created for testing');
*/