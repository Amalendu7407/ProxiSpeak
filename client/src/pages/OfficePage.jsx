import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { initSocket, getSocket } from '../socket/socketClient.js';
import { SpatialAudioEngine } from '../audio/SpatialAudioEngine.js';
import { WebRTCManager } from '../services/webrtcManager.js';
import { CanvasOffice } from '../components/office/CanvasOffice.jsx';
import { HeaderBar } from '../components/office/HeaderBar.jsx';
import { ControlsBar } from '../components/office/ControlsBar.jsx';
import { ParticipantsPanel } from '../components/office/ParticipantsPanel.jsx';
import { SettingsModal } from '../components/office/SettingsModal.jsx';
import { ProfileModal } from '../components/office/ProfileModal.jsx';
import { Loader2, AlertCircle, MicOff } from 'lucide-react';

export function OfficePage() {
  const { user, logout } = useAuth();

  // Office State
  const [office, setOffice] = useState(null);
  const [currentZone, setCurrentZone] = useState('Open Floor');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [micWarning, setMicWarning] = useState(null);

  // Audio & Mic State
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Modals & Panels State
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Local Player Coordinates
  const [localPlayer, setLocalPlayer] = useState({
    x: 800,
    y: 600,
    profile: user,
    muted: false,
    speaking: false,
  });

  // Remote Peers: peerId -> { userId, x, y, profile, muted, speaking, distance }
  const [remotePeers, setRemotePeers] = useState(new Map());

  // Proximity Radii
  const [audioRadius, setAudioRadius] = useState(250);
  const [connectionRadius, setConnectionRadius] = useState(300);

  // Engine refs
  const spatialAudioRef = useRef(null);
  const webrtcRef = useRef(null);
  const localPlayerPosRef = useRef({ x: 800, y: 600 });

  // Update local player position in ref
  const handlePositionChange = useCallback((x, y) => {
    localPlayerPosRef.current = { x, y };
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('player:move', { x, y });
    }

    // Update spatial audio nodes for all connected remote peers
    if (spatialAudioRef.current) {
      setRemotePeers((prev) => {
        prev.forEach((peer, peerId) => {
          spatialAudioRef.current.updatePeerPosition(peerId, x, y, peer.x, peer.y);
        });
        return prev;
      });
    }
  }, []);

  // Gesture resume for Web Audio
  const handleUserGesture = useCallback(() => {
    if (spatialAudioRef.current) {
      spatialAudioRef.current.ensureContext();
    }
  }, []);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (webrtcRef.current) {
        webrtcRef.current.setMute(nextMuted);
      }
      if (spatialAudioRef.current) {
        spatialAudioRef.current.setMuted(nextMuted);
      }
      setLocalPlayer((lp) => ({ ...lp, muted: nextMuted }));

      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('user:mute_state', { muted: nextMuted });
      }
      return nextMuted;
    });
  }, []);

  // Toggle Deafen
  const handleToggleDeafen = useCallback(() => {
    setIsDeafened((prev) => {
      const nextDeafened = !prev;
      if (spatialAudioRef.current) {
        spatialAudioRef.current.setDeafened(nextDeafened);
      }
      return nextDeafened;
    });
  }, []);

  // Leave Office
  const handleLeaveOffice = useCallback(() => {
    const socket = getSocket();
    if (socket) {
      socket.emit('office:leave');
    }
    logout();
  }, [logout]);

  // Main Lifecycle: Socket, Spatial Audio, WebRTC
  useEffect(() => {
    const socket = initSocket();

    // 1. Initialize Spatial Audio Engine
    const spatialAudio = new SpatialAudioEngine({ audioRadius: 250 });
    spatialAudioRef.current = spatialAudio;

    // 2. Initialize WebRTC Manager
    const webrtc = new WebRTCManager({
      localUserId: user.id || user._id,
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      sendSignal: (recipientId, signal) => {
        if (socket && socket.connected) {
          socket.emit('rtc:signal', { recipientId, signal });
        }
      },
      onRemoteStream: (peerId, stream) => {
        console.log(`[WebRTC] Received remote audio stream from peer ${peerId}`);
        spatialAudio.addRemotePeerStream(peerId, stream);
        // Apply initial spatial positioning
        const peer = remotePeers.get(peerId);
        if (peer) {
          const loc = localPlayerPosRef.current;
          spatialAudio.updatePeerPosition(peerId, loc.x, loc.y, peer.x, peer.y);
        }
      },
      onPeerDisconnected: (peerId) => {
        spatialAudio.removeRemotePeer(peerId);
      },
    });
    webrtcRef.current = webrtc;

    // Request microphone access
    webrtc
      .initLocalMicrophone()
      .then((stream) => {
        spatialAudio.setupLocalStream(stream, (speaking) => {
          setIsSpeaking(speaking);
          setLocalPlayer((lp) => ({ ...lp, speaking }));
        });
      })
      .catch((err) => {
        console.warn('Microphone access not granted', err);
        setMicWarning('Microphone access was denied. You can still listen to spatial audio as you move.');
      });

    // Socket Event Handlers
    const joinOffice = () => {
      setConnectionStatus('connected');
      // Join default headquarters office
      socket.emit('office:join', { officeId: 'HQ1' }, (response) => {
        if (response?.success) {
          setOffice(response.office);
          setAudioRadius(response.proximityConfig?.audioRadius || 250);
          setConnectionRadius(response.proximityConfig?.connectionRadius || 300);

          if (response.self) {
            setLocalPlayer({
              x: response.self.x,
              y: response.self.y,
              profile: response.self.profile || user,
              muted: false,
              speaking: false,
            });
            localPlayerPosRef.current = { x: response.self.x, y: response.self.y };
          }

          if (response.webrtc?.iceServers) {
            webrtc.iceServers = response.webrtc.iceServers;
          }

          // Populate existing users
          const initialPeers = new Map();
          if (response.users) {
            for (const u of response.users) {
              if (u.userId !== (user.id || user._id)) {
                initialPeers.set(u.userId, {
                  userId: u.userId,
                  x: u.x,
                  y: u.y,
                  profile: u.profile,
                  muted: u.muted,
                  speaking: false,
                });
              }
            }
          }
          setRemotePeers(initialPeers);
          setLoading(false);
        } else {
          setError(response?.error || 'Failed to join office');
          setLoading(false);
        }
      });
    };

    if (socket.connected) {
      joinOffice();
    } else {
      socket.on('connect', joinOffice);
    }

    socket.on('connect_error', () => {
      setConnectionStatus('connecting');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('office:user_joined', (newPeer) => {
      setRemotePeers((prev) => {
        const next = new Map(prev);
        next.set(newPeer.userId, {
          userId: newPeer.userId,
          x: newPeer.x,
          y: newPeer.y,
          profile: newPeer.profile,
          muted: newPeer.muted,
          speaking: false,
        });
        return next;
      });
    });

    socket.on('office:user_left', ({ userId: leftUserId }) => {
      webrtc.disconnectPeer(leftUserId);
      spatialAudio.removeRemotePeer(leftUserId);
      setRemotePeers((prev) => {
        const next = new Map(prev);
        next.delete(leftUserId);
        return next;
      });
    });

    socket.on('player:moved', ({ userId: peerId, x, y }) => {
      setRemotePeers((prev) => {
        const peer = prev.get(peerId);
        if (!peer) return prev;
        const next = new Map(prev);
        next.set(peerId, { ...peer, x, y });

        // Update spatial audio
        const loc = localPlayerPosRef.current;
        spatialAudio.updatePeerPosition(peerId, loc.x, loc.y, x, y);

        return next;
      });
    });

    socket.on('user:mute_state', ({ userId: peerId, muted }) => {
      setRemotePeers((prev) => {
        const peer = prev.get(peerId);
        if (!peer) return prev;
        const next = new Map(prev);
        next.set(peerId, { ...peer, muted });
        return next;
      });
    });

    socket.on('proximity:enter', async ({ peerId, peer, distance }) => {
      console.log(`[Proximity] Peer ${peerId} entered connection radius (${distance}px)`);
      if (peer) {
        setRemotePeers((prev) => {
          const next = new Map(prev);
          next.set(peerId, {
            userId: peerId,
            x: peer.x,
            y: peer.y,
            profile: peer.profile,
            muted: peer.muted,
            speaking: false,
            distance,
          });
          return next;
        });
      }

      // Establish WebRTC connection
      await webrtc.connectToPeer(peerId);
    });

    socket.on('proximity:leave', ({ peerId }) => {
      console.log(`[Proximity] Peer ${peerId} exceeded disconnection radius`);
      webrtc.disconnectPeer(peerId);
      spatialAudio.removeRemotePeer(peerId);
    });

    socket.on('proximity:update', ({ activePeers }) => {
      if (!activePeers) return;
      setRemotePeers((prev) => {
        const next = new Map(prev);
        for (const ap of activePeers) {
          const existing = next.get(ap.peerId);
          if (existing) {
            next.set(ap.peerId, {
              ...existing,
              distance: ap.distance,
              muted: ap.muted,
              profile: ap.profile || existing.profile,
            });
          }
        }
        return next;
      });
    });

    socket.on('rtc:signal', async ({ senderId, signal }) => {
      await webrtc.handleSignal(senderId, signal);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('office:user_joined');
      socket.off('office:user_left');
      socket.off('player:moved');
      socket.off('user:mute_state');
      socket.off('proximity:enter');
      socket.off('proximity:leave');
      socket.off('proximity:update');
      socket.off('rtc:signal');

      webrtc.destroy();
      spatialAudio.destroy();
    };
  }, [user]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-900 text-white gap-4">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Entering ProxiSpeak Virtual Headquarters...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-900 text-white p-6">
        <div className="glass-modal max-w-md p-6 rounded-3xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold">Office Connection Error</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // List of participants for panel
  const participantsList = [
    {
      userId: user.id || user._id,
      profile: user,
      muted: isMuted,
      distance: 0,
    },
    ...Array.from(remotePeers.values()),
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-dark-900 select-none">
      {/* Mic Warning Toast */}
      {micWarning && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs shadow-xl animate-in fade-in">
          <MicOff className="w-4 h-4 shrink-0" />
          <span>{micWarning}</span>
          <button
            onClick={() => setMicWarning(null)}
            className="ml-2 font-bold hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Top HUD */}
      <HeaderBar
        office={office}
        currentZone={currentZone}
        user={user}
        connectionStatus={connectionStatus}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2D Canvas Office Viewport */}
      <CanvasOffice
        officeLayout={office?.layout}
        localPlayer={localPlayer}
        onPositionChange={handlePositionChange}
        remotePeers={remotePeers}
        audioRadius={audioRadius}
        connectionRadius={connectionRadius}
        onCurrentZoneChange={setCurrentZone}
        onUserGesture={handleUserGesture}
      />

      {/* Bottom Controls Bar */}
      <ControlsBar
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isDeafened={isDeafened}
        onToggleDeafen={handleToggleDeafen}
        isSpeaking={isSpeaking}
        participantsCount={remotePeers.size + 1}
        onToggleParticipants={() => setIsParticipantsOpen((prev) => !prev)}
        isParticipantsOpen={isParticipantsOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLeaveOffice={handleLeaveOffice}
      />

      {/* Participants Sidebar */}
      <ParticipantsPanel
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={participantsList}
        currentUserId={user.id || user._id}
        audioRadius={audioRadius}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        audioRadius={audioRadius}
        connectionRadius={connectionRadius}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
