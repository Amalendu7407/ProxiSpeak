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

 