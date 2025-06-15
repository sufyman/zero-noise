// Simple authentication system using local file storage
// Perfect for small user base (max 100 users)

export interface User {
  email: string;
  timestamp: string;
  source: string;
  userAgent: string;
  id: number;
  lastLogin?: string;
}

export interface LoginSession {
  email: string;
  loginTime: string;
  sessionId: string;
}

// Get all registered users from signup data
export const getRegisteredUsers = async (): Promise<User[]> => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const filePath = path.join(process.cwd(), 'signup-data', 'signups.jsonl');
    
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line);
    
    const users: User[] = [];
    for (const line of lines) {
      try {
        const user = JSON.parse(line);
        if (user.email) {
          users.push(user);
        }
      } catch {
        // Skip invalid lines
      }
    }
    
    return users;
  } catch (error) {
    console.error('Error reading user data:', error);
    return [];
  }
};

// Check if email is registered
export const isEmailRegistered = async (email: string): Promise<boolean> => {
  const users = await getRegisteredUsers();
  return users.some(user => user.email.toLowerCase() === email.toLowerCase());
};

// Get user by email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const users = await getRegisteredUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
};

// Update user's last login time
export const updateLastLogin = async (email: string): Promise<void> => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const filePath = path.join(process.cwd(), 'signup-data', 'signups.jsonl');
    
    if (!fs.existsSync(filePath)) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line);
    
    const updatedLines: string[] = [];
    
    for (const line of lines) {
      try {
        const user = JSON.parse(line);
        if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
          user.lastLogin = new Date().toISOString();
        }
        updatedLines.push(JSON.stringify(user));
      } catch {
        // Keep invalid lines as-is
        updatedLines.push(line);
      }
    }
    
    fs.writeFileSync(filePath, updatedLines.join('\n') + '\n');
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

// Generate simple session ID
export const generateSessionId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Session persistence using file storage (for server restarts)
const SESSIONS_FILE = 'signup-data/sessions.jsonl';

// Helper to load sessions from file
const loadSessions = async (): Promise<Map<string, LoginSession>> => {
  const sessions = new Map<string, LoginSession>();
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const filePath = path.join(process.cwd(), SESSIONS_FILE);
    
    if (!fs.existsSync(filePath)) {
      return sessions;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter((line: string) => line);
    
    for (const line of lines) {
      try {
        const session: LoginSession = JSON.parse(line);
        // Only load sessions that are less than 24 hours old
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        if (new Date(session.loginTime).getTime() > oneDayAgo) {
          sessions.set(session.sessionId, session);
        }
      } catch {
        // Skip invalid lines
      }
    }
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
  
  return sessions;
};

// Helper to save sessions to file
const saveSessions = async (sessions: Map<string, LoginSession>): Promise<void> => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Ensure directory exists
    const dir = path.join(process.cwd(), 'signup-data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filePath = path.join(process.cwd(), SESSIONS_FILE);
    
    // Convert sessions to JSONL format
    const lines = Array.from(sessions.values()).map(session => JSON.stringify(session));
    fs.writeFileSync(filePath, lines.join('\n') + (lines.length > 0 ? '\n' : ''));
  } catch (error) {
    console.error('Error saving sessions:', error);
  }
};

// Initialize sessions (will be loaded asynchronously)
const activeSessions = new Map<string, LoginSession>();

// Load sessions on startup
loadSessions().then(sessions => {
  sessions.forEach((session, sessionId) => {
    activeSessions.set(sessionId, session);
  });
}).catch(error => {
  console.error('Error initializing sessions:', error);
});

// Create login session
export const createLoginSession = (email: string): string => {
  const sessionId = generateSessionId();
  const session: LoginSession = {
    email,
    loginTime: new Date().toISOString(),
    sessionId
  };
  
  // Remove any existing sessions for this email
  for (const [id, existingSession] of activeSessions.entries()) {
    if (existingSession.email.toLowerCase() === email.toLowerCase()) {
      activeSessions.delete(id);
    }
  }
  
  activeSessions.set(sessionId, session);
  
  // Clean up old sessions (older than 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [id, session] of activeSessions.entries()) {
    if (new Date(session.loginTime).getTime() < oneDayAgo) {
      activeSessions.delete(id);
    }
  }
  
  // Save sessions to file
  saveSessions(activeSessions).catch(error => {
    console.error('Error saving sessions:', error);
  });
  
  return sessionId;
};

// Get session by ID
export const getSession = (sessionId: string): LoginSession | null => {
  return activeSessions.get(sessionId) || null;
};

// Validate session - now async to properly load sessions
export const validateSession = async (sessionId: string): Promise<boolean> => {
  let session = activeSessions.get(sessionId);
  
  // If session not found in memory and we haven't loaded yet, load from file
  if (!session && activeSessions.size === 0) {
    const loadedSessions = await loadSessions();
    loadedSessions.forEach((sessionData, id) => {
      activeSessions.set(id, sessionData);
    });
    session = activeSessions.get(sessionId);
  }
  
  if (!session) return false;
  
  // Check if session is less than 24 hours old
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return new Date(session.loginTime).getTime() > oneDayAgo;
};

// Logout (remove session)
export const logout = (sessionId: string): boolean => {
  const deleted = activeSessions.delete(sessionId);
  if (deleted) {
    saveSessions(activeSessions).catch(error => {
      console.error('Error saving sessions:', error);
    });
  }
  return deleted;
};

// Get all active sessions (for debugging)
export const getActiveSessions = (): LoginSession[] => {
  return Array.from(activeSessions.values());
}; 