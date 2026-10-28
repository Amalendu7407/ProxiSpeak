# ProxiSpeak 🎙️🏢

> **ProxiSpeak** is a production-ready, full-stack virtual office application where colleagues move around an interactive 2D office floor plan and converse via real-time, spatially-aware WebRTC voice chat. As avatars approach one another, conversations naturally become audible; as avatars move away, sound attenuates and seamlessly fades out.

---

## 🌟 Key Features

1. **JWT Authentication & Domain Restriction**:
   - Registration strictly restricted to configurable corporate email domains (e.g. `@infotact.com`).
   - Secure password hashing with `bcryptjs`.
   - Rotating refresh tokens stored as SHA-256 hashes in MongoDB with automatic reuse detection and revocation.
   - HttpOnly, SameSite, Secure cookies for refresh tokens.
2. **Interactive 2D HTML5 Canvas Office**:
   - High-performance Canvas rendering loop decoupling input and physics from React re-renders.
   - Fixed-step / delta-time avatar movement with WASD and arrow keys.
   - Smooth collision resolution with walls and office furniture (conference tables, desks, lounge bars).
   - Dynamic zone tracking (*Meeting Room Alpha*, *Executive Boardroom*, *Coffee Lounge*, *Quiet Focus Pods*).
   - High DPI (`devicePixelRatio`) support with camera interpolation.
3. **In-Memory Geospatial Proximity Engine**:
   - High-speed 2D `SpatialGrid` hash-grid for $O(1)$ neighboring lookups.
   - Configurable Euclidean distance thresholds:
     - **Audible Hearing Radius**: 250 px (~6.2m)
     - **WebRTC Connection Radius**: 300 px (~7.5m)
     - **WebRTC Disconnection Radius (Hysteresis)**: 360 px (~9.0m)
   - Connection hysteresis completely eliminates rapid connection flapping at boundaries.
   - Cross-office isolation and automated stale session cleanup.
4. **WebRTC Spatial Voice System**:
   - W3C **Perfect Negotiation** pattern with polite/impolite deterministic tie-breaking.
   - Secure WebRTC signaling over Socket.IO with strict proximity and office access verification.
   - Echo cancellation, noise suppression, and automatic gain control.
5. **Web Audio API Spatialization**:
   - Per-peer audio pipeline: `MediaStreamAudioSourceNode` ➔ `GainNode` ➔ `StereoPannerNode` ➔ `AudioDestination`.
   - Distance attenuation: $\text{volume} = \text{clamp}(1 - \text{distance} / \text{radius}, 0, 1)$.
   - Horizontal stereo panning: $\text{pan} = \text{clamp}((\text{remoteX} - \text{localX}) / \text{radius}, -1, +1)$.
   - `AudioParam.setTargetAtTime` smooth automation preventing audible pops and clicks.
   - Real-time `AnalyserNode` for local speaking detection and avatar pulse ripples.
6. **Cloudinary v2 Profile Avatars**:
   - Secure server-side avatar uploads using Cloudinary SDK v2.
   - 5MB strict limit, MIME verification (JPEG, PNG, WebP only; SVG rejected for security).
   - Safe server-generated public IDs with atomic cleanup of replaced images.
   - Built-in fallback avatar generation when Cloudinary credentials are not configured.

---

## 📂 Repository Architecture

```
ProxySpeak/
├── client/                     # Vite + React 18 + Tailwind CSS frontend
│   ├── src/
│   │   ├── audio/              # Web Audio SpatialAudioEngine
│   │   ├── canvas/             # Canvas renderer, input manager, collisions
│   │   ├── components/         # HUD, modals, avatars, controls
│   │   ├── contexts/           # AuthContext & session restore
│   │   ├── pages/              # AuthPage, OfficePage
│   │   ├── services/           # Fetch API wrapper, WebRTCManager, auth, users
│   │   ├── socket/             # Socket.IO client instance
│   │   ├── styles/             # Tailwind CSS & glassmorphic styles
│   │   └── utils/              # Distance, attenuation, and panning math
│   └── package.json
├── server/                     # Express + Socket.IO + Mongoose backend
│   ├── src/
│   │   ├── config/             # Config parsing & MongoDB connection
│   │   ├── controllers/        # Auth, User, and Office HTTP controllers
│   │   ├── middleware/         # Auth, error handling, rate limiting, multer
│   │   ├── models/             # User, RefreshToken, Office, OfficeMembership
│   │   ├── proximity/          # SpatialGrid & ProximityEngine
│   │   ├── routes/             # REST endpoints
│   │   ├── services/           # AuthService, CloudinaryService, OfficeService
│   │   ├── socket/             # Socket.IO server & WebRTC signaling
│   │   └── validators/         # Zod schemas with domain checking
│   ├── tests/
│   │   ├── unit/               # Proximity, audio math, token unit tests
│   │   ├── integration/        # Auth, profile, and Socket.IO integration tests
│   │   └── performance.test.js # 50-client concurrent load benchmark
│   └── package.json
├── .env.example                # Template configuration
├── package.json                # Monorepo workspaces & orchestrating scripts
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** >= v18 (v24 LTS recommended)
- **MongoDB** (local `mongod` or MongoDB Atlas cluster URI)

### 2. Installation
Install all dependencies across both client and server workspaces:
```bash
npm run install:all
```

### 3. Environment Configuration
Copy `.env.example` to `.env` in the root (and/or `server/`):
```bash
cp .env.example .env
```
Key variables to configure:
```ini
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/proxispeak
ALLOWED_EMAIL_DOMAIN=infotact.com
JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_min_32_chars
```



### 4. Running Locally in Development
Start both server and client concurrently with a single command:
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

---

## 🧪 Testing

### Run Automated Unit & Integration Tests
Vitest executes tests across models, auth, domain validation, token rotation, spatial grid, hysteresis, and Socket.IO signaling:
```bash
npm test
```

### Run 50-Client Performance Benchmark
Run the concurrent user stress test evaluating 2, 10, 25, and 50 simulated clients:
```bash
npm run test:perf
```

---

## 👥 Two-Browser Manual Testing Instructions

To experience proximity-based spatial audio firsthand:

1. **Launch the application** with `npm run dev`.
2. Open **Browser Window 1** (e.g. Chrome) and navigate to `http://localhost:5173`.
   - Register an account: `alice@infotact.com`, password `Password123!`.
   - Grant microphone permissions when prompted.
   - Alice spawns in the virtual office floor plan.
3. Open **Browser Window 2** (e.g. Chrome Incognito or Firefox) and navigate to `http://localhost:5173`.
   - Register a second account: `bob@infotact.com`, password `Password123!`.
   - Grant microphone permissions.
   - Bob spawns near the office center.
4. **Test Proximity Hearing Range**:
   - Use `WASD` or arrow keys to move Bob towards Alice.
   - Observe the green proximity circle around Alice. When Bob enters the connection radius, the WebRTC peer connection initializes seamlessly.
   - When Bob enters the inner hearing circle ($250\text{ px}$), speak into Browser 2's microphone. Notice Alice hears Bob clearly.
   - Move Bob to the far left of Alice. Notice the audio pans distinctly to Alice's **left headphone**.
   - Move Bob to the far right of Alice. Notice the audio pans distinctly to Alice's **right headphone**.
   - Move Bob away into the hallway. Notice Bob's voice fades smoothly to zero.
5. **Test Microphone Controls**:
   - Press <kbd>M</kbd> or click the mic button to mute/unmute.
   - Observe the real-time red mute badge appear on the avatar and participant list.

---

## 📡 Socket.IO Event Protocol Reference

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `office:join` | Client ➔ Server | `{ officeId }` | Authenticated request to enter an office room |
| `office:joined` | Server ➔ Client | `{ office, self, users, webrtc }` | Initial office state, spawn point, and current users |
| `office:user_joined` | Server ➔ Broadcast | `{ userId, x, y, profile, muted }` | Notifies office occupants of new peer |
| `office:user_left` | Server ➔ Broadcast | `{ userId }` | Notifies office occupants when peer leaves |
| `player:move` | Client ➔ Server | `{ x, y }` | Rate-limited local avatar coordinate update |
| `player:moved` | Server ➔ Broadcast | `{ userId, x, y }` | Interpolated position update for remote avatars |
| `proximity:enter` | Server ➔ Client | `{ peerId, peer, distance, canHear }` | Peer entered connection radius (triggers WebRTC setup) |
| `proximity:leave` | Server ➔ Client | `{ peerId }` | Peer exceeded disconnection radius (triggers WebRTC teardown) |
| `proximity:update` | Server ➔ Client | `{ activePeers: [...] }` | Distance and hearing status updates |
| `rtc:signal` | Bidirectional | `{ recipientId, signal }` | End-to-end SDP offer/answer & ICE candidate routing |
| `user:mute_state` | Bidirectional | `{ userId, muted }` | Microphone mute status synchronization |

---

## 🛡️ Security Architecture

- **Strict CORS & Helmet**: Configured for WebSockets, WebRTC, and credentials.
- **Rate Limiting**:
  - Auth limiter: 30 requests per 15 minutes per IP.
  - API limiter: 120 requests per minute per IP.
  - Movement throttle: Server clamps incoming `player:move` to max 35 updates/sec and rejects impossible teleportation velocities (> 1200 px/sec).
- **Zod Schema Validation**: Sanitizes and enforces domain bounds on every request.
- **Token Security**: Refresh tokens stored solely as SHA-256 hashes; automatic revocation of all user sessions upon replay detection.
- **Signaling Recipient Authorization**: WebRTC signals are rejected unless both sender and receiver are authenticated members of the same office and currently within connected proximity.

---

## 📈 Scaling Architecture (Mesh vs SFU)

| Feature | ProxiSpeak Mesh (Current) | SFU (e.g. mediasoup / LiveKit) |
| :--- | :--- | :--- |
| **Server CPU / Bandwidth** | Negligible (Audio relayed P2P) | High (Server transcodes / forwards tracks) |
| **Max Concurrent Office Users** | **50+ Users** (Spatial proximity limits active connections to ~4-8 per avatar) | **500+ Users** per office room |
| **Infrastructure Cost** | Low (only STUN/TURN needed) | Higher (requires media routing instances) |
| **Audio Latency** | Direct peer-to-peer (~15-40ms) | Client-to-server-to-client (~40-80ms) |

Because ProxiSpeak enforces **proximity-based connection management**, even with 50+ users in an office, each user only maintains 2-6 peer connections with nearby colleagues. If an organization requires giant all-hands meetings with 50+ users packed into a single circle, the modular `WebRTCManager` and `ProximityEngine` can be plugged into an SFU (such as mediasoup or LiveKit) without altering the proximity engine.
