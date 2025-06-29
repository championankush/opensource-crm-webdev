import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Image, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const Signup: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          avatar: avatar || undefined
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Signup successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(data.error || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isFormValid = firstName && lastName && email && password.length >= 6 && validateEmail(email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25 mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
          <p className="text-slate-600">Sign up for your CRM dashboard</p>
        </div>
        <div className="card shadow-xl shadow-slate-200/50">
          <div className="card-content">
            <form onSubmit={handleSubmit} className="space-y-6">
              {success && (
                <div className="flex items-center space-x-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{success}</span>
                </div>
              )}
              {error && (
                <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-semibold text-slate-700">First Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="input pl-12"
                    placeholder="Enter your first name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-semibold text-slate-700">Last Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="input pl-12"
                    placeholder="Enter your last name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input pl-12"
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input pl-12"
                    placeholder="Enter your password"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="avatar" className="text-sm font-semibold text-slate-700">Avatar URL (optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Image className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    id="avatar"
                    type="url"
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    className="input pl-12"
                    placeholder="https://example.com/avatar.png"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="w-full btn btn-primary btn-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing up...
                  </>
                ) : (
                  <>
                    <User className="w-5 h-5 mr-2" />
                    Sign Up
                  </>
                )}
              </button>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-slate-400">Already have an account?</span>
              </div>
            </div>
            <button
              className="w-full btn btn-outline btn-secondary"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup; 