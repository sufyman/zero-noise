// Script to import existing signup data to Google Sheets
// Run this after setting up the Google Apps Script webhook

const fs = require('fs');
const path = require('path');

async function importSignupsToSheet() {
  const filePath = path.join(__dirname, 'signup-data', 'signups.jsonl');
  
  if (!fs.existsSync(filePath)) {
    console.log('No signup data file found');
    return;
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('❌ GOOGLE_SHEETS_WEBHOOK_URL not set in .env file');
    console.log('Please set up the Google Apps Script webhook first');
    return;
  }

  console.log('📤 Importing signup data to Google Sheets...\n');

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n').filter(line => line);

  let imported = 0;
  let failed = 0;

  for (const line of lines) {
    try {
      const signup = JSON.parse(line);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signup),
      });

      if (response.ok) {
        console.log('✅', signup.email);
        imported++;
      } else {
        console.log('❌', signup.email, '- Failed');
        failed++;
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log('❌ Error processing line:', error.message);
      failed++;
    }
  }

  console.log(`\n📊 Import Summary:`);
  console.log(`✅ Imported: ${imported}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total: ${lines.length}`);
}

// Load environment variables
const { config } = require('dotenv');
config({ path: '.env' });

importSignupsToSheet().catch(console.error); 