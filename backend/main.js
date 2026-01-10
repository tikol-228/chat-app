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
    origin: true, // Allow all origins for local network access
    methods: ["GET", "POST"]
  }
})

// Middleware for Socket.IO authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = user;
    next();
  });
});

app.use(cors({
  origin: true // Allow all origins
})) 

const messages = [];
const users = []; // In-memory user storage

app.use(express.json());

// Middleware to verify JWT
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

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../my-app/dist')));

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

// Register route
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: Date.now(), name, email, password: hashedPassword };
  users.push(user);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = users.find(user => user.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/messages', authenticateToken, (req, res) => {
  res.json(messages);
});

app.post('/messages', authenticateToken, (req, res) => {
  const { text } = req.body;
  const sender = req.user.email; // Use email as sender
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  const newMessage = { id: Date.now(), text, sender };
  messages.push(newMessage);
  res.status(201).json(newMessage);
});

app.delete('/messages/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = messages.findIndex(msg => msg.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Message not found' });
  }
  // Check if the user is the sender
  if (messages[index].sender !== req.user.email) {
    return res.status(403).json({ error: 'You can only delete your own messages' });
  }
  messages.splice(index, 1);
  res.status(204).send();
});

// ✅ Catch-all route for new path-to-regexp (v7+)
app.get('/*path', (req, res) => {
  res.sendFile(path.join(__dirname, '../my-app/dist/index.html'));
});

const onlineUsers = [];

io.on('connection', (socket) => {
  console.log('a user connected');

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
    const { text } = data;
    const sender = socket.user.email;
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
