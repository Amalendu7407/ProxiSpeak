# contribute here
# Database and Geospatial Work

## 1. MongoDB Connection
- Database: proxispeak
- Connection: mongodb://localhost:27017/proxispeak
- MongoDB connection tested successfully.

## 2. User Model
- Stores username, socketId, and location.
- Location is stored as [x, y] canvas coordinates.
- A 2D geospatial index is created on the location field.

## 3. Proximity Query
- MongoDB $near query is used to find nearby users.
- The current user is excluded using socketId.
- Nearby user results include username, socketId, and location.

## 4. Testing Results

| Test | Result |
|---|---|
| MongoDB connection | PASS |
| 2D geospatial index | PASS |
| $near proximity query | PASS |
| User location update | PASS |
| Database disconnect cleanup simulation | PASS |

## 5. Test Files
- test-near.js
- test-proximity.js
- test-users-near.js
- test-location-update.js
- test-disconnect-cleanup.js

## 6. Notes
- Location update and database cleanup tests passed.
- Disconnect cleanup was tested at database level, not through actual Socket.IO integration.
- WebRTC audio connection is a separate frontend/backend integration task.
