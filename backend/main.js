import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins for local network access
    methods: ["GET", "POST"]
  }
})

app.use(cors({
  origin: true // Allow all origins
})) 

const messages = [];

app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../my-app/dist')));

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.get('/messages', (req, res) => {
  res.json(messages);
});

app.post('/messages', (req, res) => {
  const { text, sender } = req.body;
  if (!text || !sender) {
    return res.status(400).json({ error: 'Text and sender are required' });
  }
  const newMessage = { id: Date.now(), text, sender };
  messages.push(newMessage);
  res.status(201).json(newMessage);
});

// ✅ Catch-all route for new path-to-regexp (v7+)
app.get('/*path', (req, res) => {
  res.sendFile(path.join(__dirname, '../my-app/dist/index.html'));
});

const onlineUsers = [];

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join', (username) => {
    socket.username = username;
    if (!onlineUsers.includes(username)) {
      onlineUsers.push(username);
    }
    io.emit('userJoined', username);
    io.emit('onlineUsers', onlineUsers);
  });

  socket.on('sendMessage', (data) => {
    const { text, sender } = data;
    const newMessage = { id: Date.now(), text, sender };
    messages.push(newMessage);
    io.emit('newMessage', newMessage);
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      const index = onlineUsers.indexOf(socket.username);
      if (index > -1) {
        onlineUsers.splice(index, 1);
      }
      io.emit('userLeft', socket.username);
      io.emit('onlineUsers', onlineUsers);
    }
    console.log('user disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  console.log(`Server is running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  if (addresses.length > 0) {
    console.log(`Network access: ${addresses.map(addr => `http://${addr}:${PORT}`).join(', ')}`);
  } else {
    console.log('No network interfaces found for external access.');
  }
});
