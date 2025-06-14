// Simple test script to verify Google Sheets integration
// Run with: node test-google-sheets.js

const { config } = require('dotenv');
config({ path: '.env' });

async function testGoogleSheets() {
  console.log('🧪 Testing Google Sheets Integration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('GOOGLE_SHEETS_CLIENT_EMAIL:', process.env.GOOGLE_SHEETS_CLIENT_EMAIL ? '✅ Set' : '❌ Missing');
  console.log('GOOGLE_SHEETS_PRIVATE_KEY:', process.env.GOOGLE_SHEETS_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
  console.log('GOOGLE_SHEETS_SPREADSHEET_ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? '✅ Set' : '❌ Missing');
  console.log('GOOGLE_SHEETS_RANGE:', process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:D (default)');

  if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    console.log('\n❌ Missing required environment variables. Please check your .env file.');
    return;
  }

  try {
    // Test API endpoint
    console.log('\n🚀 Testing API endpoint...');
    
    const testEmail = `test-sheets+${Date.now()}@example.com`;
    const response = await fetch('http://localhost:3000/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API endpoint working!');
      console.log('Response:', data);
    } else {
      console.log('❌ API endpoint failed:');
      console.log('Status:', response.status);
      console.log('Response:', data);
    }

  } catch (error) {
    console.log('❌ Error testing API:', error.message);
    console.log('💡 Make sure your development server is running on port 3000');
  }
}

testGoogleSheets(); 