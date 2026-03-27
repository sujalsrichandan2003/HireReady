from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import base64
import json
import io

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
    avatar_choice: str = "priya"
    language_preference: str = "english"
    voice_speed: str = "normal"
    elevenlabs_api_key: Optional[str] = None
    auth_type: str = "google"  # google or email
    password_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Question(BaseModel):
    question_id: str
    track: str
    topic: str
    title: str
    description: str
    difficulty: str  # easy, medium, hard
    question_type: str  # theory, coding
    examples: Optional[List[dict]] = []
    constraints: Optional[List[str]] = []
    hints: Optional[List[str]] = []
    starter_code: Optional[dict] = {}  # {python: "...", javascript: "...", java: "...", cpp: "..."}
    expected_time_complexity: Optional[str] = None
    expected_space_complexity: Optional[str] = None
    tags: Optional[List[str]] = []

class InterviewSession(BaseModel):
    session_id: str
    user_id: str
    track: str
    difficulty: str
    mode: str = "practice"  # practice or real
    status: str = "in_progress"
    questions: List[dict] = []
    answers: List[dict] = []
    current_question_index: int = 0
    weak_topics: List[str] = []
    proctoring_events: List[dict] = []
    integrity_score: int = 100
    camera_enabled: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class InterviewReport(BaseModel):
    report_id: str
    session_id: str
    user_id: str
    track: str
    mode: str = "practice"
    overall_score: int = 0
    technical_score: int = 0
    communication_score: int = 0
    problem_solving_score: int = 0
    code_quality_score: int = 0
    clarity_score: int = 0
    confidence_score: int = 0
    integrity_score: int = 100
    grade: str = "C"  # A, B, C, D, F
    hiring_recommendation: str = "Borderline"
    strengths: List[str] = []
    improvements: List[str] = []
    topics_to_study: List[str] = []
    ai_summary: str = ""
    coaching_feedback: List[dict] = []  # Detailed coaching for each weak answer
    proctoring_notes: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response Models
class SessionRequest(BaseModel):
    session_id: str

class EmailSignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class EmailLoginRequest(BaseModel):
    email: EmailStr
    password: str

class StartInterviewRequest(BaseModel):
    track: str
    difficulty: str = "medium"
    mode: str = "practice"  # practice or real
    topics: Optional[List[str]] = None
    camera_enabled: bool = False

class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str
    code: Optional[str] = None
    time_taken: Optional[int] = None

class ProctoringEventRequest(BaseModel):
    session_id: str
    event_type: str  # look_away, tab_switch, phone_detected, long_silence
    timestamp: str

class UpdateSettingsRequest(BaseModel):
    avatar_choice: Optional[str] = None
    language_preference: Optional[str] = None
    voice_speed: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "21m00Tcm4TlvDq8ikWAM"  # Default female voice

class SilenceCheckRequest(BaseModel):
    session_id: str
    silence_duration: int  # seconds

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

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/signup")
async def email_signup(request: EmailSignupRequest, response: Response):
    """Email + password signup"""
    # Check if user exists
    existing = await db.users.find_one({"email": request.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(request.password)
    
    user_doc = {
        "user_id": user_id,
        "email": request.email,
        "name": request.name,
        "picture": None,
        "avatar_choice": "priya",
        "language_preference": "english",
        "voice_speed": "normal",
        "elevenlabs_api_key": None,
        "auth_type": "email",
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Remove password_hash from response
    user_doc.pop("password_hash", None)
    return user_doc

@api_router.post("/auth/login")
async def email_login(request: EmailLoginRequest, response: Response):
    """Email + password login"""
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user_doc.get("auth_type") != "email":
        raise HTTPException(status_code=400, detail="Please use Google login for this account")
    
    if not verify_password(request.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.delete_many({"user_id": user_doc["user_id"]})
    await db.user_sessions.insert_one({
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc.pop("password_hash", None)
    return user_doc

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
    
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "avatar_choice": "priya",
            "language_preference": "english",
            "voice_speed": "normal",
            "elevenlabs_api_key": None,
            "auth_type": "google",
            "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return user_doc

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    user_dict = user.model_dump()
    user_dict.pop("password_hash", None)
    return user_dict

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== TTS ROUTES (ElevenLabs) ====================

@api_router.post("/tts/generate")
async def generate_tts(req: TTSRequest, user: User = Depends(get_current_user)):
    """Generate TTS using ElevenLabs or fallback to Web Speech API"""
    elevenlabs_key = user.elevenlabs_api_key
    
    if not elevenlabs_key:
        # Return indicator to use Web Speech API
        return {"use_web_speech": True, "text": req.text}
    
    try:
        from elevenlabs import ElevenLabs
        from elevenlabs.types import VoiceSettings
        
        eleven_client = ElevenLabs(api_key=elevenlabs_key)
        
        # Use a natural Indian-English female voice
        voice_id = req.voice_id or "21m00Tcm4TlvDq8ikWAM"  # Rachel - natural female
        
        audio_generator = eleven_client.text_to_speech.convert(
            text=req.text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=0.5,
                similarity_boost=0.75,
                style=0.0,
                use_speaker_boost=True
            )
        )
        
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        audio_b64 = base64.b64encode(audio_data).decode()
        
        return {
            "use_web_speech": False,
            "audio_data": f"data:audio/mpeg;base64,{audio_b64}"
        }
    except Exception as e:
        logger.error(f"ElevenLabs error: {e}")
        return {"use_web_speech": True, "text": req.text, "error": str(e)}

# ==================== INTERVIEW ROUTES ====================

@api_router.post("/interviews/start")
async def start_interview(req: StartInterviewRequest, user: User = Depends(get_current_user)):
    """Start a new interview session"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    session_id = f"interview_{uuid.uuid4().hex[:12]}"
    
    # Get questions from the question bank
    query = {"track": req.track}
    if req.topics:
        query["topic"] = {"$in": req.topics}
    
    # Get questions based on difficulty distribution
    questions_cursor = db.questions.find(query, {"_id": 0})
    all_questions = await questions_cursor.to_list(500)
    
    if not all_questions:
        # Fallback: generate questions with AI
        all_questions = []
    
    # Select 10 questions with difficulty progression
    selected_questions = []
    easy_qs = [q for q in all_questions if q.get("difficulty") == "easy"]
    medium_qs = [q for q in all_questions if q.get("difficulty") == "medium"]
    hard_qs = [q for q in all_questions if q.get("difficulty") == "hard"]
    
    import random
    random.shuffle(easy_qs)
    random.shuffle(medium_qs)
    random.shuffle(hard_qs)
    
    # Distribution: 3 easy, 4 medium, 3 hard
    selected_questions.extend(easy_qs[:3])
    selected_questions.extend(medium_qs[:4])
    selected_questions.extend(hard_qs[:3])
    
    # Fill remaining with any available
    while len(selected_questions) < 10 and all_questions:
        q = all_questions.pop(0)
        if q not in selected_questions:
            selected_questions.append(q)
    
    # AI System prompt for human-like interviewer
    lang_instruction = ""
    if user.language_preference == "hinglish":
        lang_instruction = " Ask questions and give feedback in Hinglish (mix of Hindi and English). Example: 'Tell me, aapne Python mein decorators use kiye hain? Explain karo.'"
    
    avatar_name = "Priya" if user.avatar_choice == "priya" else "Arjun"
    
    system_prompt = f"""You are {avatar_name}, a senior technical interviewer at a top Indian product company like Flipkart or Razorpay. You have 8 years of experience interviewing candidates. You speak in a warm, professional, encouraging tone — not like a robot.{lang_instruction}

Your interview style:
- Use natural filler words occasionally like 'Great', 'Okay', 'Alright', 'Interesting'
- Ask follow-up questions when an answer is incomplete
- Never read out a list — you speak naturally
- Remember everything said earlier in the interview and reference it
- When candidate gives a wrong answer you do not say 'Wrong' — you say something like 'That is partially correct, can you think about what happens when...'
- You conduct a real interview, not a quiz
- Keep feedback to 1-2 sentences, then immediately ask the next question
- Be encouraging but honest

You are conducting a {req.track} interview at {req.difficulty} difficulty level.
{"This is REAL INTERVIEW MODE - be more formal and strict, no hints allowed." if req.mode == "real" else "This is practice mode - you can be slightly more helpful."}

For each response, provide:
1. Brief feedback on the previous answer (1-2 sentences)
2. Natural transition phrase
3. The next question

Keep the conversation flowing naturally without pauses."""

    # Get first question
    first_q = selected_questions[0] if selected_questions else None
    
    if first_q:
        first_question_text = f"{first_q.get('title', 'Question 1')}\n\n{first_q.get('description', 'Tell me about yourself.')}"
        is_coding = first_q.get("question_type") == "coding"
    else:
        # Generate with AI
        try:
            llm_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=llm_key,
                session_id=session_id,
                system_message=system_prompt
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            
            user_message = UserMessage(text="Start the interview. Greet the candidate warmly and ask your first question.")
            first_question_text = await chat.send_message(user_message)
            is_coding = False
        except Exception as e:
            logger.error(f"LLM error: {e}")
            first_question_text = f"Welcome! Let's start with a warm-up. Can you tell me about your experience with {req.track}?"
            is_coding = False
    
    # Prepare interview questions list
    interview_questions = []
    for i, q in enumerate(selected_questions[:10]):
        interview_questions.append({
            "index": i,
            "question_id": q.get("question_id", f"q_{i}"),
            "title": q.get("title", f"Question {i+1}"),
            "description": q.get("description", ""),
            "difficulty": q.get("difficulty", "medium"),
            "question_type": q.get("question_type", "theory"),
            "examples": q.get("examples", []),
            "constraints": q.get("constraints", []),
            "hints": q.get("hints", []),
            "starter_code": q.get("starter_code", {}),
            "expected_time_complexity": q.get("expected_time_complexity"),
            "expected_space_complexity": q.get("expected_space_complexity"),
            "topic": q.get("topic", req.track)
        })
    
    # Create interview session
    interview_doc = {
        "session_id": session_id,
        "user_id": user.user_id,
        "track": req.track,
        "difficulty": req.difficulty,
        "mode": req.mode,
        "status": "in_progress",
        "questions": interview_questions,
        "answers": [],
        "current_question_index": 0,
        "weak_topics": [],
        "proctoring_events": [],
        "integrity_score": 100,
        "camera_enabled": req.camera_enabled,
        "system_prompt": system_prompt,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.interviews.insert_one(interview_doc)
    
    # Prepare response
    current_q = interview_questions[0] if interview_questions else {
        "title": "Introduction",
        "description": first_question_text,
        "question_type": "theory",
        "difficulty": "easy"
    }
    
    return {
        "session_id": session_id,
        "track": req.track,
        "difficulty": req.difficulty,
        "mode": req.mode,
        "current_question": current_q,
        "greeting": f"Hello! I'm {avatar_name}, and I'll be conducting your {req.track} interview today. Let's begin!",
        "question_number": 1,
        "total_questions": len(interview_questions) or 10,
        "is_coding": current_q.get("question_type") == "coding"
    }

@api_router.post("/interviews/answer")
async def submit_answer(req: SubmitAnswerRequest, user: User = Depends(get_current_user)):
    """Submit answer and get AI feedback + next question immediately"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    interview = await db.interviews.find_one(
        {"session_id": req.session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview["status"] == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed")
    
    current_index = interview["current_question_index"]
    questions = interview.get("questions", [])
    current_q = questions[current_index] if current_index < len(questions) else {}
    
    # Save answer
    answer_doc = {
        "index": current_index,
        "question_id": current_q.get("question_id", f"q_{current_index}"),
        "answer": req.answer,
        "code": req.code,
        "time_taken": req.time_taken,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Get AI feedback and next question
    avatar_name = "Priya" if user.avatar_choice == "priya" else "Arjun"
    
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        
        # Build conversation context
        prev_answers = interview.get("answers", [])
        context = f"Interview Track: {interview['track']}\n"
        context += f"Current Question ({current_index + 1}/10): {current_q.get('title', '')}\n"
        context += f"Question: {current_q.get('description', '')}\n"
        context += f"Candidate's Answer: {req.answer}\n"
        if req.code:
            context += f"Candidate's Code:\n```\n{req.code}\n```\n"
        
        next_q = questions[current_index + 1] if current_index + 1 < len(questions) else None
        
        evaluation_prompt = f"""{context}

Evaluate this answer and respond naturally as {avatar_name}:
1. Give brief, constructive feedback (1-2 sentences) - be encouraging but honest
2. {"Then naturally transition to the next question: " + next_q.get('title', '') if next_q else "This was the last question. Thank the candidate warmly."}

Remember: You speak naturally, not like a robot. Use phrases like "That's interesting", "Good thinking", "I see what you mean" etc.

Respond in this JSON format:
{{
    "feedback": "Your 1-2 sentence feedback here",
    "feedback_type": "correct" or "partial" or "incorrect",
    "weak_topic": "topic name if answer was weak, or null",
    "transition": "Natural transition phrase to next question",
    "is_complete": true if this was the last question else false
}}"""

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"{req.session_id}_eval_{current_index}",
            system_message=interview.get("system_prompt", "You are a friendly technical interviewer.")
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        user_message = UserMessage(text=evaluation_prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                eval_data = json.loads(response[json_start:json_end])
            else:
                eval_data = {
                    "feedback": "Thank you for your answer.",
                    "feedback_type": "partial",
                    "weak_topic": None,
                    "transition": "Let's continue.",
                    "is_complete": current_index >= 9
                }
        except json.JSONDecodeError:
            eval_data = {
                "feedback": response[:200] if response else "Thank you for your answer.",
                "feedback_type": "partial",
                "weak_topic": None,
                "transition": "Let's move on.",
                "is_complete": current_index >= 9
            }
        
        feedback = eval_data.get("feedback", "Thank you for your answer.")
        weak_topic = eval_data.get("weak_topic")
        is_complete = eval_data.get("is_complete", False) or current_index >= 9
        
    except Exception as e:
        logger.error(f"LLM error: {e}")
        feedback = "Thank you for your answer. Let's continue."
        weak_topic = None
        is_complete = current_index >= 9
    
    # Update answer with feedback
    answer_doc["feedback"] = feedback
    answer_doc["feedback_type"] = eval_data.get("feedback_type", "partial")
    
    # Update interview
    update_data = {
        "$push": {"answers": answer_doc},
        "$set": {"current_question_index": current_index + 1}
    }
    
    if weak_topic:
        update_data["$push"]["weak_topics"] = weak_topic
    
    if is_complete:
        update_data["$set"]["status"] = "completed"
        update_data["$set"]["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.interviews.update_one(
        {"session_id": req.session_id},
        update_data
    )
    
    # Prepare next question response
    next_question = None
    if not is_complete and current_index + 1 < len(questions):
        next_question = questions[current_index + 1]
    
    return {
        "feedback": feedback,
        "transition": eval_data.get("transition", ""),
        "is_complete": is_complete,
        "next_question": next_question,
        "question_number": current_index + 2 if not is_complete else current_index + 1,
        "total_questions": len(questions) or 10,
        "is_coding": next_question.get("question_type") == "coding" if next_question else False
    }

@api_router.post("/interviews/silence-response")
async def get_silence_response(req: SilenceCheckRequest, user: User = Depends(get_current_user)):
    """Get AI response for silence detection"""
    import random
    
    interview = await db.interviews.find_one(
        {"session_id": req.session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    avatar_name = "Priya" if user.avatar_choice == "priya" else "Arjun"
    
    if req.silence_duration >= 20:
        response = "Let's move on to the next question. We can always come back to this if time permits."
        move_on = True
    elif req.silence_duration >= 8:
        responses = [
            "Take your time, I'm here.",
            "Should I repeat the question?",
            "No rush, think it through.",
            "Would you like a hint?",
            "Feel free to think out loud - that's actually helpful."
        ]
        response = random.choice(responses)
        move_on = False
    else:
        response = None
        move_on = False
    
    return {
        "response": response,
        "move_on": move_on,
        "speaker": avatar_name
    }

@api_router.post("/interviews/proctoring-event")
async def record_proctoring_event(req: ProctoringEventRequest, user: User = Depends(get_current_user)):
    """Record a proctoring event"""
    interview = await db.interviews.find_one(
        {"session_id": req.session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Deduct integrity score based on event type
    deductions = {
        "look_away": 5,
        "tab_switch": 10,
        "phone_detected": 15,
        "long_silence": 2
    }
    
    deduction = deductions.get(req.event_type, 5)
    
    event = {
        "type": req.event_type,
        "timestamp": req.timestamp,
        "deduction": deduction
    }
    
    # Count existing events of same type
    existing_events = interview.get("proctoring_events", [])
    same_type_count = sum(1 for e in existing_events if e.get("type") == req.event_type)
    
    # Get appropriate AI response
    avatar_name = "Priya" if user.avatar_choice == "priya" else "Arjun"
    
    responses = {
        "look_away": [
            "I noticed you looked away — remember in a real interview the interviewer is watching. Try to maintain eye contact.",
            "Please keep your focus on the screen during the interview."
        ],
        "tab_switch": [
            "I see you navigated away from the screen. In a real interview this would raise concerns. Let's continue.",
            "Please stay on this tab during the interview."
        ],
        "phone_detected": [
            "I noticed you picked something up. In a real interview please keep your workspace clear.",
            "Please put away any devices during the interview."
        ]
    }
    
    ai_response = None
    warning_level = "normal"
    
    if same_type_count == 0:
        ai_response = responses.get(req.event_type, [""])[0]
        warning_level = "gentle"
    elif same_type_count == 1:
        ai_response = f"This is your second warning. In a real interview this would result in immediate disqualification."
        warning_level = "serious"
    elif same_type_count >= 2:
        ai_response = "Multiple integrity concerns detected. This will be flagged in your final report."
        warning_level = "critical"
    
    await db.interviews.update_one(
        {"session_id": req.session_id},
        {
            "$push": {"proctoring_events": event},
            "$inc": {"integrity_score": -deduction}
        }
    )
    
    return {
        "recorded": True,
        "ai_response": ai_response,
        "warning_level": warning_level,
        "events_count": same_type_count + 1
    }

@api_router.post("/interviews/{session_id}/complete")
async def complete_interview(session_id: str, user: User = Depends(get_current_user)):
    """Generate comprehensive report with coaching feedback"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    interview = await db.interviews.find_one(
        {"session_id": session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Build conversation for analysis
    conversation = ""
    weak_answers = []
    
    for i, q in enumerate(interview.get("questions", [])):
        conversation += f"\nQ{i+1}: {q.get('title', '')} - {q.get('description', '')}\n"
        if i < len(interview.get("answers", [])):
            a = interview["answers"][i]
            conversation += f"A{i+1}: {a.get('answer', '')}\n"
            if a.get("code"):
                conversation += f"Code: {a['code']}\n"
            if a.get("feedback_type") in ["partial", "incorrect"]:
                weak_answers.append({
                    "question": q,
                    "answer": a,
                    "index": i
                })
        conversation += "\n"
    
    # Generate comprehensive report with coaching
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        
        report_prompt = f"""Analyze this {interview['track']} interview comprehensively.

Interview Mode: {interview.get('mode', 'practice')}
Integrity Score: {interview.get('integrity_score', 100)}
Proctoring Events: {len(interview.get('proctoring_events', []))}

Transcript:
{conversation}

Generate a detailed JSON report:
{{
    "overall_score": <0-100>,
    "technical_score": <0-100>,
    "communication_score": <0-100>,
    "problem_solving_score": <0-100>,
    "code_quality_score": <0-100>,
    "clarity_score": <0-100>,
    "confidence_score": <0-100>,
    "grade": "A" or "B" or "C" or "D" or "F",
    "hiring_recommendation": "Strong Hire" or "Hire" or "Borderline" or "No Hire",
    "strengths": ["strength1", "strength2", "strength3"],
    "improvements": ["area1", "area2", "area3"],
    "topics_to_study": ["topic1", "topic2", "topic3"],
    "ai_summary": "3-4 sentence performance summary",
    "coaching_feedback": [
        {{
            "question_index": 0,
            "what_candidate_said": "summary of their answer",
            "why_weak": "explanation of why it was weak or wrong",
            "correct_approach": "the right way to answer with example",
            "tip": "specific interview tip"
        }}
    ],
    "proctoring_notes": ["note1", "note2"]
}}

For coaching_feedback, include specific advice. If candidate said "I don't know", add: "Never say 'I don't know' in an interview. Instead say: 'I haven't worked on this directly, but my approach would be...' Then attempt to reason through it."

Return ONLY valid JSON."""

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"{session_id}_report",
            system_message="You are an interview performance analyst and career coach. Provide detailed, actionable feedback."
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        user_message = UserMessage(text=report_prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                report_data = json.loads(response[json_start:json_end])
            else:
                raise ValueError("No JSON found")
        except (json.JSONDecodeError, ValueError):
            report_data = generate_default_report(interview)
            
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        report_data = generate_default_report(interview)
    
    # Add proctoring analysis
    proctoring_events = interview.get("proctoring_events", [])
    proctoring_notes = report_data.get("proctoring_notes", [])
    
    if not proctoring_events:
        proctoring_notes.append("Excellent — no integrity concerns detected. You maintained professional conduct throughout.")
    else:
        event_counts = {}
        for e in proctoring_events:
            event_counts[e.get("type", "unknown")] = event_counts.get(e.get("type", "unknown"), 0) + 1
        for event_type, count in event_counts.items():
            proctoring_notes.append(f"{event_type.replace('_', ' ').title()} detected {count} time(s)")
    
    report_data["proctoring_notes"] = proctoring_notes
    report_data["integrity_score"] = max(0, interview.get("integrity_score", 100))
    
    # Determine grade and hiring recommendation based on scores
    overall = report_data.get("overall_score", 70)
    if overall >= 85:
        report_data["grade"] = "A"
        report_data["hiring_recommendation"] = "Strong Hire"
    elif overall >= 70:
        report_data["grade"] = "B"
        report_data["hiring_recommendation"] = "Hire"
    elif overall >= 55:
        report_data["grade"] = "C"
        report_data["hiring_recommendation"] = "Borderline"
    else:
        report_data["grade"] = "D" if overall >= 40 else "F"
        report_data["hiring_recommendation"] = "No Hire"
    
    # Create report
    report_id = f"report_{uuid.uuid4().hex[:12]}"
    report_doc = {
        "report_id": report_id,
        "session_id": session_id,
        "user_id": user.user_id,
        "track": interview["track"],
        "mode": interview.get("mode", "practice"),
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

def generate_default_report(interview):
    """Generate default report when AI fails"""
    return {
        "overall_score": 65,
        "technical_score": 60,
        "communication_score": 70,
        "problem_solving_score": 65,
        "code_quality_score": 60,
        "clarity_score": 68,
        "confidence_score": 65,
        "grade": "C",
        "hiring_recommendation": "Borderline",
        "strengths": ["Attempted all questions", "Good effort", "Clear communication"],
        "improvements": ["Study core concepts", "Practice more coding", "Work on time management"],
        "topics_to_study": [interview.get("track", "Programming"), "Data Structures", "Problem Solving"],
        "ai_summary": f"You completed a {interview.get('track', '')} interview. There's room for improvement in technical depth. Keep practicing!",
        "coaching_feedback": [],
        "proctoring_notes": []
    }

@api_router.get("/interviews/history")
async def get_interview_history(user: User = Depends(get_current_user)):
    """Get user's interview history"""
    interviews = await db.interviews.find(
        {"user_id": user.user_id},
        {"_id": 0, "system_prompt": 0}
    ).sort("created_at", -1).to_list(100)
    
    return interviews

@api_router.get("/interviews/{session_id}")
async def get_interview(session_id: str, user: User = Depends(get_current_user)):
    """Get specific interview session"""
    interview = await db.interviews.find_one(
        {"session_id": session_id, "user_id": user.user_id},
        {"_id": 0, "system_prompt": 0}
    )
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    return interview

@api_router.post("/interviews/{session_id}/save-exit")
async def save_and_exit(session_id: str, user: User = Depends(get_current_user)):
    """Save progress and exit interview"""
    await db.interviews.update_one(
        {"session_id": session_id, "user_id": user.user_id},
        {"$set": {"status": "paused"}}
    )
    return {"message": "Progress saved", "session_id": session_id}

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
    reports = await db.reports.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    interviews = await db.interviews.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    if not reports:
        return {
            "total_sessions": len(interviews),
            "completed_sessions": 0,
            "average_score": 0,
            "strongest_topic": "N/A",
            "weakest_topic": "N/A",
            "score_history": [],
            "topic_scores": {},
            "weak_topics": [],
            "real_interview_count": 0
        }
    
    total_score = sum(r.get("overall_score", 0) for r in reports)
    avg_score = total_score / len(reports) if reports else 0
    
    topic_scores = {}
    weak_topics_count = {}
    real_interview_count = sum(1 for r in reports if r.get("mode") == "real")
    
    for r in reports:
        track = r.get("track", "Unknown")
        if track not in topic_scores:
            topic_scores[track] = []
        topic_scores[track].append(r.get("overall_score", 0))
        
        for topic in r.get("improvements", []):
            weak_topics_count[topic] = weak_topics_count.get(topic, 0) + 1
    
    topic_averages = {k: sum(v)/len(v) for k, v in topic_scores.items()}
    
    strongest = max(topic_averages.items(), key=lambda x: x[1])[0] if topic_averages else "N/A"
    weakest = min(topic_averages.items(), key=lambda x: x[1])[0] if topic_averages else "N/A"
    
    score_history = [
        {"date": r.get("created_at"), "score": r.get("overall_score", 0), "track": r.get("track"), "mode": r.get("mode", "practice")}
        for r in reports
    ]
    
    sorted_weak = sorted(weak_topics_count.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "total_sessions": len(interviews),
        "completed_sessions": len(reports),
        "average_score": round(avg_score, 1),
        "strongest_topic": strongest,
        "weakest_topic": weakest,
        "score_history": score_history,
        "topic_scores": topic_averages,
        "weak_topics": [{"topic": t, "count": c} for t, c in sorted_weak],
        "real_interview_count": real_interview_count
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
Completed: {stats['completed_sessions']}
Average Score: {stats['average_score']}
Strongest Topic: {stats['strongest_topic']}
Weakest Topic: {stats['weakest_topic']}
Weak Areas: {', '.join([w['topic'] for w in stats['weak_topics'][:3]])}
Real Interviews: {stats['real_interview_count']}

Be specific and actionable. Mention specific topics they should focus on."""

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"rec_{user.user_id}_{datetime.now().timestamp()}",
            system_message="You are an interview coach providing brief, actionable recommendations."
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        
        user_message = UserMessage(text=prompt)
        recommendation = await chat.send_message(user_message)
        
        return {"recommendation": recommendation}
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        return {
            "recommendation": f"Focus on improving your {stats['weakest_topic']} skills. Your average score is {stats['average_score']}%. Keep practicing!"
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
    if req.elevenlabs_api_key is not None:
        update_data["elevenlabs_api_key"] = req.elevenlabs_api_key
    
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 0})
    return updated_user

# ==================== TRACKS & QUESTIONS ====================

@api_router.get("/tracks")
async def get_tracks():
    """Get available interview tracks"""
    return [
        {"id": "python", "name": "Python Developer", "icon": "code", "description": "Python fundamentals, OOP, data structures", "topics": ["basics", "oop", "decorators", "generators", "async", "data-structures"]},
        {"id": "dsa", "name": "DSA", "icon": "binary", "description": "Data Structures & Algorithms", "topics": ["arrays", "linked-lists", "trees", "graphs", "dynamic-programming", "sorting", "hashing", "stack-queue"]},
        {"id": "javascript", "name": "JavaScript", "icon": "braces", "description": "JS fundamentals, ES6+, async programming", "topics": ["basics", "es6", "async", "dom", "closures", "prototypes"]},
        {"id": "hr", "name": "HR Round", "icon": "users", "description": "Behavioral questions, soft skills", "topics": ["introduction", "strengths-weaknesses", "teamwork", "conflict", "goals", "company-fit"]},
        {"id": "system-design", "name": "System Design", "icon": "server", "description": "Architecture, scalability, design patterns", "topics": ["fundamentals", "database", "caching", "load-balancing", "microservices", "api-design"]},
        {"id": "data-analyst", "name": "Data Analyst", "icon": "bar-chart", "description": "SQL, analytics, data visualization", "topics": ["sql", "pandas", "visualization", "statistics", "etl", "reporting"]},
        {"id": "java", "name": "Java Developer", "icon": "coffee", "description": "Java fundamentals, OOP, Spring", "topics": ["basics", "oop", "collections", "multithreading", "spring", "jdbc"]},
        {"id": "ai-ml", "name": "AI/ML Engineer", "icon": "brain", "description": "Machine Learning, Deep Learning, NLP", "topics": ["ml-basics", "deep-learning", "nlp", "computer-vision", "model-deployment", "data-preprocessing"]},
        {"id": "frontend", "name": "Frontend Developer", "icon": "layout", "description": "HTML, CSS, React, responsive design", "topics": ["html-css", "javascript", "react", "responsive", "performance", "accessibility"]},
        {"id": "backend", "name": "Backend Developer", "icon": "database", "description": "APIs, databases, server-side development", "topics": ["api-design", "databases", "authentication", "caching", "security", "deployment"]}
    ]

@api_router.get("/questions/{track}")
async def get_track_questions(track: str, topic: Optional[str] = None):
    """Get questions for a track"""
    query = {"track": track}
    if topic:
        query["topic"] = topic
    
    questions = await db.questions.find(query, {"_id": 0}).to_list(100)
    return questions

# ==================== SEED QUESTIONS ====================

@api_router.post("/admin/seed-questions")
async def seed_questions():
    """Seed the database with interview questions"""
    # Check if already seeded
    count = await db.questions.count_documents({})
    if count > 100:
        return {"message": f"Questions already seeded ({count} questions)"}
    
    questions = generate_question_bank()
    
    if questions:
        await db.questions.delete_many({})
        await db.questions.insert_many(questions)
    
    return {"message": f"Seeded {len(questions)} questions"}

def generate_question_bank():
    """Generate comprehensive question bank based on GFG/LeetCode patterns"""
    questions = []
    
    # ==================== DSA QUESTIONS ====================
    dsa_questions = [
        # Arrays - Easy
        {
            "question_id": "dsa_001",
            "track": "dsa",
            "topic": "arrays",
            "title": "Two Sum",
            "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
            "difficulty": "easy",
            "question_type": "coding",
            "examples": [
                {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."},
                {"input": "nums = [3,2,4], target = 6", "output": "[1,2]"},
                {"input": "nums = [3,3], target = 6", "output": "[0,1]"}
            ],
            "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."],
            "hints": ["Think about what data structure allows O(1) lookup", "Can you solve it in a single pass?"],
            "starter_code": {
                "python": "def twoSum(nums: list[int], target: int) -> list[int]:\n    # Your code here\n    pass",
                "javascript": "function twoSum(nums, target) {\n    // Your code here\n}",
                "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n    }\n}",
                "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your code here\n    }\n};"
            },
            "expected_time_complexity": "O(n)",
            "expected_space_complexity": "O(n)",
            "tags": ["array", "hash-table"]
        },
        {
            "question_id": "dsa_002",
            "track": "dsa",
            "topic": "arrays",
            "title": "Best Time to Buy and Sell Stock",
            "description": "You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
            "difficulty": "easy",
            "question_type": "coding",
            "examples": [
                {"input": "prices = [7,1,5,3,6,4]", "output": "5", "explanation": "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."},
                {"input": "prices = [7,6,4,3,1]", "output": "0", "explanation": "No transactions are done and the max profit = 0."}
            ],
            "constraints": ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
            "hints": ["Track the minimum price seen so far", "Calculate profit at each step"],
            "starter_code": {
                "python": "def maxProfit(prices: list[int]) -> int:\n    # Your code here\n    pass",
                "javascript": "function maxProfit(prices) {\n    // Your code here\n}",
                "java": "class Solution {\n    public int maxProfit(int[] prices) {\n        // Your code here\n    }\n}",
                "cpp": "class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        // Your code here\n    }\n};"
            },
            "expected_time_complexity": "O(n)",
            "expected_space_complexity": "O(1)",
            "tags": ["array", "dynamic-programming"]
        },
        # Arrays - Medium
        {
            "question_id": "dsa_003",
            "track": "dsa",
            "topic": "arrays",
            "title": "Container With Most Water",
            "description": "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.",
            "difficulty": "medium",
            "question_type": "coding",
            "examples": [
                {"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49", "explanation": "The max area is between index 1 and 8."},
                {"input": "height = [1,1]", "output": "1"}
            ],
            "constraints": ["n == height.length", "2 <= n <= 10^5", "0 <= height[i] <= 10^4"],
            "hints": ["Use two pointers", "Move the pointer with smaller height"],
            "starter_code": {
                "python": "def maxArea(height: list[int]) -> int:\n    # Your code here\n    pass",
                "javascript": "function maxArea(height) {\n    // Your code here\n}",
                "java": "class Solution {\n    public int maxArea(int[] height) {\n        // Your code here\n    }\n}",
                "cpp": "class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        // Your code here\n    }\n};"
            },
            "expected_time_complexity": "O(n)",
            "expected_space_complexity": "O(1)",
            "tags": ["array", "two-pointers", "greedy"]
        },
        {
            "question_id": "dsa_004",
            "track": "dsa",
            "topic": "arrays",
            "title": "3Sum",
            "description": "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. Notice that the solution set must not contain duplicate triplets.",
            "difficulty": "medium",
            "question_type": "coding",
            "examples": [
                {"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]"},
                {"input": "nums = [0,1,1]", "output": "[]"},
                {"input": "nums = [0,0,0]", "output": "[[0,0,0]]"}
            ],
            "constraints": ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
            "hints": ["Sort the array first", "Use two pointers for each fixed element"],
            "starter_code": {
                "python": "def threeSum(nums: list[int]) -> list[list[int]]:\n    # Your code here\n    pass",
                "javascript": "function threeSum(nums) {\n    // Your code here\n}",
                "java": "class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        // Your code here\n    }\n}",
                "cpp": "class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        // Your code here\n    }\n};"
            },
            "expected_time_complexity": "O(n^2)",
            "expected_space_complexity": "O(1)",
            "tags": ["array", "two-pointers", "sorting"]
        },
        # Linked Lists
        {
            "question_id": "dsa_005",
            "track": "dsa",
            "topic": "linked-lists",
            "title": "Reverse Linked List",
            "description": "Given the head of a singly linked list, reverse the list, and return the reversed list.",
            "difficulty": "easy",
            "question_type": "coding",
            "examples": [
                {"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]"},
                {"input": "head = [1,2]", "output": "[2,1]"},
                {"input": "head = []", "output": "[]"}
            ],
            "constraints": ["The number of nodes in the list is in range [0, 5000]", "-5000 <= Node.val <= 5000"],
            "hints": ["Use three pointers: prev, curr, next", "Can you do it iteratively and recursively?"],
            "starter_code": {
                "python": "# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\n\ndef reverseList(head):\n    # Your code here\n    pass",
                "javascript": "function reverseList(head) {\n    // Your code here\n}",
                "java": "class Solution {\n    public ListNode reverseList(ListNode head) {\n        // Your code here\n    }\n}",
                "cpp": "class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Your code here\n    }\n};"
            },
            "expected_time_complexity": "O(n)",
            "expected_space_complexity": "O(1)",
            "tags": ["linked-list", "recursion"]
        },
        {
            "question_id": "dsa_006",
            "track": "dsa",
            "topic": "linked-lists",
            "title": "Merge Two Sorted Lists",
            "description": "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.",
            "difficulty": "easy",
            "question_type": "coding",
            "examples": [
                {"input": "list1 = [1,2,4], list2 = [1,3,4]", "output": "[1,1,2,3,4,4]"},
                {"input": "list1 = [], list2 = []", "output": "[]"},
                {"input": "list1 = [], list2 = [0]", "output": "[0]"}
            ],
            "constraints": ["The number of nodes in both lists is in range [0, 50]", "-100 <= Node.val <= 100", "Both lists are sorted in non-decreasing order"],
            "hints": ["Use a dummy head node", "Compare nodes one by one"],
            "starter_code": {
                "python": "def mergeTwoLists(list1, list2):\n    # Your code here\n    pass",
                "javascript": "function mergeTwoLists(list1, list2) {\n    // Your code here\n}",
                "java": "class Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        // Your code here\n    }\n}",
                "cpp": "class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        // Your code here\n    }\n};"
            },
            "expected_time_complexity": "O(n + m)",
            "expected_space_complexity": "O(1)",
            "tags": ["linked-list", "recursion"]
        },
        # Trees
        {
            "question_id": "dsa_007",
            "track": "dsa",
            "topic": "trees",
            "title": "Maximum Depth of Binary Tree",
            "description": "Given the root of a binary tree, return its maximum depth. A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
            "difficulty": "easy",
            "question_type": "coding",
            "examples": [
                {"input": "root = [3,9,20,null,null,15,7]", "output": "3"},
                {"input": "root = [1,null,2]", "output": "2"}
            ],
            "constraints": ["The number of nodes is in range [0, 10^4]", "-100 <= Node.val <= 100"],
            "hints": ["Use recursion", "Base case: empty tree has depth 0"],
            "starter_code": {
                "python": "def maxDepth(root) -> int:\n    # Your code here\n    pass",
                "javascript": "function maxDepth(root) {\n    // Your code here\n}",
                "java": "class Solution {\n    public int maxDepth(TreeNode root) {\n        // Your code here\n    }\n}",
                "cpp": "class Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        // Your code here\n    }\n};"
            },
            "expected_time_complexity": "O(n)",
            "expected_space_complexity": "O(h)",
            "tags": ["tree", "dfs", "bfs", "recursion"]
        },
        # Dynamic Programming
        {
            "question_id": "dsa_008",
            "track": "dsa",
            "topic": "dynamic-programming",
            "title": "Climbing Stairs",
            "description": "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
            "difficulty": "easy",
            "question_type": "coding",
            "examples": [
                {"input": "n = 2", "output": "2", "explanation": "There are two ways: 1+1 and 2."},
                {"input": "n = 3", "output": "3", "explanation": "There are three ways: 1+1+1, 1+2, and 2+1."}
            ],
            "constraints": ["1 <= n <= 45"],
            "hints": ["This is similar to Fibonacci", "dp[i] = dp[i-1] + dp[i-2]"],
            "starter_code": {
                "python": "def climbStairs(n: int) -> int:\n    # Your code here\n    pass",
                "javascript": "function climbStairs(n) {\n    // Your code here\n}",
                "java": "class Solution {\n    public int climbStairs(int n) {\n        // Your code here\n    }\n}",
                "cpp": "class Solution {\npublic:\n    int climbStairs(int n) {\n        // Your code here\n    }\n};"
            },
            "expected_time_complexity": "O(n)",
            "expected_space_complexity": "O(1)",
            "tags": ["dp", "math", "memoization"]
        },
        {
            "question_id": "dsa_009",
            "track": "dsa",
            "topic": "dynamic-programming",
            "title": "Longest Increasing Subsequence",
            "description": "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
            "difficulty": "medium",
            "question_type": "coding",
            "examples": [
                {"input": "nums = [10,9,2,5,3,7,101,18]", "output": "4", "explanation": "The longest increasing subsequence is [2,3,7,101]."},
                {"input": "nums = [0,1,0,3,2,3]", "output": "4"},
                {"input": "nums = [7,7,7,7,7,7,7]", "output": "1"}
            ],
            "constraints": ["1 <= nums.length <= 2500", "-10^4 <= nums[i] <= 10^4"],
            "hints": ["Use dynamic programming", "For O(n log n), use binary search"],
            "starter_code": {
                "python": "def lengthOfLIS(nums: list[int]) -> int:\n    # Your code here\n    pass",
                "javascript": "function lengthOfLIS(nums) {\n    // Your code here\n}",
                "java": "class Solution {\n    public int lengthOfLIS(int[] nums) {\n        // Your code here\n    }\n}",
                "cpp": "class Solution {\npublic:\n    int lengthOfLIS(vector<int>& nums) {\n        // Your code here\n    }\n};"
            },
            "expected_time_complexity": "O(n^2) or O(n log n)",
            "expected_space_complexity": "O(n)",
            "tags": ["dp", "binary-search", "array"]
        },
        # Hard
        {
            "question_id": "dsa_010",
            "track": "dsa",
            "topic": "dynamic-programming",
            "title": "Longest Valid Parentheses",
            "description": "Given a string containing just the characters '(' and ')', return the length of the longest valid (well-formed) parentheses substring.",
            "difficulty": "hard",
            "question_type": "coding",
            "examples": [
                {"input": 's = "(()"', "output": "2", "explanation": 'The longest valid parentheses substring is "()".'},
                {"input": 's = ")()())"', "output": "4", "explanation": 'The longest valid parentheses substring is "()()".'},
                {"input": 's = ""', "output": "0"}
            ],
            "constraints": ["0 <= s.length <= 3 * 10^4", "s[i] is '(' or ')'"],
            "hints": ["Use a stack to track indices", "Or use DP where dp[i] is length ending at i"],
            "starter_code": {
                "python": "def longestValidParentheses(s: str) -> int:\n    # Your code here\n    pass",
                "javascript": "function longestValidParentheses(s) {\n    // Your code here\n}",
                "java": "class Solution {\n    public int longestValidParentheses(String s) {\n        // Your code here\n    }\n}",
                "cpp": "class Solution {\npublic:\n    int longestValidParentheses(string s) {\n        // Your code here\n    }\n};"
            },
            "expected_time_complexity": "O(n)",
            "expected_space_complexity": "O(n)",
            "tags": ["string", "dp", "stack"]
        },
    ]
    questions.extend(dsa_questions)
    
    # ==================== PYTHON QUESTIONS ====================
    python_questions = [
        # Theory - Easy
        {
            "question_id": "py_001",
            "track": "python",
            "topic": "basics",
            "title": "Difference between List and Tuple",
            "description": "What is the difference between a list and a tuple in Python? When would you use each one?",
            "difficulty": "easy",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Think about mutability", "Consider memory and performance"],
            "starter_code": {},
            "tags": ["python", "data-structures", "basics"]
        },
        {
            "question_id": "py_002",
            "track": "python",
            "topic": "basics",
            "title": "What are Python Decorators?",
            "description": "Explain what decorators are in Python. Give an example of when you would use one.",
            "difficulty": "medium",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Think of them as function wrappers", "Common use cases: logging, timing, authentication"],
            "starter_code": {},
            "tags": ["python", "decorators", "functions"]
        },
        {
            "question_id": "py_003",
            "track": "python",
            "topic": "oop",
            "title": "Explain __init__ and __new__",
            "description": "What is the difference between __init__ and __new__ methods in Python? When would you override __new__?",
            "difficulty": "medium",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["__new__ creates the instance", "__init__ initializes it"],
            "starter_code": {},
            "tags": ["python", "oop", "magic-methods"]
        },
        {
            "question_id": "py_004",
            "track": "python",
            "topic": "generators",
            "title": "Generators vs Iterators",
            "description": "What is the difference between generators and iterators in Python? Write a simple generator function.",
            "difficulty": "medium",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["yield vs return", "Memory efficiency"],
            "starter_code": {},
            "tags": ["python", "generators", "iterators"]
        },
        # Coding
        {
            "question_id": "py_005",
            "track": "python",
            "topic": "basics",
            "title": "Reverse Words in a String",
            "description": "Write a function that takes a string and returns the string with words reversed. For example, 'Hello World' becomes 'World Hello'.",
            "difficulty": "easy",
            "question_type": "coding",
            "examples": [
                {"input": '"Hello World"', "output": '"World Hello"'},
                {"input": '"Python is great"', "output": '"great is Python"'}
            ],
            "constraints": ["Input string will have at least one word", "Words are separated by single spaces"],
            "hints": ["split() and join() are useful", "Consider edge cases"],
            "starter_code": {
                "python": "def reverse_words(s: str) -> str:\n    # Your code here\n    pass"
            },
            "expected_time_complexity": "O(n)",
            "expected_space_complexity": "O(n)",
            "tags": ["python", "strings"]
        },
        {
            "question_id": "py_006",
            "track": "python",
            "topic": "decorators",
            "title": "Implement a Timing Decorator",
            "description": "Write a decorator that measures and prints the execution time of any function it decorates.",
            "difficulty": "medium",
            "question_type": "coding",
            "examples": [
                {"input": "@timer\\ndef slow_function():\\n    time.sleep(1)", "output": "Prints: 'slow_function took 1.00 seconds'"}
            ],
            "constraints": ["Use the time module", "Handle functions with any number of arguments"],
            "hints": ["Use *args and **kwargs", "time.time() gives current time"],
            "starter_code": {
                "python": "import time\n\ndef timer(func):\n    # Your code here\n    pass\n\n# Test\n@timer\ndef example():\n    time.sleep(0.1)\n    return 'done'"
            },
            "expected_time_complexity": "O(1)",
            "expected_space_complexity": "O(1)",
            "tags": ["python", "decorators", "functions"]
        },
    ]
    questions.extend(python_questions)
    
    # ==================== JAVASCRIPT QUESTIONS ====================
    js_questions = [
        {
            "question_id": "js_001",
            "track": "javascript",
            "topic": "basics",
            "title": "var vs let vs const",
            "description": "Explain the differences between var, let, and const in JavaScript. When should you use each one?",
            "difficulty": "easy",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Think about scope", "Consider hoisting", "Reassignment rules"],
            "starter_code": {},
            "tags": ["javascript", "variables", "es6"]
        },
        {
            "question_id": "js_002",
            "track": "javascript",
            "topic": "closures",
            "title": "What is a Closure?",
            "description": "Explain what a closure is in JavaScript. Give a practical example of when you would use closures.",
            "difficulty": "medium",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Function with access to outer scope", "Data privacy", "Factory functions"],
            "starter_code": {},
            "tags": ["javascript", "closures", "functions"]
        },
        {
            "question_id": "js_003",
            "track": "javascript",
            "topic": "async",
            "title": "Promises vs Async/Await",
            "description": "Explain the difference between Promises and async/await. When would you prefer one over the other?",
            "difficulty": "medium",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Syntax differences", "Error handling", "Readability"],
            "starter_code": {},
            "tags": ["javascript", "async", "promises"]
        },
        {
            "question_id": "js_004",
            "track": "javascript",
            "topic": "basics",
            "title": "Debounce Function",
            "description": "Implement a debounce function that limits how often a function can be called. The function should only execute after the specified delay has passed since the last call.",
            "difficulty": "medium",
            "question_type": "coding",
            "examples": [
                {"input": "debounce(fn, 300)", "output": "Returns debounced function that waits 300ms"}
            ],
            "constraints": ["Handle multiple rapid calls", "Use setTimeout"],
            "hints": ["Clear previous timeout on each call", "Return a new function"],
            "starter_code": {
                "javascript": "function debounce(func, delay) {\n    // Your code here\n}"
            },
            "expected_time_complexity": "O(1)",
            "expected_space_complexity": "O(1)",
            "tags": ["javascript", "functions", "optimization"]
        },
    ]
    questions.extend(js_questions)
    
    # ==================== HR QUESTIONS ====================
    hr_questions = [
        {
            "question_id": "hr_001",
            "track": "hr",
            "topic": "introduction",
            "title": "Tell Me About Yourself",
            "description": "Give me a brief introduction about yourself, your background, and what brings you here today.",
            "difficulty": "easy",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Keep it 2-3 minutes", "Focus on relevant experience", "End with why you're interested in this role"],
            "starter_code": {},
            "tags": ["hr", "introduction", "soft-skills"]
        },
        {
            "question_id": "hr_002",
            "track": "hr",
            "topic": "strengths-weaknesses",
            "title": "What is Your Greatest Strength?",
            "description": "What would you say is your greatest professional strength? Can you give me an example of how you've demonstrated this?",
            "difficulty": "easy",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Be specific with examples", "Relate to the job", "Use STAR method"],
            "starter_code": {},
            "tags": ["hr", "strengths", "self-awareness"]
        },
        {
            "question_id": "hr_003",
            "track": "hr",
            "topic": "strengths-weaknesses",
            "title": "What is Your Greatest Weakness?",
            "description": "What would you say is an area where you're still developing? How are you working to improve it?",
            "difficulty": "medium",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Be honest but strategic", "Show self-awareness", "Explain improvement steps"],
            "starter_code": {},
            "tags": ["hr", "weaknesses", "self-improvement"]
        },
        {
            "question_id": "hr_004",
            "track": "hr",
            "topic": "conflict",
            "title": "Handling Conflict with a Colleague",
            "description": "Tell me about a time when you had a disagreement with a colleague. How did you handle it?",
            "difficulty": "medium",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Use STAR method", "Focus on resolution", "Show emotional intelligence"],
            "starter_code": {},
            "tags": ["hr", "conflict", "teamwork"]
        },
        {
            "question_id": "hr_005",
            "track": "hr",
            "topic": "goals",
            "title": "Where Do You See Yourself in 5 Years?",
            "description": "Where do you see yourself professionally in the next 5 years? What are your career goals?",
            "difficulty": "easy",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Show ambition but be realistic", "Align with company growth", "Mention skill development"],
            "starter_code": {},
            "tags": ["hr", "goals", "career"]
        },
        {
            "question_id": "hr_006",
            "track": "hr",
            "topic": "teamwork",
            "title": "Describe a Team Project",
            "description": "Tell me about a successful team project you worked on. What was your role and contribution?",
            "difficulty": "easy",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Be specific about your contribution", "Mention challenges overcome", "Highlight collaboration"],
            "starter_code": {},
            "tags": ["hr", "teamwork", "projects"]
        },
    ]
    questions.extend(hr_questions)
    
    # ==================== SYSTEM DESIGN QUESTIONS ====================
    sd_questions = [
        {
            "question_id": "sd_001",
            "track": "system-design",
            "topic": "fundamentals",
            "title": "Design a URL Shortener",
            "description": "Design a URL shortening service like bit.ly. Consider scalability, availability, and the core functionality.",
            "difficulty": "medium",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Think about the hash function", "Consider the database schema", "How will you handle collisions?"],
            "starter_code": {},
            "tags": ["system-design", "scalability", "databases"]
        },
        {
            "question_id": "sd_002",
            "track": "system-design",
            "topic": "caching",
            "title": "What is Caching and When to Use It?",
            "description": "Explain what caching is and describe scenarios where you would implement caching in a system. What are the trade-offs?",
            "difficulty": "easy",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Types of caching", "Cache invalidation strategies", "Common tools like Redis"],
            "starter_code": {},
            "tags": ["system-design", "caching", "performance"]
        },
        {
            "question_id": "sd_003",
            "track": "system-design",
            "topic": "database",
            "title": "SQL vs NoSQL",
            "description": "Compare SQL and NoSQL databases. When would you choose one over the other?",
            "difficulty": "easy",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["ACID vs BASE", "Schema flexibility", "Scalability patterns"],
            "starter_code": {},
            "tags": ["system-design", "databases", "fundamentals"]
        },
        {
            "question_id": "sd_004",
            "track": "system-design",
            "topic": "load-balancing",
            "title": "Explain Load Balancing",
            "description": "What is load balancing? Describe different load balancing strategies and when you would use each.",
            "difficulty": "medium",
            "question_type": "theory",
            "examples": [],
            "constraints": [],
            "hints": ["Round robin, weighted, least connections", "Layer 4 vs Layer 7", "Health checks"],
            "starter_code": {},
            "tags": ["system-design", "load-balancing", "scalability"]
        },
    ]
    questions.extend(sd_questions)
    
    return questions

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "MockMate API", "status": "running", "version": "2.0"}

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

@app.on_event("startup")
async def startup_event():
    """Seed questions on startup if needed"""
    count = await db.questions.count_documents({})
    if count < 50:
        logger.info("Seeding question bank...")
        questions = generate_question_bank()
        if questions:
            await db.questions.delete_many({})
            await db.questions.insert_many(questions)
            logger.info(f"Seeded {len(questions)} questions")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
