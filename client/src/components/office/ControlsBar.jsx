import React, { useEffect } from 'react';
import { Mic, MicOff, Headphones, VolumeX, Users, Settings, LogOut } from 'lucide-react';

export function ControlsBar({
  isMuted,
  onToggleMute,
  isDeafened,
  onToggleDeafen,
  isSpeaking,
  participantsCount,
  onToggleParticipants,
  isParticipantsOpen,
  onOpenSettings,
  onLeaveOffice,
}) {
  // Hotkey 'M' for toggling mute
  useEffect(() => {
    const handleKeyDown = (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleMute]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-2xl border border-white/10">
        {/* Microphone Toggle */}
        <button
          onClick={onToggleMute}
          className={`relative p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            isMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
              : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30'
          }`}
          title={`Microphone ${isMuted ? 'Muted' : 'Live'} (Press M)`}
        >
          {isSpeaking && !isMuted && (
            <span className="absolute -inset-1 rounded-xl bg-brand-400/40 animate-ping" />
          )}
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Deafen / Sound Toggle */}
        <button
          onClick={onToggleDeafen}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            isDeafened
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title={isDeafened ? 'Sound Muted' : 'Spatial Audio Active'}
        >
          {isDeafened ? <VolumeX className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
        </button>

        <div className="w-[1px] h-6 bg-slate-700/60 mx-1" />

        {/* Participants Panel Toggle */}
        <button
          onClick={onToggleParticipants}
          className={`px-3 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 text-xs font-semibold ${
            isParticipantsOpen
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title="Online Colleagues"
        >
          <Users className="w-4 h-4" />
          <span>{participantsCount}</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Leave Office Button */}
        <button
          onClick={onLeaveOffice}
          className="p-3 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors"
          title="Leave Office"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
