The Problem
Every year in India:

2.5 million+ engineering students graduate and enter the job market
70% fail their first technical interview — not because they lack knowledge, but because they never practiced speaking answers out loud
Mock interview services cost ₹2,000–₹10,000 per session — unaffordable for most students
Existing platforms like LeetCode only test coding — not communication, confidence, or real interview behaviour
No platform exists that combines voice-based AI interviewing, coding practice, weakness tracking, and honest feedback — built specifically for Indian students


Most students have never sat in front of a real interviewer before their actual interview. That is the real problem.


The Solution — MockMate
MockMate is an AI-powered interview practice platform that gives every student access to a real interview experience — completely free.

An AI avatar named Priya or Arjun conducts a live voice interview
Asks real technical and HR questions from a curated question bank
Adapts difficulty based on your answers like a real interviewer
Opens a LeetCode-style code editor when coding questions appear
Gives honest, detailed feedback after every answer
Generates a full coaching report — not just scores, but exactly what you said wrong and how to say it better
Real Interview Mode simulates a strict company interview with camera proctoring and a hiring recommendation


Live Demo

mockmate.vercel.app

1. Sign up with Google or Email
2. Select track: Python / DSA / HR Round / System Design / and 6 more
3. Choose Practice Mode or Real Interview Mode
4. AI avatar Priya appears and conducts a live voice interview
5. Coding questions open a full Monaco code editor
6. Get detailed feedback report with Interview Coaching section

Features
AI Voice Interviewer

Natural human-like voice using ElevenLabs API
Avatar animates when speaking — pulsing ring, breathing, nodding
Listens to your voice answers using Web Speech API
Reacts naturally to silence — "Take your time" or "Should I repeat the question?"
Asks follow-up questions when answers are incomplete
Adapts from beginner to advanced questions based on performance

Two Interview Modes
FeaturePractice ModeReal Interview ModeHintsAvailableNot availablePauseAllowedNot allowedCameraOptionalMandatoryTimer per questionRelaxedStrict (3 min theory, 25 min coding)Priya toneWarm and encouragingFormal and strictReport typeStandard feedbackPremium certificateHiring recommendationNoYes
LeetCode Style Code Editor

Monaco Editor — same editor used in VS Code
Language selector: Python, JavaScript, Java, C++, C, Go
Starter code templates auto-load per language
Test cases panel with Input and Expected Output
Run Code button with output console
Problem statement with constraints, examples, time and space complexity

Interview Tracks
TrackTypePython DeveloperTechnical + CodingDSACoding heavy LeetCode styleJavaScript DeveloperTechnical + CodingHR RoundBehavioural + SituationalSystem DesignArchitecture + TheoryData AnalystSQL + Statistics + Case StudyJava DeveloperTechnical + CodingAI/ML EngineerTheory + Python CodingFrontend DeveloperHTML CSS JS + ReactBackend DeveloperAPI + Database + System
Camera Proctoring (Real Interview Mode)

Looking away detection
Tab switch detection
Phone or object detection
Three strike warning system
Integrity Score shown in final report
Clean report note if no issues detected

Interview Coaching Report
For every weak or wrong answer the report shows:

What you said (summary)
Why it was weak or wrong
The correct way to answer with a real example
Special rule: If you said I don't know — "Never say I don't know. Say: I haven't worked on this directly but my approach would be..."
For coding: better solution with time and space complexity explanation

Premium Score Report (Real Interview Mode)

Overall grade: A / B / C / D / F
Detailed scorecard: Technical, Communication, Problem Solving, Code Quality, Confidence, Integrity
Hiring Recommendation: Strong Hire / Hire / Borderline / No Hire
Shareable result card for LinkedIn, WhatsApp, Twitter
PDF download

Progress Tracking

Score improvement over time (line chart)
Weakness heatmap by topic
AI personalised study suggestions
Leaderboard: top performers per track this week


Tech Stack
LayerTechnologyFrontendReact + Tailwind CSS + Framer MotionBackendFastAPI (Python)DatabaseMongoDBAI BrainClaude Sonnet (Anthropic)Voice OutputElevenLabs API + Web Speech API fallbackVoice InputWeb Speech APICode EditorMonaco EditorChartsRechartsAuthGoogle OAuth + Email Password JWTDeployVercel + GitHub

Getting Started
Prerequisites

Node.js 18+
Python 3.10+
MongoDB Atlas free tier
ElevenLabs API key — free at elevenlabs.io (10,000 characters/month free)

Installation
bash# Clone the repository
git clone https://github.com/yourusername/mockmate.git
cd mockmate

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt
Environment Variables
Create .env in the backend folder:
envMONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLAUDE_API_KEY=your_claude_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
Run Locally
bash# Terminal 1 — Start backend
cd backend
uvicorn main:app --reload

# Terminal 2 — Start frontend
cd frontend
npm run dev
Open http://localhost:5173 in Chrome (recommended for Web Speech API)
Seed Question Bank
bashcd backend
python seed/questions.py

Deploy Free on Vercel
bashgit init
git add .
git commit -m "Initial commit — MockMate"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/mockmate.git
git push -u origin main
Then go to vercel.com, import the repo, add environment variables, and deploy. Live in 2 minutes.

Project Structure
mockmate/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── InterviewRoom.jsx
│   │   │   ├── Report.jsx
│   │   │   ├── Progress.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── Avatar.jsx
│   │   │   ├── CodeEditor.jsx
│   │   │   ├── VoiceInput.jsx
│   │   │   ├── VoiceOutput.jsx
│   │   │   ├── ProctorCamera.jsx
│   │   │   └── ScoreCard.jsx
│   │   └── App.jsx
├── backend/
│   ├── main.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── interview.py
│   │   ├── ai.py
│   │   └── reports.py
│   ├── models/
│   │   ├── user.py
│   │   ├── session.py
│   │   └── question.py
│   └── seed/
│       └── questions.py
└── README.md

Roadmap
Phase 1 — Current MVP

 AI voice interviewer with animated avatar
 LeetCode style coding editor with test cases
 Real question bank (50+ per track, 10 tracks)
 Practice Mode and Real Interview Mode
 Camera proctoring with integrity score
 Interview coaching in detailed reports
 Shareable result card and PDF download
 Progress tracking and weakness heatmap

Phase 2 — Coming Soon

 Mobile app (React Native)
 Resume analyser
 Company specific prep (Google, Amazon, Flipkart, Razorpay)
 Peer mock interviews
 Hindi and regional language support
 College placement dashboard


Why MockMate Wins
PlatformFreeVoiceCodingIndian ContextAdaptive AICoachingPrampYesNoYesNoNoNoInterviewing.ioNoNoYesNoNoNoLeetCodeNoNoYesNoNoNoUnstopYesNoNoPartialNoNoMockMateYesYesYesYesYesYes

Built For
VibeCon India — 40-hour national hackathon in New Delhi
Prize pool: ₹25 lakhs | 300 builders | Mentored by top Indian founders

License
MIT License — free to use, modify, and distribute.

Contact

Live App: mockmate.vercel.app
GitHub: github.com/yourusername/mockmate
Built by: [Your Name]

If MockMate helped you crack your interview, give it a star on GitHub!
Show Image


MockMate — Pitch Deck
Use this section when pitching to judges, investors, or accelerators like Y Combinator

One Liner

MockMate is an AI interview coach that gives every Indian student access to unlimited real interview practice — with voice, coding, and honest feedback — completely free.


The Problem — It Is Massive
India produces 2.5 million engineering graduates every year.
Most of them have never practiced a real interview before their actual one.

Coaching centres charge ₹2,000 to ₹10,000 per mock interview session
Existing platforms only test coding — not communication or confidence
Students from Tier 2 and Tier 3 colleges have zero access to mentors
Interview anxiety is the number one reason talented students get rejected

This is not a small problem. This affects every single student in India.

The Solution
MockMate gives every student a personal AI interview coach available 24 hours a day, 7 days a week, completely free.
Three things that make it different:
1. It sounds like a real interview
AI avatar Priya conducts a live voice conversation — not a chatbot quiz. She asks follow-up questions, reacts to silence, adapts difficulty, and gives constructive feedback exactly like a senior interviewer at Flipkart or Razorpay.
2. It covers everything
Theory questions by voice. Coding questions in a real LeetCode-style editor. HR rounds. System design. 10 tracks. 500+ questions.
3. It tells you exactly what you did wrong
Not just a score. The Interview Coaching section shows: what you said, why it was wrong, how to say it correctly. This is what a real mentor does. MockMate does it for free, instantly, after every session.

Market Size
MarketSizeEngineering graduates in India per year2.5 millionStudents actively preparing for placements8 million+Online education market in India 2025$10 billion+Interview prep market globally$3 billion+Target users Year 1100,000 students

Business Model
Free tier — always free:

3 practice sessions per month
All 10 tracks
Standard feedback report

Pro plan — ₹199 per month:

Unlimited sessions
Real Interview Mode
Premium coaching report
PDF download and shareable card
Company specific question sets

College plan — ₹50,000 per year per college:

Unlimited students
Placement team dashboard
Analytics on student performance
Branded certificate with college name
Custom question sets per company visiting campus

Revenue at 1% conversion of 100,000 users = 1,000 Pro users = ₹2 lakhs per month

Competitive Advantage
What we haveWhy it mattersVoice-first interview experienceNo competitor has this for Indian marketInterview Coaching not just scoresStudents learn, not just measureReal Interview Mode with hiring recommendationFeels like a real company interviewIndian context — Hinglish, Indian companiesBuilt for Bharat, not Silicon ValleyFree forever tierRemoves barrier for Tier 2 and 3 studentsBuilt with AI — low cost to scaleMarginal cost per user is near zero

90 Day Traction Goal
MilestoneTargetLaunch on Product HuntTop 5 of the dayCollege partnerships10 engineering collegesMonthly active users10,000 studentsPro conversions200 paying usersMonthly revenue₹40,000Press coverageYourStory, Inc42, The Ken

The Vision

Every student in India — regardless of college, city, or financial background — deserves access to world-class interview preparation.

MockMate is not just an app. It is the equaliser that gives a student from a Tier 3 college in Odisha the same interview preparation as a student from IIT Delhi.
The platforms that currently exist were built for Silicon Valley engineers.
MockMate is built for India.
For the student who practices at 2am before a 9am interview.
For the student who cannot afford a coaching centre.
For the student who knows the answer but freezes when someone is watching.
MockMate gives them Priya. And Priya never judges.
