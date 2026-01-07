import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://chat-app-my-app-three.vercel.app", // твой фронтенд на Vercel
      "https://chat-app-my-4317suddi-tikols-projects-0064ee57.vercel.app" // обновленный URL
    ],
    methods: ["GET", "POST"]
  }
})

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://chat-app-my-app-three.vercel.app",
    "https://chat-app-my-4317suddi-tikols-projects-0064ee57.vercel.app"
  ]
})) 

const messages = [];

app.use(express.json());
app.use(cors());

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
  console.log(`Server is running on port ${PORT}`);
});
