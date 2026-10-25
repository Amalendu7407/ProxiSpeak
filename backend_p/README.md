# 🎙️ ProxiSpeak - Core Backend Server Documentation

Welcome to the official backend application layer repository for **ProxiSpeak: A Geospatial Proximity Audio Ecosystem**. 

This system architecture functions as a low-latency, high-concurrency real-time signaling engine and location-tracking workspace module. It tracks active team members dynamically and orchestrates WebRTC voice paths using geographical distances.

---

## 🏗️ Technical Architecture & Stack
- **Runtime Framework:** Node.js (ECMAScript Modules Enabled)
- **Application Server:** Express.js
- **Real-Time Communication:** Socket.io (WebSockets with HTTP Long-Polling Failback)
- **Database Engine & Object Modeler:** MongoDB & Mongoose
- **Scalability Middleware:** Redis Pub/Sub Adapter (Configured for future mesh deployment clusters)
- **Automated Testing Engine:** Mocha & Chai Frameworks

---

## 📂 Backend Directory Tree Structure
```text
backend_p/
├── db.js                # Core MongoDB connection wrapper
├── server.js            # Primary Express & Socket.io execution brain
├── test.js              # Automated backend component unit tests script
├── package.json         # Dependency manifest array and scripts config
├── README.md            # System developer configuration guide
└── models/
    └── User.js          # Mongoose schema blueprint with a flat '2d' spatial index
```

---

## 🚀 Local Installation & Deployment Steps

Follow these sequential terminal commands to initialize the development sandbox:

### 1. Prerequisite Checks
Ensure that **Node.js** and **MongoDB Community Server** are currently active and running on your local machine bounds.

### 2. Dependency Resolution
Open your terminal utility inside the `backend_p` directory folder and execute:
```bash
npm install
```

### 3. Launching the Production Control Room
Boot up the main socket communication framework on **Port 3000** by running:
```bash
npm start
```
*Console verification output:*  
`📦 MongoDB database connected successfully via db.js!`  
`🚀 ProxiSpeak server running perfectly on: http://localhost:3000`

---

## 📡 Live Socket.IO Network Event Schema

### 📥 Inbound Client Event Channels
- **`join-space` (data)**  
  *Payload:* `{ username: String, x: Number, y: Number }`  
  *Action:* Saves user profiles into MongoDB and triggers an immediate map balance sync.
  
- **`move` (data)**  
  *Payload:* `{ x: Number, y: Number }`  
  *Action:* Updates active coordinate arrays inside the database and calculates the 100px `$near` boundary.

- **`webrtc-offer` / `webrtc-answer` / `ice-candidate`**  
  *Payload:* `{ targetSocketId: String, ...mediaPayloads }`  
  *Action:* Acts as a signaling router passing media handshake tracks directly between target peer remotes.

### 📤 Outbound Server Broadcast Channels
- **`users-update`**  
  *Payload Format:* `[{ id: String, x: Number, y: Number }, ...]`  
  *Action:* Broadcasts the exact flat grid layout positioning records to synchronize all screens.
  
- **`user-left`**  
  *Payload Format:* `socket.id` (String)  
  *Action:* Signals remaining workspace remotes to immediately drop the matching avatar on disconnect.

---

## 🧪 Automated Unit Testing Specification
To satisfy system reliability metrics and run the integration verification test suites, execute the command below while your primary server is running:

```bash
npx mocha test.js --exit
```
The testing wrapper script creates sandboxed connections, verifies communication loops against **Port 3000**, monitors target behaviors, and logs standard outputs directly onto your screen.
