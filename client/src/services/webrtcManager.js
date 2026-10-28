export class WebRTCManager {
  constructor(options = {}) {
    this.localUserId = options.localUserId;
    this.iceServers = options.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
    this.sendSignal = options.sendSignal || (() => {});
    this.onRemoteStream = options.onRemoteStream || (() => {});
    this.onPeerDisconnected = options.onPeerDisconnected || (() => {});

    this.localStream = null;
    this.peers = new Map(); // peerId -> { pc, polite, makingOffer, pendingCandidates, isSettingRemoteAnswerPending }
  }

  async initLocalMicrophone() {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      return this.localStream;
    } catch (err) {
      console.warn('Microphone permission denied or device not found', err);
      throw err;
    }
  }

  setMute(isMuted) {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }

  /**
   * Connect to a peer using Perfect Negotiation
   */
  async connectToPeer(peerId) {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId).pc;
    }

    // Deterministic politeness: If myUserId is lexicographically smaller, I am polite
    const polite = this.localUserId < peerId;

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    const peerData = {
      peerId,
      pc,
      polite,
      makingOffer: false,
      isSettingRemoteAnswerPending: false,
      pendingCandidates: [],
    };
    this.peers.set(peerId, peerData);

    // Add local tracks if microphone stream is available
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // ICE Candidate Handler
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.sendSignal(peerId, {
          type: 'candidate',
          candidate,
        });
      }
    };

    // Track Received Handler
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      this.onRemoteStream(peerId, remoteStream);
    };

    // Connection State Change
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        this.onPeerDisconnected(peerId);
      }
    };

    // Negotiation Needed
    pc.onnegotiationneeded = async () => {
      try {
        peerData.makingOffer = true;
        await pc.setLocalDescription();
        this.sendSignal(peerId, {
          type: 'description',
          description: pc.localDescription,
        });
      } catch (err) {
        console.error(`Negotiation needed error with peer ${peerId}`, err);
      } finally {
        peerData.makingOffer = false;
      }
    };

    return pc;
  }

  /**
   * Handle incoming WebRTC signaling payload from Socket.IO
   */
  async handleSignal(senderId, signal) {
    let peerData = this.peers.get(senderId);

    // If incoming offer and connection hasn't been instantiated yet, create it
    if (!peerData) {
      await this.connectToPeer(senderId);
      peerData = this.peers.get(senderId);
    }
    if (!peerData) return;

    const { pc, polite } = peerData;

    try {
      if (signal.type === 'description') {
        const description = signal.description;
        const offerCollision =
          description.type === 'offer' &&
          (peerData.makingOffer || pc.signalingState !== 'stable');

        peerData.ignoreOffer = !polite && offerCollision;
        if (peerData.ignoreOffer) {
          return;
        }

        peerData.isSettingRemoteAnswerPending = description.type === 'answer';
        await pc.setRemoteDescription(new RTCSessionDescription(description));
        peerData.isSettingRemoteAnswerPending = false;

        // Process any queued ICE candidates
        if (peerData.pendingCandidates.length > 0) {
          for (const cand of peerData.pendingCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          peerData.pendingCandidates = [];
        }

        if (description.type === 'offer') {
          await pc.setLocalDescription();
          this.sendSignal(senderId, {
            type: 'description',
            description: pc.localDescription,
          });
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        if (!pc.remoteDescription) {
          peerData.pendingCandidates.push(signal.candidate);
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (err) {
            if (!peerData.ignoreOffer) {
              console.warn(`Error adding ICE candidate from ${senderId}`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error(`Signaling processing error with ${senderId}`, err);
    }
  }

  disconnectPeer(peerId) {
    const peerData = this.peers.get(peerId);
    if (!peerData) return;

    peerData.pc.ontrack = null;
    peerData.pc.onicecandidate = null;
    peerData.pc.onnegotiationneeded = null;
    peerData.pc.close();
    this.peers.delete(peerId);
  }

  destroy() {
    for (const peerId of Array.from(this.peers.keys())) {
      this.disconnectPeer(peerId);
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }
}
