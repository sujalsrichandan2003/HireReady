import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Award, TrendingUp, MessageSquare, Code, Sparkles, BookOpen,
  ArrowLeft, Home, RotateCcw, CheckCircle, AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

const Report = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const response = await axios.get(`${API}/reports/${reportId}`);
      setReport(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-[#A1A1AA]">Report not found</p>
      </div>
    );
  }

  // Prepare chart data
  const barChartData = [
    { name: 'Technical', score: report.technical_score, fill: '#7C3AED' },
    { name: 'Communication', score: report.communication_score, fill: '#2563EB' },
    { name: 'Problem Solving', score: report.problem_solving_score, fill: '#10B981' },
    { name: 'Code Quality', score: report.code_quality_score, fill: '#F59E0B' },
    { name: 'Clarity', score: report.clarity_score, fill: '#EC4899' },
  ];

  const radarData = [
    { subject: 'Technical', A: report.technical_score, fullMark: 100 },
    { subject: 'Communication', A: report.communication_score, fullMark: 100 },
    { subject: 'Problem Solving', A: report.problem_solving_score, fullMark: 100 },
    { subject: 'Code Quality', A: report.code_quality_score, fullMark: 100 },
    { subject: 'Clarity', A: report.clarity_score, fullMark: 100 },
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 60) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="report-page">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-[#222222] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#A1A1AA]" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold font-['Outfit'] text-white">Interview Report</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 mb-6">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-sm text-[#7C3AED]">Interview Complete</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-['Outfit'] text-white mb-4">
            Here's Your Report
          </h1>
          <p className="text-[#A1A1AA] capitalize">{report.track} Interview</p>
        </motion.div>

        {/* Overall Score */}
        <motion.div 
          className="card text-center mb-8 max-w-md mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBg(report.overall_score)} mb-4`}>
            <span className={`text-5xl font-bold ${getScoreColor(report.overall_score)}`}>
              {report.overall_score}
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Overall Score</h2>
          <p className="text-[#A1A1AA]">
            {report.overall_score >= 80 ? 'Excellent performance!' : 
             report.overall_score >= 60 ? 'Good job, keep improving!' : 
             'Keep practicing, you\'ll get better!'}
          </p>
        </motion.div>

        {/* Score Cards Grid */}
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {[
            { label: 'Technical', score: report.technical_score, icon: Code },
            { label: 'Communication', score: report.communication_score, icon: MessageSquare },
            { label: 'Problem Solving', score: report.problem_solving_score, icon: TrendingUp },
            { label: 'Code Quality', score: report.code_quality_score, icon: CheckCircle },
            { label: 'Clarity', score: report.clarity_score, icon: Sparkles },
          ].map((item, idx) => (
            <div key={idx} className="card text-center">
              <item.icon className={`w-6 h-6 mx-auto mb-2 ${getScoreColor(item.score)}`} />
              <p className={`text-2xl font-bold ${getScoreColor(item.score)}`}>{item.score}</p>
              <p className="text-xs text-[#A1A1AA]">{item.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Bar Chart */}
          <motion.div 
            className="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Score Breakdown</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#A1A1AA' }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA' }} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111111', border: '1px solid #222222' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Radar Chart */}
          <motion.div 
            className="card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Skill Coverage</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#222222" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#A1A1AA', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#A1A1AA' }} />
                  <Radar
                    name="Score"
                    dataKey="A"
                    stroke="#7C3AED"
                    fill="#7C3AED"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Strengths */}
          <motion.div 
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-white">Strengths</h3>
            </div>
            <ul className="space-y-3">
              {report.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></div>
                  <span className="text-[#A1A1AA]">{strength}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Areas to Improve */}
          <motion.div 
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-white">Areas to Improve</h3>
            </div>
            <ul className="space-y-3">
              {report.improvements.map((improvement, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></div>
                  <span className="text-[#A1A1AA]">{improvement}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Topics to Study */}
        <motion.div 
          className="card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-[#7C3AED]" />
            <h3 className="text-lg font-semibold text-white">Topics to Study</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.topics_to_study.map((topic, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-full text-sm text-[#7C3AED]">
                {topic}
              </span>
            ))}
          </div>
        </motion.div>

        {/* AI Summary */}
        <motion.div 
          className="card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#7C3AED]" />
            <h3 className="text-lg font-semibold text-white">AI Summary</h3>
          </div>
          <p className="text-[#A1A1AA] leading-relaxed">{report.ai_summary}</p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary flex items-center gap-2"
            data-testid="practice-again-btn"
          >
            <RotateCcw className="w-5 h-5" />
            Practice Again
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary flex items-center gap-2"
            data-testid="go-dashboard-btn"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </button>
        </motion.div>
      </main>
    </div>
  );
};

export default Report;
