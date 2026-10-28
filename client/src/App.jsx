// App.jsx — root component, routes between Lobby and Game

import React, { useState } from 'react';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

function App() {
  const [joinData, setJoinData] = useState(null);

  function handleJoined(data) {
    setJoinData(data);
    // Update URL for sharing without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('room', data.room_code);
    window.history.replaceState({}, '', url.toString());
  }

  if (joinData) {
    return <GamePage joinData={joinData} />;
  }

  return <LobbyPage onJoined={handleJoined} />;
}

export default App;
