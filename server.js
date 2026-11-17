const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname))); // Sert le fichier index.html

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({ dest: 'uploads/' });

let users = [];
let messages = [];
let statuses = [];

app.post('/api/login', (req, res) => {
  const { nom, telephone, avatar } = req.body;
  let user = users.find(u => u.telephone === telephone);
  if (!user) {
    user = { id: Date.now().toString(), nom, telephone, avatar, online: true };
    users.push(user);
  } else {
    user.nom = nom;
    if (avatar) user.avatar = avatar;
    user.online = true;
  }
  res.json(user);
});

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Pas de fichier" });
  res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype, name: req.file.originalname });
});

app.get('/api/statuses', (req, res) => {
  res.json(statuses);
});

io.on('connection', (socket) => {
  socket.on('user:online', (id) => {
    io.emit('users:update', users);
  });

  socket.on('message:send', (m) => {
    messages.push(m);
    io.emit('message:new', m);
  });

  socket.on('status:new', (s) => {
    statuses.push(s);
    io.emit('status:new', s);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Talksy tourne sur le port ${PORT}`);
});
