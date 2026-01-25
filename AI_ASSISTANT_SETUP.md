# AI Clinical Assistant Setup Guide

## Overview
The AI Clinical Assistant is an intelligent chat interface powered by Google's Gemini AI that helps dental professionals with clinical decisions, treatment protocols, and patient care guidance.

## Features
- **Real-time AI Chat**: Interactive conversation with AI trained on dental knowledge
- **Treatment Protocols**: Get detailed guidelines for procedures like root canals, extractions, crown preparations
- **Pain Management**: Medication recommendations and emergency care protocols
- **Pediatric Dentistry**: Age-specific treatment guidance and behavior management
- **Practice Context**: AI has access to your patient statistics and recent treatment data
- **Quick Prompts**: Pre-defined questions for common scenarios
- **Copy Responses**: Easily copy AI responses for documentation

## Setup Instructions

### Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated API key (starts with `AIza...`)

### Step 2: Configure Your Environment

**Option A: Create .env file manually**

1. Create a new file named `.env` in your project root:
   ```
   d:\Dental Cloud Qoder\DentalCloud-by-Thuta\.env
   ```

2. Add your Gemini API key:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualAPIKeyHere
   ```

**Option B: Copy from template**

1. Rename `.env.example` to `.env`
2. Replace `your_gemini_api_key_here` with your actual API key

### Step 3: File Location to Edit

**Exact file path to add your API key:**
```
d:\Dental Cloud Qoder\DentalCloud-by-Thuta\.env
```

**What to add:**
```env
GEMINI_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuvwxyz
```
*(Replace with your actual key from Step 1)*

### Step 4: Restart Development Server

After adding your API key:

1. Stop the current dev server (Ctrl+C in terminal)
2. Restart with:
   ```bash
   npm run dev
   ```
   or
   ```bash
   npm start
   ```

### Step 5: Verify Setup

1. Navigate to **"AI Assistant"** in the sidebar (Operations section)
2. Look for the status banner at the top:
   - ⚠️ **Yellow Banner** = Mock mode (API key not configured)
   - ✅ **No Banner** = Real AI mode (connected successfully)
   - ❌ **Red Banner** = Connection error (check API key or internet)

## Mock Mode (No API Key Required)

The AI Assistant works out-of-the-box with intelligent mock responses covering:
- Root canal procedures
- Cavity treatments
- Tooth extractions
- Pain management
- Crown preparations
- Pediatric dentistry
- Dental implants

**This is perfect for:**
- Testing the interface
- Demonstrations
- Training staff
- Deciding if you want to use real AI

## Real AI Mode (With Gemini API Key)

Once configured, you get:
- Dynamic responses to any dental question
- Context-aware answers based on your practice data
- Latest medical knowledge from Google's AI
- Natural conversation flow
- More comprehensive clinical guidance

## API Key Security

⚠️ **Important Security Notes:**

1. **Never commit .env to git** - The `.env` file is already in `.gitignore`
2. **Keep your API key private** - Don't share it publicly
3. **Free tier limits**: Gemini offers generous free quotas
4. **Monitor usage**: Check your usage in Google AI Studio

## Troubleshooting

### "Mock Mode Active" banner won't disappear
- ✅ Check that `.env` file exists (not `.env.example`)
- ✅ Verify API key starts with `AIza`
- ✅ Restart the development server
- ✅ Clear browser cache and refresh

### "API Connection Error" message
- ✅ Check internet connection
- ✅ Verify API key is correct (try creating a new one)
- ✅ Check if API key has been revoked in Google AI Studio
- ✅ Ensure no firewall blocking API requests

### API key not loading
- ✅ File must be named exactly `.env` (with the dot)
- ✅ Place in project root: `d:\Dental Cloud Qoder\DentalCloud-by-Thuta\.env`
- ✅ Format: `GEMINI_API_KEY=your_key` (no spaces, no quotes)
- ✅ Server must be restarted after adding key

## Code Integration Points

If you want to customize the AI Assistant, here are the key files:

### Main Component
**File:** `components/AIAssistantView.tsx`
- Lines 8-12: Mock API key constant (for reference only)
- Lines 84-155: Gemini API integration logic
- Lines 158-430: Mock response simulation

### App Integration
**File:** `App.tsx`
- Line 18: Import Sparkles icon
- Line 54: Import AIAssistantView component
- Line 56: Add 'ai-assistant' to ViewState type
- Line 729: Navigation item in sidebar
- Line 792: Route to AIAssistantView

### Environment Configuration
**File:** `vite.config.ts`
- Lines 14-15: Environment variable exposure to client

## Using the AI Assistant

### Example Questions You Can Ask:

1. **Treatment Protocols:**
   - "What's the complete protocol for a root canal treatment?"
   - "Crown preparation guidelines?"
   - "Extraction procedure for impacted wisdom tooth?"

2. **Pain Management:**
   - "How to manage acute dental pain?"
   - "Post-operative pain medications?"
   - "Dental emergency protocols?"

3. **Pediatric Care:**
   - "Cavity treatment for 5-year-old child?"
   - "Behavior management techniques?"
   - "Fluoride treatment guidelines?"

4. **Practice Insights:**
   - "Show me my recent patient records"
   - "Practice statistics summary"

### Tips for Best Results:

✅ **Be specific** - "Root canal for molar tooth" vs "dental treatment"
✅ **Provide context** - "55-year-old patient with severe pain"
✅ **Ask follow-ups** - Build on previous answers
✅ **Copy responses** - Use the copy button to save important guidance

## API Costs

**Gemini API Pricing (as of 2024):**
- **Free tier**: 60 requests per minute
- **Pro tier**: Pay-as-you-go for higher limits

For typical dental practice usage:
- **Estimated**: 100-300 requests per day
- **Cost**: Usually within free tier limits
- **Monitor**: Check usage at [Google AI Studio](https://makersuite.google.com/)

## Support & Resources

- **Gemini API Docs**: https://ai.google.dev/docs
- **Get API Key**: https://makersuite.google.com/app/apikey
- **API Pricing**: https://ai.google.dev/pricing
- **Status Page**: https://status.cloud.google.com/

## Future Enhancements (Coming Soon)

- 🔄 Conversation history persistence
- 📎 Attach patient records to queries
- 🖼️ Image analysis (X-rays, clinical photos)
- 🎙️ Voice input support
- 📊 Treatment plan generation
- 🔗 Integration with patient files

---

**Need Help?**
If you encounter any issues, check the troubleshooting section above or refer to the inline comments in `components/AIAssistantView.tsx`.
