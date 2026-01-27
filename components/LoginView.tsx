import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, RefreshCw, Lock, User, Fingerprint, Building2 } from 'lucide-react';
import { Input } from './Shared';
import { auth } from '../services/auth';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Generate new CAPTCHA
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1; // 1-10
    const num2 = Math.floor(Math.random() * 10) + 1; // 1-10
    setCaptchaNum1(num1);
    setCaptchaNum2(num2);
    setCaptchaAnswer('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const answer = parseInt(captchaAnswer);
      if (isNaN(answer)) {
        setError('Please enter a valid number for CAPTCHA');
        setLoading(false);
        return;
      }

      const expected = captchaNum1 + captchaNum2;
      await auth.login(username, password, answer, expected);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      generateCaptcha(); // Regenerate CAPTCHA on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-8 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Fingerprint className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">DentalCloud<span className="text-indigo-300">Pro</span></h1>
          </div>
          
          <div className="max-w-md">
            <h2 className="text-3xl font-black text-white mb-4 leading-tight">
              Professional Dental Practice Management
            </h2>
            <p className="text-indigo-200 text-base mb-8 leading-relaxed">
              Secure, reliable, and enterprise-grade solution for your clinic's operations.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-700/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Enterprise Security</h3>
                  <p className="text-indigo-200 text-sm">Bank-level encryption and compliance</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-700/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Multi-Location Support</h3>
                  <p className="text-indigo-200 text-sm">Manage multiple clinics from one platform</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-700/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lock className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">HIPAA Compliant</h3>
                  <p className="text-indigo-200 text-sm">Secure patient data protection</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-indigo-300 text-sm">
          © {new Date().getFullYear()} WinterArc Myanmar Company Limited. All rights reserved.
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-5 shadow-lg">
              <Fingerprint className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-gray-600 font-medium">Sign in to your DentalCloud Pro account</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                    autoFocus
                  />
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-500" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* CAPTCHA */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Verification
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-3 bg-gray-50">
                    <span className="text-lg font-bold text-gray-700">{captchaNum1}</span>
                    <span className="text-gray-400">+</span>
                    <span className="text-lg font-bold text-gray-700">{captchaNum2}</span>
                    <span className="text-gray-400">=</span>
                  </div>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="p-3 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    title="Refresh Verification"
                  >
                    <RefreshCw size={18} className="text-gray-500" />
                  </button>
                </div>
                <div className="mt-2 lg:mt-3">
                  <input
                    type="number"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Enter answer to verify"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                
                <button
                  type="button"
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium flex items-start gap-2">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 lg:py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Secure Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100">
              
              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
                <Lock className="w-3 h-3" />
                <span>Secured by AES-256 encryption</span>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-6 text-xs lg:text-sm text-gray-500">
            <p>© {new Date().getFullYear()} WinterArc Myanmar. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;

