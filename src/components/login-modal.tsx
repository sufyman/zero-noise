"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, ArrowRight, Lock, Sparkles, Shield, User } from "lucide-react";

interface User {
  email: string;
  joinedAt: string;
  lastLogin: string;
}

interface LoginModalProps {
  showLogin: boolean;
  setShowLogin: (show: boolean) => void;
  onLoginSuccess?: (user: User) => void;
}

export function LoginModal({ showLogin, setShowLogin, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      setSuccess(true);
      setEmail("");
      
      // Call success callback with user data
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
      
      // Show success for 1 second then close modal
      setTimeout(() => {
        setSuccess(false);
        setShowLogin(false);
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {showLogin && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogin(false)}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="glass-dark p-8 rounded-3xl border border-white/10 relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5" />
              
              {/* Close button */}
              <button
                onClick={() => setShowLogin(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 glass px-3 py-1 rounded-full mb-4 border border-white/10">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium">Welcome Back</span>
                </div>
                
                <h2 className="font-display text-3xl font-bold mb-2">
                  Access Your <span className="text-gradient">Dashboard</span>
                </h2>
                <p className="text-gray-400">
                  Enter your email to continue to Zero Noise
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className={`w-full pl-12 pr-4 py-4 bg-white/5 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      error ? 'border-red-400/50 focus:border-red-400/50 focus:ring-red-400/50' : 'border-white/10 focus:border-purple-400/50 focus:ring-purple-400/50'
                    }`}
                    required
                    disabled={isLoading || success}
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm text-center bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-emerald-400 text-sm text-center bg-emerald-400/10 border border-emerald-400/20 rounded-lg p-3">
                    🎉 Login successful! Redirecting to dashboard...
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || success}
                  className="w-full btn-primary text-lg group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Logging in...</span>
                    </div>
                  ) : success ? (
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      <span>Welcome back!</span>
                    </div>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      Login to Dashboard
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Features */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="space-y-3">
                  {[
                    { icon: User, text: "Access your personalized content" },
                    { icon: Shield, text: "Secure and private" },
                    { icon: Sparkles, text: "AI-powered insights" }
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm text-gray-400">
                      <feature.icon className="w-4 h-4 text-purple-400" />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Help text */}
              <div className="mt-6 text-center">
                                 <p className="text-xs text-gray-500">
                   Don&apos;t have an account? Sign up first to get access.
                 </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 