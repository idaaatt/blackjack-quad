// components/PlayingCard.jsx
// Renders a single playing card or a face-down card back.
// Design: ivory parchment with felt-900 text. Red suits use red.
// Animation: deal-card keyframe on mount (purpose: signals card distribution).

import React, { useEffect, useRef } from 'react';
import { parseCard } from '../utils/cardUtils';

function PlayingCard({ card, size = 'md', animated = false, delay = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (animated && ref.current) {
      ref.current.style.animationDelay = `${delay}ms`;
      ref.current.classList.add('animate-deal-card');
    }
  }, [animated, delay]);

  if (!card || card === 'HIDDEN') {
    return (
      <div
        ref={ref}
        className={cardSizeClass(size) + ' playing-card-back opacity-0 animate-deal-card'}
        aria-label="Kartu tertutup"
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      />
    );
  }

  const { rank, symbol, isRed } = parseCard(card);

  return (
    <div
      ref={ref}
      className={
        cardSizeClass(size) +
        ' playing-card ' +
        (isRed ? 'red-suit' : '') +
        (animated ? ' opacity-0 animate-deal-card' : '')
      }
      style={animated ? { animationDelay: `${delay}ms`, animationFillMode: 'forwards' } : {}}
      aria-label={`${rank} of ${symbol}`}
    >
      <div className="flex flex-col h-full justify-between p-1 leading-none">
        <span className={rankTextClass(size)}>{rank}</span>
        <span className={suitTextClass(size)}>{symbol}</span>
        <span className={rankTextClass(size) + ' rotate-180 self-end'}>{rank}</span>
      </div>
    </div>
  );
}

function cardSizeClass(size) {
  const map = {
    sm: 'w-8 h-12',
    md: 'w-12 h-18',
    lg: 'w-16 h-24',
    xl: 'w-20 h-30',
  };
  return map[size] || map.md;
}

function rankTextClass(size) {
  const map = {
    sm: 'text-xs font-bold font-mono',
    md: 'text-sm font-bold font-mono',
    lg: 'text-base font-bold font-mono',
    xl: 'text-lg font-bold font-mono',
  };
  return map[size] || map.md;
}

function suitTextClass(size) {
  const map = {
    sm: 'text-sm text-center self-center',
    md: 'text-xl text-center self-center',
    lg: 'text-2xl text-center self-center',
    xl: 'text-3xl text-center self-center',
  };
  return map[size] || map.md;
}

export default PlayingCard;

