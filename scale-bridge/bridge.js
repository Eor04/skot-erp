/**
 * ╔══════════════════════════════════════════════╗
 * ║     SKOT SCALE BRIDGE  v1.0                 ║
 * ║     Toledo Prix 4 Uno → WebSocket           ║
 * ╚══════════════════════════════════════════════╝
 *
 * FLUJO:
 *   Balanza (TCP 192.168.x.x:9000)
 *       → Este programa (corre en la PC de la caja)
 *           → WebSocket ws://localhost:8765
 *               → POS Açaí en el navegador
 *
 * USO:
 *   1.  cd scale-bridge
 *   2.  npm install
 *   3.  node bridge.js                          (usa SCALE_IP del archivo)
 *   4.  O sobreescribir IP:  SCALE_IP=192.168.1.50 node bridge.js
 *
 * Para saber la IP de la balanza:
 *   - Entrá al menú de la Toledo → Configuración → Red → Ver IP
 *   - O buscala en tu router como dispositivo conectado
 */

const net  = require('net');
const { WebSocketServer } = require('ws');

// ─── Configuración ─────────────────────────────────────────────────────────
const SCALE_IP          = process.env.SCALE_IP   || '192.168.1.100'; // ← CAMBIÁ por la IP de tu balanza
const SCALE_PORT        = Number(process.env.SCALE_PORT  || 9000);
const WS_PORT           = Number(process.env.WS_PORT     || 8765);
const RECONNECT_DELAY   = Number(process.env.RECONNECT   || 3000);   // ms entre reintentos
// ───────────────────────────────────────────────────────────────────────────

let wsClients    = new Set();
let scaleSocket  = null;
let reconnTimer  = null;
let rxBuffer     = '';

// ─── Servidor WebSocket (el navegador se conecta aquí) ─────────────────────
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('listening', () => {
  log('WS', `✅ WebSocket listo en ws://localhost:${WS_PORT}`);
  log('WS', '   Abrí el POS Açaí → "Conectar por Red"');
});

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  log('WS', `Cliente conectado: ${ip}`);
  wsClients.add(ws);

  // Informar estado actual al cliente recién conectado
  ws.send(JSON.stringify(
    scaleSocket && !scaleSocket.destroyed
      ? { type: 'status', connected: true,  ip: SCALE_IP, port: SCALE_PORT }
      : { type: 'status', connected: false, message: 'Conectando a la balanza...' }
  ));

  ws.on('close', () => { wsClients.delete(ws); log('WS', `Cliente desconectado: ${ip}`); });
  ws.on('error', ()  => { wsClients.delete(ws); });

  // El POS puede enviar comandos al bridge (ej. solicitar peso manualmente)
  ws.on('message', (msg) => {
    try {
      const cmd = JSON.parse(msg.toString());
      if (cmd.type === 'request_weight' && scaleSocket && !scaleSocket.destroyed) {
        // Algunos modelos Toledo necesitan un caracter para responder
        scaleSocket.write('\x05'); // ENQ
      }
    } catch { /* ignorar */ }
  });
});

// ─── Broadcast a todos los clientes WS ────────────────────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wsClients) {
    try { if (client.readyState === 1) client.send(msg); }
    catch { wsClients.delete(client); }
  }
}

// ─── Parser de peso Toledo / Prix 4 (varios formatos) ─────────────────────
function parseWeight(str) {
  // Formato 1 (Prix 3/4 serie continua): \x02W+01234\x03  → gramos
  const f1 = str.match(/\x02W([+-])(\d{4,6})\x03/);
  if (f1) return { weight: (f1[1] === '-' ? -1 : 1) * parseInt(f1[2]) / 1000 };

  // Formato 2 (Toledo P01 continuo): P+05000  → decagramos  (5 dígitos)
  const f2 = str.match(/P([+-])(\d{5})/);
  if (f2) return { weight: (f2[1] === '-' ? -1 : 1) * parseInt(f2[2]) / 1000 };

  // Formato 3 (ASCII Mettler): "ST,GS,  0.500kg\r\n"
  const f3 = str.match(/ST,(?:GS|US),\s*([+-]?\d+\.?\d*)\s*(kg|g)/i);
  if (f3) {
    let v = parseFloat(f3[1]);
    if (f3[2].toLowerCase() === 'g') v /= 1000;
    return { weight: v };
  }

  // Formato 4 (respuesta directa Prix 4 Uno): "W 0000500\r\n" (miligramos o gramos)
  const f4 = str.match(/W\s*([+-]?\d+)\r?\n/);
  if (f4) {
    let v = parseInt(f4[1]);
    if (Math.abs(v) > 9999) v /= 1000; // era miligramos
    else if (Math.abs(v) > 50)  v /= 1000; // era gramos
    return { weight: v };
  }

  // Formato 5 (número decimal suelto): "0.250\r\n" o "250\r\n"
  const f5 = str.match(/([+-]?\d+\.?\d+)\r?\n/);
  if (f5) {
    let v = parseFloat(f5[1]);
    if (Math.abs(v) > 50) v /= 1000; // era gramos
    return { weight: v };
  }

  return null;
}

// ─── Conexión TCP a la balanza ─────────────────────────────────────────────
function connectToScale() {
  if (scaleSocket && !scaleSocket.destroyed) return;

  log('TCP', `Conectando a ${SCALE_IP}:${SCALE_PORT}...`);
  rxBuffer = '';
  scaleSocket = new net.Socket();
  scaleSocket.setTimeout(10_000);

  scaleSocket.connect(SCALE_PORT, SCALE_IP, () => {
    log('TCP', `✅ Balanza conectada: ${SCALE_IP}:${SCALE_PORT}`);
    broadcast({ type: 'status', connected: true, ip: SCALE_IP, port: SCALE_PORT });

    // Algunos modelos Prix necesitan un comando para empezar a enviar datos.
    // Descomentá la línea que corresponda a tu modelo si la balanza no envía nada:
    // scaleSocket.write('P');      // Solicitar peso puntual
    // scaleSocket.write('\x05');   // ENQ - solicitar transmisión continua
  });

  scaleSocket.on('data', (chunk) => {
    rxBuffer += chunk.toString('latin1');

    const result = parseWeight(rxBuffer);
    if (result !== null) {
      const { weight } = result;
      // Filtrar pesos físicamente imposibles
      if (weight >= -0.005 && weight < 50) {
        const kg = Math.max(0, weight);
        broadcast({
          type:   'weight',
          weight: Math.round(kg * 1000) / 1000, // 3 decimales
          unit:   'kg',
          stable: true,
          raw:    rxBuffer.trim().slice(0, 30)
        });
      }
      // Mantener solo el final del buffer (frame incompleto posible)
      rxBuffer = rxBuffer.slice(-50);
    }

    // Evitar buffer infinito
    if (rxBuffer.length > 500) rxBuffer = rxBuffer.slice(-100);
  });

  scaleSocket.on('timeout', () => {
    log('TCP', '⏰ Timeout — cerrando socket');
    scaleSocket.destroy();
  });

  scaleSocket.on('error', (err) => {
    log('TCP', `❌ ${err.message} (¿La balanza está encendida y en la red?)`);
    broadcast({ type: 'error', message: `No se pudo conectar a ${SCALE_IP}:${SCALE_PORT}` });
  });

  scaleSocket.on('close', () => {
    log('TCP', `Conexión cerrada. Reintentando en ${RECONNECT_DELAY / 1000}s...`);
    broadcast({ type: 'status', connected: false, message: 'Balanza desconectada, reconectando...' });
    scaleSocket = null;
    if (reconnTimer) clearTimeout(reconnTimer);
    reconnTimer = setTimeout(connectToScale, RECONNECT_DELAY);
  });
}

// ─── Utilidades ───────────────────────────────────────────────────────────
function log(src, msg) {
  const t = new Date().toLocaleTimeString('es-BO', { hour12: false });
  console.log(`[${t}][${src.padEnd(3)}] ${msg}`);
}

// ─── Arrancar ─────────────────────────────────────────────────────────────
console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║        SKOT Scale Bridge  v1.0              ║');
console.log('║   Toledo Prix 4 Uno  →  WebSocket           ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`  Balanza:   ${SCALE_IP}:${SCALE_PORT}`);
console.log(`  WebSocket: ws://localhost:${WS_PORT}`);
console.log('');
console.log('  💡 Si la IP es diferente, editá SCALE_IP al inicio del archivo');
console.log('     o ejecutá:  SCALE_IP=192.168.x.x node bridge.js');
console.log('');

connectToScale();
