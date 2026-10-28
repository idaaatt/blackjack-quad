/**
 * index.js
 * Express + Socket.io server for Blackjack Quad.
 * Production-ready: supports Render.com, CORS for Vercel frontend.
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const {
  createRoom, getRoom, joinRoom, setDealer, startRound,
  applyPlayerAction, advanceTurn, addManualNote, resetRound,
  getSafeRoomState, handleDisconnect, fillAiSeats, setAiDealer,
  STATUS, playerDecision, TURN_TIMER_SECONDS,
} = require('./src/roomManager');

const { handTotal, isBust } = require('./src/deck');

const app = express();
const httpServer = http.createServer(app);

// CORS origins: allow all Vercel preview URLs + custom domain
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    // Allow any vercel.app subdomain + explicit list
    if (origin.endsWith('.vercel.app') || ALLOWED_ORIGINS.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// KODE SETELAH DIPERBAIKI:
app.use(cors(corsOptions));
app.use(express.json());

// REST: Create room
app.post('/api/rooms', (req, res) => {
  const { nickname } = req.body;
  if (!nickname || nickname.trim().length < 1) {
    return res.status(400).json({ error: 'Nickname required' });
  }
  const { code } = createRoom(null, nickname.trim());
  res.json({ room_code: code });
});

// REST: Check room exists
app.get('/api/rooms/:code', (req, res) => {
  const room = getRoom(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ room_code: room.room_code, status: room.status, player_count: room.seats.filter(s => s.is_occupied && !s.is_ai).length });
});


// Active turn timers map: roomCode -> timeoutRef
const turnTimers = new Map();
const autoFillTimers = new Map();

function broadcastState(room) {
  io.to(room.room_code).emit('STATE_UPDATE', getSafeRoomState(room));
}

function startTurnTimer(room) {
  clearTurnTimer(room.room_code);

  const timer = setTimeout(() => {
    const currentRoom = getRoom(room.room_code);
    if (!currentRoom || currentRoom.status !== STATUS.PLAYER_TURN) return;

    const seat = currentRoom.seats.find(s => s.seat_id === currentRoom.current_turn_seat);
    if (!seat) return;

    // Auto-action: AI decides or stand on timeout
    let action = 'STAND';
    if (seat.is_ai) {
      const dealerSeat = currentRoom.seats.find(s => s.seat_id === currentRoom.dealer_seat);
      const dealerUp = dealerSeat && dealerSeat.hand.length > 0 ? dealerSeat.hand[0] : null;
      action = playerDecision(seat.hand, dealerUp, seat.hand.length === 2);
      // Can't double down - treat as HIT if that was returned (shouldn't be)
      if (action === 'DOUBLE_DOWN') action = 'HIT';
    }

    applyPlayerAction(currentRoom, seat.seat_id, action);
    advanceTurn(currentRoom);

    if (currentRoom.status === STATUS.PLAYER_TURN) {
      // Recurse for next player
      handleAiTurns(currentRoom);
    }

    broadcastState(currentRoom);
  }, TURN_TIMER_SECONDS * 1000);

  turnTimers.set(room.room_code, timer);
}

function clearTurnTimer(roomCode) {
  const t = turnTimers.get(roomCode);
  if (t) { clearTimeout(t); turnTimers.delete(roomCode); }
}

function handleAiTurns(room) {
  // Process all consecutive AI turns without timer
  let limit = 20; // safety cap
  while (room.status === STATUS.PLAYER_TURN && limit-- > 0) {
    const seat = room.seats.find(s => s.seat_id === room.current_turn_seat);
    if (!seat) break;

    if (!seat.is_ai) {
      // Human seat: start turn timer and stop processing
      startTurnTimer(room);
      break;
    }

    // AI turn
    if (seat.status === 'WAITING') {
      const dealerSeat = room.seats.find(s => s.seat_id === room.dealer_seat);
      const dealerUp = dealerSeat && dealerSeat.hand.length > 0 ? dealerSeat.hand[0] : null;
      const isFirst = seat.hand.length === 2;
      let action = playerDecision(seat.hand, dealerUp, isFirst);
      if (action === 'DOUBLE_DOWN') action = 'HIT';

      applyPlayerAction(room, seat.seat_id, action);
    }
    advanceTurn(room);
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // JOIN_ROOM
  socket.on('JOIN_ROOM', ({ room_code, nickname, seat_id }) => {
    const code = room_code.toUpperCase().trim();
    let room = getRoom(code);
    let isCreator = false;

    if (!room) {
      // Create room on first join
      const result = createRoom(socket.id, nickname);
      room = result.room;
      isCreator = true;
    }

    const result = joinRoom(code, socket.id, nickname, seat_id || null);
    if (result.error) {
      socket.emit('ERROR', { message: result.error });
      return;
    }

    socket.join(code);
    socket.data.room_code = code;
    socket.data.seat_id = result.seat.seat_id;
    socket.data.nickname = nickname;

    socket.emit('JOINED', {
      seat_id: result.seat.seat_id,
      room_code: code,
      is_creator: isCreator,
    });

    broadcastState(room);

    // Start auto-fill timer if room not full
    const humanCount = room.seats.filter(s => s.is_occupied && !s.is_ai).length;
    if (humanCount < 4 && !autoFillTimers.has(code)) {
      const t = setTimeout(() => {
        const r = getRoom(code);
        if (!r) return;
        fillAiSeats(r);
        io.to(code).emit('AI_TAKEOVER', { reason: 'autofill', message: 'AntiGravity mengisi kursi yang tersisa.' });
        broadcastState(r);
        autoFillTimers.delete(code);
      }, 10000);
      autoFillTimers.set(code, t);
    }
  });

  // CLAIM_DEALER
  socket.on('CLAIM_DEALER', () => {
    const code = socket.data.room_code;
    const seatId = socket.data.seat_id;
    if (!code || !seatId) return;

    const room = getRoom(code);
    if (!room || room.status !== STATUS.WAITING) return;

    const ok = setDealer(room, seatId);
    if (ok) {
      broadcastState(room);
    }
  });

  // START_ROUND
  socket.on('START_ROUND', () => {
    const code = socket.data.room_code;
    if (!code) return;

    const room = getRoom(code);
    if (!room) return;
    if (room.status !== STATUS.WAITING && room.status !== STATUS.ROUND_OVER) return;

    // Cancel autofill timer if round starting manually
    const at = autoFillTimers.get(code);
    if (at) { clearTimeout(at); autoFillTimers.delete(code); }

    // Ensure all seats occupied
    fillAiSeats(room);
    if (!room.dealer_seat) setAiDealer(room);

    startRound(room);
    broadcastState(room);

    // Start processing turns
    handleAiTurns(room);
    broadcastState(room);
  });

  // PLAYER_ACTION
  socket.on('PLAYER_ACTION', ({ action }) => {
    const code = socket.data.room_code;
    const seatId = socket.data.seat_id;
    if (!code || !seatId) return;

    const room = getRoom(code);
    if (!room || room.status !== STATUS.PLAYER_TURN) return;
    if (room.current_turn_seat !== seatId) {
      socket.emit('ERROR', { message: 'Not your turn' });
      return;
    }

    const VALID_ACTIONS = ['HIT', 'STAND', 'SPLIT', 'SURRENDER'];
    if (!VALID_ACTIONS.includes(action)) {
      socket.emit('ERROR', { message: 'Invalid action' });
      return;
    }

    clearTurnTimer(code);

    const result = applyPlayerAction(room, seatId, action);
    if (result.error) {
      socket.emit('ERROR', { message: result.error });
      return;
    }

    advanceTurn(room);
    broadcastState(room);

    if (room.status === STATUS.PLAYER_TURN) {
      handleAiTurns(room);
      broadcastState(room);
    } else if (room.status === STATUS.ROUND_OVER) {
      broadcastState(room);
    }
  });

  // ADD_NOTE
  socket.on('ADD_NOTE', ({ text }) => {
    const code = socket.data.room_code;
    const nickname = socket.data.nickname;
    if (!code || !nickname || !text) return;

    const room = getRoom(code);
    if (!room) return;

    addManualNote(room, nickname, text);
    broadcastState(room);
  });

  // NEXT_ROUND (reset for another round)
  socket.on('NEXT_ROUND', () => {
    const code = socket.data.room_code;
    if (!code) return;

    const room = getRoom(code);
    if (!room || room.status !== STATUS.ROUND_OVER) return;

    clearTurnTimer(code);
    resetRound(room);
    broadcastState(room);
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    const code = socket.data.room_code;
    if (!code) return;

    const room = getRoom(code);
    if (!room) return;

    const info = handleDisconnect(room, socket.id);
    if (info) {
      io.to(code).emit('AI_TAKEOVER', {
        reason: 'disconnect',
        seat_id: info.seat.seat_id,
        message: `${info.oldName} terputus. AntiGravity mengambil alih kursi ${info.seat.seat_id}.`,
      });

      // If it was the current turn seat, continue with AI
      if (room.current_turn_seat === info.seat.seat_id && room.status === STATUS.PLAYER_TURN) {
        clearTurnTimer(code);
        handleAiTurns(room);
      }

      broadcastState(room);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Blackjack Quad server running on :${PORT}`);
});

