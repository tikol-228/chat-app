import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key'; // In production, use environment variable

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"]
  }
});

// ======================
// SOCKET AUTH (JWT)
// ======================

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = user;
    next();
  });
});

// ======================
// EXPRESS SETUP
// ======================

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../my-app/dist')));

// ======================
// IN-MEMORY DATA
// ======================

const messages = [];
const users = [];
const onlineUsers = [];

// ======================
// JWT MIDDLEWARE
// ======================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ======================
// ROUTES
// ======================

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required' });

  if (users.find(user => user.email === email))
    return res.status(400).json({ error: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: Date.now(), name, email, password: hashedPassword };
  users.push(user);

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const user = users.find(user => user.email === email);
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/messages', authenticateToken, (req, res) => {
  res.json(messages);
});

app.post('/api/messages', authenticateToken, (req, res) => {
  const { text, chat } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const newMessage = { id: Date.now(), text, sender: req.user.email, chat };
  messages.push(newMessage);
  res.status(201).json(newMessage);
});

app.delete('/api/messages/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = messages.findIndex(msg => msg.id === id);
  if (index === -1) return res.status(404).json({ error: 'Message not found' });

  if (messages[index].sender !== req.user.email)
    return res.status(403).json({ error: 'You can only delete your own messages' });

  messages.splice(index, 1);
  res.status(204).send();
});

app.get('/*path', (req, res) => {
  res.sendFile(path.join(__dirname, '../my-app/dist/index.html'));
});

// ======================
// SOCKET.IO
// ======================

io.on('connection', (socket) => {
  console.log('a user connected');

  // ----- CHAT -----

  socket.on('join', () => {
    const username = socket.user.email;
    socket.username = username;

    if (!onlineUsers.includes(username)) {
      onlineUsers.push(username);
    }

    io.emit('userJoined', username);
    io.emit('onlineUsers', onlineUsers);
  });

  socket.on('sendMessage', (data) => {
    const newMessage = {
      id: Date.now(),
      text: data.text,
      sender: socket.user.email,
      chat: data.chat
    };

    messages.push(newMessage);
    io.emit('newMessage', newMessage);
  });

  // ----- CALLS -----

  socket.on('call', ({ to }) => {
    const calleeSocket = Array.from(io.sockets.sockets.values()).find(s => s.user && s.user.email === to);
    if (calleeSocket) {
      calleeSocket.emit('incomingCall', { from: socket.user.email, roomId: `${socket.user.email}-${to}` });
    }
  });

  socket.on('acceptCall', ({ roomId }) => {
    socket.join(roomId);
    socket.voiceRoomId = roomId;
    const callerEmail = roomId.split('-')[0];
    const callerSocket = Array.from(io.sockets.sockets.values()).find(s => s.user && s.user.email === callerEmail);
    if (callerSocket) {
      callerSocket.join(roomId);
      callerSocket.voiceRoomId = roomId;
      io.to(roomId).emit('callAccepted');
    }
  });

  // ============================
  // 🎤 WEBRTC VOICE SIGNALING
  // ============================

  socket.on("webrtc:join", ({ roomId }) => {
    socket.join(roomId);
    socket.voiceRoomId = roomId;

    const room = io.sockets.adapter.rooms.get(roomId);
    if (room && room.size > 1) {
      socket.to(roomId).emit("webrtc:ready");
    }

    console.log(`🎧 ${socket.user.email} joined voice room ${roomId}`);
  });

  socket.on("webrtc:offer", (offer) => {
    if (socket.voiceRoomId)
      socket.to(socket.voiceRoomId).emit("webrtc:offer", offer);
  });

  socket.on("webrtc:answer", (answer) => {
    if (socket.voiceRoomId)
      socket.to(socket.voiceRoomId).emit("webrtc:answer", answer);
  });

  socket.on("webrtc:ice", (candidate) => {
    if (socket.voiceRoomId)
      socket.to(socket.voiceRoomId).emit("webrtc:ice", candidate);
  });

  socket.on("webrtc:leave", () => {
    if (socket.voiceRoomId) {
      socket.to(socket.voiceRoomId).emit("webrtc:leave");
      socket.leave(socket.voiceRoomId);
      socket.voiceRoomId = null;
    }
  });

  // ----- DISCONNECT -----

  socket.on('disconnect', () => {
    if (socket.voiceRoomId) {
      socket.to(socket.voiceRoomId).emit("webrtc:leave");
    }

    if (socket.username) {
      const index = onlineUsers.indexOf(socket.username);
      if (index > -1) onlineUsers.splice(index, 1);
      io.emit('userLeft', socket.username);
      io.emit('onlineUsers', onlineUsers);
    }

    console.log('user disconnected');
  });
});

// ======================
// START SERVER
// ======================

server.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];

  for (const name in networkInterfaces) {
    for (const iface of networkInterfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  console.log(`Server is running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  if (addresses.length > 0) {
    console.log(`Network access: ${addresses.map(addr => `http://${addr}:${PORT}`).join(', ')}`);
  }
});   