import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import { 
  Mic, MicOff, Send, Play, Clock, ChevronRight, MessageSquare,
  Code, Volume2, VolumeX, Loader2
} from 'lucide-react';
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const InterviewRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isCoding, setIsCoding] = useState(false);
  const [answer, setAnswer] = useState('');
  const [code, setCode] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('python');
  const [transcript, setTranscript] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [codeOutput, setCodeOutput] = useState('');
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);

  // Avatar based on user settings
  const avatarName = user?.avatar_choice === 'arjun' ? 'Arjun' : 'Priya';
  const avatarImage = user?.avatar_choice === 'arjun' 
    ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop'
    : 'https://images.unsplash.com/photo-1677212004257-103cfa6b59d0?w=300&h=300&fit=crop';

  // Initialize interview
  useEffect(() => {
    fetchInterview();
    startTimer();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      synthRef.current.cancel();
    };
  }, [sessionId]);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const fetchInterview = async () => {
    try {
      const response = await axios.get(`${API}/interviews/${sessionId}`);
      setInterview(response.data);
      
      const questions = response.data.questions;
      const currentIdx = response.data.current_question_index;
      
      if (questions.length > 0 && currentIdx < questions.length) {
        const q = questions[currentIdx];
        setCurrentQuestion(q.question);
        setQuestionNumber(currentIdx + 1);
        setIsCoding(q.is_coding || q.question.toUpperCase().includes('CODING QUESTION:'));
        
        // Add to transcript
        setTranscript([{ type: 'ai', text: q.question }]);
        
        // Speak question if voice enabled
        if (voiceEnabled) {
          speakText(q.question);
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Text-to-Speech
  const speakText = useCallback((text) => {
    if (!voiceEnabled) return;
    
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice based on avatar
    const voices = synthRef.current.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female'));
    const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('Google UK English Male'));
    
    utterance.voice = user?.avatar_choice === 'arjun' ? maleVoice : femaleVoice;
    utterance.rate = user?.voice_speed === 'slow' ? 0.8 : user?.voice_speed === 'fast' ? 1.2 : 1;
    utterance.pitch = user?.avatar_choice === 'arjun' ? 0.9 : 1.1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
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

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setAnswer(prev => prev + ' ' + finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
    setIsListening(true);
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!answer.trim() && !code.trim()) return;
    
    setIsSubmitting(true);
    synthRef.current.cancel();
    
    // Add user answer to transcript
    setTranscript(prev => [...prev, { type: 'user', text: answer || 'Code submitted' }]);
    
    try {
      const response = await axios.post(`${API}/interviews/answer`, {
        session_id: sessionId,
        answer: answer,
        code: code || null
      });
      
      const { feedback, is_complete, next_question, question_number, is_coding } = response.data;
      
      // Add AI feedback to transcript
      setTranscript(prev => [...prev, { type: 'ai', text: feedback }]);
      
      if (voiceEnabled) {
        speakText(feedback);
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
      } else {
        // Move to next question
        setTimeout(() => {
          setCurrentQuestion(next_question);
          setQuestionNumber(question_number);
          setIsCoding(is_coding);
          setAnswer('');
          setCode('');
          setCodeOutput('');
          
          // Add next question to transcript
          setTranscript(prev => [...prev, { type: 'ai', text: next_question }]);
          
          if (voiceEnabled) {
            speakText(next_question);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run code (simulation)
  const runCode = () => {
    setCodeOutput('Running code...\n');
    
    setTimeout(() => {
      // Simulate code execution
      if (codeLanguage === 'python') {
        if (code.includes('print')) {
          const printMatch = code.match(/print\(["'](.*)["']\)/);
          setCodeOutput(printMatch ? printMatch[1] + '\n' : 'Output: (executed successfully)');
        } else {
          setCodeOutput('Code executed successfully.\n>>> ');
        }
      } else {
        setCodeOutput('Code executed successfully.');
      }
    }, 500);
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
      {/* Header */}
      <header className="flex-shrink-0 glass border-b border-[#222222] px-4 py-3">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-semibold capitalize">{interview?.track} Interview</span>
              <span className="text-[#A1A1AA] text-sm ml-2">({interview?.difficulty})</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[#A1A1AA]">
              <Clock className="w-4 h-4" />
              <span className="mono">{formatTime(elapsedTime)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#A1A1AA]">Question {questionNumber}/10</span>
              <Progress value={(questionNumber / 10) * 100} className="w-24 h-2" />
            </div>
            
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

      {/* Main Content */}
      <div className="flex-1 grid lg:grid-cols-2 overflow-hidden">
        {/* Left Panel - AI Interviewer */}
        <div className="flex flex-col p-6 border-r border-[#222222] overflow-hidden">
          {/* Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center mb-6">
            <div className="relative">
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2563EB] ${isSpeaking ? 'animate-pulse-ring' : 'opacity-50'}`} 
                style={{ transform: 'scale(1.1)' }}></div>
              <img 
                src={avatarImage}
                alt={avatarName}
                className="w-24 h-24 rounded-full object-cover relative z-10 border-4 border-[#111111]"
              />
              {isSpeaking && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#7C3AED] rounded-full flex items-center justify-center z-20">
                  <Volume2 className="w-3 h-3 text-white animate-pulse" />
                </div>
              )}
            </div>
            <h3 className="text-white font-semibold mt-3">{avatarName}</h3>
            <p className="text-[#A1A1AA] text-sm">Technical Interviewer</p>
          </div>

          {/* Current Question */}
          <div className="flex-shrink-0 bg-[#111111] rounded-xl p-4 mb-4 border border-[#222222]">
            <p className="text-white text-sm">{currentQuestion}</p>
          </div>

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto transcript-container">
            <h4 className="text-sm text-[#A1A1AA] mb-3">Conversation</h4>
            <div className="space-y-3">
              {transcript.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`transcript-message ${msg.type === 'ai' ? 'transcript-ai' : 'transcript-user'}`}
                >
                  <p className="text-sm text-white">{msg.text}</p>
                </motion.div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>

        {/* Right Panel - Answer/Code */}
        <div className="flex flex-col p-6 bg-[#111111] overflow-hidden">
          {isCoding ? (
            /* Code Editor Mode */
            <>
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-[#7C3AED]" />
                  <span className="text-white font-medium">Code Editor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={codeLanguage} onValueChange={setCodeLanguage}>
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
                  language={codeLanguage}
                  value={code}
                  onChange={(value) => setCode(value || '')}
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
            /* Text Answer Mode */
            <>
              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-[#7C3AED]" />
                <span className="text-white font-medium">Your Answer</span>
              </div>
              
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here or use the microphone..."
                className="flex-1 bg-[#0A0A0A] border border-[#222222] rounded-xl p-4 text-white placeholder-[#A1A1AA] resize-none focus:outline-none focus:border-[#7C3AED] transition-colors"
                data-testid="answer-textarea"
              />
            </>
          )}

          {/* Controls */}
          <div className="flex-shrink-0 flex items-center justify-between mt-4 pt-4 border-t border-[#222222]">
            <button
              onClick={toggleListening}
              className={`mic-button ${isListening ? 'listening bg-[#2563EB]' : 'bg-[#222222] hover:bg-[#333333]'}`}
              data-testid="mic-btn"
            >
              {isListening ? (
                <Mic className="w-6 h-6 text-white" />
              ) : (
                <MicOff className="w-6 h-6 text-[#A1A1AA]" />
              )}
            </button>
            
            <div className="flex items-center gap-3">
              {isListening && (
                <span className="text-sm text-[#2563EB] animate-pulse">Listening...</span>
              )}
              
              <button
                onClick={submitAnswer}
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
      </div>
    </div>
  );
};

export default InterviewRoom;
