// game.js — Alias game logic

const Game = (() => {
  // ===== STATE =====
  let state = null;

  function freshState(team1Name, team2Name, team1Players, team2Players, targetScore) {
    return {
      teams: [
        { name: team1Name || 'קבוצה 1', players: team1Players, score: 0 },
        { name: team2Name || 'קבוצה 2', players: team2Players, score: 0 }
      ],
      targetScore,
      currentTeamIndex: 0, // 0 or 1
      currentExplainer: null,
      round: {
        correct: 0,
        wrong: 0,
        words: []       // {word, result: 'correct'|'wrong'}
      },
      wordPool: [],     // shuffled deck
      usedWords: new Set(),
      winner: null
    };
  }

  // Fisher-Yates shuffle
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildWordPool() {
    // Shuffle the full word list, filter already used
    const available = WORDS.filter(w => !state.usedWords.has(w));
    if (available.length < 20) {
      // Ran out — reset used words
      state.usedWords.clear();
      return shuffle(WORDS);
    }
    return shuffle(available);
  }

  function startGame(team1Name, team2Name, team1Players, team2Players, targetScore) {
    state = freshState(team1Name, team2Name, team1Players, team2Players, targetScore);
    state.wordPool = buildWordPool();
    return state;
  }

  function getCurrentTeam() {
    return state.teams[state.currentTeamIndex];
  }

  function getOtherTeam() {
    return state.teams[state.currentTeamIndex === 0 ? 1 : 0];
  }

  function setExplainer(playerName) {
    state.currentExplainer = playerName;
  }

  function startRound() {
    state.round = { correct: 0, wrong: 0, words: [] };
    if (state.wordPool.length < 5) {
      state.wordPool = buildWordPool();
    }
  }

  function nextWord() {
    if (state.wordPool.length === 0) {
      state.wordPool = buildWordPool();
    }
    return state.wordPool[state.wordPool.length - 1]; // peek
  }

  function consumeWord(word, result) {
    // Remove from pool
    state.wordPool.pop();
    state.usedWords.add(word);
    state.round.words.push({ word, result });
    if (result === 'correct') {
      state.round.correct++;
    } else {
      state.round.wrong++;
    }
  }

  function endRound() {
    const roundScore = state.round.correct - state.round.wrong;
    state.teams[state.currentTeamIndex].score += roundScore;
    // Clamp at 0
    if (state.teams[state.currentTeamIndex].score < 0) {
      state.teams[state.currentTeamIndex].score = 0;
    }

    // Check win
    if (state.teams[state.currentTeamIndex].score >= state.targetScore) {
      state.winner = state.teams[state.currentTeamIndex];
    }

    // Rotate team
    state.currentTeamIndex = state.currentTeamIndex === 0 ? 1 : 0;

    return {
      correct: state.round.correct,
      wrong: state.round.wrong,
      roundScore
    };
  }

  function restartRound() {
    // Return consumed words to the pool
    state.round.words.forEach(w => {
      state.usedWords.delete(w.word);
      state.wordPool.push(w.word);
    });
    // Re-shuffle pool
    for (let i = state.wordPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.wordPool[i], state.wordPool[j]] = [state.wordPool[j], state.wordPool[i]];
    }
    state.round = { correct: 0, wrong: 0, words: [] };
  }

  function getState() { return state; }

  function getRoundScore() {
    return state.round.correct - state.round.wrong;
  }

  return {
    startGame,
    getCurrentTeam,
    getOtherTeam,
    setExplainer,
    startRound,
    nextWord,
    consumeWord,
    endRound,
    restartRound,
    getRoundScore,
    getState
  };
})();

// ===== UI CONTROLLER =====
const UI = (() => {

  // Current word tracking
  let currentWord = null;
  let roundSummaryData = null;

  // ===== SCREEN MANAGEMENT =====
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  // ===== SETUP SCREEN =====
  function initSetup() {
    // Team 1 players
    renderPlayers(1);
    renderPlayers(2);
  }

  const team1Players = [];
  const team2Players = [];

  function getPlayers(n) { return n === 1 ? team1Players : team2Players; }

  function renderPlayers(n) {
    const list = document.getElementById(`team${n}-players`);
    list.innerHTML = '';
    getPlayers(n).forEach((p, i) => {
      const tag = document.createElement('div');
      tag.className = 'player-tag';
      tag.innerHTML = `<span>${p}</span><button class="remove-player" onclick="UI.removePlayer(${n},${i})">✕</button>`;
      list.appendChild(tag);
    });
  }

  function addPlayer(n) {
    const input = document.getElementById(`team${n}-add`);
    const name = input.value.trim();
    if (!name) return;
    getPlayers(n).push(name);
    input.value = '';
    renderPlayers(n);
    input.focus();
  }

  function removePlayer(n, i) {
    getPlayers(n).splice(i, 1);
    renderPlayers(n);
  }

  function handlePlayerAddKey(event, n) {
    if (event.key === 'Enter') addPlayer(n);
  }

  function startGame() {
    const t1Name = document.getElementById('team1-name').value.trim() || 'קבוצה 1';
    const t2Name = document.getElementById('team2-name').value.trim() || 'קבוצה 2';
    const target = parseInt(document.getElementById('target-score').value) || 40;

    // Auto-add default players if empty
    if (team1Players.length === 0) team1Players.push('שחקן 1');
    if (team2Players.length === 0) team2Players.push('שחקן 1');

    Game.startGame(t1Name, t2Name, [...team1Players], [...team2Players], target);
    showWhoExplains();
  }

  // ===== WHO EXPLAINS SCREEN =====
  function showWhoExplains() {
    const team = Game.getCurrentTeam();
    document.getElementById('whose-turn-name').textContent = team.name;
    document.getElementById('explainer-hint').textContent = 'מי מסביר הפעם?';

    const grid = document.getElementById('players-grid');
    grid.innerHTML = '';
    team.players.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'player-btn';
      btn.textContent = p;
      btn.onclick = () => {
        grid.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        Game.setExplainer(p);
      };
      grid.appendChild(btn);
    });

    // Auto-select first
    if (grid.firstChild) {
      grid.firstChild.classList.add('selected');
      Game.setExplainer(team.players[0]);
    }

    showScreen('screen-who');
  }

  // ===== ACTIVE TURN SCREEN =====
  let turnCorrect = 0;
  let turnWrong = 0;

  function startTurn() {
    TimerModule.warmUp();
    Game.startRound();
    turnCorrect = 0;
    turnWrong = 0;
    updateScoreTicker();
    currentWord = Game.nextWord();
    document.getElementById('current-word').textContent = currentWord;
    resetTimerUI();
    showScreen('screen-turn');

    TimerModule.start(
      (t) => updateTimerUI(t),
      () => onTimeUp()
    );
  }

  function resetTimerUI() {
    const display = document.getElementById('timer-display');
    const ring = document.getElementById('ring-progress');
    display.textContent = '60';
    display.classList.remove('urgent');
    ring.classList.remove('urgent');
    ring.style.strokeDashoffset = '0';
  }

  function updateTimerUI(t) {
    const display = document.getElementById('timer-display');
    const ring = document.getElementById('ring-progress');
    const circumference = 408;
    display.textContent = t;
    const progress = (60 - t) / 60;
    ring.style.strokeDashoffset = progress * circumference;

    if (t <= 10) {
      display.classList.add('urgent');
      ring.classList.add('urgent');
    }
  }

  function onCorrect() {
    if (!currentWord) return;
    TimerModule.playSuccess();
    Game.consumeWord(currentWord, 'correct');
    turnCorrect++;
    updateScoreTicker();
    nextWordUI();
  }

  function onWrong() {
    if (!currentWord) return;
    TimerModule.playSkip();
    Game.consumeWord(currentWord, 'wrong');
    turnWrong++;
    updateScoreTicker();
    nextWordUI();
  }

  function restartTurn() {
    TimerModule.stop();
    Game.restartRound();
    turnCorrect = 0;
    turnWrong = 0;
    updateScoreTicker();
    currentWord = Game.nextWord();
    document.getElementById('current-word').textContent = currentWord;
    resetTimerUI();
    TimerModule.start(
      (t) => updateTimerUI(t),
      () => onTimeUp()
    );
  }

  function nextWordUI() {
    const wordEl = document.getElementById('current-word');
    wordEl.style.opacity = '0';
    setTimeout(() => {
      currentWord = Game.nextWord();
      wordEl.textContent = currentWord;
      wordEl.style.opacity = '1';
    }, 120);
  }

  function updateScoreTicker() {
    document.getElementById('ticker-correct').textContent = `✅ ${turnCorrect}`;
    document.getElementById('ticker-wrong').textContent = `❌ ${turnWrong}`;
  }

  function onTimeUp() {
    TimerModule.stop();
    currentWord = null;
    roundSummaryData = Game.endRound();
    showSummary(roundSummaryData);
  }

  // ===== SUMMARY SCREEN =====
  function showSummary(data) {
    const { correct, wrong, roundScore } = data;
    document.getElementById('summary-correct').textContent = correct;
    document.getElementById('summary-wrong').textContent = wrong;

    // Formula
    const sign = roundScore >= 0 ? '+' : '';
    document.getElementById('round-formula').textContent = `+${correct} - ${wrong} = ${sign}${roundScore} נקודות`;

    // Scores
    const gs = Game.getState();
    const t0 = gs.teams[0];
    const t1 = gs.teams[1];
    // Note: currentTeamIndex already rotated in endRound
    const justPlayedIdx = gs.currentTeamIndex === 0 ? 1 : 0;

    document.getElementById('summary-team0-name').textContent = t0.name;
    document.getElementById('summary-team0-score').textContent = t0.score;
    document.getElementById('summary-team1-name').textContent = t1.name;
    document.getElementById('summary-team1-score').textContent = t1.score;

    // Highlight leader
    const row0 = document.getElementById('summary-row0');
    const row1 = document.getElementById('summary-row1');
    row0.classList.toggle('leader', t0.score >= t1.score);
    row1.classList.toggle('leader', t1.score > t0.score);

    showScreen('screen-summary');

    // If someone won
    if (gs.winner) {
      document.getElementById('next-turn-btn').textContent = '🏆 ראה תוצאות';
      document.getElementById('next-turn-btn').onclick = showWin;
    } else {
      document.getElementById('next-turn-btn').textContent = 'תור הבא ▶';
      document.getElementById('next-turn-btn').onclick = showWhoExplains;
    }
  }

  // ===== EDIT PLAYERS MODAL =====
  function openEditPlayers() {
    const gs = Game.getState();
    const modal = document.getElementById('modal-edit-players');
    renderModalPlayers(0);
    renderModalPlayers(1);
    modal.classList.add('open');
  }

  function closeEditPlayers() {
    document.getElementById('modal-edit-players').classList.remove('open');
  }

  function renderModalPlayers(teamIdx) {
    const gs = Game.getState();
    const team = gs.teams[teamIdx];
    const explainer = gs.currentExplainer;
    // After endRound, currentTeamIndex already rotated; the team that just played is the opposite
    const justPlayedIdx = gs.currentTeamIndex === 0 ? 1 : 0;

    document.getElementById(`modal-team${teamIdx}-name`).textContent = team.name;
    const list = document.getElementById(`modal-players-${teamIdx}`);
    list.innerHTML = '';
    team.players.forEach((p, i) => {
      const isProtected = (teamIdx === justPlayedIdx && p === explainer);
      const row = document.createElement('div');
      row.className = 'modal-player-row';
      row.innerHTML = `
        <span>${p}${isProtected ? ' <small style="color:var(--text-muted);">(מסביר)</small>' : ''}</span>
        ${!isProtected ? `<button onclick="UI.removePlayerInGame(${teamIdx}, ${i})">✕</button>` : '<span></span>'}
      `;
      list.appendChild(row);
    });
  }

  function addPlayerInGame(teamIdx) {
    const input = document.getElementById(`modal-add-${teamIdx}`);
    const name = input.value.trim();
    if (!name) return;
    const gs = Game.getState();
    gs.teams[teamIdx].players.push(name);
    input.value = '';
    renderModalPlayers(teamIdx);
  }

  function removePlayerInGame(teamIdx, playerIdx) {
    const gs = Game.getState();
    gs.teams[teamIdx].players.splice(playerIdx, 1);
    renderModalPlayers(teamIdx);
  }

  // ===== WIN SCREEN =====
  function showWin() {
    const winner = Game.getState().winner;
    document.getElementById('winner-name').textContent = `קבוצת ${winner.name}`;

    const gs = Game.getState();
    document.getElementById('win-team0-name').textContent = gs.teams[0].name;
    document.getElementById('win-team0-score').textContent = gs.teams[0].score;
    document.getElementById('win-team1-name').textContent = gs.teams[1].name;
    document.getElementById('win-team1-score').textContent = gs.teams[1].score;

    showScreen('screen-win');
    // Play win sound
    setTimeout(() => TimerModule.playTick(false), 100);
    setTimeout(() => TimerModule.playTick(false), 300);
    setTimeout(() => TimerModule.playTick(false), 500);
  }

  function resetGame() {
    // Clear player arrays
    team1Players.length = 0;
    team2Players.length = 0;
    // Reset form
    document.getElementById('team1-name').value = '';
    document.getElementById('team2-name').value = '';
    document.getElementById('target-score').value = '40';
    renderPlayers(1);
    renderPlayers(2);
    showScreen('screen-setup');
  }

  return {
    initSetup,
    addPlayer,
    removePlayer,
    handlePlayerAddKey,
    startGame,
    showWhoExplains,
    startTurn,
    onCorrect,
    onWrong,
    restartTurn,
    openEditPlayers,
    closeEditPlayers,
    addPlayerInGame,
    removePlayerInGame,
    showWin,
    resetGame
  };
})();

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  UI.initSetup();
  document.getElementById('screen-setup').classList.add('active');
});
