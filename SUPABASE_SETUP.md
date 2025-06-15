# 🔐 Supabase Authentication Setup

## Overview

Your Zero Noise project now has **Supabase authentication** integrated! This provides a robust, scalable authentication system with features like:

- ✅ Email/Password authentication
- ✅ OAuth providers (Google, GitHub, etc.)
- ✅ Email verification
- ✅ Password reset
- ✅ Session management
- ✅ User metadata storage
- ✅ Real-time auth state changes

## 🚀 Quick Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project
4. Wait for the project to be ready

### 2. Get Your Project Credentials

From your Supabase dashboard:
1. Go to **Settings** → **API**
2. Copy your **Project URL**
3. Copy your **anon/public key**

### 3. Set Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Configure Authentication Providers

#### Email/Password (Already Enabled)
No additional setup needed - works out of the box!

#### Google OAuth (Optional)
1. In Supabase dashboard: **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

### 5. Set Up Email Templates (Optional)

Customize your auth emails in **Authentication** → **Email Templates**:
- Confirm signup
- Magic link
- Change email address
- Reset password

## 📁 Project Structure

```
src/
├── lib/
│   ├── supabase.ts              # Basic Supabase client
│   └── supabase/
│       ├── client.ts            # Browser client
│       └── server.ts            # Server client (SSR)
├── contexts/
│   └── auth-context.tsx         # Auth state management
├── components/
│   ├── auth-modal.tsx           # Login/Signup modal
│   └── header.tsx               # Header with auth buttons
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts         # OAuth callback handler
│   └── layout.tsx               # Root layout with AuthProvider
└── middleware.ts                # Route protection
```

## 🎯 How to Use

### In Components

```tsx
'use client'

import { useAuth } from '@/contexts/auth-context'

export function MyComponent() {
  const { user, loading, signOut } = useAuth()

  if (loading) return <div>Loading...</div>

  if (user) {
    return (
      <div>
        <p>Welcome, {user.email}!</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    )
  }

  return <div>Please sign in</div>
}
```

### In Server Components

```tsx
import { createClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  return <div>Hello, {user.email}!</div>
}
```

### In API Routes

```tsx
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return Response.json({ user })
}
```

## 🛡️ Route Protection

Routes are automatically protected by the middleware:

- `/dashboard/*` - Requires authentication
- All other routes - Public

To modify protection rules, edit `middleware.ts`:

```tsx
// Protect additional routes
if (request.nextUrl.pathname.startsWith('/admin') && !user) {
  return NextResponse.redirect(new URL('/', request.url))
}
```

## 🎨 UI Components

### AuthModal Component

The `AuthModal` component provides:
- Login/Signup forms
- Email/Password authentication
- Google OAuth button
- Form validation
- Error handling
- Loading states

### Header Component

The `Header` component includes:
- Authentication buttons
- User welcome message
- Sign out functionality
- Mobile responsive design

## 🔧 Customization

### Styling
All components use Tailwind CSS and can be customized by modifying the className props.

### Authentication Flow
- Users can sign up with email/password
- Email verification is optional (configure in Supabase)
- OAuth providers can be added easily
- Sessions are automatically managed

### User Metadata
Store additional user data:

```tsx
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg',
    },
  },
})
```

## 🚨 Migration from Old System

Your old authentication system used local file storage. To migrate:

1. **Export existing users** from `signup-data/signups.jsonl`
2. **Import to Supabase** using the dashboard or API
3. **Update your dashboard** to use Supabase auth
4. **Remove old auth files** when ready

## 🔍 Troubleshooting

### Common Issues

1. **Environment variables not loaded**
   - Restart your dev server after adding `.env.local`
   - Check variable names match exactly

2. **OAuth redirect errors**
   - Verify redirect URLs in provider settings
   - Check Supabase project URL is correct

3. **Session not persisting**
   - Check middleware configuration
   - Verify cookies are enabled

### Debug Mode

Add to your `.env.local` for debugging:
```bash
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

## 🎉 You're Ready!

Your Supabase authentication is now set up! Users can:

1. **Sign up** with email/password or OAuth
2. **Sign in** to access protected routes
3. **Stay logged in** across sessions
4. **Sign out** when done

The system handles all the complex auth logic automatically, giving you a production-ready authentication system that scales with your needs!

## 📚 Next Steps

- Set up user profiles in Supabase
- Add role-based access control
- Implement password reset flow
- Add more OAuth providers
- Set up email templates 