import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Send, Play, Clock, MessageSquare, ArrowLeft,
  Code, Volume2, VolumeX, Loader2, Lightbulb, ChevronRight,
  Camera, CameraOff, AlertTriangle, X
} from 'lucide-react';
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const InterviewRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Interview state
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [isCoding, setIsCoding] = useState(false);
  const [answer, setAnswer] = useState('');
  const [code, setCode] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('python');
  const [transcript, setTranscript] = useState([]);
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  
  // Timer and UI state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [codeOutput, setCodeOutput] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  
  // Proctoring state
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [proctoringWarning, setProctoringWarning] = useState(null);
  
  // Silence detection
  const [silenceTimer, setSilenceTimer] = useState(0);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  
  // Refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const timerRef = useRef(null);
  const silenceRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // Avatar based on user settings
  const avatarName = user?.avatar_choice === 'arjun' ? 'Arjun' : 'Priya';

  // Initialize interview
  useEffect(() => {
    fetchInterview();
    startTimer();
    startSilenceDetection();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceRef.current) clearInterval(silenceRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      synthRef.current.cancel();
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId]);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Tab visibility detection (proctoring)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && cameraEnabled) {
        recordProctoringEvent('tab_switch');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [cameraEnabled]);

  const fetchInterview = async () => {
    try {
      const response = await axios.get(`${API}/interviews/${sessionId}`);
      setInterview(response.data);
      
      const questions = response.data.questions;
      const currentIdx = response.data.current_question_index;
      
      if (questions.length > 0 && currentIdx < questions.length) {
        const q = questions[currentIdx];
        setCurrentQuestion(q);
        setQuestionNumber(currentIdx + 1);
        setTotalQuestions(questions.length);
        setIsCoding(q.question_type === 'coding');
        
        // Set starter code if coding question
        if (q.question_type === 'coding' && q.starter_code) {
          setCode(q.starter_code[codeLanguage] || '');
        }
        
        // Add greeting and first question to transcript
        const greeting = `Hello! I'm ${avatarName}, and I'll be conducting your ${response.data.track} interview today.`;
        setTranscript([
          { type: 'ai', text: greeting },
          { type: 'ai', text: q.description || q.title }
        ]);
        
        // Speak greeting and question
        if (voiceEnabled) {
          await speakText(greeting);
          await speakText(q.description || q.title);
        }
      }
    } catch (error) {
      console.error('Error fetching interview:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const startSilenceDetection = () => {
    silenceRef.current = setInterval(async () => {
      const silenceDuration = Math.floor((Date.now() - lastActivityTime) / 1000);
      setSilenceTimer(silenceDuration);
      
      // Check for silence thresholds
      if (silenceDuration === 8 || silenceDuration === 20) {
        try {
          const response = await axios.post(`${API}/interviews/silence-response`, {
            session_id: sessionId,
            silence_duration: silenceDuration
          });
          
          if (response.data.response) {
            setTranscript(prev => [...prev, { type: 'ai', text: response.data.response }]);
            if (voiceEnabled) {
              speakText(response.data.response);
            }
            
            if (response.data.move_on) {
              // Move to next question
              setTimeout(() => submitAnswer(true), 2000);
            }
          }
        } catch (err) {
          console.error('Silence response error:', err);
        }
      }
    }, 1000);
  };

  const resetSilenceTimer = () => {
    setLastActivityTime(Date.now());
    setSilenceTimer(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Text-to-Speech with ElevenLabs or Web Speech API
  const speakText = useCallback(async (text) => {
    if (!voiceEnabled || !text) return;
    
    setIsSpeaking(true);
    
    try {
      // Try ElevenLabs first
      const ttsResponse = await axios.post(`${API}/tts/generate`, {
        text: text,
        voice_id: user?.avatar_choice === 'arjun' ? '29vD33N1CtxCmqQRPOHJ' : '21m00Tcm4TlvDq8ikWAM'
      });
      
      if (!ttsResponse.data.use_web_speech && ttsResponse.data.audio_data) {
        // Play ElevenLabs audio
        if (audioRef.current) {
          audioRef.current.src = ttsResponse.data.audio_data;
          audioRef.current.onended = () => setIsSpeaking(false);
          await audioRef.current.play();
          return;
        }
      }
    } catch (err) {
      console.log('Using Web Speech API fallback');
    }
    
    // Fallback to Web Speech API
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = synthRef.current.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female'));
    const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('Google UK English Male'));
    
    utterance.voice = user?.avatar_choice === 'arjun' ? maleVoice : femaleVoice;
    utterance.rate = user?.voice_speed === 'slow' ? 0.8 : user?.voice_speed === 'fast' ? 1.2 : 1;
    utterance.pitch = user?.avatar_choice === 'arjun' ? 0.9 : 1.1;
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  }, [voiceEnabled, user]);

  // Speech-to-Text
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Please use Chrome.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = user?.language_preference === 'hinglish' ? 'hi-IN' : 'en-US';

    let finalTranscript = '';

    recognitionRef.current.onresult = (event) => {
      resetSilenceTimer();
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          setAnswer(prev => prev + transcript + ' ');
        } else {
          interimTranscript += transcript;
        }
      }
      
      setLiveTranscript(interimTranscript);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      setLiveTranscript('');
    };

    recognitionRef.current.start();
    setIsListening(true);
  };

  // Camera control
  const toggleCamera = async () => {
    if (cameraEnabled) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      setCameraStream(null);
      setCameraEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
        setCameraEnabled(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        alert('Camera access is required for proctoring. Please allow camera access.');
      }
    }
  };

  // Record proctoring event
  const recordProctoringEvent = async (eventType) => {
    try {
      const response = await axios.post(`${API}/interviews/proctoring-event`, {
        session_id: sessionId,
        event_type: eventType,
        timestamp: new Date().toISOString()
      });
      
      if (response.data.ai_response) {
        setProctoringWarning({
          message: response.data.ai_response,
          level: response.data.warning_level
        });
        
        setTranscript(prev => [...prev, { type: 'ai', text: response.data.ai_response, isWarning: true }]);
        
        if (voiceEnabled) {
          speakText(response.data.ai_response);
        }
        
        setTimeout(() => setProctoringWarning(null), 5000);
      }
    } catch (err) {
      console.error('Proctoring event error:', err);
    }
  };

  // Submit answer
  const submitAnswer = async (skipAnswer = false) => {
    if (!skipAnswer && !answer.trim() && !code.trim()) return;
    
    resetSilenceTimer();
    setIsSubmitting(true);
    setIsThinking(true);
    synthRef.current.cancel();
    
    // Stop listening if active
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    
    // Add user answer to transcript
    if (!skipAnswer) {
      setTranscript(prev => [...prev, { type: 'user', text: answer || 'Code submitted' }]);
    }
    
    try {
      const response = await axios.post(`${API}/interviews/answer`, {
        session_id: sessionId,
        answer: skipAnswer ? 'Skipped due to timeout' : answer,
        code: code || null,
        time_taken: elapsedTime
      });
      
      const { feedback, transition, is_complete, next_question, question_number, is_coding } = response.data;
      
      setIsThinking(false);
      
      // Add AI feedback to transcript
      const fullFeedback = transition ? `${feedback} ${transition}` : feedback;
      setTranscript(prev => [...prev, { type: 'ai', text: fullFeedback }]);
      
      if (voiceEnabled) {
        await speakText(fullFeedback);
      }
      
      if (is_complete) {
        // Generate and show report
        setTimeout(async () => {
          try {
            const reportRes = await axios.post(`${API}/interviews/${sessionId}/complete`);
            navigate(`/report/${reportRes.data.report_id}`);
          } catch (err) {
            console.error('Error generating report:', err);
            navigate('/dashboard');
          }
        }, 2000);
      } else if (next_question) {
        // Move to next question immediately
        setTimeout(async () => {
          setCurrentQuestion(next_question);
          setQuestionNumber(question_number);
          setIsCoding(is_coding);
          setAnswer('');
          setCode(next_question.starter_code?.[codeLanguage] || '');
          setCodeOutput('');
          setShowHints(false);
          resetSilenceTimer();
          
          // Add next question to transcript
          const questionText = next_question.description || next_question.title;
          setTranscript(prev => [...prev, { type: 'ai', text: questionText }]);
          
          if (voiceEnabled) {
            await speakText(questionText);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setIsThinking(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run code (simulation)
  const runCode = () => {
    setCodeOutput('Running code...\n');
    resetSilenceTimer();
    
    setTimeout(() => {
      if (codeLanguage === 'python') {
        if (code.includes('print')) {
          const printMatch = code.match(/print\(["'](.*)["']\)/);
          setCodeOutput(printMatch ? `>>> ${printMatch[1]}\n` : '>>> Code executed successfully\n');
        } else if (code.includes('return')) {
          setCodeOutput('>>> Function defined. Add test cases to see output.\n');
        } else {
          setCodeOutput('>>> Code executed successfully.\n');
        }
      } else {
        setCodeOutput('Code executed successfully.');
      }
    }, 500);
  };

  // Save and exit
  const handleSaveAndExit = async () => {
    try {
      await axios.post(`${API}/interviews/${sessionId}/save-exit`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Save and exit error:', err);
      navigate('/dashboard');
    }
  };

  // Change code language
  const handleLanguageChange = (lang) => {
    setCodeLanguage(lang);
    if (currentQuestion?.starter_code?.[lang]) {
      setCode(currentQuestion.starter_code[lang]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#A1A1AA]">Loading interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0A0A0A] flex flex-col overflow-hidden" data-testid="interview-room">
      {/* Hidden audio element for ElevenLabs */}
      <audio ref={audioRef} />
      
      {/* Header */}
      <header className="flex-shrink-0 glass border-b border-[#222222] px-4 py-3">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            {/* Exit Button */}
            <button 
              onClick={() => setShowExitDialog(true)}
              className="p-2 hover:bg-[#222222] rounded-lg transition-colors"
              data-testid="exit-btn"
            >
              <ArrowLeft className="w-5 h-5 text-[#A1A1AA]" />
            </button>
            
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-[#A1A1AA]">Dashboard</span>
              <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
              <span className="text-[#A1A1AA] capitalize">{interview?.track}</span>
              <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
              <span className="text-white">Interview</span>
            </div>
            
            {interview?.mode === 'real' && (
              <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium">
                REAL MODE
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[#A1A1AA]">
              <Clock className="w-4 h-4" />
              <span className="mono">{formatTime(elapsedTime)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#A1A1AA]">Q {questionNumber}/{totalQuestions}</span>
              <Progress value={(questionNumber / totalQuestions) * 100} className="w-20 h-2" />
            </div>
            
            {/* Camera toggle */}
            <button
              onClick={toggleCamera}
              className={`p-2 rounded-lg transition-colors ${cameraEnabled ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#222222] text-[#A1A1AA]'}`}
              data-testid="camera-toggle-btn"
            >
              {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2 rounded-lg hover:bg-[#222222] transition-colors"
              data-testid="voice-toggle-btn"
            >
              {voiceEnabled ? (
                <Volume2 className="w-5 h-5 text-[#7C3AED]" />
              ) : (
                <VolumeX className="w-5 h-5 text-[#A1A1AA]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Proctoring Warning */}
      <AnimatePresence>
        {proctoringWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg flex items-center gap-3 ${
              proctoringWarning.level === 'critical' ? 'bg-red-500/20 border border-red-500/50' :
              proctoringWarning.level === 'serious' ? 'bg-amber-500/20 border border-amber-500/50' :
              'bg-blue-500/20 border border-blue-500/50'
            }`}
          >
            <AlertTriangle className={`w-5 h-5 ${
              proctoringWarning.level === 'critical' ? 'text-red-400' :
              proctoringWarning.level === 'serious' ? 'text-amber-400' :
              'text-blue-400'
            }`} />
            <span className="text-white text-sm">{proctoringWarning.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 grid lg:grid-cols-2 overflow-hidden">
        {/* Left Panel - AI Interviewer */}
        <div className="flex flex-col p-6 border-r border-[#222222] overflow-hidden">
          {/* Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center mb-6">
            <div className="relative">
              {/* Animated Glow Ring */}
              <motion.div 
                className={`absolute inset-0 rounded-full ${isSpeaking ? 'bg-gradient-to-br from-[#7C3AED] to-[#2563EB]' : 'bg-[#222222]'}`}
                animate={isSpeaking ? {
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5]
                } : {
                  scale: 1,
                  opacity: 0.3
                }}
                transition={{
                  duration: 1.5,
                  repeat: isSpeaking ? Infinity : 0,
                  ease: "easeInOut"
                }}
                style={{ transform: 'scale(1.15)' }}
              />
              
              {/* Avatar Image */}
              <motion.div
                className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-[#111111] z-10"
                animate={{
                  scale: isSpeaking ? [1, 1.02, 1] : 1,
                  y: isListening ? [0, -2, 0] : 0
                }}
                transition={{
                  duration: isSpeaking ? 0.5 : 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {/* Abstract AI Avatar - Using gradient instead of photo */}
                <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] via-[#5B21B6] to-[#2563EB] flex items-center justify-center">
                  <div className="relative">
                    {/* Face silhouette */}
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <div className="space-y-2">
                        {/* Eyes */}
                        <div className="flex gap-4">
                          <motion.div 
                            className="w-2 h-2 rounded-full bg-white"
                            animate={isSpeaking ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                            transition={{ duration: 0.3, repeat: isSpeaking ? Infinity : 0 }}
                          />
                          <motion.div 
                            className="w-2 h-2 rounded-full bg-white"
                            animate={isSpeaking ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                            transition={{ duration: 0.3, repeat: isSpeaking ? Infinity : 0 }}
                          />
                        </div>
                        {/* Mouth - animates when speaking */}
                        <motion.div 
                          className="w-6 h-1 bg-white rounded-full mx-auto"
                          animate={isSpeaking ? {
                            scaleY: [1, 2, 1],
                            scaleX: [1, 0.8, 1]
                          } : { scaleY: 1, scaleX: 1 }}
                          transition={{ duration: 0.2, repeat: isSpeaking ? Infinity : 0 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Speaking indicator */}
              {isSpeaking && (
                <motion.div 
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#7C3AED] rounded-full flex items-center justify-center z-20"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Volume2 className="w-3 h-3 text-white" />
                </motion.div>
              )}
              
              {/* Thinking indicator */}
              {isThinking && (
                <motion.div 
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#2563EB] rounded-full flex items-center justify-center z-20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </div>
            
            <h3 className="text-white font-semibold mt-3">{avatarName}</h3>
            <p className="text-[#A1A1AA] text-sm">Technical Interviewer</p>
            
            {/* Status text */}
            <AnimatePresence mode="wait">
              {isThinking && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[#7C3AED] text-xs mt-2"
                >
                  Thinking<motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity }}>...</motion.span>
                </motion.p>
              )}
              {isListening && !isThinking && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[#2563EB] text-xs mt-2"
                >
                  Listening<motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity }}>...</motion.span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Current Question Card */}
          {currentQuestion && (
            <div className="flex-shrink-0 bg-[#111111] rounded-xl p-4 mb-4 border border-[#222222]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{currentQuestion.title || `Question ${questionNumber}`}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  currentQuestion.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                  currentQuestion.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {currentQuestion.difficulty}
                </span>
              </div>
              <p className="text-[#A1A1AA] text-sm">{currentQuestion.description}</p>
              
              {/* Hints button */}
              {currentQuestion.hints?.length > 0 && interview?.mode !== 'real' && (
                <button
                  onClick={() => setShowHints(!showHints)}
                  className="mt-3 flex items-center gap-1 text-xs text-[#7C3AED] hover:text-[#6D28D9]"
                >
                  <Lightbulb className="w-3 h-3" />
                  {showHints ? 'Hide hints' : 'Show hints'}
                </button>
              )}
              
              {showHints && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 p-2 bg-[#0A0A0A] rounded-lg"
                >
                  {currentQuestion.hints.map((hint, i) => (
                    <p key={i} className="text-xs text-[#A1A1AA]">• {hint}</p>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto transcript-container">
            <h4 className="text-sm text-[#A1A1AA] mb-3">Conversation</h4>
            <div className="space-y-3">
              {transcript.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`transcript-message ${msg.type === 'ai' ? 'transcript-ai' : 'transcript-user'} ${msg.isWarning ? 'border-amber-500/50' : ''}`}
                >
                  <p className="text-sm text-white">{msg.text}</p>
                </motion.div>
              ))}
              
              {/* Live transcript while listening */}
              {liveTranscript && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  className="transcript-message transcript-user opacity-50"
                >
                  <p className="text-sm text-white italic">{liveTranscript}...</p>
                </motion.div>
              )}
              
              <div ref={transcriptEndRef} />
            </div>
          </div>
          
          {/* Camera preview */}
          {cameraEnabled && (
            <div className="flex-shrink-0 mt-4">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-32 h-24 rounded-lg object-cover border border-[#222222]"
              />
            </div>
          )}
        </div>

        {/* Right Panel - Answer/Code */}
        <div className="flex flex-col p-6 bg-[#111111] overflow-hidden">
          {isCoding ? (
            /* Coding Mode - LeetCode Style */
            <>
              {/* Problem details for coding */}
              {currentQuestion?.examples?.length > 0 && (
                <div className="flex-shrink-0 mb-4 p-4 bg-[#0A0A0A] rounded-lg border border-[#222222] max-h-48 overflow-y-auto">
                  <h4 className="text-sm font-medium text-white mb-2">Examples:</h4>
                  {currentQuestion.examples.map((ex, i) => (
                    <div key={i} className="mb-2 text-xs">
                      <p className="text-[#A1A1AA]"><span className="text-[#7C3AED]">Input:</span> {ex.input}</p>
                      <p className="text-[#A1A1AA]"><span className="text-green-400">Output:</span> {ex.output}</p>
                      {ex.explanation && <p className="text-[#666666] italic">{ex.explanation}</p>}
                    </div>
                  ))}
                  
                  {currentQuestion.constraints?.length > 0 && (
                    <>
                      <h4 className="text-sm font-medium text-white mt-3 mb-2">Constraints:</h4>
                      {currentQuestion.constraints.map((c, i) => (
                        <p key={i} className="text-xs text-[#A1A1AA]">• {c}</p>
                      ))}
                    </>
                  )}
                  
                  {(currentQuestion.expected_time_complexity || currentQuestion.expected_space_complexity) && (
                    <div className="mt-3 flex gap-4">
                      {currentQuestion.expected_time_complexity && (
                        <p className="text-xs text-[#A1A1AA]">
                          <span className="text-[#7C3AED]">Time:</span> {currentQuestion.expected_time_complexity}
                        </p>
                      )}
                      {currentQuestion.expected_space_complexity && (
                        <p className="text-xs text-[#A1A1AA]">
                          <span className="text-[#7C3AED]">Space:</span> {currentQuestion.expected_space_complexity}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-[#7C3AED]" />
                  <span className="text-white font-medium">Code Editor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={codeLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-32 bg-[#0A0A0A] border-[#222222] text-white" data-testid="language-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111111] border-[#222222]">
                      <SelectItem value="python" className="text-white">Python</SelectItem>
                      <SelectItem value="javascript" className="text-white">JavaScript</SelectItem>
                      <SelectItem value="java" className="text-white">Java</SelectItem>
                      <SelectItem value="cpp" className="text-white">C++</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={runCode}
                    className="btn-secondary flex items-center gap-2 py-2"
                    data-testid="run-code-btn"
                  >
                    <Play className="w-4 h-4" />
                    Run
                  </button>
                </div>
              </div>
              
              <div className="flex-1 code-editor-container min-h-0">
                <Editor
                  height="100%"
                  language={codeLanguage === 'cpp' ? 'cpp' : codeLanguage}
                  value={code}
                  onChange={(value) => {
                    setCode(value || '');
                    resetSilenceTimer();
                  }}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
              
              {/* Output Terminal */}
              <div className="flex-shrink-0 mt-4 bg-[#0A0A0A] rounded-lg p-4 border border-[#222222]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-[#A1A1AA]">Output</span>
                </div>
                <pre className="mono text-sm text-[#A1A1AA] whitespace-pre-wrap">
                  {codeOutput || 'Click "Run" to execute your code...'}
                </pre>
              </div>
            </>
          ) : (
            /* Theory Mode - Voice Only for Theory Questions */
            <>
              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <Mic className="w-5 h-5 text-[#7C3AED]" />
                <span className="text-white font-medium">Voice Answer</span>
                <span className="text-xs text-[#A1A1AA]">(Speak your answer)</span>
              </div>
              
              {/* Live transcript display */}
              <div className="flex-1 bg-[#0A0A0A] border border-[#222222] rounded-xl p-4 overflow-y-auto">
                {answer ? (
                  <p className="text-white">{answer}</p>
                ) : (
                  <p className="text-[#666666] italic">
                    {isListening ? 'Listening... speak now' : 'Click the microphone to start speaking'}
                  </p>
                )}
                
                {liveTranscript && (
                  <p className="text-[#A1A1AA] italic mt-2">{liveTranscript}...</p>
                )}
              </div>
              
              {/* Large microphone button for theory */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center py-8">
                <button
                  onClick={toggleListening}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                    isListening 
                      ? 'bg-[#2563EB] shadow-[0_0_40px_rgba(37,99,235,0.5)]' 
                      : 'bg-[#222222] hover:bg-[#333333]'
                  }`}
                  data-testid="mic-btn"
                >
                  <motion.div
                    animate={isListening ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                    transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
                  >
                    {isListening ? (
                      <Mic className="w-10 h-10 text-white" />
                    ) : (
                      <MicOff className="w-10 h-10 text-[#A1A1AA]" />
                    )}
                  </motion.div>
                </button>
                
                <p className="mt-4 text-sm text-[#A1A1AA]">
                  {isListening ? 'Listening... tap to stop' : 'Tap to speak'}
                </p>
                
                {silenceTimer > 5 && !isListening && (
                  <p className="mt-2 text-xs text-amber-400">
                    Waiting for your response... ({silenceTimer}s)
                  </p>
                )}
              </div>
            </>
          )}

          {/* Submit Controls */}
          <div className="flex-shrink-0 flex items-center justify-between mt-4 pt-4 border-t border-[#222222]">
            <div className="flex items-center gap-3">
              {isCoding && (
                <button
                  onClick={toggleListening}
                  className={`p-3 rounded-full ${isListening ? 'bg-[#2563EB]' : 'bg-[#222222] hover:bg-[#333333]'}`}
                  data-testid="coding-mic-btn"
                >
                  {isListening ? (
                    <Mic className="w-5 h-5 text-white" />
                  ) : (
                    <MicOff className="w-5 h-5 text-[#A1A1AA]" />
                  )}
                </button>
              )}
              
              {isListening && (
                <span className="text-sm text-[#2563EB] animate-pulse">Listening...</span>
              )}
            </div>
            
            <button
              onClick={() => submitAnswer(false)}
              disabled={isSubmitting || (!answer.trim() && !code.trim())}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-answer-btn"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Submit Answer
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-[#111111] border-[#222222]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Exit Interview?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#A1A1AA]">
              Are you sure you want to exit? Your progress will be saved and you can continue later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#222222] border-[#333333] text-white hover:bg-[#333333]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSaveAndExit}
              className="bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
            >
              Save & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InterviewRoom;
