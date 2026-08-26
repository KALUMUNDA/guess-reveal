const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const MAX_PLAYERS = 10;

let players = new Map();
let round = {
  number: 0,
  hostId: null,
  question: null,
  answer: null,
  guesses: new Map(),
  revealed: false,
  phase: "lobby"
};

function publicState() {
  return {
    phase: round.phase,
    number: round.number,
    question: round.question,
    answer: round.revealed ? round.answer : null,
    revealed: round.revealed,
    hostId: round.hostId,
    players: [...players.values()].map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      guessed: round.guesses.has(p.id)
    }))
  };
}

function broadcast() {
  io.emit("state", publicState());
}

function chooseNextHost() {
  const ids = [...players.keys()];
  if (!ids.length) {
    round.hostId = null;
    return;
  }
  const currentIndex = ids.indexOf(round.hostId);
  round.hostId = ids[(currentIndex + 1 + ids.length) % ids.length] || ids[0];
}

function newRound(question) {
  if (players.size === 0) return;
  const cleanQuestion = String(question || "").trim().slice(0, 180);
  if (!cleanQuestion) return;
  round.number += 1;
  round.question = cleanQuestion;
  round.answer = null;
  round.guesses = new Map();
  round.revealed = false;
  round.phase = "answering";
  broadcast();
}

io.on("connection", socket => {
  socket.on("join", ({ name }) => {
    const cleanName = String(name || "").trim().slice(0, 20);
    if (!cleanName) return socket.emit("errorMessage", "Please enter your name.");
    if (players.size >= MAX_PLAYERS) {
      return socket.emit("errorMessage", "The game is full (10 players maximum).");
    }

    players.set(socket.id, { id: socket.id, name: cleanName, score: 0 });

    if (!round.hostId) round.hostId = socket.id;

    if (round.phase === "lobby" && players.size === 1) {
      broadcast();
    } else {
      broadcast();
    }
  });

  socket.on("startGame", ({ question }) => {
    if (socket.id !== round.hostId || players.size < 2) return;
    newRound(question);
  });

  socket.on("setAnswer", ({ answer }) => {
    if (socket.id !== round.hostId || round.phase !== "answering") return;
    const clean = String(answer || "").trim().slice(0, 120);
    if (!clean) return;
    round.answer = clean;
    round.phase = "guessing";
    broadcast();
  });

  socket.on("submitGuess", ({ guess }) => {
    if (round.phase !== "guessing" || round.revealed) return;
    if (!players.has(socket.id)) return;
    if (socket.id === round.hostId) return;

    const clean = String(guess || "").trim().slice(0, 120);
    if (!clean || round.guesses.has(socket.id)) return;

    round.guesses.set(socket.id, clean);
    broadcast();
  });

  socket.on("reveal", () => {
    if (socket.id !== round.hostId || round.phase !== "guessing" || !round.answer) return;

    round.revealed = true;
    round.phase = "revealed";

    const normalizedAnswer = round.answer.toLowerCase().trim();

    for (const [id, guess] of round.guesses.entries()) {
      const normalizedGuess = guess.toLowerCase().trim();
      const player = players.get(id);
      if (!player) continue;

      if (normalizedGuess === normalizedAnswer) {
        player.score += 100;
      } else if (
        normalizedGuess.includes(normalizedAnswer) ||
        normalizedAnswer.includes(normalizedGuess)
      ) {
        player.score += 50;
      }
    }

    broadcast();
  });

  socket.on("nextRound", ({ question }) => {
    if (socket.id !== round.hostId || round.phase !== "revealed") return;
    chooseNextHost();
    newRound(question);
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);

    if (socket.id === round.hostId) {
      chooseNextHost();
    }

    if (players.size === 0) {
      round = {
        number: 0,
        hostId: null,
        question: null,
        answer: null,
        guesses: new Map(),
        revealed: false,
        phase: "lobby"
      };
    } else if (round.phase !== "lobby") {
      broadcast();
    } else {
      broadcast();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Guess & Reveal Game running on port ${PORT}`);
});