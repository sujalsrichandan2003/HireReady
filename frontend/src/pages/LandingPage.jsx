import { useAuth } from '../App';
import { motion } from 'framer-motion';
import { 
  Code, Binary, Braces, Users, Server, BarChart, Coffee, Brain, Layout, Database,
  Mic, MessageSquare, Zap, Target, FileText, Languages, ChevronRight, Star,
  ArrowRight, Check
} from 'lucide-react';

const LandingPage = () => {
  const { user, login } = useAuth();

  const tracks = [
    { id: "python", name: "Python Developer", icon: Code },
    { id: "dsa", name: "DSA", icon: Binary },
    { id: "javascript", name: "JavaScript", icon: Braces },
    { id: "hr", name: "HR Round", icon: Users },
    { id: "system-design", name: "System Design", icon: Server },
    { id: "data-analyst", name: "Data Analyst", icon: BarChart },
    { id: "java", name: "Java Developer", icon: Coffee },
    { id: "ai-ml", name: "AI/ML Engineer", icon: Brain },
    { id: "frontend", name: "Frontend Developer", icon: Layout },
    { id: "backend", name: "Backend Developer", icon: Database },
  ];

  const features = [
    { icon: Mic, title: "Voice Interview", description: "Practice speaking your answers with AI that listens and responds naturally" },
    { icon: Zap, title: "Adaptive Questions", description: "AI adjusts difficulty based on your performance in real-time" },
    { icon: Code, title: "Code Editor", description: "Write and run code directly in the interview with syntax highlighting" },
    { icon: Target, title: "Weakness Tracking", description: "Identify and improve on your weak areas with detailed analytics" },
    { icon: FileText, title: "Detailed Reports", description: "Get comprehensive feedback after every interview session" },
    { icon: Languages, title: "Hinglish Support", description: "Practice in English or Hinglish - whatever feels comfortable" },
  ];

  const testimonials = [
    { name: "Priya Sharma", role: "SDE at Google", avatar: "PS", quote: "MockMate helped me crack my Google interview. The AI felt like a real interviewer!" },
    { name: "Rahul Kumar", role: "Data Scientist at Amazon", avatar: "RK", quote: "The DSA practice sessions were incredibly helpful. Got multiple offers!" },
    { name: "Ananya Patel", role: "Frontend Dev at Microsoft", avatar: "AP", quote: "No more anxiety. I practiced until I felt confident. Best investment ever." },
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#222222]" data-testid="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-['Outfit']">MockMate</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-[#A1A1AA] hover:text-white transition-colors">Features</a>
              <a href="#tracks" className="text-[#A1A1AA] hover:text-white transition-colors">Tracks</a>
              <a href="#pricing" className="text-[#A1A1AA] hover:text-white transition-colors">Pricing</a>
            </div>
            
            <button 
              onClick={user ? () => window.location.href = '/dashboard' : login}
              className="btn-primary flex items-center gap-2"
              data-testid="start-free-btn"
            >
              {user ? 'Dashboard' : 'Start Free'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 hero-gradient" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111111] border border-[#222222] mb-8">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-sm text-[#A1A1AA]">Now with GPT-4 powered interviews</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-['Outfit'] tracking-tight mb-6">
              Practice Interviews with AI.{' '}
              <span className="text-gradient">Get Job Ready.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-[#A1A1AA] mb-10 max-w-2xl mx-auto">
              Experience real technical interviews with an AI interviewer available 24/7. 
              No judgment. No anxiety. Just practice until you're confident.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={user ? () => window.location.href = '/dashboard' : login}
                className="btn-primary text-lg px-8 py-4 flex items-center gap-2"
                data-testid="hero-cta-btn"
              >
                Start Practicing Now
                <ArrowRight className="w-5 h-5" />
              </button>
              <a href="#how-it-works" className="btn-secondary text-lg px-8 py-4">
                See How It Works
              </a>
            </div>
          </motion.div>
          
          {/* Hero Image/Mockup */}
          <motion.div 
            className="mt-16 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED]/20 to-[#2563EB]/20 blur-3xl"></div>
              <div className="relative bg-[#111111] border border-[#222222] rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222222]">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-4 text-sm text-[#A1A1AA]">MockMate Interview Room</span>
                </div>
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Left Panel - AI Avatar */}
                  <div className="p-8 border-r border-[#222222]">
                    <div className="flex flex-col items-center">
                      <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED] to-[#2563EB] animate-pulse-ring"></div>
                        <img 
                          src="https://images.unsplash.com/photo-1677212004257-103cfa6b59d0?w=300&h=300&fit=crop"
                          alt="AI Interviewer"
                          className="w-full h-full object-cover relative z-10"
                        />
                      </div>
                      <h3 className="font-semibold text-lg">Priya</h3>
                      <p className="text-[#A1A1AA] text-sm">Technical Interviewer</p>
                      <div className="mt-6 p-4 bg-[#0A0A0A] rounded-lg w-full">
                        <p className="text-sm text-[#A1A1AA]">
                          "Can you explain the difference between a list and a tuple in Python?"
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Right Panel - Code Editor */}
                  <div className="p-4 bg-[#0A0A0A]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-[#A1A1AA]">Python</span>
                      <button className="text-xs px-3 py-1 bg-green-600 rounded text-white">Run Code</button>
                    </div>
                    <pre className="font-mono text-sm text-[#A1A1AA] bg-[#111111] p-4 rounded-lg">
{`def reverse_string(s):
    # Your solution here
    return s[::-1]

# Test
print(reverse_string("hello"))`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 border-t border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            {...fadeInUp}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-['Outfit'] mb-6">
              The Real Problem
            </h2>
            <p className="text-xl text-[#A1A1AA]">
              Most students fail interviews not because they lack knowledge — 
              <span className="text-white font-medium"> but because they never practiced speaking answers out loud.</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 border-t border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            {...fadeInUp}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 mb-6">
              <Zap className="w-4 h-4 text-[#7C3AED]" />
              <span className="text-sm text-[#7C3AED]">The Solution</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-['Outfit'] mb-6">
              MockMate gives you a real AI interviewer available 24/7
            </h2>
            <p className="text-xl text-[#A1A1AA]">
              No judgment. No anxiety. Just practice until you nail every question.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 border-t border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-['Outfit'] mb-4">How It Works</h2>
            <p className="text-[#A1A1AA]">Three simple steps to interview success</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Select Your Track", desc: "Choose from Python, DSA, System Design, and more" },
              { step: "02", title: "Practice with AI", desc: "Have real conversations with our AI interviewer" },
              { step: "03", title: "Get Detailed Feedback", desc: "Receive scores and improvement suggestions" },
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                className="card text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-5xl font-bold font-['Outfit'] text-gradient mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-[#A1A1AA]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tracks Section */}
      <section id="tracks" className="py-20 border-t border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-['Outfit'] mb-4">Interview Tracks</h2>
            <p className="text-[#A1A1AA]">Practice for any role you're targeting</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {tracks.map((track, idx) => {
              const Icon = track.icon;
              return (
                <motion.div 
                  key={track.id}
                  className="card text-center hover:border-[#7C3AED] transition-all cursor-pointer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  viewport={{ once: true }}
                  data-testid={`track-${track.id}`}
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#7C3AED]" />
                  </div>
                  <h3 className="font-medium text-sm">{track.name}</h3>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-['Outfit'] mb-4">Powerful Features</h2>
            <p className="text-[#A1A1AA]">Everything you need to ace your interviews</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div 
                  key={idx}
                  className="card feature-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  data-testid={`feature-${idx}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#7C3AED]/20 to-[#2563EB]/20 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#7C3AED]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-[#A1A1AA] text-sm">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 border-t border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-['Outfit'] mb-4">Success Stories</h2>
            <p className="text-[#A1A1AA]">Join thousands who landed their dream jobs</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <motion.div 
                key={idx}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-[#A1A1AA] mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2563EB] flex items-center justify-center text-sm font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{testimonial.name}</div>
                    <div className="text-sm text-[#A1A1AA]">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-['Outfit'] mb-4">Simple Pricing</h2>
            <p className="text-[#A1A1AA]">Start free, upgrade when you need more</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="card">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <p className="text-[#A1A1AA] mb-6">Perfect for getting started</p>
              <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-[#A1A1AA]">/month</span></div>
              <ul className="space-y-3 mb-8">
                {["3 interviews per month", "Basic feedback", "All interview tracks", "Voice interaction"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-[#A1A1AA]">
                    <Check className="w-5 h-5 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                onClick={login}
                className="btn-secondary w-full"
                data-testid="pricing-free-btn"
              >
                Get Started Free
              </button>
            </div>
            
            {/* Pro Plan */}
            <div className="card relative border-[#7C3AED] glow-primary">
              <div className="absolute -top-3 right-4 px-3 py-1 bg-[#7C3AED] rounded-full text-xs font-semibold">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <p className="text-[#A1A1AA] mb-6">For serious interview prep</p>
              <div className="text-4xl font-bold mb-6">$19<span className="text-lg text-[#A1A1AA]">/month</span></div>
              <ul className="space-y-3 mb-8">
                {["Unlimited interviews", "Detailed analytics", "Priority AI responses", "Code execution", "Progress tracking", "Weakness analysis"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-[#A1A1AA]">
                    <Check className="w-5 h-5 text-[#7C3AED]" />
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                className="btn-primary w-full"
                data-testid="pricing-pro-btn"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-['Outfit']">MockMate</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-[#A1A1AA]">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            
            <p className="text-sm text-[#A1A1AA]">
              © 2025 MockMate. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
