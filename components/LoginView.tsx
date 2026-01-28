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
  const [captchaDigits, setCaptchaDigits] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Generate new CAPTCHA
  const generateCaptcha = () => {
    const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)); // 4 random digits 0-9
    setCaptchaDigits(digits);
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
      if (captchaAnswer.length !== 4 || !/^[0-9]{4}$/.test(captchaAnswer)) {
        setError('Please enter exactly 4 digits for CAPTCHA');
        setLoading(false);
        return;
      }

      const expected = captchaDigits.join('');
      await auth.login(username, password, captchaAnswer, expected);
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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-6 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">DentalCloud<span className="text-indigo-300">Pro</span></h1>
          </div>
          
          <div className="max-w-xs">
            <h2 className="text-2xl font-black text-white mb-3 leading-tight">
              Professional Dental Practice Management
            </h2>
            <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
              Secure, reliable, and enterprise-grade solution for your clinic's operations.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 bg-indigo-700/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-3 h-3 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-xs">Enterprise Security</h3>
                  <p className="text-indigo-200 text-xs">Bank-level encryption and compliance</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 bg-indigo-700/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 className="w-3 h-3 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-xs">Multi-Location Support</h3>
                  <p className="text-indigo-200 text-xs">Manage multiple clinics from one platform</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 bg-indigo-700/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lock className="w-3 h-3 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-xs">HIPAA Compliant</h3>
                  <p className="text-indigo-200 text-xs">Secure patient data protection</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-indigo-300 text-xs">
          © {new Date().getFullYear()} WinterArc Myanmar Company Limited. All rights reserved.
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mb-4 shadow-lg">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-gray-600 font-medium text-sm">Sign in to your DentalCloud Pro account</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <User className="w-3 h-3 text-gray-500" />
                  USERNAME
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-sm"
                    autoFocus
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <Lock className="w-3 h-3 text-gray-500" />
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-sm"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* CAPTCHA */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  VERIFICATION
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-2 bg-gray-50">
                    {captchaDigits.map((digit, index) => (
                      <span key={index} className="text-lg font-bold text-gray-700 w-6 h-6 flex items-center justify-center bg-white rounded border border-gray-200">
                        {digit}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Refresh Verification"
                  >
                    <RefreshCw size={14} className="text-gray-500" />
                  </button>
                </div>
                <div className="mt-1.5">
                  <input
                    type="text"
                    value={captchaAnswer}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      setCaptchaAnswer(value);
                    }}
                    placeholder="Enter the 4 digits shown above"
                    required
                    maxLength={4}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-600">Remember me</span>
                </label>
                
                <button
                  type="button"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 font-medium flex items-start gap-1.5">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 text-sm"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Secure Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-gray-100">
              
              <div className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-400">
                <Lock className="w-2.5 h-2.5" />
                <span>Secured by AES-256 encryption</span>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-4 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} WinterArc Myanmar. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;

