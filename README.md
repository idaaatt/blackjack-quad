# Blackjack Quad

Platform gim web Blackjack real-time 4 pemain dengan AntiGravity AI Agent.

## Cara Menjalankan

### 1. Install dependencies (jika belum)
```bash
npm run install:all
```

### 2. Jalankan server (Terminal 1)
```bash
npm run dev:server
```
Server berjalan di `http://localhost:3001`

### 3. Jalankan client (Terminal 2)
```bash
npm run client
```
Client berjalan di `http://localhost:5173`

---

## Aturan Permainan

| Aksi | Status |
|------|--------|
| HIT | Aktif |
| STAND | Aktif |
| SPLIT | Aktif |
| SURRENDER | Aktif (awal ronde) |
| DOUBLE DOWN | **Dihapus** |

- **6-deck shoe** diacak dengan CSPRNG (`crypto.randomInt`)
- **Dealer rules:** Hit ≤ 16, Stand ≥ 17
- **Auto-fill AI:** Jika kurang dari 4 pemain dalam 10 detik, AntiGravity mengisi kursi otomatis
- **AI Dealer fallback:** Jika tidak ada pemain yang mengambil peran Dealer
- **Disconnect handling:** AntiGravity mengambil alih kursi pemain yang terputus

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS v3
- **Backend:** Node.js + Express + Socket.io
- **State:** In-memory (Redis-ready architecture)
- **AI:** Basic Strategy engine tanpa Double Down
- **Randomness:** Node.js `crypto.randomInt` (CSPRNG)

## Struktur File

```
BlackJack/
├── server/
│   ├── index.js           # Express + Socket.io server
│   └── src/
│       ├── deck.js        # 6-deck shoe, CSPRNG shuffle, hand utilities
│       ├── roomManager.js # Room state, game logic, round management
│       └── aiAgent.js     # AI dealer, basic strategy player, match reporter
└── client/
    └── src/
        ├── components/
        │   ├── PlayingCard.jsx   # Card rendering dengan deal animation
        │   ├── SeatCard.jsx      # Seat dengan hand, controls, scorecard
        │   ├── MatchNotes.jsx    # AI log + manual notes panel
        │   ├── Scorecard.jsx     # W/L/P leaderboard
        │   └── StatusBar.jsx     # Header: room code, status, timer, share
        ├── pages/
        │   ├── LobbyPage.jsx     # Create / Join room
        │   └── GamePage.jsx      # Main game table
        ├── utils/
        │   └── cardUtils.js      # Client-side card helpers
        └── socket.js             # Socket.io singleton
```

