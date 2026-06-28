import React, { useState } from 'react';
import { User, Lock, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Settings } from '../types';

interface LoginProps {
  onLoginSuccess: (token: string, user: { username: string; fullName: string }) => void;
  onBackToLanding: () => void;
  settings: Settings | null;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onBackToLanding, settings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan password wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Username atau password salah');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-slate-900 via-slate-850 to-blue-950">
      {/* Decorative Circles */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onBackToLanding}
          className="absolute -top-14 left-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition duration-200 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-700/50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </button>

        {/* Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 transition duration-300">
          {/* Logo / Header Area */}
          <div className="p-8 text-center bg-gradient-to-b from-blue-50/50 to-transparent dark:from-slate-800/30">
            <div className="inline-flex items-center justify-center p-3.5 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/30 mb-4 animate-scale-up">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
              Admin Portal
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {settings?.siteName || 'PGRI Kecamatan Pasirwangi'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl text-sm font-medium text-red-600 dark:text-red-400 text-center animate-shake">
                {error}
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-slate-800 dark:hover:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 focus:border-blue-500 dark:border-slate-700 dark:focus:border-blue-400 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition duration-200 text-sm font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-slate-800 dark:hover:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 focus:border-blue-500 dark:border-slate-700 dark:focus:border-blue-400 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition duration-200 text-sm font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-500 disabled:to-indigo-500 text-white rounded-2xl font-bold text-sm tracking-wide shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menghubungkan...
                </>
              ) : (
                'Masuk ke Dashboard'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5">
          <p className="text-xs text-slate-300 font-medium">
            @2026 Cabang PGRI Kecamatan Pasirwangi. Developer Asep Akon, S.Pd
          </p>
        </div>
      </div>
    </div>
  );
};
