// Google Apps Script Webhook for Zero Noise Email Signups
// 
// Instructions:
// 1. Go to script.google.com
// 2. Create a new project
// 3. Replace the default code with this script
// 4. Deploy as Web App with execute permissions for "Anyone"
// 5. Copy the Web App URL to your .env file as GOOGLE_SHEETS_WEBHOOK_URL

function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Open your Google Sheet by ID
    const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // Replace with your actual sheet ID
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    
    // Prepare the row data
    const rowData = [
      data.email || '',
      data.timestamp || new Date().toISOString(),
      data.source || 'website',
      data.userAgent || 'unknown'
    ];
    
    // Add the data to the sheet
    sheet.appendRow(rowData);
    
    // Log success
    console.log('Successfully added email to sheet:', data.email);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Email added to sheet successfully',
        email: data.email
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log error
    console.error('Error adding email to sheet:', error);
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function (optional)
function testWebhook() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        email: 'test@example.com',
        timestamp: new Date().toISOString(),
        source: 'test',
        userAgent: 'Google Apps Script Test'
      })
    }
  };
  
  const result = doPost(testData);
  console.log('Test result:', result.getContent());
} 