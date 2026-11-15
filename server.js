const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
io.on('connection', (socket) => {
  socket.on('chat message', (msg) => { io.emit('chat message', msg); });
});
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Bavard marche'));
