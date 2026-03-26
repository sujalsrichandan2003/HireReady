import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Code, Binary, Braces, Users, Server, BarChart, Coffee, Brain, Layout, Database,
  Play, History, TrendingUp, Target, MessageSquare, Settings, LogOut, ChevronRight,
  Calendar, Award, AlertCircle
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer
} from 'recharts';

const trackIcons = {
  python: Code,
  dsa: Binary,
  javascript: Braces,
  hr: Users,
  'system-design': Server,
  'data-analyst': BarChart,
  java: Coffee,
  'ai-ml': Brain,
  frontend: Layout,
  backend: Database,
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [recommendation, setRecommendation] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [loading, setLoading] = useState(true);
  const [startingInterview, setStartingInterview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tracksRes, interviewsRes, statsRes, recRes] = await Promise.all([
        axios.get(`${API}/tracks`),
        axios.get(`${API}/interviews/history`),
        axios.get(`${API}/progress/stats`),
        axios.get(`${API}/progress/recommendations`)
      ]);
      
      setTracks(tracksRes.data);
      setInterviews(interviewsRes.data);
      setStats(statsRes.data);
      setRecommendation(recRes.data.recommendation);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    if (!selectedTrack) return;
    
    setStartingInterview(true);
    try {
      const response = await axios.post(`${API}/interviews/start`, {
        track: selectedTrack,
        difficulty: selectedDifficulty
      });
      navigate(`/interview/${response.data.session_id}`);
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setStartingInterview(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Prepare radar chart data
  const radarData = stats?.topic_scores ? Object.entries(stats.topic_scores).map(([topic, score]) => ({
    topic: topic.charAt(0).toUpperCase() + topic.slice(1),
    score: Math.round(score),
    fullMark: 100
  })) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="dashboard">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-['Outfit'] text-white">MockMate</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/progress')}
                className="flex items-center gap-2 text-[#A1A1AA] hover:text-white transition-colors"
                data-testid="progress-nav-btn"
              >
                <TrendingUp className="w-5 h-5" />
                <span className="hidden sm:inline">Progress</span>
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 text-[#A1A1AA] hover:text-white transition-colors"
                data-testid="settings-nav-btn"
              >
                <Settings className="w-5 h-5" />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <div className="flex items-center gap-3">
                <img 
                  src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=7C3AED&color=fff`}
                  alt={user?.name}
                  className="w-8 h-8 rounded-full"
                />
                <button 
                  onClick={logout}
                  className="text-[#A1A1AA] hover:text-white transition-colors"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold font-['Outfit'] text-white mb-2">
            {getGreeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-[#A1A1AA]">Ready to practice today?</p>
        </motion.div>

        {/* Start Interview Section */}
        <motion.div 
          className="card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold mb-6 text-white">Start New Interview</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Track Selection */}
            <div className="sm:col-span-2">
              <label className="block text-sm text-[#A1A1AA] mb-2">Select Track</label>
              <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                <SelectTrigger className="bg-[#0A0A0A] border-[#222222] text-white" data-testid="track-select">
                  <SelectValue placeholder="Choose interview track" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-[#222222]">
                  {tracks.map((track) => (
                    <SelectItem key={track.id} value={track.id} className="text-white hover:bg-[#222222]">
                      {track.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Difficulty */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-2">Difficulty</label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="bg-[#0A0A0A] border-[#222222] text-white" data-testid="difficulty-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-[#222222]">
                  <SelectItem value="easy" className="text-white hover:bg-[#222222]">Easy</SelectItem>
                  <SelectItem value="medium" className="text-white hover:bg-[#222222]">Medium</SelectItem>
                  <SelectItem value="hard" className="text-white hover:bg-[#222222]">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Start Button */}
            <div className="flex items-end">
              <button 
                onClick={startInterview}
                disabled={!selectedTrack || startingInterview}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="start-interview-btn"
              >
                {startingInterview ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Interview
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Track Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {tracks.map((track) => {
              const Icon = trackIcons[track.id] || Code;
              return (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrack(track.id)}
                  className={`p-4 rounded-xl border transition-all ${
                    selectedTrack === track.id 
                      ? 'bg-[#7C3AED]/10 border-[#7C3AED]' 
                      : 'bg-[#0A0A0A] border-[#222222] hover:border-[#333333]'
                  }`}
                  data-testid={`track-btn-${track.id}`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${selectedTrack === track.id ? 'text-[#7C3AED]' : 'text-[#A1A1AA]'}`} />
                  <p className={`text-xs text-center ${selectedTrack === track.id ? 'text-white' : 'text-[#A1A1AA]'}`}>
                    {track.name}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Stats and AI Recommendation */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <motion.div 
            className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="card stats-card">
              <div className="flex items-center gap-3 mb-2">
                <History className="w-5 h-5 text-[#7C3AED]" />
                <span className="text-sm text-[#A1A1AA]">Total Sessions</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.total_sessions || 0}</p>
            </div>
            
            <div className="card stats-card">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-5 h-5 text-[#2563EB]" />
                <span className="text-sm text-[#A1A1AA]">Avg Score</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.average_score || 0}%</p>
            </div>
            
            <div className="card stats-card">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm text-[#A1A1AA]">Strongest</span>
              </div>
              <p className="text-lg font-semibold text-white truncate">{stats?.strongest_topic || 'N/A'}</p>
            </div>
            
            <div className="card stats-card">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-[#A1A1AA]">Focus Area</span>
              </div>
              <p className="text-lg font-semibold text-white truncate">{stats?.weakest_topic || 'N/A'}</p>
            </div>
          </motion.div>
          
          {/* AI Recommendation */}
          <motion.div 
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-[#7C3AED]" />
              <h3 className="font-semibold text-white">AI Recommendation</h3>
            </div>
            <p className="text-sm text-[#A1A1AA]">{recommendation || 'Start your first interview to get personalized recommendations!'}</p>
          </motion.div>
        </div>

        {/* Performance Radar Chart */}
        {radarData.length > 0 && (
          <motion.div 
            className="card mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-xl font-semibold mb-4 text-white">Performance Overview</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#222222" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: '#A1A1AA', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#A1A1AA' }} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#7C3AED"
                    fill="#7C3AED"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Past Interviews Table */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Past Interviews</h2>
            <button 
              onClick={() => navigate('/progress')}
              className="text-sm text-[#7C3AED] hover:text-[#6D28D9] flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {interviews.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-[#A1A1AA] mx-auto mb-4" />
              <p className="text-[#A1A1AA]">No interviews yet. Start your first one!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#222222]">
                    <TableHead className="text-[#A1A1AA]">Date</TableHead>
                    <TableHead className="text-[#A1A1AA]">Track</TableHead>
                    <TableHead className="text-[#A1A1AA]">Status</TableHead>
                    <TableHead className="text-[#A1A1AA]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interviews.slice(0, 5).map((interview) => (
                    <TableRow key={interview.session_id} className="border-[#222222]">
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#A1A1AA]" />
                          {formatDate(interview.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-white capitalize">{interview.track}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          interview.status === 'completed' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {interview.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {interview.status === 'completed' ? (
                          <button 
                            onClick={async () => {
                              try {
                                const res = await axios.get(`${API}/reports`);
                                const report = res.data.find(r => r.session_id === interview.session_id);
                                if (report) {
                                  navigate(`/report/${report.report_id}`);
                                } else {
                                  // Generate report if not exists
                                  const newReport = await axios.post(`${API}/interviews/${interview.session_id}/complete`);
                                  navigate(`/report/${newReport.data.report_id}`);
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="text-sm text-[#7C3AED] hover:text-[#6D28D9]"
                            data-testid={`view-report-${interview.session_id}`}
                          >
                            View Report
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigate(`/interview/${interview.session_id}`)}
                            className="text-sm text-[#2563EB] hover:text-[#1D4ED8]"
                          >
                            Continue
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
