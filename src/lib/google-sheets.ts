import { google } from 'googleapis';

// Initialize Google Sheets API
const getGoogleSheetsInstance = () => {
  const rawPrivateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;

  if (!rawPrivateKey || !clientEmail) {
    throw new Error('Google Sheets credentials not configured');
  }

  // Handle both properly formatted keys and keys with literal \n
  let privateKey = rawPrivateKey;
  if (rawPrivateKey.includes('\\n')) {
    privateKey = rawPrivateKey.replace(/\\n/g, '\n');
  }

  // Ensure the key is properly formatted
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('Invalid private key format');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      private_key: privateKey,
      client_email: clientEmail,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
};

export interface SignupData {
  email: string;
  timestamp?: string;
  source?: string;
  userAgent?: string;
}

export const addEmailToSheet = async (data: SignupData) => {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:D';

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID not configured');
    }

    const timestamp = data.timestamp || new Date().toISOString();
    const values = [
      [
        data.email,
        timestamp,
        data.source || 'website',
        data.userAgent || 'unknown'
      ]
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error adding email to sheet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

export const getEmailsFromSheet = async () => {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:D';

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID not configured');
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    
    // Skip header row if it exists
    const emails = rows.slice(1).map((row) => ({
      email: row[0] || '',
      timestamp: row[1] || '',
      source: row[2] || '',
      userAgent: row[3] || '',
    }));

    return {
      success: true,
      data: emails,
    };
  } catch (error) {
    console.error('Error fetching emails from sheet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

export const checkEmailExists = async (email: string) => {
  try {
    const result = await getEmailsFromSheet();
    
    if (!result.success) {
      return { success: false, exists: false, error: result.error };
    }

    const exists = result.data?.some((entry) => 
      entry.email.toLowerCase() === email.toLowerCase()
    ) || false;

    return {
      success: true,
      exists,
    };
  } catch (error) {
    console.error('Error checking email existence:', error);
    return {
      success: false,
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}; 