// components/Scorecard.jsx
// Win/Loss/Push scorecard for all seats.
// Purpose: clear at-a-glance leaderboard during the session.

import React from 'react';
import { winRate } from '../utils/cardUtils';

function Scorecard({ seats, dealerSeat }) {
  const players = seats.filter(s => s.is_occupied);

  if (players.length === 0) return null;

  return (
    <div className="panel p-0 overflow-hidden" aria-label="Papan Skor">
      <div className="px-4 py-2 border-b border-felt-600">
        <h2 className="font-display text-base text-gold-400 font-semibold">Papan Skor</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono" aria-label="Scorecard tabel">
          <thead>
            <tr className="border-b border-felt-700">
              <th className="text-left px-3 py-2 text-felt-400 font-normal">Pemain</th>
              <th className="text-center px-2 py-2 text-green-500 font-semibold">W</th>
              <th className="text-center px-2 py-2 text-red-500 font-semibold">L</th>
              <th className="text-center px-2 py-2 text-gold-500 font-semibold">P</th>
              <th className="text-center px-2 py-2 text-ivory-300 font-semibold">Win%</th>
            </tr>
          </thead>
          <tbody>
            {players.map(seat => (
              <tr key={seat.seat_id} className={`border-b border-felt-700/50 ${seat.seat_id === dealerSeat ? 'bg-wood-900/30' : ''}`}>
                <td className="px-3 py-2 text-ivory-200 truncate max-w-[100px]">
                  <span className="truncate block">{seat.player_name}</span>
                  {seat.seat_id === dealerSeat && (
                    <span className="text-gold-600 text-[10px]">Dealer ronde ini</span>
                  )}
                  {seat.is_ai && (
                    <span className="text-gold-700 text-[10px]"> [AI]</span>
                  )}
                </td>
                <td className="text-center px-2 py-2 text-green-400">{seat.scorecard.win}</td>
                <td className="text-center px-2 py-2 text-red-400">{seat.scorecard.loss}</td>
                <td className="text-center px-2 py-2 text-gold-400">{seat.scorecard.push}</td>
                <td className="text-center px-2 py-2 text-ivory-200">{winRate(seat.scorecard)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dealer stats row */}
      {dealerSeat !== null && (() => {
        const ds = seats.find(s => s.seat_id === dealerSeat);
        if (!ds || !ds.dealer_scorecard) return null;
        const total = ds.dealer_scorecard.win + ds.dealer_scorecard.loss;
        if (total === 0) return null;
        return (
          <div className="px-4 py-2 border-t border-felt-700/50 text-xs font-mono text-felt-400">
            Dealer {ds.player_name}: {ds.dealer_scorecard.win}W / {ds.dealer_scorecard.loss}L terhadap pemain
          </div>
        );
      })()}
    </div>
  );
}

export default Scorecard;

