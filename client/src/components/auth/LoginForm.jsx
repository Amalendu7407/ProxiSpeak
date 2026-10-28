import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { Input } from '../common/Input.jsx';
import { Button } from '../common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export function LoginForm({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Input
        label="Company Email"
        type="email"
        placeholder="user@infotact.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        icon={Mail}
        required
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        icon={Lock}
        required
        autoComplete="current-password"
      />

      <Button type="submit" loading={loading} icon={LogIn} className="w-full mt-2">
        Sign In to Virtual Office
      </Button>

      <div className="text-center mt-2">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-xs text-slate-400 hover:text-brand-400 transition-colors"
        >
          Need an account? <span className="font-semibold text-brand-400 underline underline-offset-2">Register with company domain</span>
        </button>
      </div>
    </form>
  );
}
