# Guess & Reveal

A simple real-time multiplayer guessing game for up to 10 players.

## Features
- 10 players on 10 different devices
- No accounts
- No room code
- One global game session
- Player names
- Custom questions written by the commenter/host
- Hidden commenter answer
- Real-time guesses
- SHOW ANSWER reveal
- Automatic scoring
- Leaderboard
- Mobile-friendly UI

## Run locally

Install Node.js, then in this folder:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

For other devices on the same Wi-Fi, open the computer's local IP address, for example:

`http://192.168.1.5:3000`

## Put it online

Deploy the project to any Node.js hosting service that supports a persistent WebSocket connection. The server uses Socket.IO for real-time synchronization.

## Game rules
- The first player becomes the commenter/host.
- The host writes the question for the round.
- The host writes and locks an answer.
- Everyone else submits a guess.
- The host presses SHOW ANSWER.
- Exact match = 100 points.
- Partial containment match = 50 points.
- After reveal, the host presses NEXT ROUND and writes the next question.
- Host role rotates each round.
