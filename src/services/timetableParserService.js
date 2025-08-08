const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getLogger } = require('../utils/logger');

class TimetableParserService {
    constructor() {
        this.logger = getLogger();
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    /**
     * Parse timetable image using AI
     * @param {Buffer} imageBuffer - The image data
     * @param {string} userId - User ID for logging
     * @returns {Promise<Array>} Array of parsed classes
     */
    async parseTimetableImage(imageBuffer, userId) {
        try {
            this.logger.info('Starting AI timetable parsing', { userId });

            // Convert image to base64 for API
            const base64Image = imageBuffer.toString('base64');
            
            // Craft the prompt for the AI
            const prompt = `
Please analyze this timetable image and extract all class information. 
Return ONLY a valid JSON array with the following structure for each class:

[
  {
    "subject": "Subject Name",
    "day": "Day of Week (Monday/Tuesday/etc)",
    "startTime": "HH:MM format",
    "endTime": "HH:MM format",
    "duration": "Duration in hours (decimal, e.g. 2.0)"
  }
]

Important:
- Extract subject names exactly as they appear
- Use 24-hour time format (HH:MM)
- Calculate duration as endTime - startTime in hours
- If time format is unclear, use best guess
- Return ONLY the JSON array, no other text
- Ensure all times are in HH:MM format
- Handle multiple classes per day
- If a class spans multiple time slots, create separate entries

Example output:
[
  {
    "subject": "Mathematics",
    "day": "Monday", 
    "startTime": "09:00",
    "endTime": "11:00",
    "duration": 2.0
  }
]
`;

            // Generate content with image
            const result = await this.model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Image
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in AI response');
            }

            const parsedData = JSON.parse(jsonMatch[0]);
            
            // Validate and clean the data
            const validatedData = this.validateAndCleanData(parsedData);
            
            this.logger.info('AI timetable parsing completed', { 
                userId, 
                classesFound: validatedData.length 
            });

            return validatedData;

        } catch (error) {
            this.logger.error('AI timetable parsing failed', error, { userId });
            throw new Error(`Failed to parse timetable: ${error.message}`);
        }
    }

    /**
     * Validate and clean parsed data
     * @param {Array} data - Raw parsed data
     * @returns {Array} Cleaned and validated data
     */
    validateAndCleanData(data) {
        if (!Array.isArray(data)) {
            throw new Error('Invalid data format: expected array');
        }

        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const cleanedData = [];

        for (const item of data) {
            try {
                // Validate required fields
                if (!item.subject || !item.day || !item.startTime || !item.endTime) {
                    this.logger.warn('Skipping invalid class entry', { item });
                    continue;
                }

                // Clean and validate day
                const day = item.day.toLowerCase().trim();
                if (!validDays.includes(day)) {
                    this.logger.warn('Invalid day found, skipping', { day: item.day });
                    continue;
                }

                // Clean and validate times
                const startTime = this.normalizeTime(item.startTime);
                const endTime = this.normalizeTime(item.endTime);
                
                if (!startTime || !endTime) {
                    this.logger.warn('Invalid time format, skipping', { 
                        startTime: item.startTime, 
                        endTime: item.endTime 
                    });
                    continue;
                }

                // Calculate duration
                const duration = this.calculateDuration(startTime, endTime);
                if (duration <= 0 || duration > 8) {
                    this.logger.warn('Invalid duration, skipping', { duration });
                    continue;
                }

                // Clean subject name
                const subject = this.cleanSubjectName(item.subject);

                cleanedData.push({
                    subject,
                    day: this.capitalizeFirstLetter(day),
                    startTime,
                    endTime,
                    duration
                });

            } catch (error) {
                this.logger.warn('Error processing class entry', error, { item });
                continue;
            }
        }

        return cleanedData;
    }

    /**
     * Normalize time format to HH:MM
     * @param {string} time - Time string
     * @returns {string} Normalized time
     */
    normalizeTime(time) {
        if (!time) return null;

        // Remove extra spaces and convert to string
        time = time.toString().trim();

        // Handle various time formats
        const timePatterns = [
            /^(\d{1,2}):(\d{2})$/i,           // 9:30, 14:30
            /^(\d{1,2})\.(\d{2})$/i,           // 9.30, 14.30
            /^(\d{1,2})h(\d{2})?$/i,           // 9h, 9h30
            /^(\d{1,2})(\d{2})$/i,             // 930, 1430
            /^(\d{1,2}):(\d{2})(am|pm)$/i,     // 9:30am, 2:30pm
            /^(\d{1,2})\.(\d{2})(am|pm)$/i,    // 9.30am, 2.30pm
        ];

        for (const pattern of timePatterns) {
            const match = time.match(pattern);
            if (match) {
                let hours = parseInt(match[1]);
                let minutes = parseInt(match[2] || '0');
                const period = match[3]?.toLowerCase();

                // Handle AM/PM
                if (period === 'pm' && hours !== 12) {
                    hours += 12;
                } else if (period === 'am' && hours === 12) {
                    hours = 0;
                }

                // Validate hours and minutes
                if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
            }
        }

        return null;
    }

    /**
     * Calculate duration between two times
     * @param {string} startTime - Start time in HH:MM format
     * @param {string} endTime - End time in HH:MM format
     * @returns {number} Duration in hours
     */
    calculateDuration(startTime, endTime) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        let startMinutes = startHour * 60 + startMin;
        let endMinutes = endHour * 60 + endMin;

        // Handle overnight classes (shouldn't happen for timetables)
        if (endMinutes < startMinutes) {
            endMinutes += 24 * 60;
        }

        const durationMinutes = endMinutes - startMinutes;
        return durationMinutes / 60;
    }

    /**
     * Clean subject name
     * @param {string} subject - Raw subject name
     * @returns {string} Cleaned subject name
     */
    cleanSubjectName(subject) {
        if (!subject) return 'Unknown Subject';

        return subject
            .trim()
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/[^\w\s\-]/g, '')  // Remove special characters except spaces and hyphens
            .substring(0, 100);  // Limit length
    }

    /**
     * Capitalize first letter
     * @param {string} str - Input string
     * @returns {string} String with first letter capitalized
     */
    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Check if AI service is available
     * @returns {boolean} True if API key is configured
     */
    isAvailable() {
        return !!process.env.GEMINI_API_KEY;
    }
}

module.exports = TimetableParserService;
