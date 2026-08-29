const socket = io();

const $ = id => document.getElementById(id);
let me = null;
let state = null;

$("joinBtn").onclick = join;

$("nameInput").addEventListener("keydown", e => {
  if (e.key === "Enter") join();
});

$("startGame")?.addEventListener("click", () => {
  socket.emit("startGame");
});

$("setAnswerBtn").onclick = () => {
  socket.emit("setAnswer", {
    answer: $("answerInput").value
  });
};

$("answerInput").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    $("setAnswerBtn").click();
  }
});

$("revealBtn").onclick = () => {
  socket.emit("reveal");
};

$("guessBtn").onclick = submitGuess;

$("guessInput").addEventListener("keydown", e => {
  if (e.key === "Enter") submitGuess();
});

$("nextBtn").onclick = () => {
  socket.emit("nextRound");
};


function join() {
  const name = $("nameInput").value.trim();
  const roomCode = $("roomCodeInput").value.trim();

  if (!name) {
    $("joinError").textContent = "Enter your name first.";
    return;
  }

  me = { name };

  socket.emit("join", {
    name,
    roomCode
  });
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

  $("roundLabel").textContent =
    state.number ? `Round ${state.number}` : "Lobby";

  const amHost = state.hostId === socket.id;

  const meData = state.players.find(
    p => p.id === socket.id
  );


  if (state.phase === "lobby") {

    $("game").classList.add("hidden");
    $("lobby").classList.remove("hidden");

    $("lobby").innerHTML = `
      <div class="eyebrow">LOBBY</div>

      <h2>
        ${state.players.length}/10 players joined
      </h2>

      <p class="hint">
        ${
          state.players
            .map(p => escapeHtml(p.name))
            .join(" • ") ||
          "Waiting for players..."
        }
      </p>

      ${
        amHost
          ? `
            <button
              id="startGameBtn"
              class="primary"
              ${state.players.length < 2 ? "disabled" : ""}
            >
              START GAME
            </button>
          `
          : `
            <p class="hint">
              Waiting for
              ${
                escapeHtml(
                  state.players.find(
                    p => p.id === state.hostId
                  )?.name || "the host"
                )
              }
              to start...
            </p>
          `
      }
    `;

    $("startGameBtn")?.addEventListener(
      "click",
      () => socket.emit("startGame")
    );

    return;
  }


  $("lobby").classList.add("hidden");
  $("game").classList.remove("hidden");

  $("question").textContent =
    state.question || "";


  $("hostPanel").classList.toggle(
    "hidden",
    !amHost
  );

  $("guessPanel").classList.toggle(
    "hidden",
    amHost || state.phase !== "guessing"
  );

  $("waitingPanel").classList.toggle(
    "hidden",
    !amHost || state.phase !== "guessing"
  );

  $("revealPanel").classList.toggle(
    "hidden",
    !state.revealed
  );


  if (amHost) {

    $("setAnswerBtn").disabled =
      state.phase !== "answering";

    $("answerInput").disabled =
      state.phase !== "answering";

    $("revealArea").classList.toggle(
      "hidden",
      state.phase === "answering"
    );

    if (state.phase !== "answering") {
      $("answerInput").value = "";
    }
  }


  if (!amHost && state.phase === "guessing") {

    const guessed =
      state.guesses?.[socket.id] ||
      meData?.guessed;

    $("guessBtn").disabled = !!guessed;

    $("guessInput").disabled = !!guessed;

    $("guessStatus").textContent =
      guessed
        ? "✓ Guess submitted. Waiting for the reveal..."
        : "";
  }


  if (state.revealed) {

    $("answerText").textContent =
      state.answer;

    $("nextBtn").classList.toggle(
      "hidden",
      !amHost
    );


    if (!amHost) {

      const myGuess =
        meData?.guessed;

      $("scoreMessage").textContent =
        myGuess
          ? "Your guess has been scored. Check the leaderboard!"
          : "Round revealed!";

    } else {

      $("scoreMessage").textContent =
        "Answer revealed! Points have been awarded.";
    }
  }


  renderLeaderboard();
}


function submitGuess() {

  if (!state || state.phase !== "guessing") {
    return;
  }

  const guess =
    $("guessInput").value.trim();

  if (!guess) {
    return;
  }

  socket.emit("submitGuess", {
    guess
  });

  $("guessInput").value = "";
}


function renderLeaderboard() {

  const sorted =
    [...state.players].sort(
      (a, b) =>
        (b.wins || 0) - (a.wins || 0)
    );


  $("leaderboard").innerHTML =
    sorted.map((p, i) => `
      <div class="playerRow">

        <div class="playerRank">
          ${i + 1}
        </div>

        <div class="playerName">
          ${escapeHtml(p.name)}
          ${
            p.id === socket.id
              ? '<span class="small">(you)</span>'
              : ""
          }
        </div>

        <div class="playerScore">
          ${p.wins || 0} wins
        </div>

      </div>
    `).join("");
}


function escapeHtml(value) {

  return String(value).replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );
}


function toast(msg) {

  $("toast").textContent = msg;

  $("toast").classList.add("show");

  setTimeout(
    () => $("toast").classList.remove("show"),
    2400
  );
}
