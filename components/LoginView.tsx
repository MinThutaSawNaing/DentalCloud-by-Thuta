import React, { useState, useEffect } from 'react';
import { LogIn, RefreshCw } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 animate-scale-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-4">
            <span className="text-3xl">🦷</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">DentalCloud Pro</h1>
          <p className="text-sm text-gray-500 font-medium">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
            autoFocus
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          {/* CAPTCHA */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
              CAPTCHA
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center justify-center gap-2 border-gray-200 border rounded-xl p-3 bg-gray-50">
                <span className="text-lg font-bold text-gray-700">{captchaNum1}</span>
                <span className="text-gray-400">+</span>
                <span className="text-lg font-bold text-gray-700">{captchaNum2}</span>
                <span className="text-gray-400">=</span>
              </div>
              <button
                type="button"
                onClick={generateCaptcha}
                className="p-3 border-gray-200 border rounded-xl hover:bg-gray-50 transition-colors"
                title="Refresh CAPTCHA"
              >
                <RefreshCw size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="mt-2">
              <Input
                type="number"
                value={captchaAnswer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaptchaAnswer(e.target.value)}
                placeholder="Enter answer"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Default admin: <span className="font-semibold text-gray-600">admin / admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;

