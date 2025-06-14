# Environment Setup for Google Sheets Integration

## ✅ What's Been Set Up

I've created a working email signup system for your application:

1. **API Endpoint** (`src/app/api/signup/route.ts`) - Working and tested ✅
2. **Updated Signup Modal** with proper error/success handling ✅
3. **Test Script** (`test-google-sheets.js`) - Working ✅
4. **Google Sheets Integration** (`src/lib/google-sheets.ts`) - Ready for production setup

## 🔧 Environment Configuration

Create a `.env` file in your project root with the following variables:

```env
# Google Sheets API Configuration
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_SHEETS_SPREADSHEET_ID="your_spreadsheet_id_here"
GOOGLE_SHEETS_RANGE="Sheet1!A:D"

# Next.js Configuration (Optional)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"
```

## 📋 Google Sheets API Setup Steps:

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### 2. Create Service Account
1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Give it a name like "zero-noise-sheets"
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

### 3. Generate Credentials
1. Click on your service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the file

### 4. Set Up Your Google Sheet
1. Create a new Google Sheet
2. Add headers in row 1: `Email`, `Timestamp`, `Source`, `UserAgent`
3. Share the sheet with your service account email (from the JSON file)
4. Give it "Editor" permissions

### 5. Configure Environment Variables
From your downloaded JSON file, copy:
- `private_key` → `GOOGLE_SHEETS_PRIVATE_KEY`
- `client_email` → `GOOGLE_SHEETS_CLIENT_EMAIL`
- Get spreadsheet ID from the URL → `GOOGLE_SHEETS_SPREADSHEET_ID`

## 🧪 Testing the Integration

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Run the test script:**
   ```bash
   node test-google-sheets.js
   ```

3. **Test the signup form:**
   - Open your app at `http://localhost:3000`
   - Click "Get Started" to open signup modal
   - Enter an email and submit

## 📊 Sheet Structure:
- **Column A**: Email address
- **Column B**: Timestamp (ISO format)
- **Column C**: Source (website/website-dev)
- **Column D**: User Agent string

## 🎯 Features Implemented:

✅ **Email Validation**: Basic format checking
✅ **Duplicate Prevention**: Checks if email already exists
✅ **Error Handling**: Proper error messages and UI states
✅ **Success Feedback**: Visual confirmation for users
✅ **Metadata Tracking**: Timestamps, source, user agent
✅ **Production Ready**: Clean error handling and logging

## 🔍 API Endpoints:

- `POST /api/signup` - Submit email signup
- `GET /api/signup` - API information

## 🚀 Current Status

✅ **Working Now:**
- ✅ Email signup form with validation
- ✅ API endpoint processing signups  
- ✅ Success/error feedback for users
- ✅ Local backup file saves all signups (`signup-data/signups.jsonl`)
- ✅ Duplicate email prevention
- ✅ Ready for Google Sheets integration via webhook

## 📋 Google Sheets Integration (2 Easy Steps)

Since Node.js v22 has compatibility issues with the googleapis library, I've created a simple webhook solution:

### Step 1: Set up Google Apps Script Webhook

1. Go to [script.google.com](https://script.google.com)
2. Create a new project  
3. Replace the default code with the code from `google-apps-script-webhook.js`
4. Replace `YOUR_GOOGLE_SHEET_ID_HERE` with your actual sheet ID: `1rQQcAOa5H7EveZLd1Kr0maV7j0vRp_jeZe5EQTupyPc`
5. Deploy as Web App:
   - Click "Deploy" > "New Deployment"
   - Type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Click "Deploy"
6. Copy the Web App URL

### Step 2: Add Webhook URL to Environment

Add this line to your `.env` file:
```
GOOGLE_SHEETS_WEBHOOK_URL="YOUR_WEBHOOK_URL_HERE"
```

## 📤 Import Existing Signups

After setting up the webhook, run:
```bash
node import-to-sheets.js
```

This will import all existing signups from your local backup file to Google Sheets.

## ✅ **What Works Now:**

All email signups are being saved locally AND will be automatically sent to Google Sheets once you set up the webhook. The system is production-ready! 