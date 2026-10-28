/**
 * aiAgent.js
 * AntiGravity AI Agent logic.
 * Implements Basic Strategy (no Double Down) for player seats.
 * Implements strict Dealer rules (Hit <= 16, Stand >= 17).
 */
const { handTotal, canSplit } = require('./deck');

/**
 * Dealer AI: hit on <= 16, stand on >= 17.
 */
function dealerDecision(hand) {
  const total = handTotal(hand);
  return total <= 16 ? 'HIT' : 'STAND';
}

/**
 * Basic Strategy player AI (no Double Down option).
 * Returns: 'HIT' | 'STAND' | 'SPLIT' | 'SURRENDER'
 *
 * Strategy reference: simplified Basic Strategy table.
 * Surrender: early surrender on hard 16 vs dealer 9-A (first action only).
 * Split: always split Aces and 8s; split matching pairs per basic strategy.
 * Otherwise: use hard-total hit/stand thresholds.
 */
function playerDecision(hand, dealerUpcard, isFirstAction) {
  const total = handTotal(hand);
  const dealerRank = dealerUpcardValue(dealerUpcard);

  // Surrender (first action only, hard 16 vs dealer 9/10/A)
  if (isFirstAction && hand.length === 2) {
    if (total === 16 && [9, 10, 11].includes(dealerRank)) {
      return 'SURRENDER';
    }
    if (total === 15 && dealerRank === 10) {
      return 'SURRENDER';
    }
  }

  // Split logic (first action only)
  if (isFirstAction && canSplit(hand)) {
    const pairRank = dealerUpcardValue(hand[0]);
    // Always split Aces
    if (pairRank === 11) return 'SPLIT';
    // Always split 8s
    if (pairRank === 8) return 'SPLIT';
    // Split 9s vs 2-6, 8-9
    if (pairRank === 9 && ![7, 10, 11].includes(dealerRank)) return 'SPLIT';
    // Split 7s vs 2-7
    if (pairRank === 7 && dealerRank <= 7) return 'SPLIT';
    // Split 6s vs 2-6
    if (pairRank === 6 && dealerRank <= 6) return 'SPLIT';
    // Split 4s vs 5-6
    if (pairRank === 4 && [5, 6].includes(dealerRank)) return 'SPLIT';
    // Split 2s/3s vs 2-7
    if ([2, 3].includes(pairRank) && dealerRank <= 7) return 'SPLIT';
  }

  // Soft hand detection (has ace counted as 11)
  const hasSoftAce = hasSoftAceInHand(hand);

  if (hasSoftAce) {
    // Soft totals (basic strategy, no double)
    if (total >= 19) return 'STAND';
    if (total === 18) return dealerRank >= 9 ? 'HIT' : 'STAND';
    return 'HIT'; // soft 17 or less
  }

  // Hard totals
  if (total >= 17) return 'STAND';
  if (total >= 13 && dealerRank <= 6) return 'STAND';
  if (total === 12 && [4, 5, 6].includes(dealerRank)) return 'STAND';
  return 'HIT';
}

function dealerUpcardValue(card) {
  if (!card) return 10;
  const rank = card.slice(0, -1);
  if (rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function hasSoftAceInHand(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    const rank = card.slice(0, -1);
    if (rank === 'A') {
      aces++;
      total += 11;
    } else if (['J', 'Q', 'K'].includes(rank)) {
      total += 10;
    } else {
      total += parseInt(rank, 10);
    }
  }
  // If we have aces counted as 11 and haven't busted, it's soft
  return aces > 0 && total <= 21;
}

/**
 * AI Match Reporter: generates a one-sentence round summary.
 */
function generateRoundSummary(roundNumber, seats, dealerSeatId) {
  const dealerSeat = seats.find(s => s.seat_id === dealerSeatId);
  const dealerName = dealerSeat ? (dealerSeat.is_ai ? 'AntiGravity Dealer' : dealerSeat.player_name) : 'Dealer';

  const winners = seats.filter(s => s.seat_id !== dealerSeatId && s.round_result === 'WIN');
  const losers = seats.filter(s => s.seat_id !== dealerSeatId && s.round_result === 'LOSS');
  const pushes = seats.filter(s => s.seat_id !== dealerSeatId && s.round_result === 'PUSH');
  const blackjacks = seats.filter(s => s.seat_id !== dealerSeatId && s.round_result === 'BLACKJACK');

  const parts = [];
  if (blackjacks.length > 0) {
    parts.push(`${blackjacks.map(s => s.player_name).join(', ')} hit Blackjack`);
  }
  if (winners.length > 0) {
    parts.push(`${winners.map(s => s.player_name).join(', ')} won`);
  }
  if (pushes.length > 0) {
    parts.push(`${pushes.map(s => s.player_name).join(', ')} pushed`);
  }
  if (losers.length > 0) {
    parts.push(`${dealerName} beat ${losers.map(s => s.player_name).join(', ')}`);
  }

  const summary = parts.length > 0
    ? `Ronde ${roundNumber}: ${parts.join(', ')}.`
    : `Ronde ${roundNumber}: semua pemain selesai bermain.`;

  return summary;
}

module.exports = { dealerDecision, playerDecision, generateRoundSummary };

