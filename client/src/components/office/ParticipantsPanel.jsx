import React from 'react';
import { X, Volume2, VolumeX, Mic, MicOff, Users } from 'lucide-react';
import { Avatar } from '../common/Avatar.jsx';

export function ParticipantsPanel({
  isOpen,
  onClose,
  participants = [],
  currentUserId,
  audioRadius = 250,
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-20 right-4 w-80 max-h-[calc(100vh-140px)] glass-modal rounded-3xl shadow-2xl p-5 z-20 flex flex-col pointer-events-auto border border-white/10 animate-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-bold text-white">Online Colleagues</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
            {participants.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 space-y-2 pr-1">
        {participants.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No other colleagues in the office.</p>
        ) : (
          participants.map((p) => {
            const isSelf = p.userId === currentUserId;
            const distanceMeters = p.distance !== undefined ? (p.distance / 40).toFixed(1) : null;
            const inAudioRange = p.distance !== undefined ? p.distance <= audioRadius : false;

            return (
              <div
                key={p.userId}
                className={`p-2.5 rounded-2xl flex items-center justify-between transition-colors ${
                  isSelf
                    ? 'bg-brand-500/10 border border-brand-500/20'
                    : inAudioRange
                    ? 'bg-slate-800/80 border border-brand-500/30'
                    : 'bg-slate-800/40 border border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar user={p.profile || { name: 'User' }} size="sm" isMuted={p.muted} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {p.profile?.name || 'Colleague'} {isSelf && <span className="text-brand-400 text-[10px]">(You)</span>}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {isSelf ? (
                        'Active'
                      ) : distanceMeters !== null ? (
                        <span>
                          {distanceMeters}m away •{' '}
                          <span className={inAudioRange ? 'text-brand-400 font-medium' : 'text-slate-500'}>
                            {inAudioRange ? 'In hearing range' : 'Out of range'}
                          </span>
                        </span>
                      ) : (
                        'In Office'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400 shrink-0">
                  {p.muted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {!isSelf && inAudioRange && (
                    <Volume2 className="w-3.5 h-3.5 text-brand-400 ml-1" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
