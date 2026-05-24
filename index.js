const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Guardamos el estado actual del dispositivo
let estadoDispositivo = {
  conectado: false,
  camaraActiva: false,
  microfonoActivo: false,
  ubicacion: 'Desconocida',
  ultimoLatido: null,
};

io.on('connection', (socket) => {
  console.log('Nueva conexion:', socket.id);

  // El telefono se identifica al conectarse
  socket.on('identificar', (data) => {
    if (data.tipo === 'telefono') {
      socket.join('telefono');
      estadoDispositivo.conectado = true;
      console.log('Telefono conectado');
      // Notifica a la PC que el telefono esta conectado
      io.to('pc').emit('telefono_conectado', estadoDispositivo);
    }

    if (data.tipo === 'pc') {
      socket.join('pc');
      console.log('PC conectada');
      // Envia el estado actual a la PC al conectarse
      socket.emit('estado_actual', estadoDispositivo);
    }
  });

  // El telefono envia su ubicacion
  socket.on('ubicacion', (data) => {
    estadoDispositivo.ubicacion = data.lugar;
    console.log('Ubicacion recibida:', data.lugar);
    io.to('pc').emit('ubicacion_actualizada', data);
  });

  // El telefono envia latidos para confirmar que sigue vivo
  socket.on('latido', (data) => {
    estadoDispositivo.ultimoLatido = new Date().toISOString();
    io.to('pc').emit('latido', data);
  });

  // La PC manda comando de activar camara
  socket.on('activar_camara', () => {
    estadoDispositivo.camaraActiva = true;
    console.log('Comando: activar camara');
    io.to('telefono').emit('comando', { accion: 'activar_camara' });
  });

  // La PC manda comando de detener camara
  socket.on('detener_camara', () => {
    estadoDispositivo.camaraActiva = false;
    console.log('Comando: detener camara');
    io.to('telefono').emit('comando', { accion: 'detener_camara' });
  });

  // La PC manda comando de activar microfono
  socket.on('activar_microfono', () => {
    estadoDispositivo.microfonoActivo = true;
    console.log('Comando: activar microfono');
    io.to('telefono').emit('comando', { accion: 'activar_microfono' });
  });

  // La PC manda comando de detener microfono
  socket.on('detener_microfono', () => {
    estadoDispositivo.microfonoActivo = false;
    console.log('Comando: detener microfono');
    io.to('telefono').emit('comando', { accion: 'detener_microfono' });
  });

  // Cuando el telefono se desconecta
  socket.on('disconnect', () => {
    console.log('Desconectado:', socket.id);
    estadoDispositivo.conectado = false;
    io.to('pc').emit('telefono_desconectado');
  });
});

// Ruta simple para verificar que el servidor esta vivo
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