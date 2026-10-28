// components/SeatCard.jsx
// Renders one player's seat at the table.
// Shows: name, hand, total, status badge, scorecard, action controls if it's the player's turn.

import React from 'react';
import PlayingCard from './PlayingCard';
import { handTotal, isBust, isBlackjack, canSplit, resultLabel, resultClass, winRate } from '../utils/cardUtils';

function SeatCard({
  seat,
  isDealer,
  isMyTurn,
  isMe,
  gameStatus,
  onAction,
  onClaimDealer,
  dealerNotClaimed,
}) {
  const total = handTotal(seat.hand);
  const bust = isBust(seat.hand);
  const bj = isBlackjack(seat.hand);
  const firstAction = seat.hand.length === 2;

  const showActions = isMyTurn && isMe && gameStatus === 'PLAYER_TURN' && seat.status === 'WAITING';

  const seatStateClass = getSeatStateClass(seat, isMyTurn, gameStatus);

  return (
    <div
      className={`panel p-3 flex flex-col gap-2 transition-all duration-300 ${seatStateClass}`}
      role="region"
      aria-label={`Seat ${seat.seat_id}: ${seat.player_name || 'Kosong'}`}
    >
      {/* Seat header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="seat-label">Seat {seat.seat_id}</span>
          {isDealer && (
            <span className="text-xs font-mono bg-gold-500 text-felt-900 px-1.5 py-0.5 rounded font-semibold">
              DEALER
            </span>
          )}
          {seat.is_ai && (
            <span className="text-xs font-mono text-gold-600 border border-gold-700 px-1.5 py-0.5 rounded">
              AI
            </span>
          )}
          {isMe && !isDealer && (
            <span className="text-xs text-green-400 font-mono">KAMU</span>
          )}
        </div>

        {/* Claim dealer button — shown before round starts if no dealer claimed */}
        {dealerNotClaimed && isMe && gameStatus === 'WAITING' && !isDealer && (
          <button
            className="btn-action text-xs px-3 py-1"
            onClick={onClaimDealer}
            aria-label="Ambil peran Dealer"
          >
            Jadi Dealer
          </button>
        )}
      </div>

      {/* Player name */}
      <div className="font-ui text-sm font-medium text-ivory-200 truncate min-h-[1.25rem]">
        {seat.player_name || <span className="text-felt-500 italic">Kursi kosong</span>}
      </div>

      {/* Hand display */}
      {seat.is_occupied && (
        <div className="flex flex-col gap-2">
          {/* Main hand */}
          <div className="flex gap-1 flex-wrap min-h-[3rem]" aria-label="Kartu di tangan">
            {seat.hand.length === 0 ? (
              <span className="text-felt-500 text-xs italic">Menunggu kartu...</span>
            ) : (
              seat.hand.map((card, i) => (
                <PlayingCard
                  key={`${card}-${i}`}
                  card={card}
                  size="md"
                  animated={true}
                  delay={i * 120}
                />
              ))
            )}
          </div>

          {/* Split hand */}
          {seat.split_hand && seat.split_hand.length > 0 && (
            <div>
              <p className="text-xs text-gold-500 mb-1 font-mono">SPLIT HAND</p>
              <div className="flex gap-1">
                {seat.split_hand.map((card, i) => (
                  <PlayingCard key={`split-${card}-${i}`} card={card} size="sm" animated={true} delay={i * 100} />
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          {seat.hand.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-ivory-100">
                {total}
              </span>
              {bust && <StatusChip label="BUST" color="red" />}
              {bj && <StatusChip label="BLACKJACK" color="gold" />}
              {seat.status === 'STAND' && !bust && !bj && <StatusChip label="STAND" color="gray" />}
              {seat.status === 'SURRENDER' && <StatusChip label="SURRENDER" color="gray" />}
            </div>
          )}

          {/* Round result */}
          {seat.round_result && (
            <div className={`text-base ${resultClass(seat.round_result)} animate-slide-up`}>
              {resultLabel(seat.round_result)}
            </div>
          )}
        </div>
      )}

      {/* Action buttons — only shown for the human player on their turn */}
      {showActions && (
        <div className="flex flex-wrap gap-2 mt-1 animate-fade-in">
          <ActionButton label="HIT" onClick={() => onAction('HIT')} />
          <ActionButton label="STAND" onClick={() => onAction('STAND')} />
          {firstAction && canSplit(seat.hand) && (
            <ActionButton label="SPLIT" onClick={() => onAction('SPLIT')} variant="accent" />
          )}
          {firstAction && (
            <ActionButton label="MENYERAH" onClick={() => onAction('SURRENDER')} variant="danger" />
          )}
        </div>
      )}

      {/* Scorecard — shown when round has started at least once */}
      {seat.is_occupied && (seat.scorecard.win + seat.scorecard.loss + seat.scorecard.push) > 0 && (
        <div className="border-t border-felt-600 pt-2 mt-1">
          <div className="flex gap-3 text-xs font-mono">
            <span className="score-win">W:{seat.scorecard.win}</span>
            <span className="score-loss">L:{seat.scorecard.loss}</span>
            <span className="score-push">P:{seat.scorecard.push}</span>
            <span className="text-gold-500">{winRate(seat.scorecard)}</span>
          </div>
          {isDealer && seat.dealer_scorecard && (
            <div className="text-xs font-mono text-felt-400 mt-0.5">
              Dealer: {seat.dealer_scorecard.win}W / {seat.dealer_scorecard.loss}L
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, onClick, variant = 'default' }) {
  const variantClass = {
    default: 'btn-action',
    accent: 'btn-action border-gold-600 text-gold-300',
    danger: 'btn-action border-red-800 text-red-400 hover:border-red-600',
  }[variant] || 'btn-action';

  return (
    <button className={variantClass} onClick={onClick} aria-label={label}>
      {label}
    </button>
  );
}

function StatusChip({ label, color }) {
  const colorMap = {
    red: 'bg-red-900 border-red-700 text-red-300',
    gold: 'bg-yellow-900 border-yellow-600 text-yellow-200',
    gray: 'bg-felt-700 border-felt-600 text-felt-300',
    green: 'bg-green-900 border-green-700 text-green-300',
  };
  return (
    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${colorMap[color] || colorMap.gray}`}>
      {label}
    </span>
  );
}

function getSeatStateClass(seat, isMyTurn, gameStatus) {
  if (!seat.is_occupied) return 'opacity-60';
  if (isMyTurn && gameStatus === 'PLAYER_TURN') return 'active-turn-ring';
  if (seat.round_result === 'WIN' || seat.round_result === 'BLACKJACK') return 'animate-win-flash';
  if (seat.status === 'BUST') return 'animate-bust-shake';
  return '';
}

export default SeatCard;

