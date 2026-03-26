import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, TrendingUp, Calendar, Target, Award, Brain,
  MessageSquare, BarChart as BarChartIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

const Progress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, reportsRes, recRes] = await Promise.all([
        axios.get(`${API}/progress/stats`),
        axios.get(`${API}/reports`),
        axios.get(`${API}/progress/recommendations`)
      ]);
      
      setStats(statsRes.data);
      setReports(reportsRes.data);
      setRecommendation(recRes.data.recommendation);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  const formatFullDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Prepare line chart data for score history
  const scoreHistory = stats?.score_history?.map(item => ({
    date: formatDate(item.date),
    score: item.score,
    track: item.track
  })) || [];

  // Prepare weakness heatmap data
  const weaknessData = stats?.weak_topics?.map(item => ({
    topic: item.topic,
    count: item.count
  })) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="progress-page">
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
                <span className="text-xl font-bold font-['Outfit'] text-white">My Progress</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="card stats-card">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-[#7C3AED]" />
              <span className="text-sm text-[#A1A1AA]">Total Sessions</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.total_sessions || 0}</p>
          </div>
          
          <div className="card stats-card">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-[#2563EB]" />
              <span className="text-sm text-[#A1A1AA]">Average Score</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.average_score || 0}%</p>
          </div>
          
          <div className="card stats-card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm text-[#A1A1AA]">Strongest Topic</span>
            </div>
            <p className="text-lg font-semibold text-white truncate">{stats?.strongest_topic || 'N/A'}</p>
          </div>
          
          <div className="card stats-card">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-[#A1A1AA]">Needs Focus</span>
            </div>
            <p className="text-lg font-semibold text-white truncate">{stats?.weakest_topic || 'N/A'}</p>
          </div>
        </motion.div>

        {/* AI Insight */}
        <motion.div 
          className="card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-[#7C3AED]" />
            <h3 className="font-semibold text-white">AI Insight</h3>
          </div>
          <p className="text-[#A1A1AA]">{recommendation}</p>
        </motion.div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Score Trend */}
          <motion.div 
            className="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Score Improvement Over Time</h3>
            {scoreHistory.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                    <XAxis dataKey="date" tick={{ fill: '#A1A1AA' }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#A1A1AA' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111111', border: '1px solid #222222' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#7C3AED" 
                      strokeWidth={2}
                      dot={{ fill: '#7C3AED', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#7C3AED' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-[#A1A1AA]">Complete more interviews to see your progress</p>
              </div>
            )}
          </motion.div>

          {/* Weakness Heatmap */}
          <motion.div 
            className="card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Areas Needing Improvement</h3>
            {weaknessData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weaknessData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                    <XAxis type="number" tick={{ fill: '#A1A1AA' }} />
                    <YAxis type="category" dataKey="topic" tick={{ fill: '#A1A1AA' }} width={120} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111111', border: '1px solid #222222' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {weaknessData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index < 2 ? '#EF4444' : index < 4 ? '#F59E0B' : '#22C55E'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-[#A1A1AA]">No weakness data available yet</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* All Sessions Table */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">All Interview Sessions</h3>
          
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <BarChartIcon className="w-12 h-12 text-[#A1A1AA] mx-auto mb-4" />
              <p className="text-[#A1A1AA]">No completed interviews yet</p>
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-primary mt-4"
              >
                Start Your First Interview
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#222222]">
                    <TableHead className="text-[#A1A1AA]">Date</TableHead>
                    <TableHead className="text-[#A1A1AA]">Track</TableHead>
                    <TableHead className="text-[#A1A1AA]">Overall Score</TableHead>
                    <TableHead className="text-[#A1A1AA]">Technical</TableHead>
                    <TableHead className="text-[#A1A1AA]">Communication</TableHead>
                    <TableHead className="text-[#A1A1AA]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.report_id} className="border-[#222222]">
                      <TableCell className="text-white">{formatFullDate(report.created_at)}</TableCell>
                      <TableCell className="text-white capitalize">{report.track}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          report.overall_score >= 80 ? 'bg-green-500/20 text-green-400' :
                          report.overall_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {report.overall_score}%
                        </span>
                      </TableCell>
                      <TableCell className="text-[#A1A1AA]">{report.technical_score}%</TableCell>
                      <TableCell className="text-[#A1A1AA]">{report.communication_score}%</TableCell>
                      <TableCell>
                        <button 
                          onClick={() => navigate(`/report/${report.report_id}`)}
                          className="text-sm text-[#7C3AED] hover:text-[#6D28D9]"
                        >
                          View Report
                        </button>
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

export default Progress;
