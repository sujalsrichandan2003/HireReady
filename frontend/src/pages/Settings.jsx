import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Settings as SettingsIcon, Volume2, Languages,
  MessageSquare, Save, Trash2, LogOut, Key, ExternalLink, Mic
} from 'lucide-react';
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
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState({
    avatar_choice: user?.avatar_choice || 'priya',
    language_preference: user?.language_preference || 'english',
    voice_speed: user?.voice_speed || 'normal',
    elevenlabs_api_key: user?.elevenlabs_api_key || ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const testVoice = async () => {
    if (!settings.elevenlabs_api_key) {
      alert('Please enter your ElevenLabs API key first');
      return;
    }
    
    setTestingVoice(true);
    try {
      // Save key first
      await axios.put(`${API}/settings`, { elevenlabs_api_key: settings.elevenlabs_api_key });
      
      // Test TTS
      const response = await axios.post(`${API}/tts/generate`, {
        text: `Hello! I'm ${settings.avatar_choice === 'arjun' ? 'Arjun' : 'Priya'}, your AI interviewer. How are you doing today?`,
        voice_id: settings.avatar_choice === 'arjun' ? '29vD33N1CtxCmqQRPOHJ' : '21m00Tcm4TlvDq8ikWAM'
      });
      
      if (!response.data.use_web_speech && response.data.audio_data) {
        const audio = new Audio(response.data.audio_data);
        audio.play();
      } else {
        // Fallback to Web Speech
        const utterance = new SpeechSynthesisUtterance(`Hello! I'm ${settings.avatar_choice === 'arjun' ? 'Arjun' : 'Priya'}, your AI interviewer.`);
        window.speechSynthesis.speak(utterance);
        alert('ElevenLabs not available. Using browser voice instead.');
      }
    } catch (error) {
      console.error('Voice test error:', error);
      alert('Failed to test voice. Please check your API key.');
    } finally {
      setTestingVoice(false);
    }
  };

  const handleDeleteAccount = async () => {
    alert('Account deletion requested. This feature is coming soon.');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="settings-page">
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
                <span className="text-xl font-bold font-['Outfit'] text-white">Settings</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Section */}
        <motion.div 
          className="card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-[#7C3AED]" />
            <h2 className="text-lg font-semibold text-white">Profile</h2>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <img 
              src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=7C3AED&color=fff`}
              alt={user?.name}
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h3 className="text-white font-medium">{user?.name}</h3>
              <p className="text-[#A1A1AA] text-sm">{user?.email}</p>
              <p className="text-xs text-[#666666] capitalize mt-1">
                {user?.auth_type === 'google' ? 'Signed in with Google' : 'Email account'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Voice Settings (ElevenLabs) */}
        <motion.div 
          className="card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Mic className="w-5 h-5 text-[#7C3AED]" />
            <h2 className="text-lg font-semibold text-white">Voice Settings (ElevenLabs)</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                ElevenLabs API Key
              </label>
              <input
                type="password"
                value={settings.elevenlabs_api_key}
                onChange={(e) => setSettings({ ...settings, elevenlabs_api_key: e.target.value })}
                placeholder="Enter your ElevenLabs API key"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#222222] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:border-[#7C3AED] transition-colors"
                data-testid="elevenlabs-key-input"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[#A1A1AA]">
                  Get free API key (10,000 characters/month):
                  <a 
                    href="https://elevenlabs.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#7C3AED] hover:text-[#6D28D9] ml-1 inline-flex items-center gap-1"
                  >
                    elevenlabs.io <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <button
                  onClick={testVoice}
                  disabled={testingVoice}
                  className="text-xs text-[#7C3AED] hover:text-[#6D28D9] flex items-center gap-1"
                >
                  {testingVoice ? 'Testing...' : 'Test Voice'}
                  <Volume2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <div className="p-3 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg">
              <p className="text-sm text-[#A1A1AA]">
                Without an API key, MockMate will use your browser's built-in voice (Web Speech API), which works but sounds more robotic.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Interview Settings */}
        <motion.div 
          className="card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <SettingsIcon className="w-5 h-5 text-[#7C3AED]" />
            <h2 className="text-lg font-semibold text-white">Interview Settings</h2>
          </div>
          
          <div className="space-y-6">
            {/* Avatar Selection */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-2">AI Interviewer Avatar</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSettings({ ...settings, avatar_choice: 'priya' })}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center ${
                    settings.avatar_choice === 'priya' 
                      ? 'bg-[#7C3AED]/10 border-[#7C3AED]' 
                      : 'bg-[#0A0A0A] border-[#222222] hover:border-[#333333]'
                  }`}
                  data-testid="avatar-priya-btn"
                >
                  {/* Priya Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] via-[#5B21B6] to-[#2563EB] flex items-center justify-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="w-4 h-0.5 bg-white rounded-full mx-auto" />
                      </div>
                    </div>
                  </div>
                  <span className="text-white font-medium">Priya</span>
                  <span className="text-xs text-[#A1A1AA]">Female Voice</span>
                </button>
                
                <button
                  onClick={() => setSettings({ ...settings, avatar_choice: 'arjun' })}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center ${
                    settings.avatar_choice === 'arjun' 
                      ? 'bg-[#7C3AED]/10 border-[#7C3AED]' 
                      : 'bg-[#0A0A0A] border-[#222222] hover:border-[#333333]'
                  }`}
                  data-testid="avatar-arjun-btn"
                >
                  {/* Arjun Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#7C3AED] flex items-center justify-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="w-4 h-0.5 bg-white rounded-full mx-auto" />
                      </div>
                    </div>
                  </div>
                  <span className="text-white font-medium">Arjun</span>
                  <span className="text-xs text-[#A1A1AA]">Male Voice</span>
                </button>
              </div>
            </div>
            
            {/* Language Preference */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-2">
                <Languages className="w-4 h-4 inline mr-2" />
                Interview Language
              </label>
              <Select 
                value={settings.language_preference} 
                onValueChange={(value) => setSettings({ ...settings, language_preference: value })}
              >
                <SelectTrigger className="bg-[#0A0A0A] border-[#222222] text-white" data-testid="language-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-[#222222]">
                  <SelectItem value="english" className="text-white hover:bg-[#222222]">English</SelectItem>
                  <SelectItem value="hinglish" className="text-white hover:bg-[#222222]">Hinglish (Hindi + English)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Hinglish mode: AI will ask questions and give feedback in a mix of Hindi and English
              </p>
            </div>
            
            {/* Voice Speed */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-2">
                <Volume2 className="w-4 h-4 inline mr-2" />
                Voice Speed
              </label>
              <Select 
                value={settings.voice_speed} 
                onValueChange={(value) => setSettings({ ...settings, voice_speed: value })}
              >
                <SelectTrigger className="bg-[#0A0A0A] border-[#222222] text-white" data-testid="voice-speed-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-[#222222]">
                  <SelectItem value="slow" className="text-white hover:bg-[#222222]">Slow</SelectItem>
                  <SelectItem value="normal" className="text-white hover:bg-[#222222]">Normal</SelectItem>
                  <SelectItem value="fast" className="text-white hover:bg-[#222222]">Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Save Button */}
          <div className="mt-6 pt-6 border-t border-[#222222]">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
              data-testid="save-settings-btn"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </motion.div>

        {/* Account Actions */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-6">Account</h2>
          
          <div className="space-y-4">
            <button
              onClick={logout}
              className="w-full btn-secondary flex items-center justify-center gap-2"
              data-testid="logout-settings-btn"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="w-full py-2.5 px-4 rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                  data-testid="delete-account-btn"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete Account
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#111111] border-[#222222]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#A1A1AA]">
                    This action cannot be undone. This will permanently delete your account and remove all your data including interview history and reports.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-[#222222] border-[#333333] text-white hover:bg-[#333333]">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Settings;
