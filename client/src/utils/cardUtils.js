// utils/cardUtils.js
// Card rendering helpers

export const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RED_SUITS = new Set(['H', 'D']);

export function parseCard(card) {
  if (!card || card === 'HIDDEN') return { rank: '?', suit: '?', symbol: '?', isRed: false };
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  return {
    rank,
    suit,
    symbol: SUIT_SYMBOLS[suit] || suit,
    isRed: RED_SUITS.has(suit),
  };
}

export function handTotal(hand) {
  if (!hand || hand.length === 0) return 0;
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card === 'HIDDEN') continue;
    const { rank } = parseCard(card);
    if (rank === 'A') { total += 11; aces++; }
    else if (['J', 'Q', 'K'].includes(rank)) total += 10;
    else total += parseInt(rank, 10) || 0;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

export function isBust(hand) {
  return handTotal(hand) > 21;
}

export function isBlackjack(hand) {
  return hand && hand.length === 2 && handTotal(hand) === 21 && !hand.includes('HIDDEN');
}

export function canSplit(hand) {
  if (!hand || hand.length !== 2 || hand.includes('HIDDEN')) return false;
  const r1 = parseCard(hand[0]).rank;
  const r2 = parseCard(hand[1]).rank;
  const faceRanks = new Set(['J', 'Q', 'K', '10']);
  if (faceRanks.has(r1) && faceRanks.has(r2)) return true;
  return r1 === r2;
}

export function resultLabel(result) {
  const map = {
    WIN: 'MENANG',
    LOSS: 'KALAH',
    PUSH: 'SERI',
    BLACKJACK: 'BLACKJACK!',
    SURRENDER: 'MENYERAH',
    BUST: 'BUST',
  };
  return map[result] || result;
}

export function resultClass(result) {
  const map = {
    WIN: 'result-win',
    BLACKJACK: 'result-blackjack',
    LOSS: 'result-loss',
    BUST: 'result-loss',
    PUSH: 'result-push',
    SURRENDER: 'text-gray-400 font-display font-bold',
  };
  return map[result] || 'text-gray-400';
}

export function winRate(scorecard) {
  const total = scorecard.win + scorecard.loss + scorecard.push;
  if (total === 0) return '—';
  return ((scorecard.win / total) * 100).toFixed(0) + '%';
}

