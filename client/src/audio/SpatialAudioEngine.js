import { calculateAttenuation, calculatePan, calculateDistance } from '../utils/math.js';

export class SpatialAudioEngine {
  constructor(options = {}) {
    this.audioRadius = options.audioRadius || 250;
    this.audioCtx = null;
    this.peerChains = new Map(); // peerId -> { stream, source, gainNode, pannerNode }
    this.localAnalyser = null;
    this.localSource = null;
    this.isMuted = false;
    this.isDeafened = false;
  }

  ensureContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn('Web Audio API not supported in this browser environment');
        return null;
      }
      this.audioCtx = new AudioCtxClass();
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((err) => {
        console.warn('Failed to resume AudioContext:', err);
      });
    }

    return this.audioCtx;
  }

  /**
   * Set up local microphone analyzer to detect speaking activity
   */
  setupLocalStream(stream, onSpeakingChange = () => {}) {
    const ctx = this.ensureContext();
    if (!ctx || !stream) return;

    try {
      if (this.localSource) {
        this.localSource.disconnect();
      }

      this.localSource = ctx.createMediaStreamSource(stream);
      this.localAnalyser = ctx.createAnalyser();
      this.localAnalyser.fftSize = 256;
      this.localAnalyser.smoothingTimeConstant = 0.4;
      this.localSource.connect(this.localAnalyser);

      const bufferLength = this.localAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let wasSpeaking = false;

      const checkSpeaking = () => {
        if (!this.localAnalyser) return;
        this.localAnalyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const isSpeaking = average > 25 && !this.isMuted;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          onSpeakingChange(isSpeaking);
        }

        this.speakingInterval = requestAnimationFrame(checkSpeaking);
      };

      checkSpeaking();
    } catch (err) {
      console.warn('Could not initialize local audio analyser', err);
    }
  }

  /**
   * Attach a remote WebRTC MediaStream and construct the spatial audio chain:
   * MediaStreamSource -> GainNode -> StereoPannerNode -> AudioDestination
   */
  addRemotePeerStream(peerId, stream) {
    const ctx = this.ensureContext();
    if (!ctx || !stream) return;

    // Clean up existing chain if peer is re-adding
    this.removeRemotePeer(peerId);

    try {
      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      const pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      // Start muted until initial spatial coordinates are updated
      gainNode.gain.setValueAtTime(0, ctx.currentTime);

      if (pannerNode) {
        pannerNode.pan.setValueAtTime(0, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(ctx.destination);
      } else {
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
      }

      this.peerChains.set(peerId, {
        stream,
        source,
        gainNode,
        pannerNode,
        distance: 9999,
        volume: 0,
        pan: 0,
      });
    } catch (err) {
      console.error(`Failed to create spatial audio chain for peer ${peerId}`, err);
    }
  }

  /**
   * Update 2D spatial positioning for a remote peer relative to local player
   */
  updatePeerPosition(peerId, localX, localY, remoteX, remoteY) {
    const chain = this.peerChains.get(peerId);
    if (!chain || !this.audioCtx) return;

    const ctx = this.audioCtx;
    const distance = calculateDistance(localX, localY, remoteX, remoteY);
    const targetVolume = this.isDeafened ? 0 : calculateAttenuation(distance, this.audioRadius);
    const targetPan = calculatePan(localX, remoteX, this.audioRadius);

    chain.distance = distance;
    chain.volume = targetVolume;
    chain.pan = targetPan;

    // Smooth automation prevents audio clicks / pops
    const now = ctx.currentTime;
    const rampTime = 0.05; // 50ms smooth transition time constant

    try {
      chain.gainNode.gain.setTargetAtTime(targetVolume, now, rampTime);
      if (chain.pannerNode) {
        chain.pannerNode.pan.setTargetAtTime(targetPan, now, rampTime);
      }
    } catch (err) {
      // In case AudioContext is closing
    }
  }

  setDeafened(deafened) {
    this.isDeafened = Boolean(deafened);
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    for (const chain of this.peerChains.values()) {
      const targetVolume = this.isDeafened ? 0 : calculateAttenuation(chain.distance, this.audioRadius);
      chain.gainNode.gain.setTargetAtTime(targetVolume, now, 0.05);
    }
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
  }

  removeRemotePeer(peerId) {
    const chain = this.peerChains.get(peerId);
    if (!chain) return;

    try {
      chain.source.disconnect();
      chain.gainNode.disconnect();
      if (chain.pannerNode) {
        chain.pannerNode.disconnect();
      }
    } catch (err) {
      // Ignore disconnect errors
    }

    this.peerChains.delete(peerId);
  }

  destroy() {
    if (this.speakingInterval) {
      cancelAnimationFrame(this.speakingInterval);
    }

    for (const peerId of Array.from(this.peerChains.keys())) {
      this.removeRemotePeer(peerId);
    }

    if (this.localSource) {
      this.localSource.disconnect();
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }

    this.audioCtx = null;
  }
}
