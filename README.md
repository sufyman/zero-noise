# 🎧 Zero Noise - Personalized AI Content Feed

> **Hackathon Project**: A revolutionary AI-powered content curation platform that delivers personalized briefings in your preferred format.

## ✨ What is Zero Noise?

Zero Noise eliminates information overload by delivering **exactly** the content you need, **exactly** how you want it. Using advanced AI, we learn your interests, goals, and consumption preferences to create personalized daily briefings that cut through the noise.

## 🚀 Demo Features

### 🎯 Core User Journey
1. **Beautiful Landing Page** - Modern, engaging homepage with clear value proposition
2. **Simple Email Signup** - Frictionless onboarding (stores data in Google Sheets)
3. **Voice Agent Onboarding** - AI-powered conversation to understand user preferences
4. **Content Feed Preparation** - Animated progress showing AI curation in action
5. **Multiple Content Formats** - Podcast, reports, emails, videos (podcast fully functional)
6. **Interactive Podcast Player** - Full-featured audio experience with transcripts

### 🎙️ Podcast Experience (Primary Demo)
- **Personalized Hosts**: Tim Ferriss & Lex Friedman conversation styles
- **Custom Speed**: 1.5x playback (user-preferred)
- **Personal Mantra**: "You can do it Sam!" opening motivation
- **Interactive Transcript**: Read along and click to jump to sections
- **Question Feature**: Interrupt and ask for deeper dives (placeholder)

### 📱 Mobile-First Design
- **Responsive Design**: Beautiful on all devices
- **PWA Ready**: Installable as mobile app
- **Touch-Friendly**: Optimized for mobile interaction

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 + React 19
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion for smooth interactions  
- **UI Components**: Custom component library
- **Icons**: Lucide React
- **Deployment**: Vercel-ready

## 🎨 Design Philosophy

- **Zero Friction**: Every interaction is streamlined
- **Beautiful Animations**: Engaging micro-interactions
- **Modern Aesthetic**: Purple/pink gradient theme with clean typography
- **Accessibility First**: Semantic HTML and proper contrast ratios

## 📊 Demo Data

The app showcases a user persona interested in:
- Consumer startup news
- SEO trends  
- AI progress for startups
- Stable diffusion models

With preferences for:
- 5-minute daily podcasts
- Tim Ferriss & Lex Friedman hosting styles
- 1.5x playback speed
- Morning motivation ("You can do it Sam!")

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zero-noise

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build for Production

```bash
# Create optimized build
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
zero-noise/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── page.tsx        # Landing page
│   │   ├── onboarding/     # Voice setup flow
│   │   └── dashboard/      # Content feed & podcast
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Base UI components
│   │   └── signup-modal.tsx
│   └── lib/               # Utilities
├── public/                # Static assets
└── README.md
```

## 🎯 Key Features for Hackathon

### ✅ Completed
- [x] Stunning landing page with clear value prop
- [x] Email signup with Google Sheets integration ready
- [x] Voice agent simulation with realistic conversation
- [x] Progress animation for content preparation  
- [x] Multiple content format showcase
- [x] Full-featured podcast player
- [x] Interactive transcript functionality
- [x] Mobile-responsive design
- [x] PWA manifest for mobile installation

### 🚧 Ready for Integration
- [ ] Google Sheets API integration
- [ ] OpenAI API for real voice processing
- [ ] ElevenLabs for voice synthesis
- [ ] Real content curation pipeline
- [ ] User authentication system

## 🎪 Hackathon Demo Script

1. **Landing Page** (30 seconds)
   - Show beautiful hero section
   - Highlight value proposition
   - Demonstrate responsive design

2. **Signup Flow** (45 seconds)
   - Click "Get Your First Report FREE"
   - Enter email (saves to local storage)
   - Smooth transition to onboarding

3. **Voice Onboarding** (90 seconds)
   - Show animated voice agent
   - Click through conversation flow
   - Demonstrate realistic AI interaction
   - Show progress indicators

4. **Feed Preparation** (30 seconds)
   - Watch progress bar animation
   - Show content formats loading
   - Highlight podcast as ready format

5. **Podcast Experience** (2 minutes)
   - Open podcast player
   - Show personalized content
   - Demonstrate 1.5x speed
   - Toggle transcript view
   - Show interactive features

## 🌟 Future Roadmap

### Phase 1: MVP (Post-Hackathon)
- Real AI voice processing integration
- Google Sheets backend connection
- Basic content curation pipeline
- User preference storage

### Phase 2: Enhanced Features
- Multiple host personality options
- Advanced content filtering
- Social sharing capabilities
- Analytics dashboard

### Phase 3: Scale
- Multi-language support
- Enterprise features
- API for third-party integrations
- Advanced personalization algorithms

## 🤝 Team Integration Points

### For Backend Team
- Google Sheets API integration in `src/components/signup-modal.tsx`
- User data model in localStorage (ready for database migration)
- Content API endpoints needed for dashboard

### For AI Team  
- Voice processing integration in onboarding page
- Content curation pipeline for feed generation
- Podcast script generation based on user preferences

### For DevOps Team
- Environment variables setup
- Production deployment configuration
- API endpoint configuration

## 📱 Mobile Demo

The app is fully PWA-ready and can be installed on mobile devices:

1. Open in mobile browser
2. Add to home screen
3. Launch as native app experience

## 🎉 Hackathon Impact

Zero Noise addresses the modern problem of **information overload**. By combining:
- ✨ **AI-powered personalization**
- 🎯 **Format flexibility** 
- 🚀 **Friction-free experience**
- 📱 **Mobile-first design**

We're creating the future of content consumption - personalized, efficient, and delightful.

---

Built with ❤️ for the hackathon by the Zero Noise team!
