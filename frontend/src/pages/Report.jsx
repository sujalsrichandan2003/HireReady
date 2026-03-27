import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Award, TrendingUp, MessageSquare, Code, Sparkles, BookOpen,
  ArrowLeft, Home, RotateCcw, CheckCircle, AlertCircle, Download,
  Share2, Linkedin, Twitter, Shield, Zap, GraduationCap
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

const Report = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef(null);

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

  const downloadPDF = async () => {
    if (!certificateRef.current) return;
    
    setDownloading(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#0A0A0A'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`MockMate_Report_${report.track}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const shareToLinkedIn = () => {
    const text = `I just completed a ${report.track} interview on MockMate and scored ${report.overall_score}%! 🎯 #MockMate #InterviewPrep #TechInterview`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = `Just scored ${report.overall_score}% on my ${report.track} mock interview with MockMate! 🚀 AI-powered interview practice is the future. #MockMate #TechInterview`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
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
    { name: 'Confidence', score: report.confidence_score || 70, fill: '#8B5CF6' },
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

  const getGradeColor = (grade) => {
    const colors = {
      'A': 'from-green-500 to-emerald-500',
      'B': 'from-blue-500 to-cyan-500',
      'C': 'from-yellow-500 to-orange-500',
      'D': 'from-orange-500 to-red-500',
      'F': 'from-red-500 to-red-700'
    };
    return colors[grade] || colors['C'];
  };

  const getRecommendationColor = (rec) => {
    if (rec === 'Strong Hire') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (rec === 'Hire') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (rec === 'Borderline') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
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
              {report.mode === 'real' && (
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Real Mode
                </span>
              )}
            </div>
            
            {/* Share/Download buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={shareToLinkedIn}
                className="p-2 hover:bg-[#222222] rounded-lg transition-colors"
                title="Share on LinkedIn"
              >
                <Linkedin className="w-5 h-5 text-[#0A66C2]" />
              </button>
              <button
                onClick={shareToTwitter}
                className="p-2 hover:bg-[#222222] rounded-lg transition-colors"
                title="Share on Twitter"
              >
                <Twitter className="w-5 h-5 text-[#1DA1F2]" />
              </button>
              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="btn-secondary flex items-center gap-2"
              >
                {downloading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Certificate Card (for PDF) */}
        <div ref={certificateRef} className="mb-8">
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
              {user?.name}'s Report
            </h1>
            <p className="text-[#A1A1AA] capitalize">{report.track} Interview • {new Date(report.created_at).toLocaleDateString()}</p>
          </motion.div>

          {/* Grade and Score */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Overall Score */}
            <motion.div 
              className="card text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full ${getScoreBg(report.overall_score)} mb-4`}>
                <span className={`text-5xl font-bold ${getScoreColor(report.overall_score)}`}>
                  {report.overall_score}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-1">Overall Score</h2>
              <p className="text-[#A1A1AA] text-sm">out of 100</p>
            </motion.div>

            {/* Grade */}
            <motion.div 
              className="card text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
            >
              <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br ${getGradeColor(report.grade)} mb-4`}>
                <span className="text-5xl font-bold text-white">
                  {report.grade}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-1">Grade</h2>
              <p className="text-[#A1A1AA] text-sm">Performance Level</p>
            </motion.div>

            {/* Hiring Recommendation */}
            <motion.div 
              className="card text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className={`inline-flex items-center justify-center px-6 py-4 rounded-xl border mb-4 ${getRecommendationColor(report.hiring_recommendation)}`}>
                <span className="text-2xl font-bold">
                  {report.hiring_recommendation}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-1">Recommendation</h2>
              <p className="text-[#A1A1AA] text-sm">Simulated Hiring Decision</p>
            </motion.div>
          </div>
        </div>

        {/* Score Cards Grid */}
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {[
            { label: 'Technical', score: report.technical_score, icon: Code },
            { label: 'Communication', score: report.communication_score, icon: MessageSquare },
            { label: 'Problem Solving', score: report.problem_solving_score, icon: TrendingUp },
            { label: 'Code Quality', score: report.code_quality_score, icon: CheckCircle },
            { label: 'Clarity', score: report.clarity_score, icon: Sparkles },
            { label: 'Integrity', score: report.integrity_score, icon: Shield },
          ].map((item, idx) => (
            <div key={idx} className="card text-center">
              <item.icon className={`w-5 h-5 mx-auto mb-2 ${getScoreColor(item.score)}`} />
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

        {/* Interview Coaching Section */}
        {report.coaching_feedback && report.coaching_feedback.length > 0 && (
          <motion.div 
            className="card mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-[#7C3AED]" />
              <h3 className="text-lg font-semibold text-white">Interview Coaching</h3>
            </div>
            <p className="text-[#A1A1AA] text-sm mb-4">Detailed feedback on your weak answers with suggestions for improvement:</p>
            
            <Accordion type="single" collapsible className="space-y-2">
              {report.coaching_feedback.map((feedback, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="border border-[#222222] rounded-lg px-4">
                  <AccordionTrigger className="text-white hover:no-underline">
                    <span className="text-left">Question {(feedback.question_index || idx) + 1}</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <div>
                      <h4 className="text-sm font-medium text-[#A1A1AA] mb-1">What you said:</h4>
                      <p className="text-white text-sm bg-[#0A0A0A] p-3 rounded-lg">
                        {feedback.what_candidate_said || "Answer not recorded"}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-orange-400 mb-1">Why it was weak:</h4>
                      <p className="text-[#A1A1AA] text-sm">
                        {feedback.why_weak}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-green-400 mb-1">Better approach:</h4>
                      <p className="text-[#A1A1AA] text-sm bg-green-500/5 border border-green-500/20 p-3 rounded-lg">
                        {feedback.correct_approach}
                      </p>
                    </div>
                    
                    {feedback.tip && (
                      <div className="flex items-start gap-2 p-3 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg">
                        <Sparkles className="w-4 h-4 text-[#7C3AED] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-[#A1A1AA]">{feedback.tip}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        )}

        {/* Proctoring Notes */}
        {report.proctoring_notes && report.proctoring_notes.length > 0 && (
          <motion.div 
            className="card mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-[#7C3AED]" />
              <h3 className="text-lg font-semibold text-white">Integrity Report</h3>
            </div>
            <ul className="space-y-2">
              {report.proctoring_notes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 ${
                    note.includes('Excellent') || note.includes('no integrity') 
                      ? 'bg-green-500' 
                      : 'bg-amber-500'
                  }`}></div>
                  <span className="text-[#A1A1AA] text-sm">{note}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Topics to Study */}
        <motion.div 
          className="card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
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
