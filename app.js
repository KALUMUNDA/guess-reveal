const socket = io();

const $ = id => document.getElementById(id);
let me = null;
let state = null;

$("joinBtn").onclick = join;
$("nameInput").addEventListener("keydown", e => { if (e.key === "Enter") join(); });
$("startGame")?.addEventListener("click", () => socket.emit("startGame"));
$("setAnswerBtn").onclick = () => {
  socket.emit("setAnswer", { answer: $("answerInput").value });
};
$("answerInput").addEventListener("keydown", e => {
  if (e.key === "Enter") $("setAnswerBtn").click();
});
$("revealBtn").onclick = () => {
  const otherPlayers = state.players.filter(p => p.id !== state.hostId);
  const allGuessed =
    otherPlayers.length > 0 &&
    otherPlayers.every(p => p.guessed);

  if (!allGuessed) {
    toast("Wait for everyone to submit their guess.");
    return;
  }

  socket.emit("reveal");
};
$("guessBtn").onclick = submitGuess;
$("guessInput").addEventListener("keydown", e => { if (e.key === "Enter") submitGuess(); });
$("nextBtn").onclick = () => socket.emit("nextRound");

function join() {
  const name = $("nameInput").value.trim();
  const roomCode = $("roomCodeInput").value.trim();
  if (!name) {
    $("joinError").textContent = "Enter your name first.";
    return;
  }
  me = { name };
  socket.emit("join", { name, roomCode });
}

socket.on("errorMessage", msg => {
  $("joinError").textContent = msg;
  toast(msg);
});

socket.on("state", s => {
  state = s;
  render();
});

function render() {
  if (!state) return;

  $("joinScreen").classList.add("hidden");
  $("gameScreen").classList.remove("hidden");
  $("playerCount").textContent = state.players.length;
  $("roundLabel").textContent = state.number ? `Round ${state.number}` : "Lobby";

  const amHost = state.hostId === socket.id;
  const meData = state.players.find(p => p.id === socket.id);

if (state.phase === "lobby" || state.phase === "questioning") {
    $("game").classList.add("hidden");
    $("lobby").classList.remove("hidden");
    $("lobby").innerHTML = `
      <div class="eyebrow">LOBBY</div>
      <h2>${state.players.length}/10 players joined</h2>
      <p class="hint">${state.players.map(p => escapeHtml(p.name)).join(" • ") || "Waiting for players..."}</p>
      ${amHost
        ? `<div class="customQuestionBox">
             <label for="questionInput" class="questionLabel">YOUR QUESTION</label>
             <textarea id="questionInput" maxlength="180" placeholder="Write your own question..."></textarea>
             <button id="startGameBtn" class="primary" ${state.players.length < 2 ? "disabled" : ""}>
               START GAME
             </button>
           </div>`
        : `<p class="hint">Waiting for ${escapeHtml(state.players.find(p => p.id === state.hostId)?.name || "the host")} to start...</p>`}
    `;
    $("startGameBtn")?.addEventListener("click", () => {
      const question = $("questionInput").value.trim();
      if (!question) {
        toast("Write a question first.");
        $("questionInput").focus();
        return;
      }
      socket.emit("startGame", { question });
    });
    return;
  }

  $("lobby").classList.add("hidden");
  $("game").classList.remove("hidden");
  $("question").textContent = state.question || "";

  $("hostPanel").classList.toggle("hidden", !amHost);
  $("guessPanel").classList.toggle("hidden", amHost || state.phase !== "guessing");
  $("waitingPanel").classList.toggle("hidden", !amHost || state.phase !== "guessing");
  $("revealPanel").classList.toggle("hidden", !state.revealed);

if (amHost) {

$("setAnswerBtn").disabled = state.phase !== "answering";
$("answerInput").disabled = state.phase !== "answering";

$("revealArea").classList.toggle("hidden", state.phase === "answering");
const otherPlayers = state.players.filter(p => p.id !== state.hostId);
const allGuessed =
  otherPlayers.length > 0 &&
  otherPlayers.every(p => p.guessed);

$("revealBtn").disabled =
  !amHost || state.phase !== "guessing" || !allGuessed;
if (state.phase !== "answering") $("answerInput").value = "";

if (state.phase === "guessing") {

const playersWhoGuess = state.players.filter(p => p.id !== socket.id);

const submitted = playersWhoGuess.filter(p => p.guessed).length;
const total = playersWhoGuess.length;

$("waitingPanel").classList.remove("hidden");

$("waitingPanel").innerHTML = `
<div class="loader">⏳</div>

<h3>
${submitted === total ? "Everyone has submitted!" : "Waiting for everyone..."}
</h3>

<div class="guessList">

${playersWhoGuess.map(p => `
<div class="guessPlayer">
<span>${escapeHtml(p.name)}</span>
<span>${p.guessed ? "✅ Submitted" : "⏳ Waiting"}</span>
</div>
`).join("")}

</div>

<p class="hint">
${submitted}/${total} players have submitted their guess.
</p>
`;

$("revealBtn").disabled = submitted !== total;

} else {

$("waitingPanel").classList.add("hidden");

}

}
  

  if (!amHost && state.phase === "guessing") {
    const guessed = state.guesses?.[socket.id] || meData?.guessed;
    $("guessBtn").disabled = !!guessed;
    $("guessInput").disabled = !!guessed;
    $("guessStatus").textContent = guessed ? "✓ Guess submitted. Waiting for the reveal..." : "";
  }

  if (state.revealed) {
    $("answerText").textContent = state.answer;
    if (amHost) {
    $("nextBtn").classList.remove("hidden");
    $("nextBtn").textContent = "NEXT ROUND →";

    $("nextBtn").onclick = () => {
        socket.emit("nextRound");
    };
} else {
    $("nextBtn").classList.add("hidden");
}

    if (!amHost) {
      const myGuess = meData?.guessed;
      $("scoreMessage").textContent = myGuess
        ? "Your guess has been scored. Check the leaderboard!"
        : "Round revealed!";
    } else {
      $("scoreMessage").textContent = "Answer revealed! Points have been awarded.";
    }
  }
const statusBox = $("guessStatusItems");

if (statusBox && state.players) {
  statusBox.innerHTML = state.players.map(player => {
    const hasGuessed = state.guesses && state.guesses[player.id];

    return `
      <div class="guess-status-row">
        <span>${player.name}</span>
        <span>${hasGuessed ? "✅ Submitted" : "⏳ Waiting"}</span>
      </div>
    `;
  }).join("");
}
  renderLeaderboard();
}

function submitGuess() {
  if (!state || state.phase !== "guessing") return;
  const guess = $("guessInput").value.trim();
  if (!guess) return;
  socket.emit("submitGuess", { guess });
  $("guessInput").value = "";
}

function renderLeaderboard() {
  const sorted = [...state.players].sort((a,b) => b.score - a.score);
  $("leaderboard").innerHTML = sorted.map((p, i) => `
    <div class="playerRow">
      <div class="rank">${i === 0 && p.score > 0 ? "👑" : i + 1}</div>
      <div class="playerName">${escapeHtml(p.name)} ${p.id === socket.id ? "<span class='small'>(you)</span>" : ""}</div>
      <div class="playerScore">${p.score} pts ${p.guessed ? "<span class='check'>✓</span>" : ""}</div>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function toast(msg) {
  $("toast").textContent = msg;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2400);
}
