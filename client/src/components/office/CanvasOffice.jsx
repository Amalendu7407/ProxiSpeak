import React, { useRef, useEffect } from 'react';
import { OfficeRenderer } from '../../canvas/renderer.js';
import { InputManager } from '../../canvas/input.js';
import { resolveMovement } from '../../canvas/collisions.js';

export function CanvasOffice({
  officeLayout,
  localPlayer,
  onPositionChange,
  remotePeers = new Map(),
  audioRadius = 250,
  connectionRadius = 300,
  onCurrentZoneChange,
  onUserGesture,
}) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const inputRef = useRef(null);

  // Store high-frequency local position in ref to avoid React re-rendering on every animation frame!
  const localPosRef = useRef({
    x: localPlayer.x || 800,
    y: localPlayer.y || 600,
    muted: localPlayer.muted,
    speaking: localPlayer.speaking,
    profile: localPlayer.profile,
  });

  // Keep local player props synchronized with ref
  useEffect(() => {
    localPosRef.current.muted = localPlayer.muted;
    localPosRef.current.speaking = localPlayer.speaking;
    localPosRef.current.profile = localPlayer.profile;
  }, [localPlayer.muted, localPlayer.speaking, localPlayer.profile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new OfficeRenderer(canvas);
    rendererRef.current = renderer;
    renderer.resize();

    const inputManager = new InputManager();
    inputRef.current = inputManager;
    inputManager.attach();

    const handleResize = () => {
      renderer.resize();
    };
    window.addEventListener('resize', handleResize);

    let animationFrameId;
    let lastTime = performance.now();
    let lastReportTime = 0;
    let lastReportedX = localPosRef.current.x;
    let lastReportedY = localPosRef.current.y;
    let currentZoneName = '';

    const PLAYER_SPEED = 240; // Pixels per second
    const AVATAR_RADIUS = 22; // Collision boundary radius

    const loop = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap delta-time at 100ms
      lastTime = currentTime;

      // 1. Process movement inputs
      const { dx, dy, isMoving } = inputManager.getMovementVector();

      if (isMoving) {
        const proposedX = localPosRef.current.x + dx * PLAYER_SPEED * dt;
        const proposedY = localPosRef.current.y + dy * PLAYER_SPEED * dt;

        const resolved = resolveMovement(
          proposedX,
          proposedY,
          localPosRef.current.x,
          localPosRef.current.y,
          AVATAR_RADIUS,
          officeLayout?.walls || [],
          { width: officeLayout?.width || 1600, height: officeLayout?.height || 1200 }
        );

        localPosRef.current.x = resolved.x;
        localPosRef.current.y = resolved.y;

        // Throttled network broadcast (~30Hz)
        if (currentTime - lastReportTime > 33) {
          const moveDist = Math.hypot(
            resolved.x - lastReportedX,
            resolved.y - lastReportedY
          );
          if (moveDist > 1) {
            onPositionChange(resolved.x, resolved.y);
            lastReportedX = resolved.x;
            lastReportedY = resolved.y;
            lastReportTime = currentTime;
          }
        }
      }

      // 2. Check current zone under avatar
      if (officeLayout?.zones) {
        const px = localPosRef.current.x;
        const py = localPosRef.current.y;
        let detectedZone = 'Open Floor';

        for (const zone of officeLayout.zones) {
          if (
            px >= zone.x &&
            px <= zone.x + zone.width &&
            py >= zone.y &&
            py <= zone.y + zone.height
          ) {
            detectedZone = zone.name;
            break;
          }
        }

        if (detectedZone !== currentZoneName) {
          currentZoneName = detectedZone;
          onCurrentZoneChange(detectedZone);
        }
      }

      // 3. Synchronize remote peers into renderer
      remotePeers.forEach((peer, peerId) => {
        renderer.updateRemotePeer(
          peerId,
          peer.x,
          peer.y,
          peer.profile,
          peer.muted,
          peer.speaking
        );
      });

      // 4. Render 2D Frame
      renderer.render(
        localPosRef.current,
        officeLayout || {},
        audioRadius,
        connectionRadius
      );

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      inputManager.detach();
      window.removeEventListener('resize', handleResize);
    };
  }, [officeLayout, onPositionChange, remotePeers, audioRadius, connectionRadius, onCurrentZoneChange]);

  return (
    <div
      className="relative w-full h-full overflow-hidden cursor-crosshair bg-dark-900 select-none"
      onClick={onUserGesture}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
