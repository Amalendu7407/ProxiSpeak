import React from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { Mic, Radio, Navigation, Volume2 } from 'lucide-react';

export function SettingsModal({ isOpen, onClose, audioRadius = 250, connectionRadius = 300 }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Spatial Office Settings">
      <div className="space-y-5 text-sm text-slate-300">
        {/* Controls Guide */}
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2.5">
          <div className="flex items-center gap-2 text-white font-semibold text-xs">
            <Navigation className="w-4 h-4 text-brand-400" />
            <span>Avatar Movement</span>
          </div>
          <p className="text-xs text-slate-400">
            Use <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono">W</kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono">A</kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono">S</kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono">D</kbd> or the{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono">Arrow Keys</kbd> to walk around the office.
          </p>
          <p className="text-xs text-slate-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono">M</kbd> anytime to toggle microphone mute.
          </p>
        </div>

        {/* Spatial Audio Radii */}
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-xs">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Proximity Audio Parameters</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Audible Hearing Radius:</span>
              <span className="font-mono text-emerald-400 font-bold">{audioRadius} px (~{(audioRadius / 40).toFixed(1)}m)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">WebRTC Connection Radius:</span>
              <span className="font-mono text-blue-400 font-bold">{connectionRadius} px (~{(connectionRadius / 40).toFixed(1)}m)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Peer connections are established slightly before sound is audible so conversations start seamlessly without negotiation delays.
          </p>
        </div>

        {/* WebRTC Diagnostics */}
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2">
          <div className="flex items-center gap-2 text-white font-semibold text-xs">
            <Radio className="w-4 h-4 text-purple-400" />
            <span>WebRTC Network Connectivity</span>
          </div>
          <p className="text-xs text-slate-400">
            Mesh peer-to-peer audio is powered by Google STUN servers with automatic ICE candidate exchange and perfect negotiation.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="secondary" onClick={onClose} size="sm">
            Close Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
}
