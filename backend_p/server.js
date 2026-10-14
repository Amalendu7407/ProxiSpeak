import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();
app.use(cors()); // फ्रंटएंड और बैकएंड को बिना एरर जोड़ने के लिए

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" } // सुरक्षा सेटिंग्स
});

// जब भी कोई यूजर वेबसाइट खोलेगा, यह सॉकेट कनेक्शन चालू होगा
io.on('connection', (socket) => {
  console.log(`🔌 एक नया यूजर जुड़ गया! उसकी सॉकेट आईडी है: ${socket.id}`);

  // जब फ्रंटएंड से यूजर ज्वाइन करेगा
  socket.on('join-space', (data) => {
    console.log(`${data.username} ने ऑफिस ज्वाइन किया!`);
    // बाकी सब को बताओ कि नया यूजर आया है
    socket.broadcast.emit('user-joined', {
      socketId: socket.id,
      username: data.username,
      x: data.x,
      y: data.y
    });
  });
socket.on('move', (data) => {
    socket.broadcast.emit('move', { id: socket.id, ...data });
  });
  // जब कोई यूजर वेबसाइट बंद करेगा
  socket.on('disconnect', () => {
    console.log(`❌ यूजर चला गया: ${socket.id}`);
    io.emit('user-left', socket.id);
  });
});

// सर्वर को पोर्ट 5000 पर चालू करना
const PORT = 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 सदस्य A का सर्ver चालू है: http://localhost:${PORT}`);
});








