const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Création des dossiers
const UPLOADS = path.join(__dirname, "uploads");
const DATA = path.join(__dirname, "data");
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

const DB_FILE = path.join(DATA, "db.json");
let db = { users: [], messages: [], statuses: [] };

// Charger la BDD (si elle existe)
if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8")); } catch(e){}
}

function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

// Configuration de l'upload (photos/vidéos)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => cb(null, uuid() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype, name: req.file.originalname });
});

// API pour les utilisateurs et le login
app.get("/api/users", (req, res) => res.json(db.users));

app.post("/api/login", (req, res) => {
  const { nom, telephone, avatar } = req.body;
  if (!nom || !telephone) return res.status(400).json({ error: "Champs requis" });
  
  let user = db.users.find(u => u.telephone === telephone);
  if (!user) {
    user = { id: uuid(), nom, telephone, avatar: avatar || null, online: false };
    db.users.push(user);
  } else {
    user.nom = nom;
    if (avatar) user.avatar = avatar;
  }
  saveDB();
  res.json(user);
});

// Socket.io (messages temps réel)
io.on("connection", (socket) => {
  socket.on("user:online", (userId) => {
    io.emit("users:update", db.users);
  });

  socket.on("message:send", (msg) => {
    db.messages.push(msg);
    saveDB();
    io.emit("message:new", msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log(`✅ Talksy server running on port ${PORT}`));
