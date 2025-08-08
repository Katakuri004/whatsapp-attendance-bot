# 🤖 AI Timetable Parser Feature

## Overview

The WhatsApp Attendance Bot now includes an advanced AI-powered timetable parsing feature that allows users to automatically add all their classes by simply sending a screenshot of their timetable.

## How It Works

### 1. User Sends Timetable Image
- User takes a screenshot of their timetable
- Sends the image to the bot via WhatsApp
- Bot detects the image and processes it

### 2. AI Analysis
- Image is sent to Google's Gemini AI model
- AI analyzes the image using OCR and structural understanding
- Extracts class information: subject names, days, times, durations

### 3. Data Processing
- AI returns structured JSON data
- Bot validates and cleans the data
- Converts various time formats to standard HH:MM format
- Calculates class durations automatically

### 4. Confirmation Process
- Bot shows all detected classes to the user
- User can review and confirm before adding
- Reply "yes" to add all classes, "no" to cancel
- Confirmation expires after 5 minutes

### 5. Database Integration
- Bot adds confirmed classes to the user's schedule
- Handles duplicates gracefully
- Provides detailed feedback to the user

## Features

### ✅ Intelligent Parsing
- Extracts subject names exactly as they appear
- Handles various time formats (9:30, 9.30, 9h30, 930, 9:30am, etc.)
- Automatically calculates class durations
- Validates data before saving

### ✅ Robust Error Handling
- Graceful handling of unclear images
- Detailed error messages for users
- Fallback to manual entry if AI fails
- Logging for debugging and monitoring

### ✅ User-Friendly Experience
- Real-time processing feedback
- Confirmation step before adding classes
- Detailed results summary
- Shows which classes were added vs. skipped
- Clear instructions for better results

### ✅ Security & Privacy
- Image data is processed securely
- No permanent storage of images
- API calls are logged for monitoring
- Rate limiting prevents abuse

## Setup Instructions

### 1. Get Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Get API key"
3. Create a new API key
4. Copy the key

### 2. Configure Environment
Add your API key to the `.env` file:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Install Dependencies
```bash
npm install @google/generative-ai
```

### 4. Restart Bot
```bash
npm start
```

## Usage

### For Users
1. **Take a screenshot** of your timetable
2. **Send the image** to the bot via WhatsApp
3. **Wait for processing** (usually 5-10 seconds)
4. **Review the detected classes** - bot will show all classes found
5. **Confirm or cancel** - reply "yes" to add all classes, "no" to cancel
6. **Use commands** like `/list` to see all your subjects

### Best Practices for Images
- **Clear and readable** text
- **Well-structured** timetable format
- **Good lighting** and contrast
- **Avoid blurry** or low-resolution images
- **Include all relevant** class information

## Technical Details

### AI Model
- **Model**: Google Gemini 1.5 Flash
- **Capabilities**: OCR + Structural understanding
- **Input**: Image (JPEG/PNG)
- **Output**: Structured JSON data

### Data Format
```json
[
  {
    "subject": "Mathematics",
    "day": "Monday",
    "startTime": "09:00",
    "endTime": "11:00",
    "duration": 2.0
  }
]
```

### Time Format Support
- `9:30` → `09:30`
- `9.30` → `09:30`
- `9h30` → `09:30`
- `930` → `09:30`
- `9:30am` → `09:30`
- `2:30pm` → `14:30`

### Error Handling
- **Invalid images**: Clear error messages
- **No classes found**: Helpful suggestions
- **API failures**: Graceful fallback
- **Duplicate classes**: Skip with explanation

## Monitoring & Logging

### Log Categories
- `AI_TIMETABLE_PARSING_START`: When parsing begins
- `AI_TIMETABLE_PARSING_SUCCESS`: Successful parsing
- `AI_TIMETABLE_PARSING_ERROR`: Parsing failures
- `AI_CLASS_ADDED`: Individual class additions
- `AI_CLASS_SKIPPED`: Skipped classes with reasons

### Metrics Tracked
- Parsing success rate
- Classes found per image
- Processing time
- Error types and frequencies
- User adoption rate

## Troubleshooting

### Common Issues

#### 1. "AI Timetable Parser is not configured"
**Solution**: Add `GEMINI_API_KEY` to your `.env` file

#### 2. "No Classes Found"
**Causes**:
- Unclear or blurry image
- Unusual timetable format
- Text too small to read
- Poor image quality

**Solutions**:
- Send a clearer, higher-resolution image
- Ensure good lighting
- Use a standard timetable format
- Try manual entry as fallback

#### 3. "Timetable Processing Failed"
**Causes**:
- Network connectivity issues
- API rate limits
- Invalid API key
- Image download failures

**Solutions**:
- Check internet connection
- Verify API key is correct
- Try again in a few minutes
- Use manual entry as fallback

### Debug Mode
Enable detailed logging by setting:
```env
LOG_LEVEL=debug
```

## Security Considerations

### Data Privacy
- Images are processed but not stored permanently
- API calls are logged for monitoring only
- No personal data is sent to third parties

### Rate Limiting
- Built-in rate limiting prevents abuse
- API calls are monitored and logged
- Automatic blocking of excessive requests

### Error Handling
- Sensitive error details are not exposed to users
- Internal errors are logged for debugging
- Graceful degradation when AI service is unavailable

## Future Enhancements

### Planned Features
- **Multiple timetable formats**: Support for different university formats
- **Batch processing**: Handle multiple images at once
- **Smart validation**: AI-powered data validation
- **Custom prompts**: User-configurable parsing instructions
- **Offline mode**: Fallback parsing without AI

### Performance Optimizations
- **Caching**: Cache common timetable formats
- **Parallel processing**: Handle multiple classes simultaneously
- **Image optimization**: Compress images before processing
- **Response time**: Optimize for faster processing

## Support

### Getting Help
1. Check the logs for detailed error information
2. Verify your API key is correct
3. Test with a simple, clear timetable image
4. Use manual entry as a fallback option

### Reporting Issues
When reporting issues, please include:
- Screenshot of the timetable image
- Error message received
- Bot logs (if available)
- Steps to reproduce the issue

---

**Note**: This feature requires a Google Gemini API key and internet connectivity. The AI service is optional - users can still add classes manually if the AI parser is not configured.
