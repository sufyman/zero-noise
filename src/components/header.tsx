'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Menu, X, Zap } from 'lucide-react'
import { AuthModal } from './auth-modal'
import { useAuth } from '@/contexts/auth-context'

export function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, loading, signOut } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleAuthClick = () => {
    setShowAuthModal(true)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
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
              {loading ? (
                <div className="w-8 h-8 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
              ) : user ? (
                <div className="flex items-center gap-4">
                  <span className="text-gray-300">
                    Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                  <button 
                    onClick={handleSignOut}
                    className="text-gray-300 hover:text-white transition-colors px-4 py-2"
                  >
                    Sign Out
                  </button>
                  <a 
                    href="/dashboard"
                    className="bg-gradient-to-r from-purple-400 to-cyan-500 text-black px-6 py-2 rounded-lg font-semibold hover:from-purple-500 hover:to-cyan-600 transition-all"
                  >
                    Dashboard
                  </a>
                </div>
              ) : (
                <button 
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-6 py-2 rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all"
                  onClick={handleAuthClick}
                >
                  Get Started
                </button>
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
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
                    </div>
                  ) : user ? (
                    <div className="space-y-3">
                      <div className="text-gray-300 text-center">
                        Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]}
                      </div>
                      <button 
                        onClick={handleSignOut}
                        className="w-full text-gray-300 hover:text-white transition-colors py-2"
                      >
                        Sign Out
                      </button>
                      <a 
                        href="/dashboard"
                        className="block w-full bg-gradient-to-r from-purple-400 to-cyan-500 text-black px-6 py-3 rounded-lg font-semibold hover:from-purple-500 hover:to-cyan-600 transition-all text-center"
                      >
                        Dashboard
                      </a>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        handleAuthClick()
                        setMobileMenuOpen(false)
                      }}
                      className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-6 py-3 rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-600 transition-all"
                    >
                      Get Started
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  )
} 