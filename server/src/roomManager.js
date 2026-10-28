/**
 * roomManager.js
 * In-memory room state management.
 * In production this would back onto Redis.
 */
const { createShoe, handTotal, isBlackjack, isBust, canSplit } = require('./deck');
const { dealerDecision, playerDecision, generateRoundSummary } = require('./aiAgent');

const rooms = new Map(); // roomCode -> roomState

const STATUS = {
  WAITING: 'WAITING',
  DEALING: 'DEALING',
  PLAYER_TURN: 'PLAYER_TURN',
  DEALER_TURN: 'DEALER_TURN',
  ROUND_OVER: 'ROUND_OVER',
};

const TURN_TIMER_SECONDS = 15;
const AI_AUTOFILL_SECONDS = 10;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ROOM-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createEmptySeat(seatId) {
  return {
    seat_id: seatId,
    player_name: null,
    socket_id: null,
    is_ai: false,
    is_occupied: false,
    hand: [],
    split_hand: null,
    status: 'WAITING',
    round_result: null,
    scorecard: { win: 0, loss: 0, push: 0 },
    dealer_scorecard: { win: 0, loss: 0 },
  };
}

function createRoom(creatorSocketId, creatorNickname) {
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));

  const room = {
    room_code: code,
    status: STATUS.WAITING,
    dealer_seat: null,
    current_turn_seat: null,
    timer_seconds: TURN_TIMER_SECONDS,
    round_number: 0,
    shoe: createShoe(6),
    shoe_index: 0,
    seats: [1, 2, 3, 4].map(createEmptySeat),
    match_notes: [],
    ai_autofill_timer: null,
    turn_timer: null,
    dealer_claimed: false,
  };

  rooms.set(code, room);
  return { room, code };
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function dealCard(room) {
  if (room.shoe_index >= room.shoe.length - 52) {
    room.shoe = createShoe(6);
    room.shoe_index = 0;
  }
  return room.shoe[room.shoe_index++];
}

function joinRoom(code, socketId, nickname, requestedSeat) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };

  const emptySeat = requestedSeat
    ? room.seats.find(s => s.seat_id === requestedSeat && !s.is_occupied)
    : room.seats.find(s => !s.is_occupied && !s.is_ai);

  if (!emptySeat) return { error: 'No available seat' };

  emptySeat.player_name = nickname;
  emptySeat.socket_id = socketId;
  emptySeat.is_occupied = true;
  emptySeat.is_ai = false;

  return { seat: emptySeat, room };
}

function fillAiSeats(room) {
  const aiNames = ['AntiGravity Alpha', 'AntiGravity Beta', 'AntiGravity Gamma', 'AntiGravity Delta'];
  let aiIndex = 0;
  for (const seat of room.seats) {
    if (!seat.is_occupied) {
      seat.player_name = aiNames[aiIndex % aiNames.length];
      seat.is_occupied = true;
      seat.is_ai = true;
      seat.socket_id = null;
      aiIndex++;
    }
  }
}

function setDealer(room, seatId) {
  // Validate seat is occupied
  const seat = room.seats.find(s => s.seat_id === seatId);
  if (!seat || !seat.is_occupied) return false;
  room.dealer_seat = seatId;
  room.dealer_claimed = true;
  return true;
}

function setAiDealer(room) {
  // Find first AI seat or set seat 4 as AI dealer
  const aiSeat = room.seats.find(s => s.is_ai && s.is_occupied);
  if (aiSeat) {
    room.dealer_seat = aiSeat.seat_id;
  } else {
    // Force seat 4 as AI dealer
    const seat4 = room.seats.find(s => s.seat_id === 4);
    seat4.player_name = 'AntiGravity Dealer';
    seat4.is_occupied = true;
    seat4.is_ai = true;
    room.dealer_seat = 4;
  }
}

function startRound(room) {
  if (room.dealer_seat === null) setAiDealer(room);
  fillAiSeats(room);

  room.status = STATUS.DEALING;
  room.round_number++;

  // Reset hands
  for (const seat of room.seats) {
    seat.hand = [];
    seat.split_hand = null;
    seat.status = 'WAITING';
    seat.round_result = null;
  }

  // Deal 2 cards to each player, dealer gets 2 (second face-down in real play)
  for (let i = 0; i < 2; i++) {
    for (const seat of room.seats) {
      seat.hand.push(dealCard(room));
    }
  }

  // Check for player blackjacks immediately
  for (const seat of room.seats) {
    if (seat.seat_id !== room.dealer_seat && isBlackjack(seat.hand)) {
      seat.status = 'BLACKJACK';
    }
  }

  // Find first non-dealer seat to act
  room.status = STATUS.PLAYER_TURN;
  room.current_turn_seat = nextPlayerSeat(room, null);

  if (room.current_turn_seat === null) {
    // All players have blackjack or surrendered, go to dealer
    runDealerTurn(room);
  }
}

function nextPlayerSeat(room, currentSeat) {
  const playerSeats = room.seats.filter(s =>
    s.seat_id !== room.dealer_seat &&
    s.is_occupied &&
    s.status === 'WAITING'
  );

  if (playerSeats.length === 0) return null;

  if (currentSeat === null) return playerSeats[0].seat_id;

  const idx = playerSeats.findIndex(s => s.seat_id === currentSeat);
  if (idx === -1 || idx + 1 >= playerSeats.length) return null;
  return playerSeats[idx + 1].seat_id;
}

function applyPlayerAction(room, seatId, action) {
  const seat = room.seats.find(s => s.seat_id === seatId);
  if (!seat || room.current_turn_seat !== seatId) return { error: 'Not your turn' };
  if (seat.status !== 'WAITING') return { error: 'Action not allowed' };

  const isFirstAction = seat.hand.length === 2;

  switch (action) {
    case 'HIT': {
      seat.hand.push(dealCard(room));
      if (isBust(seat.hand)) {
        seat.status = 'BUST';
      } else if (handTotal(seat.hand) === 21) {
        seat.status = 'STAND'; // auto-stand at 21
      }
      break;
    }
    case 'STAND': {
      seat.status = 'STAND';
      break;
    }
    case 'SPLIT': {
      if (!isFirstAction || !canSplit(seat.hand)) return { error: 'Cannot split' };
      seat.split_hand = [seat.hand.pop()];
      seat.hand.push(dealCard(room));
      seat.split_hand.push(dealCard(room));
      // Stay on WAITING to continue with main hand
      break;
    }
    case 'SURRENDER': {
      if (!isFirstAction) return { error: 'Surrender only on first action' };
      seat.status = 'SURRENDER';
      break;
    }
    default:
      return { error: 'Unknown action' };
  }

  return { ok: true };
}

function advanceTurn(room) {
  const current = room.seats.find(s => s.seat_id === room.current_turn_seat);

  // If current seat is done (STAND/BUST/SURRENDER/BLACKJACK), move to next
  const isDone = current &&
    ['STAND', 'BUST', 'SURRENDER', 'BLACKJACK'].includes(current.status);

  if (isDone) {
    const next = nextPlayerSeat(room, room.current_turn_seat);
    if (next === null) {
      runDealerTurn(room);
    } else {
      room.current_turn_seat = next;
    }
  }
}

function runDealerTurn(room) {
  room.status = STATUS.DEALER_TURN;
  room.current_turn_seat = room.dealer_seat;

  const dealerSeat = room.seats.find(s => s.seat_id === room.dealer_seat);

  // Dealer draws until stand or bust
  while (dealerDecision(dealerSeat.hand) === 'HIT') {
    dealerSeat.hand.push(dealCard(room));
  }

  dealerSeat.status = isBust(dealerSeat.hand) ? 'BUST' : 'STAND';
  resolveRound(room);
}

function resolveRound(room) {
  room.status = STATUS.ROUND_OVER;

  const dealerSeat = room.seats.find(s => s.seat_id === room.dealer_seat);
  const dealerTotal = handTotal(dealerSeat.hand);
  const dealerBust = isBust(dealerSeat.hand);
  const dealerBJ = isBlackjack(dealerSeat.hand);

  let dealerWins = 0;
  let dealerLosses = 0;

  for (const seat of room.seats) {
    if (seat.seat_id === room.dealer_seat) continue;
    if (!seat.is_occupied) continue;

    const playerTotal = handTotal(seat.hand);
    let result;

    if (seat.status === 'SURRENDER') {
      result = 'SURRENDER';
    } else if (seat.status === 'BLACKJACK' && !dealerBJ) {
      result = 'BLACKJACK'; // blackjack beats dealer non-BJ
    } else if (seat.status === 'BLACKJACK' && dealerBJ) {
      result = 'PUSH';
    } else if (seat.status === 'BUST') {
      result = 'LOSS';
    } else if (dealerBust) {
      result = 'WIN';
    } else if (playerTotal > dealerTotal) {
      result = 'WIN';
    } else if (playerTotal === dealerTotal) {
      result = 'PUSH';
    } else {
      result = 'LOSS';
    }

    seat.round_result = result;

    if (result === 'WIN' || result === 'BLACKJACK') {
      seat.scorecard.win++;
      dealerLosses++;
    } else if (result === 'LOSS' || result === 'SURRENDER') {
      seat.scorecard.loss++;
      dealerWins++;
    } else if (result === 'PUSH') {
      seat.scorecard.push++;
    }
  }

  // Update dealer scorecard
  dealerSeat.dealer_scorecard.win += dealerWins;
  dealerSeat.dealer_scorecard.loss += dealerLosses;

  // Generate AI match note
  const summary = generateRoundSummary(room.round_number, room.seats, room.dealer_seat);
  room.match_notes.push({
    id: Date.now(),
    type: 'AI',
    text: summary,
    timestamp: new Date().toISOString(),
  });
}

function addManualNote(room, playerName, text) {
  room.match_notes.push({
    id: Date.now(),
    type: 'MANUAL',
    author: playerName,
    text: text.slice(0, 300),
    timestamp: new Date().toISOString(),
  });
}

function resetRound(room) {
  room.status = STATUS.WAITING;
  room.current_turn_seat = null;
  room.dealer_claimed = false;
  room.dealer_seat = null;

  for (const seat of room.seats) {
    seat.hand = [];
    seat.split_hand = null;
    seat.status = 'WAITING';
    seat.round_result = null;
  }
}

function getSafeRoomState(room, requestingSocketId) {
  // Returns room state. Dealer's second card (hole card) is hidden
  // until DEALER_TURN or ROUND_OVER.
  const showHoleCard = [STATUS.DEALER_TURN, STATUS.ROUND_OVER].includes(room.status);

  return {
    room_code: room.room_code,
    status: room.status,
    dealer_seat: room.dealer_seat,
    current_turn_seat: room.current_turn_seat,
    timer_seconds: TURN_TIMER_SECONDS,
    round_number: room.round_number,
    seats: room.seats.map(seat => {
      let hand = seat.hand;
      // Hide dealer hole card
      if (seat.seat_id === room.dealer_seat && !showHoleCard && hand.length >= 2) {
        hand = [hand[0], 'HIDDEN'];
      }
      return {
        ...seat,
        hand,
      };
    }),
    match_notes: room.match_notes.slice(-30), // last 30 notes
  };
}

function handleDisconnect(room, socketId) {
  const seat = room.seats.find(s => s.socket_id === socketId);
  if (!seat) return null;

  const wasDealer = seat.seat_id === room.dealer_seat;

  // Take over with AI
  seat.is_ai = true;
  seat.socket_id = null;
  const oldName = seat.player_name;
  seat.player_name = `${oldName} (AI)`;

  return { seat, wasDealer, oldName };
}

module.exports = {
  createRoom, getRoom, joinRoom, setDealer, setAiDealer,
  startRound, applyPlayerAction, advanceTurn, runDealerTurn,
  addManualNote, resetRound, getSafeRoomState, handleDisconnect,
  fillAiSeats, STATUS, playerDecision, TURN_TIMER_SECONDS,
};

