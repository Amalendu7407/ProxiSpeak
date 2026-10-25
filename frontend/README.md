# ProxiSpeak Frontend

## Overview
ProxiSpeak is a 2D virtual office where users move their avatars around a shared map. When two users come within 100 pixels of each other, they enter each other's "hearing zone", which is the basis for proximity-based audio.

## Features
- Login screen with username
- Avatar movement on HTML5 Canvas (WASD / Arrow keys)
- Live multiplayer avatars using Socket.io
- Glowing 100px hearing zone around the player
- Office layout with walls, desks, tables, sofa and plants
- Wall and furniture collision detection
- Smooth 60 FPS animation using requestAnimationFrame
- Nearby users highlighted when inside the hearing zone

## Tech Stack
HTML5 Canvas, JavaScript, Socket.io client

## Folder Structure
- index.html: login screen and canvas
- app.js: game logic, movement, rendering, socket events
- style.css: styling

## Setup and Run
1. Start the backend: `cd backend_p`, then `npm install`, then `node server.js`
2. Open `frontend/index.html` in a browser
3. Enter a username and click Join
4. To test multiplayer, open the page in two tabs with different usernames

## Socket Events Used
- `join-space`: sent when a user joins
- `move`: sends the player's current position to the server
- `user-joined`: a new user has joined
- `user-moved`: another user's position was updated
- `user-left`: a user has disconnected

## Screenshots
Coming soon
