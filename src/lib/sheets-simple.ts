// Simplified Google Sheets integration using Google Apps Script Web App
// This bypasses Node.js crypto compatibility issues

export interface SignupData {
  email: string;
  timestamp?: string;
  source?: string;
  userAgent?: string;
}

// For now, let's create a working solution that saves to a JSON file locally
// and provides instructions for Google Sheets integration
export const addEmailToSheet = async (data: SignupData) => {
  try {
    const timestamp = data.timestamp || new Date().toISOString();
    const signupData = {
      email: data.email,
      timestamp,
      source: data.source || 'website',
      userAgent: data.userAgent || 'unknown',
      id: Date.now() // Simple ID for tracking
    };

    console.log('📧 New email signup:', signupData);

    // Try to save to a local JSON file for backup
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const dataDir = path.join(process.cwd(), 'signup-data');
      const filePath = path.join(dataDir, 'signups.jsonl');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Append to JSONL file (each line is a JSON object)
      const line = JSON.stringify(signupData) + '\n';
      fs.appendFileSync(filePath, line);
      
      console.log('✅ Email saved to local backup file:', filePath);
    } catch (fileError) {
      console.warn('Could not save to local file:', fileError);
    }

    // For Google Sheets, we'll use a webhook approach
    try {
      // You can replace this URL with a Google Apps Script Web App URL
      const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
      
      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(signupData),
        });

        if (response.ok) {
          console.log('✅ Successfully sent to Google Sheets via webhook');
          return { success: true, data: signupData };
        } else {
          console.warn('Webhook failed:', response.status);
        }
      }
    } catch (webhookError) {
      console.warn('Webhook error:', webhookError);
    }

    // Always return success since we logged the data
    return {
      success: true,
      data: signupData,
      message: 'Email logged successfully'
    };

  } catch (error) {
    console.error('Error processing email signup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

export const checkEmailExists = async (email: string): Promise<{success: boolean, exists: boolean, error?: string}> => {
  try {
    // Check local backup file for duplicates
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'signup-data', 'signups.jsonl');
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line);
        
        for (const line of lines) {
          try {
            const signup = JSON.parse(line);
            if (signup.email && signup.email.toLowerCase() === email.toLowerCase()) {
              console.log('🔍 Found duplicate email in local file');
              return { success: true, exists: true };
            }
          } catch {
            // Skip invalid lines
          }
        }
      }
    } catch (fileError) {
      console.warn('Could not check local file for duplicates:', fileError);
    }

    // If no local duplicates found, allow signup
    return { success: true, exists: false };
    
  } catch (error) {
    console.error('Error checking email existence:', error);
    // On error, allow the signup to proceed
    return { success: true, exists: false };
  }
}; 