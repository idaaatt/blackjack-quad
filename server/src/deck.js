/**
 * deck.js
 * 6-deck shoe using crypto.randomInt for CSPRNG shuffling.
 * No Double Down in this ruleset.
 */
const crypto = require('crypto');

const SUITS = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createShoe(numDecks = 6) {
  const shoe = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push(`${rank}${suit}`);
      }
    }
  }
  return fisherYatesCsprng(shoe);
}

function fisherYatesCsprng(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cardValue(card) {
  const rank = card.slice(0, -1); // strip suit
  if (rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function handTotal(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    const v = cardValue(card);
    total += v;
    if (card.slice(0, -1) === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isBlackjack(hand) {
  return hand.length === 2 && handTotal(hand) === 21;
}

function isBust(hand) {
  return handTotal(hand) > 21;
}

function canSplit(hand) {
  if (hand.length !== 2) return false;
  return cardValue(hand[0]) === cardValue(hand[1]);
}

module.exports = { createShoe, handTotal, isBlackjack, isBust, canSplit, cardValue };

