import React from 'react';

export function Avatar({ user, size = 'md', isSpeaking = false, isMuted = false, className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const name = user?.name || 'User';
  const avatarUrl = user?.avatar?.url;
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Speaking pulsating border ring */}
      {isSpeaking && !isMuted && (
        <span className="absolute -inset-1 rounded-full bg-brand-500/40 animate-ping" />
      )}

      <div
        className={`relative rounded-full flex items-center justify-center font-semibold text-white overflow-hidden border-2 transition-all ${
          isSpeaking && !isMuted ? 'border-brand-400 shadow-[0_0_12px_rgba(74,222,128,0.5)]' : 'border-slate-700'
        } ${sizeClasses[size] || sizeClasses.md} bg-gradient-to-tr from-slate-800 to-slate-700`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Mute status badge */}
      {isMuted && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-dark-900 flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-white rotate-45" />
        </div>
      )}
    </div>
  );
}
