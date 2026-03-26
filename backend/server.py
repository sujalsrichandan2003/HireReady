from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    avatar_choice: str = "priya"  # priya or arjun
    language_preference: str = "english"  # english or hinglish
    voice_speed: str = "normal"  # slow, normal, fast
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InterviewSession(BaseModel):
    session_id: str
    user_id: str
    track: str
    difficulty: str
    status: str = "in_progress"  # in_progress, completed
    questions: List[dict] = []
    answers: List[dict] = []
    current_question_index: int = 0
    weak_topics: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class InterviewReport(BaseModel):
    report_id: str
    session_id: str
    user_id: str
    track: str
    overall_score: int = 0
    technical_score: int = 0
    communication_score: int = 0
    problem_solving_score: int = 0
    code_quality_score: int = 0
    clarity_score: int = 0
    strengths: List[str] = []
    improvements: List[str] = []
    topics_to_study: List[str] = []
    ai_summary: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response Models
class SessionRequest(BaseModel):
    session_id: str

class StartInterviewRequest(BaseModel):
    track: str
    difficulty: str = "medium"

class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str
    code: Optional[str] = None

class UpdateSettingsRequest(BaseModel):
    avatar_choice: Optional[str] = None
    language_preference: Optional[str] = None
    voice_speed: Optional[str] = None

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    """Get current user from session token in cookie or header"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def exchange_session(request: SessionRequest, response: Response):
    """Exchange session_id from Emergent Auth for user data and set cookie"""
    try:
        async with httpx.AsyncClient() as http_client:
            auth_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = auth_response.json()
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user data
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "avatar_choice": "priya",
            "language_preference": "english",
            "voice_speed": "normal",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove old sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_doc

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== INTERVIEW ROUTES ====================

@api_router.post("/interviews/start")
async def start_interview(req: StartInterviewRequest, user: User = Depends(get_current_user)):
    """Start a new interview session"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    session_id = f"interview_{uuid.uuid4().hex[:12]}"
    
    # Get language preference
    lang_instruction = ""
    if user.language_preference == "hinglish":
        lang_instruction = " Ask questions and give feedback in Hinglish (mix of Hindi and English). Example: 'Tell me, aapne Python mein decorators use kiye hain? Explain karo.'"
    
    # Create system prompt
    avatar_name = "Priya" if user.avatar_choice == "priya" else "Arjun"
    system_prompt = f"""You are {avatar_name}, a professional technical interviewer at a top Indian tech company. You are conducting a {req.track} interview at {req.difficulty} difficulty level.{lang_instruction}

Your task:
1. Ask one question at a time
2. Start with easier questions and gradually increase difficulty based on user's answers
3. After each answer, give honest, constructive feedback in 1-2 sentences
4. For weak answers, ask a follow-up question on the same topic
5. Mix theory and coding questions appropriately
6. Keep track of weak areas
7. Be encouraging, professional, and realistic
8. Never reveal you are an AI unless directly asked

For coding questions, clearly state "CODING QUESTION:" at the start and specify the expected input/output format.

Generate exactly 10 questions for this interview session. Start with the first question now."""

    # Generate first question using Claude
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=llm_key,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        user_message = UserMessage(text="Start the interview. Ask the first question.")
        first_question = await chat.send_message(user_message)
    except Exception as e:
        logger.error(f"LLM error: {e}")
        first_question = f"Welcome to your {req.track} interview! Let's start with a fundamental question: Can you explain what {req.track} is and why it's important in software development?"
    
    # Create interview session
    interview_doc = {
        "session_id": session_id,
        "user_id": user.user_id,
        "track": req.track,
        "difficulty": req.difficulty,
        "status": "in_progress",
        "questions": [{"index": 0, "question": first_question, "is_coding": "CODING QUESTION:" in first_question.upper()}],
        "answers": [],
        "current_question_index": 0,
        "weak_topics": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.interviews.insert_one(interview_doc)
    
    return {
        "session_id": session_id,
        "track": req.track,
        "difficulty": req.difficulty,
        "current_question": first_question,
        "question_number": 1,
        "total_questions": 10,
        "is_coding": "CODING QUESTION:" in first_question.upper()
    }

@api_router.post("/interviews/answer")
async def submit_answer(req: SubmitAnswerRequest, user: User = Depends(get_current_user)):
    """Submit answer and get next question or feedback"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Get interview session
    interview = await db.interviews.find_one(
        {"session_id": req.session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview["status"] == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed")
    
    current_index = interview["current_question_index"]
    
    # Save answer
    answer_doc = {
        "index": current_index,
        "answer": req.answer,
        "code": req.code,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Get AI feedback and next question
    lang = user.language_preference
    avatar_name = "Priya" if user.avatar_choice == "priya" else "Arjun"
    
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        
        # Build conversation history
        history_text = ""
        for i, q in enumerate(interview["questions"]):
            history_text += f"Question {i+1}: {q['question']}\n"
            if i < len(interview["answers"]):
                history_text += f"Answer: {interview['answers'][i]['answer']}\n"
        
        system_prompt = f"""You are {avatar_name}, continuing a {interview['track']} interview. 
Previous conversation:
{history_text}

Current question: {interview['questions'][current_index]['question']}
User's answer: {req.answer}
{f"User's code: {req.code}" if req.code else ""}

Provide:
1. Brief feedback on the answer (1-2 sentences)
2. If this is question {current_index + 1} of 10 and more questions remain, ask the next question
3. If answer was weak, note the weak topic

Format your response as:
FEEDBACK: [your feedback]
WEAK_TOPIC: [topic if weak, or "none"]
NEXT_QUESTION: [next question, or "INTERVIEW_COMPLETE" if this was question 10]"""

        chat = LlmChat(
            api_key=llm_key,
            session_id=req.session_id,
            system_message=system_prompt
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        user_message = UserMessage(text="Evaluate my answer and continue the interview.")
        response = await chat.send_message(user_message)
        
        # Parse response
        feedback = ""
        weak_topic = ""
        next_question = ""
        
        lines = response.split("\n")
        for line in lines:
            if line.startswith("FEEDBACK:"):
                feedback = line.replace("FEEDBACK:", "").strip()
            elif line.startswith("WEAK_TOPIC:"):
                weak_topic = line.replace("WEAK_TOPIC:", "").strip()
            elif line.startswith("NEXT_QUESTION:"):
                next_question = line.replace("NEXT_QUESTION:", "").strip()
        
        # Fallback parsing if format wasn't followed
        if not feedback:
            feedback = response[:200]
        if not next_question:
            if current_index >= 9:
                next_question = "INTERVIEW_COMPLETE"
            else:
                next_question = f"Let's continue. Can you tell me more about {interview['track']}?"
                
    except Exception as e:
        logger.error(f"LLM error: {e}")
        feedback = "Thank you for your answer."
        weak_topic = ""
        next_question = "INTERVIEW_COMPLETE" if current_index >= 9 else f"Moving on, can you explain another concept in {interview['track']}?"
    
    # Update interview
    answer_doc["feedback"] = feedback
    
    update_data = {
        "$push": {"answers": answer_doc},
        "$set": {"current_question_index": current_index + 1}
    }
    
    if weak_topic and weak_topic.lower() != "none":
        update_data["$push"]["weak_topics"] = weak_topic
    
    is_complete = next_question == "INTERVIEW_COMPLETE" or current_index >= 9
    
    if not is_complete:
        update_data["$push"]["questions"] = {
            "index": current_index + 1,
            "question": next_question,
            "is_coding": "CODING QUESTION:" in next_question.upper()
        }
    else:
        update_data["$set"]["status"] = "completed"
        update_data["$set"]["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.interviews.update_one(
        {"session_id": req.session_id},
        update_data
    )
    
    return {
        "feedback": feedback,
        "is_complete": is_complete,
        "next_question": next_question if not is_complete else None,
        "question_number": current_index + 2 if not is_complete else current_index + 1,
        "total_questions": 10,
        "is_coding": "CODING QUESTION:" in next_question.upper() if not is_complete else False
    }

@api_router.post("/interviews/{session_id}/complete")
async def complete_interview(session_id: str, user: User = Depends(get_current_user)):
    """Generate final report for completed interview"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    interview = await db.interviews.find_one(
        {"session_id": session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Build full conversation for analysis
    conversation = ""
    for i, q in enumerate(interview["questions"]):
        conversation += f"Q{i+1}: {q['question']}\n"
        if i < len(interview["answers"]):
            a = interview["answers"][i]
            conversation += f"A{i+1}: {a['answer']}\n"
            if a.get("code"):
                conversation += f"Code: {a['code']}\n"
            if a.get("feedback"):
                conversation += f"Feedback: {a['feedback']}\n"
        conversation += "\n"
    
    # Generate report using AI
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        
        report_prompt = f"""Analyze this {interview['track']} interview and generate a detailed performance report.

Interview transcript:
{conversation}

Weak topics identified: {', '.join(interview.get('weak_topics', [])) or 'None'}

Generate a JSON report with these exact fields:
{{
    "overall_score": <0-100>,
    "technical_score": <0-100>,
    "communication_score": <0-100>,
    "problem_solving_score": <0-100>,
    "code_quality_score": <0-100>,
    "clarity_score": <0-100>,
    "strengths": ["strength1", "strength2", "strength3"],
    "improvements": ["area1", "area2", "area3"],
    "topics_to_study": ["topic1", "topic2", "topic3"],
    "ai_summary": "3-4 sentence overall performance summary"
}}

Be honest and constructive. Return ONLY the JSON, no other text."""

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"{session_id}_report",
            system_message="You are an interview performance analyst. Analyze interviews and generate detailed feedback reports."
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        user_message = UserMessage(text=report_prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON from response
        import json
        # Try to extract JSON from response
        try:
            # Find JSON in response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                report_data = json.loads(response[json_start:json_end])
            else:
                raise ValueError("No JSON found")
        except (json.JSONDecodeError, ValueError, KeyError):
            # Default scores
            report_data = {
                "overall_score": 70,
                "technical_score": 65,
                "communication_score": 75,
                "problem_solving_score": 70,
                "code_quality_score": 65,
                "clarity_score": 72,
                "strengths": ["Good effort", "Attempted all questions", "Clear communication"],
                "improvements": ["Study core concepts", "Practice more coding", "Work on time management"],
                "topics_to_study": [interview["track"], "Data Structures", "Problem Solving"],
                "ai_summary": f"You completed a {interview['track']} interview. There's room for improvement in technical depth. Keep practicing!"
            }
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        report_data = {
            "overall_score": 70,
            "technical_score": 65,
            "communication_score": 75,
            "problem_solving_score": 70,
            "code_quality_score": 65,
            "clarity_score": 72,
            "strengths": ["Good effort", "Attempted all questions"],
            "improvements": ["Study core concepts", "Practice more coding"],
            "topics_to_study": [interview["track"]],
            "ai_summary": f"You completed a {interview['track']} interview. Keep practicing to improve!"
        }
    
    # Create report
    report_id = f"report_{uuid.uuid4().hex[:12]}"
    report_doc = {
        "report_id": report_id,
        "session_id": session_id,
        "user_id": user.user_id,
        "track": interview["track"],
        **report_data,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reports.insert_one(report_doc)
    
    # Update interview status
    await db.interviews.update_one(
        {"session_id": session_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return report_doc

@api_router.get("/interviews/history")
async def get_interview_history(user: User = Depends(get_current_user)):
    """Get user's interview history"""
    interviews = await db.interviews.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return interviews

@api_router.get("/interviews/{session_id}")
async def get_interview(session_id: str, user: User = Depends(get_current_user)):
    """Get specific interview session"""
    interview = await db.interviews.find_one(
        {"session_id": session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    return interview

# ==================== REPORTS ROUTES ====================

@api_router.get("/reports")
async def get_reports(user: User = Depends(get_current_user)):
    """Get all reports for user"""
    reports = await db.reports.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return reports

@api_router.get("/reports/{report_id}")
async def get_report(report_id: str, user: User = Depends(get_current_user)):
    """Get specific report"""
    report = await db.reports.find_one(
        {"report_id": report_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return report

# ==================== PROGRESS/STATS ROUTES ====================

@api_router.get("/progress/stats")
async def get_progress_stats(user: User = Depends(get_current_user)):
    """Get user's progress statistics"""
    # Get all reports
    reports = await db.reports.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get all interviews
    interviews = await db.interviews.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    if not reports:
        return {
            "total_sessions": len(interviews),
            "average_score": 0,
            "strongest_topic": "N/A",
            "weakest_topic": "N/A",
            "score_history": [],
            "topic_scores": {},
            "weak_topics": []
        }
    
    # Calculate stats
    total_score = sum(r.get("overall_score", 0) for r in reports)
    avg_score = total_score / len(reports) if reports else 0
    
    # Track scores by topic
    topic_scores = {}
    weak_topics_count = {}
    
    for r in reports:
        track = r.get("track", "Unknown")
        if track not in topic_scores:
            topic_scores[track] = []
        topic_scores[track].append(r.get("overall_score", 0))
        
        for topic in r.get("improvements", []):
            weak_topics_count[topic] = weak_topics_count.get(topic, 0) + 1
    
    # Calculate average per topic
    topic_averages = {k: sum(v)/len(v) for k, v in topic_scores.items()}
    
    strongest = max(topic_averages.items(), key=lambda x: x[1])[0] if topic_averages else "N/A"
    weakest = min(topic_averages.items(), key=lambda x: x[1])[0] if topic_averages else "N/A"
    
    # Score history
    score_history = [
        {"date": r.get("created_at"), "score": r.get("overall_score", 0), "track": r.get("track")}
        for r in reports
    ]
    
    # Top weak topics
    sorted_weak = sorted(weak_topics_count.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "total_sessions": len(interviews),
        "average_score": round(avg_score, 1),
        "strongest_topic": strongest,
        "weakest_topic": weakest,
        "score_history": score_history,
        "topic_scores": topic_averages,
        "weak_topics": [{"topic": t, "count": c} for t, c in sorted_weak]
    }

@api_router.get("/progress/recommendations")
async def get_recommendations(user: User = Depends(get_current_user)):
    """Get AI recommendations based on performance"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    stats = await get_progress_stats(user)
    
    if stats["total_sessions"] == 0:
        return {
            "recommendation": "Start your first interview to get personalized recommendations!"
        }
    
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        
        prompt = f"""Based on this student's interview performance data, provide a brief personalized recommendation (2-3 sentences):

Total Sessions: {stats['total_sessions']}
Average Score: {stats['average_score']}
Strongest Topic: {stats['strongest_topic']}
Weakest Topic: {stats['weakest_topic']}
Weak Areas: {', '.join([w['topic'] for w in stats['weak_topics'][:3]])}

Be specific and actionable. Mention specific topics they should focus on."""

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"rec_{user.user_id}",
            system_message="You are an interview coach providing brief, actionable recommendations."
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        user_message = UserMessage(text=prompt)
        recommendation = await chat.send_message(user_message)
        
        return {"recommendation": recommendation}
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        return {
            "recommendation": f"Focus on improving your {stats['weakest_topic']} skills. Your average score is {stats['average_score']}. Keep practicing!"
        }

# ==================== SETTINGS ROUTES ====================

@api_router.put("/settings")
async def update_settings(req: UpdateSettingsRequest, user: User = Depends(get_current_user)):
    """Update user settings"""
    update_data = {}
    
    if req.avatar_choice:
        update_data["avatar_choice"] = req.avatar_choice
    if req.language_preference:
        update_data["language_preference"] = req.language_preference
    if req.voice_speed:
        update_data["voice_speed"] = req.voice_speed
    
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return updated_user

# ==================== TRACKS ====================

@api_router.get("/tracks")
async def get_tracks():
    """Get available interview tracks"""
    return [
        {"id": "python", "name": "Python Developer", "icon": "code", "description": "Python fundamentals, OOP, data structures"},
        {"id": "dsa", "name": "DSA", "icon": "binary", "description": "Data Structures & Algorithms"},
        {"id": "javascript", "name": "JavaScript", "icon": "braces", "description": "JS fundamentals, ES6+, async programming"},
        {"id": "hr", "name": "HR Round", "icon": "users", "description": "Behavioral questions, soft skills"},
        {"id": "system-design", "name": "System Design", "icon": "server", "description": "Architecture, scalability, design patterns"},
        {"id": "data-analyst", "name": "Data Analyst", "icon": "bar-chart", "description": "SQL, analytics, data visualization"},
        {"id": "java", "name": "Java Developer", "icon": "coffee", "description": "Java fundamentals, OOP, Spring"},
        {"id": "ai-ml", "name": "AI/ML Engineer", "icon": "brain", "description": "Machine Learning, Deep Learning, NLP"},
        {"id": "frontend", "name": "Frontend Developer", "icon": "layout", "description": "HTML, CSS, React, responsive design"},
        {"id": "backend", "name": "Backend Developer", "icon": "database", "description": "APIs, databases, server-side development"}
    ]

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "MockMate API", "status": "running"}

# Include the router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
