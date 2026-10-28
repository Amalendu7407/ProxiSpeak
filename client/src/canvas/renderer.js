import { lerp } from '../utils/math.js';

// Pre-cached image instances for user avatars
const imageCache = new Map();

function getCachedImage(url) {
  if (!url) return null;
  if (imageCache.has(url)) {
    const img = imageCache.get(url);
    return img.complete ? img : null;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  imageCache.set(url, img);
  return null;
}

export class OfficeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 800, y: 600, targetX: 800, targetY: 600 };
    this.remoteAvatars = new Map(); // peerId -> { targetX, targetY, currentX, currentY, profile, muted, speaking }
    this.pulsePhase = 0;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.dpr = dpr;
    this.viewWidth = rect.width;
    this.viewHeight = rect.height;
  }

  updateRemotePeer(peerId, targetX, targetY, profile, muted, speaking) {
    if (!this.remoteAvatars.has(peerId)) {
      this.remoteAvatars.set(peerId, {
        currentX: targetX,
        currentY: targetY,
        targetX,
        targetY,
        profile: profile || {},
        muted: Boolean(muted),
        speaking: Boolean(speaking),
      });
    } else {
      const peer = this.remoteAvatars.get(peerId);
      peer.targetX = targetX;
      peer.targetY = targetY;
      if (profile) peer.profile = profile;
      if (muted !== undefined) peer.muted = muted;
      if (speaking !== undefined) peer.speaking = speaking;
    }
  }

  removeRemotePeer(peerId) {
    this.remoteAvatars.delete(peerId);
  }

  render(localPlayer, officeLayout, audioRadius = 250, connectionRadius = 300) {
    const { ctx, canvas, dpr = 1, viewWidth, viewHeight } = this;
    if (!ctx || !viewWidth || !viewHeight) return;

    this.pulsePhase = (this.pulsePhase + 0.05) % (Math.PI * 2);

    // Smooth camera interpolation towards local player
    this.camera.targetX = localPlayer.x;
    this.camera.targetY = localPlayer.y;
    this.camera.x = lerp(this.camera.x, this.camera.targetX, 0.1);
    this.camera.y = lerp(this.camera.y, this.camera.targetY, 0.1);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Camera transform: Center view on player's camera position
    const offsetX = Math.floor(viewWidth / 2 - this.camera.x);
    const offsetY = Math.floor(viewHeight / 2 - this.camera.y);
    ctx.translate(offsetX, offsetY);

    // 1. Draw Office Floor Grid & Border
    this.drawFloor(officeLayout);

    // 2. Draw Office Zones (Meeting rooms, lounges, focus areas)
    this.drawZones(officeLayout.zones);

    // 3. Draw Local Player Proximity Audio Rings (Audio Radius & Connection Radius)
    this.drawProximityRadius(localPlayer.x, localPlayer.y, audioRadius, connectionRadius);

    // 4. Draw Walls & Furniture
    this.drawWallsAndFurniture(officeLayout.walls);

    // 5. Draw Remote Players
    this.drawRemoteAvatars(localPlayer, audioRadius);

    // 6. Draw Local Player Avatar
    this.drawAvatar({
      x: localPlayer.x,
      y: localPlayer.y,
      name: `${localPlayer.profile?.name || 'You'} (You)`,
      avatarUrl: localPlayer.profile?.avatar?.url,
      isLocal: true,
      muted: localPlayer.muted,
      speaking: localPlayer.speaking,
    });

    ctx.restore();
  }

  drawFloor(layout) {
    const { ctx } = this;
    const width = layout.width || 1600;
    const height = layout.height || 1200;

    // Floor background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Floor grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;

    ctx.beginPath();
    for (let x = 0; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Map outline
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, width, height);
  }

  drawZones(zones = []) {
    const { ctx } = this;
    for (const zone of zones) {
      ctx.fillStyle = zone.color || 'rgba(59, 130, 246, 0.08)';
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.setLineDash([]);

      // Zone label header
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(zone.name.toUpperCase(), zone.x + 16, zone.y + 24);
    }
  }

  drawProximityRadius(x, y, audioRadius, connectionRadius) {
    const { ctx, pulsePhase } = this;

    // Outer connection radius (faint dashed circle)
    ctx.beginPath();
    ctx.arc(x, y, connectionRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Audio hearing radius (gentle glowing green fill)
    const gradient = ctx.createRadialGradient(x, y, 10, x, y, audioRadius);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.12)');
    gradient.addColorStop(0.7, 'rgba(34, 197, 94, 0.05)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

    ctx.beginPath();
    ctx.arc(x, y, audioRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Subtle pulsating border for hearing perimeter
    const pulseOffset = Math.sin(pulsePhase) * 2;
    ctx.beginPath();
    ctx.arc(x, y, audioRadius + pulseOffset, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawWallsAndFurniture(walls = []) {
    const { ctx } = this;

    for (const item of walls) {
      if (item.type === 'wall') {
        // Wall shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(item.x + 4, item.y + 4, item.width, item.height);

        // Wall main body
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(item.x, item.y, item.width, item.height);

        // Wall top bevel highlight
        ctx.fillStyle = '#334155';
        ctx.fillRect(item.x, item.y, item.width, Math.min(item.height, 4));

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(item.x, item.y, item.width, item.height);
      } else if (item.type === 'desk') {
        // Wooden desk with monitor
        ctx.fillStyle = '#292524';
        ctx.fillRect(item.x, item.y, item.width, item.height);

        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(item.x, item.y, item.width, item.height);

        // Laptop / monitor indicator on desk
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(item.x + item.width / 2 - 14, item.y + item.height / 2 - 3, 28, 6);
      } else if (item.type === 'meeting-table') {
        // Rounded conference table
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(item.x, item.y, item.width, item.height, 16);
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Table center glass panel
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.beginPath();
        ctx.roundRect(item.x + 12, item.y + 12, item.width - 24, item.height - 24, 8);
        ctx.fill();
      }
    }
  }

  drawRemoteAvatars(localPlayer, audioRadius) {
    for (const [peerId, peer] of this.remoteAvatars.entries()) {
      // Smooth interpolation
      peer.currentX = lerp(peer.currentX, peer.targetX, 0.18);
      peer.currentY = lerp(peer.currentY, peer.targetY, 0.18);

      const dx = peer.currentX - localPlayer.x;
      const dy = peer.currentY - localPlayer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isAudible = dist <= audioRadius;

      this.drawAvatar({
        x: peer.currentX,
        y: peer.currentY,
        name: peer.profile?.name || 'Colleague',
        avatarUrl: peer.profile?.avatar?.url,
        isLocal: false,
        muted: peer.muted,
        speaking: peer.speaking,
        isAudible,
        distance: dist,
      });
    }
  }

  drawAvatar({ x, y, name, avatarUrl, isLocal, muted, speaking, isAudible = true, distance = 0 }) {
    const { ctx, pulsePhase } = this;
    const radius = 22;

    ctx.save();
    ctx.translate(x, y);

    // If remote and outside audio range, slightly fade
    if (!isLocal && !isAudible) {
      ctx.globalAlpha = 0.65;
    }

    // 1. Speaking sound wave ripples
    if (speaking && !muted) {
      const pulseSize = 6 + Math.sin(pulsePhase * 2) * 4;
      ctx.beginPath();
      ctx.arc(0, 0, radius + pulseSize, 0, Math.PI * 2);
      ctx.strokeStyle = isLocal ? 'rgba(34, 197, 94, 0.7)' : 'rgba(59, 130, 246, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 2. Avatar Drop Shadow
    ctx.beginPath();
    ctx.arc(2, 4, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();

    // 3. Avatar Body Circle
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = isLocal ? '#16a34a' : '#2563eb';
    ctx.fill();

    // Avatar image or initials
    const img = getCachedImage(avatarUrl);
    if (img) {
      ctx.save();
      ctx.clip();
      ctx.drawImage(img, -radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    } else {
      // Draw initials
      const initials = (name || 'U')
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, 0, 1);
    }

    // Border ring around avatar
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = isLocal ? '#4ade80' : '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 4. Microphone Mute / Live Badge Indicator (Bottom right of avatar)
    const badgeX = radius * 0.7;
    const badgeY = radius * 0.7;
    const badgeR = 8;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = muted ? '#ef4444' : '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#0b0f17';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. Name Label Pill (Below avatar)
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    const textWidth = ctx.measureText(name).width;
    const pillW = textWidth + 16;
    const pillH = 18;
    const pillY = radius + 8;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(-pillW / 2, pillY, pillW, pillH, 9);
    ctx.fill();

    ctx.strokeStyle = isLocal ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 0, pillY + pillH / 2);

    ctx.restore();
  }
}
