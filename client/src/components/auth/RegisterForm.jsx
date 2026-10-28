import React, { useState } from 'react';
import { User, Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Input } from '../common/Input.jsx';
import { Button } from '../common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export function RegisterForm({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      await register({ name, email, password, confirmPassword });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
        <span>Registration restricted to configured company domain (e.g. <b>@infotact.com</b>).</span>
      </div>

      <Input
        label="Full Name"
        type="text"
        placeholder="Jane Doe"
        value={name}
        onChange={(e) => setName(e.target.value)}
        icon={User}
        required
      />

      <Input
        label="Corporate Email"
        type="email"
        placeholder="jane@infotact.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        icon={Mail}
        required
        autoComplete="email"
      />

      <Input
        label="Password (min 8 chars, 1 number/symbol)"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        icon={Lock}
        required
        autoComplete="new-password"
      />

      <Input
        label="Confirm Password"
        type="password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        icon={Lock}
        required
        autoComplete="new-password"
      />

      <Button type="submit" loading={loading} className="w-full mt-2">
        Create Office Account
      </Button>

      <div className="text-center mt-2">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-xs text-slate-400 hover:text-brand-400 transition-colors"
        >
          Already have an account? <span className="font-semibold text-brand-400 underline underline-offset-2">Sign in</span>
        </button>
      </div>
    </form>
  );
}
