import React, { useState } from 'react';
import { Copy, Check, Radio, Shield, User as UserIcon } from 'lucide-react';
import { Avatar } from '../common/Avatar.jsx';

export function HeaderBar({ office, currentZone, user, connectionStatus, onOpenProfile, onOpenSettings }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!office?.code) return;
    navigator.clipboard.writeText(office.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    connected: 'bg-emerald-500',
    connecting: 'bg-amber-500 animate-pulse',
    disconnected: 'bg-rose-500',
  };

  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
      {/* Left: Office Identity & Zone */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight">{office?.name || 'Virtual Office'}</h1>
              {office?.code && (
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  title="Copy office code"
                >
                  <span>{office.code}</span>
                  {copied ? <Check className="w-3 h-3 text-brand-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-brand-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                {currentZone || 'Open Floor'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Connection Status & User Profile Button */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="glass-panel px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-xl text-xs text-slate-300">
          <span className={`w-2 h-2 rounded-full ${statusColors[connectionStatus] || statusColors.connected}`} />
          <span className="capitalize font-medium">{connectionStatus || 'Connected'}</span>
        </div>

        <button
          onClick={onOpenProfile}
          className="glass-panel p-1.5 pr-3 rounded-2xl flex items-center gap-2.5 hover:bg-slate-800/80 transition-all shadow-xl group"
        >
          <Avatar user={user} size="sm" />
          <span className="text-xs font-semibold text-slate-200 group-hover:text-white max-w-[120px] truncate">
            {user?.name || 'Account'}
          </span>
        </button>
      </div>
    </header>
  );
}
