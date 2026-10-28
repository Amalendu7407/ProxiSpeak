import React, { useState } from 'react';
import { Volume2, Users, MapPin, Radio } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm.jsx';
import { RegisterForm } from '../components/auth/RegisterForm.jsx';

export function AuthPage() {
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-dark-900 via-dark-800 to-slate-950 relative overflow-hidden">
      {/* Background ambient glow circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center z-10">
        {/* Left column: Product Hero and Proximity Pitch */}
        <div className="hidden md:flex flex-col gap-6 text-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">ProxiSpeak</h1>
              <p className="text-xs text-brand-400 font-medium">Spatial Audio Virtual Workspace</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold leading-tight text-white">
              Work together naturally with spatial voice proximity.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Move your avatar around the virtual office floor. Walk up to teammates to chat effortlessly, hold spontaneous discussions, and walk away when you're done.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">2D Spatial Audio</h4>
                <p className="text-xs text-slate-400">Distance-based volume attenuation & stereo panning.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Interactive Canvas Office</h4>
                <p className="text-xs text-slate-400">Meeting rooms, collaboration tables & focus pods.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Seamless WebRTC Mesh</h4>
                <p className="text-xs text-slate-400">High fidelity, low latency peer-to-peer audio.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Auth Form Glassmorphic Card */}
        <div className="w-full glass-modal p-8 rounded-3xl shadow-2xl border border-white/10">
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-bold text-white">
                {isRegistering ? 'Create your account' : 'Welcome back'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isRegistering
                  ? 'Join your team in the virtual headquarters'
                  : 'Enter your credentials to access the office'}
              </p>
            </div>
          </div>

          {isRegistering ? (
            <RegisterForm onSwitchToLogin={() => setIsRegistering(false)} />
          ) : (
            <LoginForm onSwitchToRegister={() => setIsRegistering(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
