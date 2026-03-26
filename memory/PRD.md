# MockMate - AI Interview Practice Platform

## Product Requirements Document (PRD)

### Original Problem Statement
Build MockMate — AI Interview Practice Platform for Indian Students. A production-ready web app where users practice real job interviews with an AI interviewer that behaves like a human. Users select a role, AI conducts live voice-based interview conversation, coding questions appear when needed, and detailed feedback report is generated at the end.

### User Personas
1. **Job-seeking Indian Students** - Computer science/IT students preparing for placements
2. **Working Professionals** - Looking to switch jobs or prepare for promotions
3. **Career Changers** - Transitioning into tech roles

### Core Requirements (Static)
- Voice-based interview simulation with AI
- Multiple interview tracks (Python, DSA, JavaScript, HR, System Design, etc.)
- Code editor for coding questions
- Real-time AI feedback
- Comprehensive performance reports
- Progress tracking over time
- Hinglish language support

### Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Claude Sonnet via Emergent Integrations
- **Auth**: Emergent-managed Google OAuth
- **Voice**: Web Speech API (browser-native)
- **Code Editor**: Monaco Editor

### What's Been Implemented
**Date: March 27, 2025**

1. **Landing Page** ✅
   - Hero section with animated CTA
   - Problem/Solution sections
   - How it works (3 steps)
   - Interview tracks grid (10 tracks)
   - Features section (6 features)
   - Testimonials (3 mock reviews)
   - Pricing (Free/Pro plans - placeholder)
   - Footer

2. **Authentication** ✅
   - Emergent-managed Google OAuth
   - Session management with cookies
   - Protected routes

3. **Dashboard** ✅
   - Track selection grid
   - Difficulty selector (Easy/Medium/Hard)
   - Start interview button
   - Stats cards (Total Sessions, Avg Score, Strongest/Weakest Topics)
   - AI recommendation box
   - Past interviews table
   - Performance radar chart

4. **Interview Room** ✅
   - AI avatar with speaking animation
   - Real-time transcript
   - Question progress bar
   - Timer
   - Voice toggle (TTS)
   - Microphone button (STT)
   - Text answer mode
   - Code editor mode (Monaco)
   - Language selector (Python, JS, Java, C++)
   - Run code simulation

5. **Report Page** ✅
   - Overall score display
   - 5 score categories (Technical, Communication, Problem Solving, Code Quality, Clarity)
   - Bar chart (score breakdown)
   - Radar chart (skill coverage)
   - Strengths list
   - Areas to improve
   - Topics to study
   - AI summary

6. **Progress Page** ✅
   - Stats overview
   - AI insight
   - Score improvement line chart
   - Weakness bar chart
   - All sessions table

7. **Settings Page** ✅
   - Profile display
   - Avatar selection (Priya/Arjun)
   - Language preference (English/Hinglish)
   - Voice speed (Slow/Normal/Fast)
   - Logout
   - Delete account (placeholder)

### API Endpoints Implemented
- `POST /api/auth/session` - Exchange OAuth session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `GET /api/tracks` - Get interview tracks
- `POST /api/interviews/start` - Start new interview
- `POST /api/interviews/answer` - Submit answer
- `POST /api/interviews/{id}/complete` - Generate report
- `GET /api/interviews/history` - Get user's interviews
- `GET /api/interviews/{id}` - Get specific interview
- `GET /api/reports` - Get all reports
- `GET /api/reports/{id}` - Get specific report
- `GET /api/progress/stats` - Get progress stats
- `GET /api/progress/recommendations` - Get AI recommendations
- `PUT /api/settings` - Update user settings

### Prioritized Backlog

**P0 (Critical - Next Iteration)**
- None currently blocking

**P1 (High Priority)**
- Email notifications for completed interviews
- Interview session resume functionality
- Export reports as PDF
- Social sharing of achievements

**P2 (Medium Priority)**
- Company-specific interview tracks (Google, Amazon, etc.)
- Mock video interviews
- Peer interview mode
- Interview scheduling
- Mobile app (React Native)

**P3 (Future)**
- AI-powered resume review
- LinkedIn integration
- Job board integration
- Community features
- Premium subscription handling (Stripe)

### Next Tasks
1. Test the full interview flow with real Claude AI responses
2. Add email notification integration
3. Implement PDF export for reports
4. Add more interview tracks
5. Improve code execution (currently simulated)
