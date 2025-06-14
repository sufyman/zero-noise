"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { User, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface User {
  email: string;
  joinedAt: string;
  lastLogin: string;
  source?: string;
}

interface FormData {
  interests: string[];
  contentFormat: string;
  dailyTime: number;
  podcastStyle: string;
  preferredSpeed: number;
  mantra: string;
}

export default function OnboardingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    interests: [],
    contentFormat: 'podcast',
    dailyTime: 5,
    podcastStyle: 'conversational',
    preferredSpeed: 1.5,
    mantra: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setUser(data.user);
          } else {
            // Not authenticated, redirect to home
            router.push('/');
            return;
          }
        } else {
          // Not authenticated, redirect to home
          router.push('/');
          return;
        }
      } catch {
        // Error checking auth, redirect to home
        router.push('/');
        return;
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, [router]);

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (formData.interests.length === 0) {
      alert('Please select at least one interest');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Preferences saved, redirect to dashboard
        router.push('/dashboard');
      } else {
        const error = await response.json();
        alert(`Error saving preferences: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const interestOptions = [
    'Consumer Startups',
    'SEO & Marketing',
    'AI & Machine Learning',
    'Stable Diffusion',
    'Tech Industry News',
    'Product Management',
    'Business Strategy',
    'Entrepreneurship'
  ];

  const podcastStyles = [
         { id: 'conversational', name: 'Conversational', desc: 'Tim Ferriss / Lex Fridman style' },
    { id: 'analytical', name: 'Analytical', desc: 'Data-driven and structured' },
    { id: 'energetic', name: 'Energetic', desc: 'High-energy and motivational' },
    { id: 'casual', name: 'Casual', desc: 'Relaxed and informal' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* User Header */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Welcome!</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Step {currentStep + 1} of 5</span>
              <span>{Math.round(((currentStep + 1) / 5) * 100)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 0: Interests */}
              {currentStep === 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    What are your main interests?
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Select the topics you&apos;d like to stay updated on:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                    {interestOptions.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => handleInterestToggle(interest)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                          formData.interests.includes(interest)
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-medium">{interest}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: Content Format */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    How do you prefer to consume content?
                  </h2>
                  <div className="space-y-3 mb-8">
                    {[
                      { id: 'podcast', label: 'Audio Podcast', desc: 'Perfect for commuting or multitasking' },
                      { id: 'written', label: 'Written Report', desc: 'Detailed analysis you can skim' },
                      { id: 'video', label: 'Video Summary', desc: 'Visual presentation with charts' }
                    ].map((format) => (
                      <button
                        key={format.id}
                        onClick={() => setFormData(prev => ({ ...prev, contentFormat: format.id }))}
                        className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          formData.contentFormat === format.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{format.label}</div>
                        <div className="text-sm text-gray-600">{format.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Time Preference */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    How much time do you have daily?
                  </h2>
                  <div className="space-y-3 mb-8">
                    {[
                      { value: 3, label: '3 minutes', desc: 'Quick highlights only' },
                      { value: 5, label: '5 minutes', desc: 'Perfect for busy professionals' },
                      { value: 10, label: '10 minutes', desc: 'More detailed coverage' },
                      { value: 15, label: '15 minutes', desc: 'Deep dive into topics' }
                    ].map((time) => (
                      <button
                        key={time.value}
                        onClick={() => setFormData(prev => ({ ...prev, dailyTime: time.value }))}
                        className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          formData.dailyTime === time.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{time.label}</div>
                        <div className="text-sm text-gray-600">{time.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Podcast Style (only if podcast selected) */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {formData.contentFormat === 'podcast' ? 'What podcast style do you prefer?' : 'What presentation style do you prefer?'}
                  </h2>
                  <div className="space-y-3 mb-8">
                    {podcastStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setFormData(prev => ({ ...prev, podcastStyle: style.id }))}
                        className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          formData.podcastStyle === style.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{style.name}</div>
                        <div className="text-sm text-gray-600">{style.desc}</div>
                      </button>
                    ))}
                  </div>

                  {formData.contentFormat === 'podcast' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred playback speed: {formData.preferredSpeed}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.25"
                        value={formData.preferredSpeed}
                        onChange={(e) => setFormData(prev => ({ ...prev, preferredSpeed: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.5x</span>
                        <span>1.0x</span>
                        <span>1.5x</span>
                        <span>2.0x</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Personal Touch */}
              {currentStep === 4 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Add a personal touch
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Would you like a daily motivational message or mantra? (Optional)
                  </p>
                  <div className="mb-6">
                    <input
                      type="text"
                      placeholder="e.g., &apos;You can do it!&apos; or &apos;Focus on what matters today&apos;"
                      value={formData.mantra}
                      onChange={(e) => setFormData(prev => ({ ...prev, mantra: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-8">
                    <h3 className="font-medium text-gray-900 mb-3">Your preferences:</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div><strong>Interests:</strong> {formData.interests.join(', ')}</div>
                      <div><strong>Format:</strong> {formData.contentFormat}</div>
                      <div><strong>Duration:</strong> {formData.dailyTime} minutes</div>
                      <div><strong>Style:</strong> {podcastStyles.find(s => s.id === formData.podcastStyle)?.name}</div>
                      {formData.contentFormat === 'podcast' && (
                        <div><strong>Speed:</strong> {formData.preferredSpeed}x</div>
                      )}
                      {formData.mantra && <div><strong>Mantra:</strong> &quot;{formData.mantra}&quot;</div>}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center space-x-2"
              >
                <span>Back</span>
              </Button>

              {currentStep < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === 0 && formData.interests.length === 0}
                  className="btn-primary-light flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || formData.interests.length === 0}
                  className="btn-primary-light flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 