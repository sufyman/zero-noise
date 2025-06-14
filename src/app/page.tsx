"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Zap, 
  Mic, 
  Brain, 
  Headphones, 
  ArrowRight, 
  Play,
  Sparkles,
  Check,
  Star,
  Menu,
  X,
  Users,
  Clock,
  Shield,
  TrendingUp
} from "lucide-react";
import { SignupModal } from "@/components/signup-modal";
import { LoginModal } from "@/components/login-modal";

interface User {
  email: string;
  joinedAt: string;
  lastLogin: string;
}

export default function LandingPage() {
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

    // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            // User is already authenticated, redirect to dashboard
            window.location.href = '/dashboard';
            return;
          }
        }
      } catch {
        console.log('Not authenticated');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    setShowLogin(false);
    // Redirect to dashboard after successful login
    window.location.href = '/dashboard';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/90 backdrop-blur-lg border-b border-white/10' : 'bg-black/50 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 z-10">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-bold">Zero Noise</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">How it Works</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#about" className="text-gray-300 hover:text-white transition-colors">About</a>
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-4">
              {isCheckingAuth ? (
                <div className="w-8 h-8 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
              ) : user ? (
                <div className="flex items-center gap-4">
                  <span className="text-gray-300">Welcome, {user.email.split('@')[0]}</span>
                  <button 
                    onClick={handleLogout}
                    className="text-gray-300 hover:text-white transition-colors px-4 py-2"
                  >
                    Logout
                  </button>
                  <button className="bg-gradient-to-r from-purple-400 to-cyan-500 text-black px-6 py-2 rounded-lg font-semibold hover:from-purple-500 hover:to-cyan-600 transition-all">
                    Dashboard
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setShowLogin(true)}
                    className="text-gray-300 hover:text-white transition-colors px-4 py-2"
                  >
                    Login
                  </button>
                  <button 
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-6 py-2 rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all"
                    onClick={() => setShowSignup(true)}
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2 z-10 relative"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              className="absolute top-16 left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-white/10 z-50 lg:hidden"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="px-4 py-6 space-y-4">
                <a 
                  href="#features" 
                  className="block text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </a>
                <a 
                  href="#how-it-works" 
                  className="block text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How it Works
                </a>
                <a 
                  href="#pricing" 
                  className="block text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </a>
                <a 
                  href="#about" 
                  className="block text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </a>
                <div className="pt-4 border-t border-white/10 space-y-3">
                  {isCheckingAuth ? (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
                    </div>
                  ) : user ? (
                    <>
                      <div className="text-gray-300 py-2">Welcome, {user.email.split('@')[0]}</div>
                      <button 
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="block w-full text-left text-gray-300 hover:text-white transition-colors py-2"
                      >
                        Logout
                      </button>
                      <button className="w-full bg-gradient-to-r from-purple-400 to-cyan-500 text-black px-6 py-3 rounded-lg font-semibold">
                        Dashboard
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setShowLogin(true);
                          setMobileMenuOpen(false);
                        }}
                        className="block w-full text-left text-gray-300 hover:text-white transition-colors py-2"
                      >
                        Login
                      </button>
                      <button 
                        className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-6 py-3 rounded-lg font-semibold"
                        onClick={() => {
                          setShowSignup(true);
                          setMobileMenuOpen(false);
                        }}
                      >
                        Get Started
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-20">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />
        
        <div className="relative max-w-6xl mx-auto text-center z-10 pt-16">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-cyan-400/30"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium">Powered by Advanced AI</span>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-6 leading-tight"
          >
            Cut Through the{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Noise
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl lg:text-2xl text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed"
          >
            Get personalized content delivered exactly how you want it. AI-powered daily briefings tailored to your interests, goals, and preferred consumption style.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <button 
              className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-8 py-4 rounded-lg text-lg font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all duration-300 flex items-center gap-2 group"
              onClick={() => setShowSignup(true)}
            >
              <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Start Your Journey
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-medium border border-white/20 hover:bg-white/20 transition-all duration-300 flex items-center gap-2 group">
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Watch Demo
            </button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-gray-400"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Ready in 60 seconds</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />
                ))}
              </div>
              <span className="ml-2">4.9/5 from 1,200+ users</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { number: "10K+", label: "Active Users" },
              { number: "500K+", label: "Reports Generated" },
              { number: "98%", label: "Satisfaction Rate" },
              { number: "24/7", label: "AI Processing" }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cyan-400 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-400 text-sm lg:text-base">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              How <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Zero Noise</span> Works
            </h2>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
              Three simple steps to transform how you consume content
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Mic,
                title: "Voice Onboarding",
                description: "Tell our AI about your interests, goals, and content preferences through natural conversation. No forms, no hassle.",
                gradient: "from-cyan-400 to-blue-500",
                color: "text-cyan-400"
              },
              {
                icon: Brain,
                title: "AI Processing",
                description: "Advanced AI analyzes your preferences and curates the most relevant content from thousands of trusted sources.",
                gradient: "from-purple-500 to-pink-500",
                color: "text-purple-400"
              },
              {
                icon: Headphones,
                title: "Your Format",
                description: "Receive personalized content as podcasts, reports, videos, or any format that fits your lifestyle.",
                gradient: "from-emerald-400 to-cyan-400",
                color: "text-emerald-400"
              }
            ].map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
                className="p-6 sm:p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-8 h-8 text-black" />
                </div>
                <h3 className={`text-xl sm:text-2xl font-bold mb-4 ${step.color}`}>
                  {step.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Content <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Your Way</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
              Choose from multiple formats tailored to your lifestyle and preferences
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🎧", title: "Podcasts", desc: "Daily audio briefings for your commute" },
              { icon: "📊", title: "Reports", desc: "Detailed written analysis and insights" },
              { icon: "🎥", title: "Videos", desc: "Visual content summaries and explanations" },
              { icon: "📱", title: "Mobile", desc: "Bite-sized updates on the go" }
            ].map((format, index) => (
              <motion.div
                key={format.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 text-center group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{format.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-cyan-400 transition-colors">
                  {format.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {format.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Trusted by <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">10,000+</span> Professionals
            </h2>
            <p className="text-lg sm:text-xl text-gray-400">
              Join industry leaders who&apos;ve transformed their content consumption
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                quote: "Zero Noise has completely transformed how I stay informed. I save 3 hours daily while staying better informed than ever.",
                author: "Sarah Chen",
                role: "VP of Product, TechCorp",
                avatar: "👩‍💼"
              },
              {
                quote: "The AI curation is incredibly accurate. It&apos;s like having a personal research assistant that never sleeps.",
                author: "Michael Rodriguez",
                role: "Startup Founder",
                avatar: "👨‍💻"
              },
              {
                quote: "I get my industry insights delivered as a morning podcast. It&apos;s perfect for my commute and keeps me ahead of trends.",
                author: "Emily Johnson",
                role: "Marketing Director",
                avatar: "👩‍🎨"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
                className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 italic">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{testimonial.avatar}</div>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 sm:p-12 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Ready to Cut Through the{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Noise
              </span>?
            </h2>
            <p className="text-lg sm:text-xl text-gray-400 mb-8">
              Join thousands of professionals who&apos;ve transformed their content consumption
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-8 py-4 rounded-lg text-lg font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all duration-300 flex items-center gap-2 group"
                onClick={() => setShowSignup(true)}
              >
                <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-medium border border-white/20 hover:bg-white/20 transition-all duration-300 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>100% Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>10,000+ Users</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>Growing Fast</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-bold">Zero Noise</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
              <span>© 2024 Zero Noise. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>

      <SignupModal showSignup={showSignup} setShowSignup={setShowSignup} />
      <LoginModal showLogin={showLogin} setShowLogin={setShowLogin} onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
