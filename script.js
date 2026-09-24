// ======================================================
// CHESS COACH AI
// ======================================================
// Human = playerColor ('w' or 'b', chosen in Settings)
// AI    = the other color
//
// chess.js   = chess rules
// Stockfish  = calculation
// Coach layer = explanations, pre-move scanning,
//                difficulty, sound, drag & drop
// ======================================================

// ======================================================
// GAME
// ======================================================

const game = new Chess();

// ======================================================
// ENGINE
// ======================================================

let engine = null;

let engineReady = false;

let engineThinking = false;

let analysisStage = null;

// ======================================================
// EVALUATION
// ======================================================

let engineEvaluation = 0;

let deepestDepth = -1;

// ======================================================
// PLAYER MOVE ANALYSIS
// ======================================================

let playerMove = null;

let positionBeforeMove = null;

let evaluationBeforeMove = null;

let evaluationAfterMove = null;

let bestMoveBeforePlayerMove = null;

let moveAnnotations = {};

// ======================================================
// BOARD
// ======================================================

const chessBoard = document.getElementById("chessBoard");

let selectedSquare = null;

let flipped = false;

let lastMove = null;

// ======================================================
// SETTINGS
// ======================================================

let currentSkill = "club";

let soundEnabled = true;

let promotionResolve = null;

let playerColor = "w";

let recommendedMove = null;

// ======================================================
// OPENING TRAINER STATE
// ======================================================

let trainerOpening = null;

let trainerIndex = 0;

let trainerActive = false;

// ======================================================
// PIECE DATA
// ======================================================

const pieces = {
  w: {
    k: "♔",

    q: "♕",

    r: "♖",

    b: "♗",

    n: "♘",

    p: "♙",
  },

  b: {
    k: "♚",

    q: "♛",

    r: "♜",

    b: "♝",

    n: "♞",

    p: "♟",
  },
};

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const PIECE_NAME = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

// ======================================================
// DIFFICULTY TIERS
// ======================================================

const SKILL_LEVELS = {
  beginner: {
    label: "Beginner",
    skill: 2,
    elo: 1320,
    limitStrength: true,
    depth: 6,
  },

  club: {
    label: "Club Player",
    skill: 8,
    elo: 1600,
    limitStrength: true,
    depth: 9,
  },

  expert: {
    label: "Expert",
    skill: 14,
    elo: 2200,
    limitStrength: true,
    depth: 12,
  },

  magnus: {
    label: "Magnus Mode",
    skill: 20,
    elo: null,
    limitStrength: false,
    depth: 17,
  },
};

const ANALYSIS_DEPTH = 16;

// ======================================================
// COACH VOICE — PHASE-BASED PRINCIPLES
// ======================================================

const APHORISMS = {
  opening: [
    "Develop with a purpose — every piece should fight for the center.",
    "Don't spend two moves on one piece while others stay at home.",
    "King safety first. An exposed king undoes good positional work.",
    "Fight for the center before you decide where your pieces belong.",
  ],

  middlegame: [
    "Ask what your opponent's last move wants before deciding your own.",
    "Find the move that improves your worst-placed piece.",
    "Calculate forcing lines first: checks, captures, threats.",
    "A plan you can explain in one sentence is usually a good one.",
  ],

  endgame: [
    "Activate your king — in the endgame it's a fighting piece.",
    "Count the tempo. Endgames are won and lost by a single move.",
    "Push passed pawns, or blockade them firmly.",
    "Trade pieces when ahead in material, keep pieces on when behind.",
  ],
};

let lastAphorism = "";

// ======================================================
// OPENING REPERTOIRE
// ======================================================

/*
    Every line is written as a fixed sequence of SAN moves.
    During training both sides play from this script (the
    opponent's replies are auto-played rather than searched
    by Stockfish) so the lesson always plays out the same
    way. Stepping outside the line at any point simply ends
    training and hands the game back to normal engine play.
*/

const OPENINGS = {
  w: [
    {
      id: "italian",
      name: "Italian Game",
      side: "w",
      tag: "Aggressive & classical",
      summary:
        "Fast development aimed straight at f7 — a natural way to fight for the center and create early threats.",
      moves: [
        {
          san: "e4",
          by: "w",
          note: "Claim the center and open lines for your bishop and queen.",
        },
        {
          san: "e5",
          by: "b",
          note: "Black mirrors, contesting the same central square.",
        },
        {
          san: "Nf3",
          by: "w",
          note: "Develop with tempo, attacking the e5 pawn.",
        },
        { san: "Nc6", by: "b", note: "Defend the pawn and develop a piece." },
        {
          san: "Bc4",
          by: "w",
          note: "Aim at f7 — the weakest square in Black's camp.",
        },
        { san: "Bc5", by: "b", note: "Black mirrors the idea, eyeing f2." },
        { san: "c3", by: "w", note: "Prepare d4 to build a full pawn center." },
        { san: "Nf6", by: "b", note: "Develop and put pressure on e4." },
        {
          san: "d3",
          by: "w",
          note: "Support e4 and keep things solid before committing to d4.",
        },
        { san: "d6", by: "b", note: "Black keeps the position just as solid." },
      ],
    },
    {
      id: "ruylopez",
      name: "Ruy Lopez",
      side: "w",
      tag: "Classical & strategic",
      summary:
        "The most respected e4 opening in chess history — pin the knight that defends e5 and press for a long-term edge.",
      moves: [
        { san: "e4", by: "w", note: "Claim the center." },
        { san: "e5", by: "b", note: "Black meets it head-on." },
        { san: "Nf3", by: "w", note: "Develop and attack e5." },
        { san: "Nc6", by: "b", note: "Defend the pawn." },
        {
          san: "Bb5",
          by: "w",
          note: "Pin the knight — if it ever takes on e4, the pin costs Black the e5 pawn back.",
        },
        {
          san: "a6",
          by: "b",
          note: "Ask the question: the Morphy Defense, gaining a tempo on the bishop.",
        },
        {
          san: "Ba4",
          by: "w",
          note: "Keep the pin rather than resolving it — the bishop stays aimed at c6.",
        },
        { san: "Nf6", by: "b", note: "Develop and counterattack e4." },
        {
          san: "O-O",
          by: "w",
          note: "Get the king safe before the position opens up.",
        },
      ],
    },
    {
      id: "qgambit",
      name: "Queen's Gambit",
      side: "w",
      tag: "Strategic & rich",
      summary:
        "Offer a wing pawn to build a bigger center — one of the deepest, most respected d4 systems ever played.",
      moves: [
        { san: "d4", by: "w", note: "Claim the center with the queen's pawn." },
        { san: "d5", by: "b", note: "Black claims it right back." },
        {
          san: "c4",
          by: "w",
          note: "The gambit — offering the c-pawn to pull Black's d-pawn away from the center.",
        },
        {
          san: "e6",
          by: "b",
          note: "Black declines the pawn and reinforces d5 instead (the Queen's Gambit Declined).",
        },
        { san: "Nc3", by: "w", note: "Develop and add pressure on d5." },
        { san: "Nf6", by: "b", note: "Develop and defend d5 again." },
        {
          san: "Bg5",
          by: "w",
          note: "Pin the knight against the queen, a classic QGD idea.",
        },
      ],
    },
    {
      id: "london",
      name: "London System",
      side: "w",
      tag: "Simple & universal",
      summary:
        "A repeatable setup you can play against almost anything Black tries — low theory, high reliability.",
      moves: [
        { san: "d4", by: "w", note: "Claim the center." },
        { san: "d5", by: "b", note: "Black claims it back." },
        { san: "Nf3", by: "w", note: "Develop naturally." },
        { san: "Nf6", by: "b", note: "Black develops too." },
        {
          san: "Bf4",
          by: "w",
          note: "The signature London move — get this bishop out before it gets boxed in by e3.",
        },
      ],
    },
  ],

  b: [
    {
      id: "sicilian",
      name: "Sicilian Defense",
      side: "b",
      tag: "Sharp & fighting",
      versusTag: "vs 1.e4",
      summary:
        "The most fought-over reply to 1.e4 — instead of mirroring White, Black fights for the center asymmetrically.",
      moves: [
        { san: "e4", by: "w", note: "White stakes a claim in the center." },
        {
          san: "c5",
          by: "b",
          note: "Rather than mirror with ...e5, strike on the other side for an unbalanced fight.",
        },
        { san: "Nf3", by: "w", note: "White develops and prepares d4." },
        {
          san: "d6",
          by: "b",
          note: "A flexible setup that supports a later ...Nf6 without allowing e5.",
        },
        { san: "d4", by: "w", note: "White opens the center." },
        {
          san: "cxd4",
          by: "b",
          note: "Trade, opening the c-file for Black's rook later on.",
        },
        {
          san: "Nxd4",
          by: "w",
          note: "White recaptures, centralizing the knight.",
        },
        { san: "Nf6", by: "b", note: "Develop and attack e4 immediately." },
        { san: "Nc3", by: "w", note: "White defends e4 and develops." },
      ],
    },
    {
      id: "french",
      name: "French Defense",
      side: "b",
      tag: "Solid & structured",
      versusTag: "vs 1.e4",
      summary:
        "A rock-solid pawn chain in exchange for a slightly cramped position early — built for players who like clear plans.",
      moves: [
        { san: "e4", by: "w", note: "White claims the center." },
        {
          san: "e6",
          by: "b",
          note: "Prepare ...d5 without letting a piece get kicked around.",
        },
        { san: "d4", by: "w", note: "White builds a bigger center." },
        {
          san: "d5",
          by: "b",
          note: "Now challenge it — this is the French pawn structure.",
        },
        { san: "Nc3", by: "w", note: "White defends e4 and develops." },
        { san: "Nf6", by: "b", note: "Attack e4 and develop." },
        {
          san: "Bg5",
          by: "w",
          note: "Pin the knight (the Classical Variation).",
        },
        { san: "Be7", by: "b", note: "Break the pin and prepare to castle." },
      ],
    },
    {
      id: "carokann",
      name: "Caro-Kann Defense",
      side: "b",
      tag: "Solid & low-theory",
      versusTag: "vs 1.e4",
      summary:
        "Similar solidity to the French, but Black's light-squared bishop gets out before the pawn chain locks it in.",
      moves: [
        { san: "e4", by: "w", note: "White claims the center." },
        {
          san: "c6",
          by: "b",
          note: "Prepare ...d5 while keeping the option to recapture with a pawn.",
        },
        { san: "d4", by: "w", note: "White builds a bigger center." },
        { san: "d5", by: "b", note: "Challenge the center." },
        { san: "Nc3", by: "w", note: "White defends e4 and develops." },
        { san: "dxe4", by: "b", note: "Resolve the tension on Black's terms." },
        { san: "Nxe4", by: "w", note: "White recaptures." },
        {
          san: "Bf5",
          by: "b",
          note: "The key point of the move order — get this bishop out before playing ...e6 locks it in.",
        },
      ],
    },
    {
      id: "scandinavian",
      name: "Scandinavian Defense",
      side: "b",
      tag: "Simple & direct",
      versusTag: "vs 1.e4",
      summary:
        "Trade in the center immediately and bring the queen out early — very few traps to memorize, easy to understand.",
      moves: [
        { san: "e4", by: "w", note: "White claims the center." },
        { san: "d5", by: "b", note: "Challenge e4 immediately." },
        { san: "exd5", by: "w", note: "White takes." },
        {
          san: "Qxd5",
          by: "b",
          note: "Recapture with the queen — a little early, but very direct and simple to play.",
        },
        {
          san: "Nc3",
          by: "w",
          note: "White develops with tempo, attacking the queen.",
        },
        {
          san: "Qa5",
          by: "b",
          note: "Retreat to an active square that keeps an eye on c3 and e1.",
        },
      ],
    },
    {
      id: "kingsindian",
      name: "King's Indian Defense",
      side: "b",
      tag: "Hypermodern & sharp",
      versusTag: "vs 1.d4",
      summary:
        "Let White build a big center, then strike back at it later — a hypermodern classic with real winning chances for Black.",
      moves: [
        { san: "d4", by: "w", note: "White claims the center." },
        {
          san: "Nf6",
          by: "b",
          note: "Develop and control e4 without committing the center pawns yet.",
        },
        { san: "c4", by: "w", note: "White expands further." },
        {
          san: "g6",
          by: "b",
          note: "Prepare to fianchetto — the hallmark of the King's Indian.",
        },
        { san: "Nc3", by: "w", note: "White develops." },
        {
          san: "Bg7",
          by: "b",
          note: "Fianchetto the bishop, aiming down the long diagonal.",
        },
        {
          san: "e4",
          by: "w",
          note: "White completes a full classical center.",
        },
        {
          san: "d6",
          by: "b",
          note: "Finish development, ready to strike back later with ...e5 or ...c5.",
        },
      ],
    },
  ],
};

// ======================================================
// SOUND
// ======================================================

let audioCtx = null;

function primeAudio() {
  if (audioCtx) {
    return;
  }

  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;

    if (Ctx) {
      audioCtx = new Ctx();
    }
  } catch (error) {
    audioCtx = null;
  }
}

function playTone(freq, duration, type, gainPeak) {
  if (!soundEnabled) {
    return;
  }

  if (!audioCtx) {
    primeAudio();
  }

  if (!audioCtx) {
    return;
  }

  try {
    const osc = audioCtx.createOscillator();

    const gain = audioCtx.createGain();

    osc.type = type || "sine";

    osc.frequency.value = freq;

    const now = audioCtx.currentTime;

    gain.gain.setValueAtTime(0.0001, now);

    gain.gain.exponentialRampToValueAtTime(gainPeak || 0.05, now + 0.012);

    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(audioCtx.destination);

    osc.start(now);

    osc.stop(now + duration + 0.03);
  } catch (error) {
    /* audio best-effort only */
  }
}

function soundMove() {
  playTone(392, 0.09, "triangle", 0.045);
}

function soundCapture() {
  playTone(220, 0.13, "square", 0.045);
}

function soundCheck() {
  playTone(640, 0.14, "sawtooth", 0.05);

  setTimeout(() => playTone(520, 0.14, "sawtooth", 0.045), 90);
}

function soundIllegal() {
  playTone(140, 0.12, "square", 0.035);
}

function soundGameEnd(won) {
  if (won) {
    playTone(523, 0.14, "sine", 0.05);

    setTimeout(() => playTone(659, 0.14, "sine", 0.05), 140);

    setTimeout(() => playTone(784, 0.24, "sine", 0.05), 280);
  } else {
    playTone(300, 0.2, "sine", 0.04);

    setTimeout(() => playTone(220, 0.3, "sine", 0.04), 180);
  }
}

// ======================================================
// SETTINGS PERSISTENCE
// ======================================================

function loadSettings() {
  try {
    const storedSkill = localStorage.getItem("chesscoach_skill");

    if (storedSkill && SKILL_LEVELS[storedSkill]) {
      currentSkill = storedSkill;
    }
  } catch (error) {
    /* localStorage unavailable — keep defaults */
  }

  try {
    const storedSound = localStorage.getItem("chesscoach_sound");

    if (storedSound !== null) {
      soundEnabled = storedSound === "1";
    }
  } catch (error) {
    /* localStorage unavailable — keep defaults */
  }

  try {
    const storedColor = localStorage.getItem("chesscoach_color");

    if (storedColor === "w" || storedColor === "b") {
      playerColor = storedColor;
    }
  } catch (error) {
    /* localStorage unavailable — keep defaults */
  }
}

// ======================================================
// DIALOG HELPERS (with fallback for old browsers)
// ======================================================

function showDialog(dialog) {
  if (!dialog) {
    return;
  }

  if (typeof dialog.showModal === "function") {
    try {
      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    } catch (error) {
      /* fall through to attribute fallback */
    }
  }

  dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (!dialog) {
    return;
  }

  if (typeof dialog.close === "function" && dialog.open) {
    try {
      dialog.close();

      return;
    } catch (error) {
      /* fall through to attribute fallback */
    }
  }

  dialog.removeAttribute("open");
}

// ======================================================
// TACTICAL HEURISTICS
// ======================================================

function squareFromRC(row, col) {
  if (row < 0 || row > 7 || col < 0 || col > 7) {
    return null;
  }

  return "abcdefgh"[col] + (8 - row);
}

/*
    Pseudo-legal attackers of `square` belonging to
    `byColor`, computed directly from the board array.
    This is intentionally independent of chess.js's own
    legality/FEN validation so it never has to construct
    synthetic positions.
*/

function getAttackers(board, square, byColor) {
  const file = "abcdefgh".indexOf(square[0]);

  const rank = parseInt(square[1], 10);

  const tr = 8 - rank;

  const tc = file;

  const attackers = [];

  const knightDeltas = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];

  knightDeltas.forEach(([dr, dc]) => {
    const r = tr + dr;

    const c = tc + dc;

    if (r < 0 || r > 7 || c < 0 || c > 7) {
      return;
    }

    const p = board[r][c];

    if (p && p.color === byColor && p.type === "n") {
      attackers.push({ square: squareFromRC(r, c), type: "n" });
    }
  });

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) {
        continue;
      }

      const r = tr + dr;

      const c = tc + dc;

      if (r < 0 || r > 7 || c < 0 || c > 7) {
        continue;
      }

      const p = board[r][c];

      if (p && p.color === byColor && p.type === "k") {
        attackers.push({ square: squareFromRC(r, c), type: "k" });
      }
    }
  }

  const attackerRow = byColor === "w" ? tr + 1 : tr - 1;

  [-1, 1].forEach((dc) => {
    const c = tc + dc;

    if (attackerRow < 0 || attackerRow > 7 || c < 0 || c > 7) {
      return;
    }

    const p = board[attackerRow][c];

    if (p && p.color === byColor && p.type === "p") {
      attackers.push({ square: squareFromRC(attackerRow, c), type: "p" });
    }
  });

  function scan(dirs, types) {
    dirs.forEach(([dr, dc]) => {
      let r = tr + dr;

      let c = tc + dc;

      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const p = board[r][c];

        if (p) {
          if (p.color === byColor && types.indexOf(p.type) !== -1) {
            attackers.push({ square: squareFromRC(r, c), type: p.type });
          }

          break;
        }

        r += dr;

        c += dc;
      }
    });
  }

  scan(
    [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],

    ["r", "q"],
  );

  scan(
    [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],

    ["b", "q"],
  );

  return attackers;
}

/*
    Finds pieces belonging to `mySide` that are hanging:
    attacked, and either undefended, attacked by something
    less valuable, or outnumbered by attackers.
*/

function findHangingPieces(mySide) {
  const board = game.board();

  const oppSide = mySide === "w" ? "b" : "w";

  const results = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];

      if (!piece || piece.color !== mySide || piece.type === "k") {
        continue;
      }

      const square = squareFromRC(r, c);

      const attackers = getAttackers(board, square, oppSide);

      if (attackers.length === 0) {
        continue;
      }

      const defenders = getAttackers(board, square, mySide);

      const pieceVal = PIECE_VALUE[piece.type];

      const minAttackerVal = Math.min(
        ...attackers.map((a) => PIECE_VALUE[a.type]),
      );

      const minAttacker = attackers.find(
        (a) => PIECE_VALUE[a.type] === minAttackerVal,
      );

      let hanging = false;

      if (defenders.length === 0) {
        hanging = true;
      } else if (minAttackerVal < pieceVal) {
        hanging = true;
      } else if (attackers.length > defenders.length) {
        hanging = true;
      }

      if (hanging) {
        results.push({
          square,

          type: piece.type,

          value: pieceVal,

          attackerCount: attackers.length,

          defenderCount: defenders.length,

          minAttackerType: minAttacker ? minAttacker.type : piece.type,
        });
      }
    }
  }

  results.sort((a, b) => b.value - a.value);

  return results;
}

function getGamePhase() {
  const moveCount = game.history().length;

  if (moveCount < 10) {
    return "opening";
  }

  const boardField = game.fen().split(" ")[0];

  const pieceCount = boardField.replace(/[^a-zA-Z]/g, "").length;

  if (pieceCount <= 12) {
    return "endgame";
  }

  return "middlegame";
}

function pickAphorism() {
  const pool = APHORISMS[getGamePhase()];

  let choice = pool[Math.floor(Math.random() * pool.length)];

  let guard = 0;

  while (choice === lastAphorism && guard < 5) {
    choice = pool[Math.floor(Math.random() * pool.length)];

    guard++;
  }

  lastAphorism = choice;

  return choice;
}

// ======================================================
// BEFORE-YOU-MOVE CHECKLIST
// ======================================================

function renderChecklist() {
  const list = document.getElementById("checklistList");

  const tag = document.getElementById("checklistTurnTag");

  if (!list) {
    return;
  }

  if (trainerActive && trainerOpening) {
    renderTrainerChecklist(list, tag);

    return;
  }

  if (game.game_over()) {
    if (tag) {
      tag.textContent = "GAME OVER";
    }

    list.innerHTML =
      '<li class="checklist-empty">The game has ended. Start a new game to keep training.</li>';

    return;
  }

  if (!engineReady) {
    if (tag) {
      tag.textContent = "STARTING";
    }

    list.innerHTML =
      '<li class="checklist-empty">Waiting for the engine to start…</li>';

    return;
  }

  if (game.turn() !== playerColor) {
    if (tag) {
      tag.textContent = "AI TURN";
    }

    list.innerHTML =
      '<li class="checklist-empty">Watching the opponent think…</li>';

    return;
  }

  if (tag) {
    tag.textContent = "YOUR TURN";
  }

  const items = [];

  if (game.in_check()) {
    items.push({
      severity: "danger",

      icon: "⚠",

      title: "You are in check",

      detail:
        "Deal with it first — block it, capture the checking piece, or move your king.",
    });
  }

  const hanging = findHangingPieces(playerColor);

  if (hanging.length > 0) {
    hanging.slice(0, 3).forEach((h) => {
      items.push({
        severity: "danger",

        icon: "🎯",

        title: `Your ${PIECE_NAME[h.type]} on ${h.square.toUpperCase()} is hanging`,

        detail:
          h.defenderCount === 0
            ? `It's undefended and attacked ${h.attackerCount > 1 ? h.attackerCount + " times" : "once"}. Move it, defend it, or make the trade favor you.`
            : `It's attacked by a ${PIECE_NAME[h.minAttackerType]} worth less than it — that exchange favors your opponent.`,
      });
    });

    if (hanging.length > 3) {
      items.push({
        severity: "warn",

        icon: "➕",

        title: `${hanging.length - 3} more piece${hanging.length - 3 === 1 ? "" : "s"} also need attention`,

        detail: "Scan the rest of the board before you commit to a move.",
      });
    }
  } else {
    items.push({
      severity: "good",

      icon: "✓",

      title: "Nothing of yours is hanging",

      detail: "Your pieces are safe for now — look for what to improve.",
    });
  }

  const legalMoves = game.moves({ verbose: true });

  const captures = legalMoves.filter(
    (m) => m.flags.indexOf("c") !== -1 || m.flags.indexOf("e") !== -1,
  );

  const checks = legalMoves.filter(
    (m) => m.san.endsWith("+") || m.san.endsWith("#"),
  );

  if (captures.length > 0) {
    const best = captures
      .slice()
      .sort(
        (a, b) =>
          (PIECE_VALUE[b.captured] || 0) - (PIECE_VALUE[a.captured] || 0),
      )[0];

    items.push({
      severity: "info",

      icon: "⚔",

      title: `${captures.length} capture${captures.length === 1 ? "" : "s"} available`,

      detail: `Strongest option: ${PIECE_NAME[best.piece]} takes ${PIECE_NAME[best.captured]} on ${best.to.toUpperCase()}. Check it's actually safe before playing it.`,
    });
  }

  if (checks.length > 0) {
    items.push({
      severity: "info",

      icon: "⚡",

      title: `${checks.length} check${checks.length === 1 ? "" : "s"} available`,

      detail:
        "A check is only good if your position improves after the reply — calculate it out.",
    });
  }

  items.push({
    severity: "info",

    icon: "🧭",

    title: "Before you commit",

    detail: pickAphorism(),
  });

  list.innerHTML = "";

  items.forEach((item) => {
    const li = document.createElement("li");

    li.className = `severity-${item.severity}`;

    li.innerHTML = `
      <span class="checklist-icon">${item.icon}</span>
      <div>
        <strong>${item.title}</strong>
        <span class="detail">${item.detail}</span>
      </div>
    `;

    list.appendChild(li);
  });
}

// ======================================================
// OPENING TRAINER
// ======================================================

function findMoveBySan(san) {
  const moves = game.moves({ verbose: true });

  return moves.find((m) => m.san === san) || null;
}

function startOpeningTrainer(opening) {
  setPlayerColor(opening.side);

  startNewGame(true);

  trainerOpening = opening;

  trainerIndex = 0;

  trainerActive = true;

  showCoachMessage(`📖 ${opening.name}`, opening.summary);

  trainerStep();
}

function trainerStep() {
  if (!trainerActive || !trainerOpening) {
    renderChecklist();

    return;
  }

  if (trainerIndex >= trainerOpening.moves.length) {
    trainerActive = false;

    showCoachMessage(
      `📖 ${trainerOpening.name} complete`,

      "You've played through the main line — nice work. I'll go back to full move analysis from here.",
    );

    clearRecommendation();

    renderChecklist();

    if (game.turn() !== playerColor && !game.game_over()) {
      setTimeout(() => makeAIMove(), 600);
    }

    return;
  }

  const entry = trainerOpening.moves[trainerIndex];

  renderChecklist();

  if (entry.by === playerColor) {
    const found = findMoveBySan(entry.san);

    if (found) {
      showRecommendation(found.from, found.to);
    }
  } else {
    clearRecommendation();

    playScriptedMove(entry);
  }
}

function playScriptedMove(entry) {
  setTimeout(() => {
    if (!trainerActive) {
      return;
    }

    let result = null;

    try {
      result = game.move(entry.san);
    } catch (error) {
      result = null;
    }

    if (!result) {
      trainerActive = false;

      showCoachMessage(
        "Training hit a snag",

        "Something went wrong continuing that line, so I've switched to free play — you can keep going from here.",
      );

      createBoard();

      updateTurn();

      if (game.turn() !== playerColor && !game.game_over()) {
        setTimeout(() => makeAIMove(), 500);
      }

      return;
    }

    lastMove = { from: result.from, to: result.to };

    if (result.flags.indexOf("c") !== -1 || result.flags.indexOf("e") !== -1) {
      soundCapture();
    } else {
      soundMove();
    }

    if (game.in_check()) {
      soundCheck();
    }

    createBoard();

    updateMoveHistory();

    updateCapturedTray();

    updateTurn();

    showCoachMessage(`📖 ${entry.san}`, entry.note);

    trainerIndex++;

    if (game.game_over()) {
      handleGameEnd();

      return;
    }

    trainerStep();
  }, 700);
}

function renderTrainerChecklist(list, tag) {
  if (tag) {
    tag.textContent = "TRAINING";
  }

  const total = trainerOpening.moves.length;

  const entry = trainerOpening.moves[trainerIndex];

  if (!entry) {
    list.innerHTML = '<li class="checklist-empty">Training complete.</li>';

    return;
  }

  const waitingForPlayer = entry.by === playerColor;

  list.innerHTML = "";

  const header = document.createElement("li");

  header.className = "severity-info";

  header.innerHTML = `
    <span class="checklist-icon">📖</span>
    <div>
      <strong>${trainerOpening.name} — move ${trainerIndex + 1} of ${total}</strong>
      <span class="detail">${waitingForPlayer ? "Play the highlighted move on the board." : "Watch what the book plays here…"}</span>
    </div>
  `;

  list.appendChild(header);

  const noteItem = document.createElement("li");

  noteItem.className = "severity-good";

  noteItem.innerHTML = `
    <span class="checklist-icon">💡</span>
    <div>
      <strong>${entry.san}</strong>
      <span class="detail">${entry.note}</span>
    </div>
  `;

  list.appendChild(noteItem);

  const exitItem = document.createElement("li");

  exitItem.className = "checklist-empty";

  exitItem.innerHTML = `<button class="ghost-button" id="exitTrainerButton" type="button">EXIT TRAINING</button>`;

  list.appendChild(exitItem);

  const exitBtn = document.getElementById("exitTrainerButton");

  if (exitBtn) {
    exitBtn.addEventListener("click", () => {
      trainerActive = false;

      clearRecommendation();

      createBoard();

      renderChecklist();

      showCoachMessage(
        "Training ended",

        "Back to free play — I'll analyze your moves as usual.",
      );
    });
  }
}

// ======================================================
// ENGINE INITIALIZATION
// ======================================================

/*
    Stockfish's browser build is designed to run inside a
    dedicated Web Worker (it calls close() on "quit" and
    wires up the worker's own onmessage/postMessage channel
    for UCI I/O) — it is not meant to be loaded with a plain
    <script> tag and called as a function.

    Workers can only be constructed from a same-origin,
    blob:, or data: URL, so a cross-origin engine URL like
    this cdnjs one has to be fetched first and turned into a
    blob: URL before we can hand it to `new Worker(...)`.
    This requires an outbound network request — normal on a
    real site, but it's the kind of request a sandboxed
    preview can block, which is the most likely reason the
    engine fails to come online there even though this exact
    setup works from a regular browser tab.
*/

const ENGINE_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js";

async function initializeEngine() {
  const indicator = document.getElementById("engineIndicator");

  const status = document.getElementById("engineStatus");

  if (typeof Worker === "undefined") {
    if (status) {
      status.textContent = "ENGINE UNAVAILABLE";
    }

    if (indicator) {
      indicator.classList.add("error");
    }

    showCoachMessage(
      "Engine unavailable",

      "This browser doesn't support Web Workers, which the chess engine needs to run.",
    );

    return;
  }

  if (status) {
    status.textContent = "DOWNLOADING ENGINE";
  }

  try {
    const response = await fetch(ENGINE_URL);

    if (!response.ok) {
      throw new Error(`Engine download failed with status ${response.status}`);
    }

    const code = await response.text();

    const blob = new Blob([code], { type: "application/javascript" });

    const blobUrl = URL.createObjectURL(blob);

    engine = new Worker(blobUrl);
  } catch (error) {
    console.error(error);

    if (status) {
      status.textContent = "ENGINE UNAVAILABLE";
    }

    if (indicator) {
      indicator.classList.add("error");
    }

    showCoachMessage(
      "Engine couldn't load",

      "The chess engine couldn't be downloaded. If you're viewing this inside a sandboxed preview, that environment may be blocking the request — opening the project's own files in a normal browser tab should work. Otherwise, check your internet connection and try New Game to retry.",
    );

    return;
  }

  engine.onmessage = function (event) {
    const message = typeof event === "string" ? event : event.data;

    if (typeof message === "string") {
      handleEngineMessage(message);
    }
  };

  engine.onerror = function (event) {
    console.error("Stockfish worker error", event);

    if (status) {
      status.textContent = "ENGINE ERROR";
    }

    if (indicator) {
      indicator.classList.add("error");
    }

    showCoachMessage(
      "Engine error",

      "The chess engine hit an error while running. Open your browser console for details, or try New Game to restart it.",
    );
  };

  engine.postMessage("uci");
}

// ======================================================
// ENGINE OPTIONS
// ======================================================

function configureEngineFullStrength() {
  if (!engine) {
    return;
  }

  engine.postMessage("setoption name UCI_LimitStrength value false");

  engine.postMessage("setoption name Skill Level value 20");
}

function configureEngineForOpponent() {
  if (!engine) {
    return;
  }

  const tier = SKILL_LEVELS[currentSkill] || SKILL_LEVELS.club;

  if (tier.limitStrength) {
    engine.postMessage("setoption name UCI_LimitStrength value true");

    engine.postMessage(`setoption name UCI_Elo value ${tier.elo}`);
  } else {
    engine.postMessage("setoption name UCI_LimitStrength value false");
  }

  engine.postMessage(`setoption name Skill Level value ${tier.skill}`);
}

// ======================================================
// ENGINE MESSAGE HANDLER
// ======================================================

function handleEngineMessage(message) {
  // --------------------------------------------------
  // UCI READY
  // --------------------------------------------------

  if (message === "uciok") {
    engine.postMessage("isready");

    return;
  }

  // --------------------------------------------------
  // ENGINE READY
  // --------------------------------------------------

  if (message === "readyok") {
    engineReady = true;

    configureEngineFullStrength();

    const indicator = document.getElementById("engineIndicator");

    const status = document.getElementById("engineStatus");

    if (indicator) {
      indicator.classList.add("ready");
    }

    if (status) {
      status.textContent = "ENGINE ONLINE";
    }

    showCoachMessage(
      "Coach engine ready",

      "Stockfish is online. I'll calculate your decisions and explain what you can learn from them.",
    );

    updateSkillUI();

    updateTurn();

    maybeStartAiFirst();

    return;
  }

  // --------------------------------------------------
  // ENGINE INFORMATION
  // --------------------------------------------------

  if (message.startsWith("info")) {
    parseEngineInfo(message);

    return;
  }

  // --------------------------------------------------
  // BEST MOVE
  // --------------------------------------------------

  if (message.startsWith("bestmove")) {
    handleBestMove(message);
  }
}

// ======================================================
// BEST MOVE
// ======================================================

function handleBestMove(message) {
  const parts = message.trim().split(/\s+/);

  const move = parts[1];

  if (!move || move === "(none)") {
    if (analysisStage === "after") {
      generateCoachVerdict();
    }

    engineThinking = false;

    analysisStage = null;

    updateTurn();

    return;
  }

  // --------------------------------------------------
  // POSITION BEFORE PLAYER MOVE
  // --------------------------------------------------

  if (analysisStage === "before") {
    bestMoveBeforePlayerMove = move;

    evaluationAfterMove = null;

    deepestDepth = -1;

    analysisStage = "after";

    configureEngineFullStrength();

    engine.postMessage("stop");

    engine.postMessage(`position fen ${game.fen()}`);

    engine.postMessage(`go depth ${ANALYSIS_DEPTH}`);

    return;
  }

  // --------------------------------------------------
  // POSITION AFTER PLAYER MOVE
  // --------------------------------------------------

  if (analysisStage === "after") {
    generateCoachVerdict();

    return;
  }

  // --------------------------------------------------
  // AI MOVE
  // --------------------------------------------------

  if (analysisStage === "ai") {
    playEngineMove(move);

    return;
  }

  // --------------------------------------------------
  // HINT
  // --------------------------------------------------

  if (analysisStage === "hint") {
    displayHint(move);

    engineThinking = false;

    analysisStage = null;

    updateTurn();
  }
}

// ======================================================
// PARSE ENGINE INFO
// ======================================================

function parseEngineInfo(message) {
  const tokens = message.trim().split(/\s+/);

  const depthIndex = tokens.indexOf("depth");

  const scoreIndex = tokens.indexOf("score");

  if (scoreIndex === -1) {
    return;
  }

  const scoreType = tokens[scoreIndex + 1];

  const scoreValue = parseInt(tokens[scoreIndex + 2], 10);

  if (isNaN(scoreValue)) {
    return;
  }

  let depth = 0;

  if (depthIndex !== -1) {
    depth = parseInt(tokens[depthIndex + 1], 10) || 0;
  }

  if (depth < deepestDepth) {
    return;
  }

  deepestDepth = depth;

  updateDepthIndicator();

  let score = getEvaluationFromScore(scoreType, scoreValue);

  /*
        Convert Stockfish's score into
        White's perspective.
    */

  if (game.turn() === "b") {
    score = -score;
  }

  engineEvaluation = score;

  if (analysisStage === "before") {
    evaluationBeforeMove = score;
  }

  if (analysisStage === "after") {
    evaluationAfterMove = score;
  }

  updateEvaluation();
}

function updateDepthIndicator() {
  const el = document.getElementById("depthIndicator");

  if (!el) {
    return;
  }

  el.textContent =
    engineThinking && deepestDepth > 0 ? `· D${deepestDepth}` : "";
}

// ======================================================
// SCORE CONVERSION
// ======================================================

function getEvaluationFromScore(type, value) {
  if (type === "cp") {
    return value / 100;
  }

  if (type === "mate") {
    if (value > 0) {
      return 99;
    }

    return -99;
  }

  return 0;
}

// ======================================================
// ANALYZE PLAYER DECISION
// ======================================================

function analyzePlayerDecision(move) {
  const postMoveHanging = findHangingPieces(playerColor);

  if (!engineReady) {
    showCoachMessage(
      "Move recorded",

      `You played ${move.san}. The engine is not ready for a detailed evaluation yet.`,
    );

    return;
  }

  playerMove = {
    ...move,

    postMoveHanging,

    plyIndex: game.history().length - 1,
  };

  /*
        Temporarily undo the move.
    */

  game.undo();

  /*
        Save exact position before
        player's decision.
    */

  positionBeforeMove = game.fen();

  /*
        Restore player's move.
    */

  game.move({
    from: move.from,

    to: move.to,

    promotion: move.promotion || "q",
  });

  evaluationBeforeMove = null;

  evaluationAfterMove = null;

  bestMoveBeforePlayerMove = null;

  deepestDepth = -1;

  analysisStage = "before";

  configureEngineFullStrength();

  engine.postMessage("stop");

  engine.postMessage(`position fen ${positionBeforeMove}`);

  engine.postMessage(`go depth ${ANALYSIS_DEPTH}`);

  showCoachMessage(
    "Analyzing your move...",

    "I'm comparing your decision with the strongest continuation available in this position.",
  );
}

// ======================================================
// GENERATE COACH VERDICT
// ======================================================

function generateCoachVerdict() {
  if (
    !playerMove ||
    evaluationBeforeMove === null ||
    evaluationAfterMove === null
  ) {
    showCoachMessage(
      "Analysis incomplete",

      "The engine did not return enough information for a reliable comparison. Try the position again.",
    );

    resetAnalysisState();

    return;
  }

  const playerWasWhite = playerMove.color === "w";

  const before = evaluationBeforeMove;

  const after = evaluationAfterMove;

  let centipawnLoss;

  /*
        Scores are from White's perspective.

        White move:
            before - after

        Black move:
            after - before
    */

  if (playerWasWhite) {
    centipawnLoss = before - after;
  } else {
    centipawnLoss = after - before;
  }

  centipawnLoss = Math.max(0, centipawnLoss);

  const verdict = classifyMove(centipawnLoss);

  const bestMove = convertUCIMoveToReadable(
    bestMoveBeforePlayerMove,

    positionBeforeMove,
  );

  moveAnnotations[playerMove.plyIndex] = verdict.icon;

  displayCoachVerdict(verdict, centipawnLoss, bestMove, before, after);

  updateMoveHistory();

  resetAnalysisState();
}

// ======================================================
// MOVE CLASSIFICATION
// ======================================================

function classifyMove(loss) {
  if (loss <= 0.1) {
    return {
      name: "BEST MOVE",

      icon: "🟢",
    };
  }

  if (loss <= 0.3) {
    return {
      name: "EXCELLENT",

      icon: "🟢",
    };
  }

  if (loss <= 0.7) {
    return {
      name: "GOOD MOVE",

      icon: "🔵",
    };
  }

  if (loss <= 1.2) {
    return {
      name: "INACCURACY",

      icon: "🟡",
    };
  }

  if (loss <= 2.5) {
    return {
      name: "MISTAKE",

      icon: "🟠",
    };
  }

  return {
    name: "BLUNDER",

    icon: "🔴",
  };
}

// ======================================================
// COACH EXPLANATION
// ======================================================

function displayCoachVerdict(verdict, loss, bestMove, before, after) {
  const move = playerMove ? playerMove.san : "?";

  let explanation = "";

  // --------------------------------------------------
  // BEST
  // --------------------------------------------------

  if (verdict.name === "BEST MOVE") {
    explanation = `
            You found the engine's strongest
            continuation.

            <br><br>

            <b>Coach lesson:</b><br>

            Remember what you calculated before making
            this move — that thought process is what
            we want to develop.
        `;
  }

  // --------------------------------------------------
  // EXCELLENT
  // --------------------------------------------------
  else if (verdict.name === "EXCELLENT") {
    explanation = `
            Your move is extremely close to
            the engine's preferred continuation.

            <br><br>

            <b>Coach lesson:</b><br>

            You preserved the important features
            of the position while improving your pieces.
        `;
  }

  // --------------------------------------------------
  // GOOD
  // --------------------------------------------------
  else if (verdict.name === "GOOD MOVE") {
    explanation = `
            Your move is sound and keeps the
            position playable.

            <br><br>

            The engine's top choice was
            <strong>${bestMove}</strong>.

            <br><br>

            <b>Coach question:</b><br>

            What does ${bestMove} accomplish
            that your move doesn't?
        `;
  }

  // --------------------------------------------------
  // INACCURACY
  // --------------------------------------------------
  else if (verdict.name === "INACCURACY") {
    explanation = `
            Your move is playable, but it gives
            away part of your position.

            <br><br>

            The engine preferred
            <strong>${bestMove}</strong>.

            <br><br>

            <b>Coach lesson:</b><br>

            When multiple moves seem playable,
            compare the purpose of each move before
            choosing one.
        `;
  }

  // --------------------------------------------------
  // MISTAKE
  // --------------------------------------------------
  else if (verdict.name === "MISTAKE") {
    explanation = `
            This move significantly worsens
            your position.

            <br><br>

            The engine preferred
            <strong>${bestMove}</strong>.

            <br><br>

            <b>Pro habit:</b><br>

            Before moving, calculate your opponent's
            forcing replies:

            <br>

            <strong>
                Checks → Captures → Threats
            </strong>
        `;
  }

  // --------------------------------------------------
  // BLUNDER
  // --------------------------------------------------
  else {
    explanation = `
            This move causes a major deterioration
            in your position.

            <br><br>

            The engine preferred
            <strong>${bestMove}</strong>.

            <br><br>

            <b>Coach question:</b><br>

            What tactical resource did you miss
            after ${move}?

            <br><br>

            Don't just memorize the engine move.
            Understand what changed.
        `;
  }

  const tacticalNote = buildTacticalNote();

  showCoachMessage(
    `${verdict.icon} ${verdict.name}`,

    `
        <strong>
            Your move: ${move}
        </strong>

        <br><br>

        ${explanation}

        <br>

        <span style="opacity:.45">
            Engine difference:
            ${loss.toFixed(2)}
        </span>
        `,

    tacticalNote,
  );

  engineEvaluation = after;

  updateEvaluation();
}

function buildTacticalNote() {
  if (!playerMove || !playerMove.postMoveHanging) {
    return null;
  }

  const hanging = playerMove.postMoveHanging;

  if (hanging.length === 0) {
    return {
      severity: "good",

      text: "✓ You didn't leave anything hanging with this move.",
    };
  }

  const worst = hanging[0];

  return {
    severity: "danger",

    text: `⚠ After this move, your ${PIECE_NAME[worst.type]} on ${worst.square.toUpperCase()} is hanging to a ${PIECE_NAME[worst.minAttackerType]}. Double-check that before your next move.`,
  };
}

// ======================================================
// RESET ANALYSIS
// ======================================================

function resetAnalysisState() {
  positionBeforeMove = null;

  playerMove = null;

  evaluationBeforeMove = null;

  evaluationAfterMove = null;

  bestMoveBeforePlayerMove = null;

  analysisStage = null;

  deepestDepth = -1;

  updateDepthIndicator();
}

// ======================================================
// UCI → SAN
// ======================================================

function convertUCIMoveToReadable(uci, fen) {
  if (!uci || !fen) {
    return "Unknown";
  }

  const from = uci.substring(0, 2);

  const to = uci.substring(2, 4);

  const promotion = uci.substring(4, 5);

  const temp = new Chess(fen);

  try {
    const move = temp.move({
      from: from,

      to: to,

      promotion: promotion || "q",
    });

    return move ? move.san : `${from}-${to}`;
  } catch {
    return `${from}-${to}`;
  }
}

// ======================================================
// AI MOVE
// ======================================================

function makeAIMove() {
  if (game.game_over()) {
    return;
  }

  if (!engineReady) {
    return;
  }

  if (engineThinking) {
    return;
  }

  engineThinking = true;

  analysisStage = "ai";

  deepestDepth = -1;

  const tier = SKILL_LEVELS[currentSkill] || SKILL_LEVELS.club;

  showCoachMessage(
    "Coach is calculating...",

    "I'm searching the position for the strongest continuation.",
  );

  configureEngineForOpponent();

  engine.postMessage("stop");

  engine.postMessage(`position fen ${game.fen()}`);

  engine.postMessage(`go depth ${tier.depth}`);

  updateTurn();
}

// ======================================================
// PLAY AI MOVE
// ======================================================

function playEngineMove(uciMove) {
  const from = uciMove.substring(0, 2);

  const to = uciMove.substring(2, 4);

  const promotion = uciMove.substring(4, 5) || "q";

  let result = null;

  try {
    result = game.move({
      from: from,

      to: to,

      promotion: promotion,
    });
  } catch (error) {
    console.error(error);
  }

  engineThinking = false;

  analysisStage = null;

  if (!result) {
    showCoachMessage(
      "Engine error",

      "The engine returned a move that could not be applied to the chess position.",
    );

    updateTurn();

    return;
  }

  lastMove = { from: result.from, to: result.to };

  if (result.flags.indexOf("c") !== -1 || result.flags.indexOf("e") !== -1) {
    soundCapture();
  } else {
    soundMove();
  }

  if (game.in_check()) {
    soundCheck();
  }

  createBoard();

  updateMoveHistory();

  updateCapturedTray();

  updateTurn();

  showCoachMessage(
    `AI played ${result.san}`,

    "Now find your candidate moves. Before moving, check your opponent's forcing replies.",
  );

  if (game.game_over()) {
    handleGameEnd();
  }
}

// ======================================================
// CREATE BOARD
// ======================================================

function squareToDisplayRC(square) {
  const file = "abcdefgh".indexOf(square[0]);

  const rank = parseInt(square[1], 10);

  const row = 8 - rank;

  const col = file;

  return flipped ? [7 - row, 7 - col] : [row, col];
}

function displayToSquare(displayRow, displayCol) {
  const row = flipped ? 7 - displayRow : displayRow;

  const col = flipped ? 7 - displayCol : displayCol;

  return squareFromRC(row, col);
}

function createBoard() {
  chessBoard.innerHTML = "";

  const board = game.board();

  const checkedKingSquare = game.in_check()
    ? findKingSquare(game.turn())
    : null;

  for (let displayRow = 0; displayRow < 8; displayRow++) {
    for (let displayCol = 0; displayCol < 8; displayCol++) {
      const squareName = displayToSquare(displayRow, displayCol);

      const file = "abcdefgh".indexOf(squareName[0]);

      const rank = parseInt(squareName[1], 10);

      const boardRow = 8 - rank;

      const boardCol = file;

      const square = document.createElement("div");

      square.classList.add("square");

      square.classList.add((boardRow + boardCol) % 2 === 0 ? "light" : "dark");

      square.dataset.square = squareName;

      if (
        lastMove &&
        (squareName === lastMove.from || squareName === lastMove.to)
      ) {
        square.classList.add("last-move");
      }

      if (checkedKingSquare && squareName === checkedKingSquare) {
        square.classList.add("king-in-check");
      }

      if (recommendedMove && squareName === recommendedMove.to) {
        square.classList.add("recommended");
      }

      if (recommendedMove && squareName === recommendedMove.from) {
        square.classList.add("recommended-from");
      }

      const piece = board[boardRow][boardCol];

      if (piece) {
        const element = document.createElement("div");

        element.classList.add("piece");

        element.classList.add(
          piece.color === "w" ? "white-piece" : "black-piece",
        );

        element.textContent = pieces[piece.color][piece.type];

        if (
          piece.color === playerColor &&
          game.turn() === playerColor &&
          !engineThinking &&
          !game.game_over()
        ) {
          element.classList.add("draggable");
        }

        square.appendChild(element);
      }

      if (displayCol === 0) {
        const rankLabel = document.createElement("span");

        rankLabel.className = "coord coord-rank";

        rankLabel.textContent = squareName[1];

        square.appendChild(rankLabel);
      }

      if (displayRow === 7) {
        const fileLabel = document.createElement("span");

        fileLabel.className = "coord coord-file";

        fileLabel.textContent = squareName[0];

        square.appendChild(fileLabel);
      }

      square.addEventListener("pointerdown", (event) =>
        handlePointerDown(event, squareName),
      );

      chessBoard.appendChild(square);
    }
  }

  renderArrowOverlay();
}

function findKingSquare(color) {
  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];

      if (piece && piece.color === color && piece.type === "k") {
        return squareFromRC(row, col);
      }
    }
  }

  return null;
}

// ======================================================
// MOVE RECOMMENDATION (arrow + highlight)
// ======================================================

function showRecommendation(from, to) {
  recommendedMove = { from, to };

  createBoard();
}

function clearRecommendation() {
  recommendedMove = null;

  const svg = document.getElementById("boardArrows");

  if (svg) {
    svg.innerHTML = "";
  }

  document
    .querySelectorAll(".square.recommended, .square.recommended-from")
    .forEach((el) => el.classList.remove("recommended", "recommended-from"));
}

function renderArrowOverlay() {
  const svg = document.getElementById("boardArrows");

  if (!svg) {
    return;
  }

  if (!recommendedMove) {
    svg.innerHTML = "";

    return;
  }

  const [r1, c1] = squareToDisplayRC(recommendedMove.from);

  const [r2, c2] = squareToDisplayRC(recommendedMove.to);

  const x1 = c1 + 0.5;

  const y1 = r1 + 0.5;

  const x2 = c2 + 0.5;

  const y2 = r2 + 0.5;

  const dx = x2 - x1;

  const dy = y2 - y1;

  const len = Math.hypot(dx, dy) || 1;

  const shorten = 0.32;

  const ex = x2 - (dx / len) * shorten;

  const ey = y2 - (dy / len) * shorten;

  svg.innerHTML = `
    <defs>
      <marker id="arrowhead" markerWidth="2.6" markerHeight="2.6" refX="1.3" refY="1.3" orient="auto">
        <path d="M0,0 L2.6,1.3 L0,2.6 Z" fill="#cdbd8f"></path>
      </marker>
    </defs>
    <line x1="${x1}" y1="${y1}" x2="${ex}" y2="${ey}" stroke="#cdbd8f" stroke-width="0.14" stroke-linecap="round" marker-end="url(#arrowhead)" opacity="0.92"></line>
  `;
}

// ======================================================
// POINTER INTERACTION (click / tap / drag, unified)
// ======================================================

function handlePointerDown(event, square) {
  if (engineThinking || game.turn() !== playerColor || game.game_over()) {
    return;
  }

  primeAudio();

  const piece = game.get(square);

  const startX = event.clientX;

  const startY = event.clientY;

  const pointerId = event.pointerId;

  // ---- nothing selected yet ----

  if (!selectedSquare) {
    if (!piece || piece.color !== playerColor) {
      return;
    }

    selectedSquare = square;

    highlightMoves(square);

    beginDragTracking(square, startX, startY, pointerId, false);

    return;
  }

  // ---- tapped the already-selected square ----

  if (selectedSquare === square) {
    beginDragTracking(square, startX, startY, pointerId, true);

    return;
  }

  // ---- tapped a different own piece: re-select ----

  if (piece && piece.color === playerColor) {
    selectedSquare = square;

    highlightMoves(square);

    beginDragTracking(square, startX, startY, pointerId, false);

    return;
  }

  // ---- otherwise: attempt a move to this square ----

  const from = selectedSquare;

  selectedSquare = null;

  attemptMove(from, square);
}

/*
    Drag visuals are layered on top of the tap-to-move flow.
    Board rebuilds (from highlightMoves/createBoard) happen
    BEFORE this runs, so the piece element is always queried
    fresh here rather than reused from the original event —
    a rebuild would otherwise leave us holding a detached node.
*/

function beginDragTracking(
  square,
  startX,
  startY,
  pointerId,
  wasAlreadySelected,
) {
  const squareEl = chessBoard.querySelector(`[data-square="${square}"]`);

  const pieceEl = squareEl ? squareEl.querySelector(".piece") : null;

  if (!pieceEl) {
    return;
  }

  let moved = false;

  const ghost = document.createElement("div");

  ghost.className = "drag-ghost piece";

  if (pieceEl.classList.contains("white-piece")) {
    ghost.classList.add("white-piece");
  }

  if (pieceEl.classList.contains("black-piece")) {
    ghost.classList.add("black-piece");
  }

  ghost.textContent = pieceEl.textContent;

  ghost.style.fontSize = getComputedStyle(pieceEl).fontSize;

  ghost.style.display = "none";

  document.body.appendChild(ghost);

  function positionGhost(x, y) {
    ghost.style.left = `${x}px`;

    ghost.style.top = `${y}px`;
  }

  function clearDropTargetHighlight() {
    document
      .querySelectorAll(".square.drop-target")
      .forEach((el) => el.classList.remove("drop-target"));
  }

  function updateDropTarget(x, y) {
    clearDropTargetHighlight();

    const el = document.elementFromPoint(x, y);

    const sq = el ? el.closest(".square") : null;

    if (sq) {
      sq.classList.add("drop-target");
    }
  }

  function onMove(ev) {
    if (ev.pointerId !== pointerId) {
      return;
    }

    if (
      !moved &&
      (Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4)
    ) {
      moved = true;

      ghost.style.display = "block";
    }

    if (moved) {
      positionGhost(ev.clientX, ev.clientY);

      updateDropTarget(ev.clientX, ev.clientY);
    }
  }

  function cleanup() {
    document.removeEventListener("pointermove", onMove);

    document.removeEventListener("pointerup", onUp);

    document.removeEventListener("pointercancel", onCancel);

    ghost.remove();

    clearDropTargetHighlight();
  }

  function onUp(ev) {
    if (ev.pointerId !== pointerId) {
      return;
    }

    cleanup();

    if (moved) {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);

      const dropSquareEl = el ? el.closest(".square") : null;

      const dropSquare = dropSquareEl ? dropSquareEl.dataset.square : null;

      if (dropSquare && dropSquare !== square) {
        selectedSquare = null;

        attemptMove(square, dropSquare);
      }

      return;
    }

    // plain tap, no movement

    if (wasAlreadySelected) {
      selectedSquare = null;

      createBoard();
    }
  }

  function onCancel(ev) {
    if (ev.pointerId !== pointerId) {
      return;
    }

    cleanup();
  }

  document.addEventListener("pointermove", onMove);

  document.addEventListener("pointerup", onUp);

  document.addEventListener("pointercancel", onCancel);
}

// ======================================================
// ATTEMPT MOVE (shared by tap & drag)
// ======================================================

async function attemptMove(from, to) {
  const legalFromSquare = game.moves({ square: from, verbose: true });

  const matching = legalFromSquare.filter((m) => m.to === to);

  if (matching.length === 0) {
    soundIllegal();

    showCoachMessage(
      "Illegal move",

      "That move isn't legal. Choose one of the highlighted squares.",
    );

    selectedSquare = null;

    createBoard();

    return;
  }

  let promotion;

  if (matching[0].flags.indexOf("p") !== -1) {
    promotion = await openPromotionModal();
  }

  const moveObj = { from, to };

  if (promotion) {
    moveObj.promotion = promotion;
  }

  let result = null;

  try {
    result = game.move(moveObj);
  } catch (error) {
    result = null;
  }

  if (!result) {
    soundIllegal();

    showCoachMessage(
      "Illegal move",

      "That move isn't legal. Choose one of the highlighted squares.",
    );

    selectedSquare = null;

    createBoard();

    return;
  }

  completePlayerMove(result);
}

function openPromotionModal() {
  return new Promise((resolve) => {
    promotionResolve = resolve;

    showDialog(document.getElementById("promotionModal"));
  });
}

function completePlayerMove(result) {
  selectedSquare = null;

  recommendedMove = null;

  lastMove = { from: result.from, to: result.to };

  if (result.flags.indexOf("c") !== -1 || result.flags.indexOf("e") !== -1) {
    soundCapture();
  } else {
    soundMove();
  }

  if (game.in_check()) {
    soundCheck();
  }

  createBoard();

  updateMoveHistory();

  updateCapturedTray();

  updateTurn();

  if (trainerActive && trainerOpening) {
    const expected = trainerOpening.moves[trainerIndex];

    if (
      expected &&
      expected.by === playerColor &&
      expected.san === result.san
    ) {
      showCoachMessage(`📖 ${result.san}`, expected.note);

      trainerIndex++;

      if (game.game_over()) {
        handleGameEnd();

        return;
      }

      trainerStep();

      return;
    }

    trainerActive = false;

    showCoachMessage(
      "Off the book",

      "That's outside today's line — no problem. I'll switch to full move analysis from here.",
    );

    if (game.game_over()) {
      handleGameEnd();

      return;
    }

    setTimeout(() => {
      analyzePlayerDecision(result);

      setTimeout(() => {
        if (!game.game_over()) {
          makeAIMove();
        }
      }, 700);
    }, 900);

    return;
  }

  analyzePlayerDecision(result);

  if (game.game_over()) {
    handleGameEnd();

    return;
  }

  /*
        Let the coach analysis begin,
        then allow the AI to move.
    */

  setTimeout(() => {
    if (!game.game_over()) {
      makeAIMove();
    }
  }, 700);
}

// ======================================================
// HIGHLIGHT MOVES
// ======================================================

function highlightMoves(square) {
  createBoard();

  const legalMoves = game.moves({
    square: square,

    verbose: true,
  });

  const squares = document.querySelectorAll(".square");

  squares.forEach((element) => {
    if (element.dataset.square === square) {
      element.classList.add("selected");
    }
  });

  legalMoves.forEach((move) => {
    squares.forEach((element) => {
      if (element.dataset.square === move.to) {
        element.classList.add(move.captured ? "capture" : "valid");
      }
    });
  });
}

// ======================================================
// CAPTURED PIECES
// ======================================================

function updateCapturedTray() {
  const history = game.history({ verbose: true });

  const byWhite = [];

  const byBlack = [];

  history.forEach((m) => {
    if (m.captured) {
      if (m.color === "w") {
        byWhite.push(m.captured);
      } else {
        byBlack.push(m.captured);
      }
    }
  });

  const order = ["q", "r", "b", "n", "p"];

  byWhite.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  byBlack.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  const byPlayer = playerColor === "w" ? byWhite : byBlack;

  const byOpponent = playerColor === "w" ? byBlack : byWhite;

  const opponentGlyphColor = playerColor === "w" ? "b" : "w";

  const playerGlyphColor = playerColor === "w" ? "w" : "b";

  const playerTray = document.getElementById("capturedByPlayer");

  const aiTray = document.getElementById("capturedByAI");

  if (playerTray) {
    playerTray.innerHTML = byPlayer
      .map((t) => `<span>${pieces[opponentGlyphColor][t]}</span>`)
      .join("");
  }

  if (aiTray) {
    aiTray.innerHTML = byOpponent
      .map((t) => `<span>${pieces[playerGlyphColor][t]}</span>`)
      .join("");
  }

  const sum = (list) => list.reduce((s, t) => s + (PIECE_VALUE[t] || 0), 0);

  const diff = sum(byWhite) - sum(byBlack);

  const diffEl = document.getElementById("materialDiff");

  if (diffEl) {
    diffEl.textContent = diff === 0 ? "" : diff > 0 ? `+${diff}` : `${diff}`;
  }
}

function updateSideAvatars() {
  const playerAvatar = document.querySelector(".player-avatar");

  const aiAvatar = document.querySelector(".ai-avatar");

  const opponent = playerColor === "w" ? "b" : "w";

  if (playerAvatar) {
    playerAvatar.textContent = pieces[playerColor].p;
  }

  if (aiAvatar) {
    aiAvatar.textContent = pieces[opponent].p;
  }
}

// ======================================================
// EVALUATION UI
// ======================================================

function updateEvaluation() {
  const value = document.getElementById("evaluationValue");

  const fill = document.getElementById("evaluationFill");

  if (!value || !fill) {
    return;
  }

  let evaluation = engineEvaluation;

  evaluation = Math.max(-5, Math.min(5, evaluation));

  value.textContent =
    evaluation >= 0 ? "+" + evaluation.toFixed(2) : evaluation.toFixed(2);

  const percentage = 50 + evaluation * 10;

  fill.style.width = `${Math.max(5, Math.min(95, percentage))}%`;
}

// ======================================================
// MOVE HISTORY
// ======================================================

function updateMoveHistory() {
  const history = document.getElementById("moveHistory");

  const count = document.getElementById("moveCount");

  const moves = game.history();

  if (count) {
    count.textContent = `${moves.length} MOVE${moves.length === 1 ? "" : "S"}`;
  }

  if (!history) {
    return;
  }

  if (moves.length === 0) {
    history.innerHTML = `

            <div class="empty-history">
                Game hasn't started yet.
            </div>

        `;

    return;
  }

  history.innerHTML = "";

  for (let i = 0; i < moves.length; i += 2) {
    const row = document.createElement("div");

    row.className = "move-row";

    const whiteTag = moveAnnotations[i]
      ? `<span class="move-tag">${moveAnnotations[i]}</span>`
      : "";

    row.innerHTML = `

            <span class="move-number">
                ${Math.floor(i / 2) + 1}.
            </span>

            <span class="move">
                ${moves[i] || ""}${whiteTag}
            </span>

            <span class="move">
                ${moves[i + 1] || ""}
            </span>

        `;

    history.appendChild(row);
  }

  history.scrollTop = history.scrollHeight;
}

// ======================================================
// TURN
// ======================================================

function updateTurn() {
  const status = document.getElementById("statusPill");

  const hintButton = document.getElementById("hintButton");

  updateDepthIndicator();

  if (status) {
    status.classList.remove("thinking", "in-check");

    if (engineThinking) {
      status.classList.add("thinking");

      status.innerHTML = `

              <span class="status-dot"></span>

              AI THINKING

          `;
    } else if (game.in_check()) {
      status.classList.add("in-check");

      status.innerHTML = `

              <span class="status-dot"></span>

              ${game.turn() === playerColor ? "YOU ARE IN CHECK" : "AI IN CHECK"}

          `;
    } else if (game.turn() === playerColor) {
      status.innerHTML = `

              <span class="status-dot"></span>

              YOUR TURN

          `;
    } else {
      status.innerHTML = `

              <span class="status-dot"></span>

              AI TURN

          `;
    }
  }

  if (hintButton) {
    hintButton.disabled =
      !engineReady ||
      engineThinking ||
      game.turn() !== playerColor ||
      game.game_over() ||
      trainerActive;
  }

  renderChecklist();
}

// ======================================================
// UNDO
// ======================================================

const undoButton = document.getElementById("undoButton");

if (undoButton) {
  undoButton.addEventListener("click", () => {
    if (engine) {
      engine.postMessage("stop");
    }

    engineThinking = false;

    analysisStage = null;

    let wasTraining = false;

    if (trainerActive) {
      trainerActive = false;

      wasTraining = true;
    }

    clearRecommendation();

    closeDialog(document.getElementById("gameOverModal"));

    /*
                Undo AI move.
            */

    if (game.history().length > 0) {
      game.undo();

      delete moveAnnotations[game.history().length];
    }

    /*
                Undo player's move.
            */

    if (game.history().length > 0) {
      game.undo();

      delete moveAnnotations[game.history().length];
    }

    selectedSquare = null;

    lastMove = null;

    engineEvaluation = 0;

    resetAnalysisState();

    createBoard();

    updateMoveHistory();

    updateCapturedTray();

    updateTurn();

    updateEvaluation();

    showCoachMessage(
      wasTraining ? "Training ended" : "Variation reset",

      wasTraining
        ? "Undo isn't tracked during opening training, so I've switched back to free play."
        : "Try another idea. Strong players compare candidate moves before committing.",
    );
  });
}

// ======================================================
// RESET / NEW GAME
// ======================================================

function startNewGame(skipAutoStart) {
  if (engine) {
    engine.postMessage("stop");
  }

  closeDialog(document.getElementById("gameOverModal"));

  trainerActive = false;

  trainerOpening = null;

  trainerIndex = 0;

  game.reset();

  selectedSquare = null;

  lastMove = null;

  engineThinking = false;

  analysisStage = null;

  engineEvaluation = 0;

  moveAnnotations = {};

  flipped = playerColor === "b";

  resetAnalysisState();

  clearRecommendation();

  createBoard();

  updateMoveHistory();

  updateCapturedTray();

  updateSideAvatars();

  updateTurn();

  updateEvaluation();

  showCoachMessage(
    "New game",

    "Your training begins. Control the center, develop your pieces, and get your king safe.",
  );

  if (!skipAutoStart) {
    maybeStartAiFirst();
  }
}

function maybeStartAiFirst() {
  if (trainerActive) {
    return;
  }

  if (!engineReady) {
    return;
  }

  if (game.history().length !== 0) {
    return;
  }

  if (game.turn() === playerColor) {
    return;
  }

  if (game.game_over()) {
    return;
  }

  setTimeout(() => makeAIMove(), 500);
}

const resetButton = document.getElementById("resetButton");

if (resetButton) {
  resetButton.addEventListener("click", startNewGame);
}

const gameOverNewGameButton = document.getElementById("gameOverNewGame");

if (gameOverNewGameButton) {
  gameOverNewGameButton.addEventListener("click", startNewGame);
}

const gameOverReviewButton = document.getElementById("gameOverReview");

if (gameOverReviewButton) {
  gameOverReviewButton.addEventListener("click", () => {
    closeDialog(document.getElementById("gameOverModal"));
  });
}

// ======================================================
// FLIP
// ======================================================

const flipButton = document.getElementById("flipButton");

if (flipButton) {
  flipButton.addEventListener("click", () => {
    flipped = !flipped;

    clearRecommendation();

    createBoard();
  });
}

// ======================================================
// COPY PGN
// ======================================================

const pgnButton = document.getElementById("pgnButton");

if (pgnButton) {
  pgnButton.addEventListener("click", async () => {
    const pgn = game.pgn() || "";

    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(pgn);

      flashButtonLabel(pgnButton, "COPIED");
    } catch (error) {
      flashButtonLabel(pgnButton, "COPY FAILED");
    }
  });
}

function flashButtonLabel(button, text) {
  const span = button.querySelector("span");

  if (!span) {
    return;
  }

  const original = span.textContent;

  span.textContent = text;

  setTimeout(() => {
    span.textContent = original;
  }, 1200);
}

// ======================================================
// HINT
// ======================================================

const hintButton = document.getElementById("hintButton");

if (hintButton) {
  hintButton.addEventListener("click", () => {
    if (trainerActive) {
      return;
    }

    if (!engineReady) {
      showCoachMessage("Engine loading", "The chess engine isn't ready yet.");

      return;
    }

    if (engineThinking) {
      return;
    }

    if (game.game_over()) {
      return;
    }

    engineThinking = true;

    analysisStage = "hint";

    deepestDepth = -1;

    showCoachMessage(
      "Calculating hint...",

      "Think first. I'm searching for the strongest candidate move.",
    );

    configureEngineFullStrength();

    engine.postMessage("stop");

    engine.postMessage(`position fen ${game.fen()}`);

    engine.postMessage(`go depth ${ANALYSIS_DEPTH}`);

    updateTurn();
  });
}

// ======================================================
// DISPLAY HINT
// ======================================================

function displayHint(uciMove) {
  const from = uciMove.substring(0, 2);

  const to = uciMove.substring(2, 4);

  const readable = convertUCIMoveToReadable(uciMove, game.fen());

  const verboseMoves = game.moves({ square: from, verbose: true });

  const matching = verboseMoves.find((m) => m.to === to);

  let purpose = "";

  if (matching) {
    if (matching.captured) {
      purpose = `It wins material by capturing on ${to.toUpperCase()}. `;
    } else if (matching.san.endsWith("+") || matching.san.endsWith("#")) {
      purpose = "It's a forcing check that limits your opponent's options. ";
    } else {
      const wasHanging = findHangingPieces(playerColor).some(
        (h) => h.square === from,
      );

      purpose = wasHanging
        ? "It rescues a piece that was under attack. "
        : "It improves your position without any immediate tactic. ";
    }
  }

  showRecommendation(from, to);

  showCoachMessage(
    "💡 Coach hint",

    `
            My strongest candidate is
            <strong>${readable}</strong>.

            <br><br>

            ${purpose}Don't play it automatically.

            <br><br>

            <b>Ask yourself:</b><br>

            What is this move trying to accomplish?

            <br><br>

            Then calculate your opponent's
            strongest response.

        `,
  );
}

// ======================================================
// GAME END
// ======================================================

function handleGameEnd() {
  let tag = "GAME OVER";

  let title = "Game Over";

  let message = "";

  let coachTitle = "";

  let coachBody = "";

  let won = false;

  let over = true;

  if (game.in_checkmate()) {
    if (game.turn() === "b") {
      won = true;

      tag = "VICTORY";

      title = "Checkmate — You Win";

      message =
        "You found a full point. Go back through the critical moments and see which decision made this possible.";

      coachTitle = "♔ Checkmate — you win";

      coachBody =
        "Excellent. Don't stop at the result. Review the decisions that created the winning position.";
    } else {
      tag = "DEFEAT";

      title = "Checkmate";

      message =
        "The engine found a mating attack. Look back through the move history for the moment the position turned.";

      coachTitle = "♟ Checkmate";

      coachBody =
        "The game is over. Find the first important decision where the position changed, and ask what you'd do differently.";
    }
  } else if (game.in_stalemate()) {
    tag = "DRAW";

    title = "Stalemate";

    message =
      "Neither side can claim the point. Stalemate is often a missed win — check if there was a cleaner path.";

    coachTitle = "Stalemate";

    coachBody =
      "The game is drawn by stalemate. If you were ahead, look for where you could have left your opponent a legal move into trouble instead.";
  } else if (game.in_threefold_repetition()) {
    tag = "DRAW";

    title = "Draw by Repetition";

    message =
      "The same position occurred three times. Sometimes that's the right result — sometimes it's a missed try.";

    coachTitle = "Draw by repetition";

    coachBody =
      "The position repeated three times. Drawn games can still contain real lessons — look for the moment a sharper try was available.";
  } else if (game.insufficient_material()) {
    tag = "DRAW";

    title = "Draw — Insufficient Material";

    message =
      "Neither side has enough material left on the board to force checkmate.";

    coachTitle = "Draw — insufficient material";

    coachBody =
      "There isn't enough material left for either side to force mate. Review how the material got traded down.";
  } else if (game.in_draw()) {
    tag = "DRAW";

    title = "Draw";

    message = "The game ended in a draw.";

    coachTitle = "Draw";

    coachBody =
      "The game ended in a draw. Drawn games can still contain major tactical and strategic lessons.";
  } else {
    over = false;
  }

  if (!over) {
    return;
  }

  showCoachMessage(coachTitle, coachBody);

  soundGameEnd(won);

  const tagEl = document.getElementById("gameOverTag");

  const titleEl = document.getElementById("gameOverTitle");

  const msgEl = document.getElementById("gameOverMessage");

  if (tagEl) {
    tagEl.textContent = tag;
  }

  if (titleEl) {
    titleEl.textContent = title;
  }

  if (msgEl) {
    msgEl.textContent = message;
  }

  showDialog(document.getElementById("gameOverModal"));

  updateTurn();
}

// ======================================================
// COACH MESSAGE
// ======================================================

function showCoachMessage(title, message, tacticalNote) {
  const coach = document.getElementById("coachMessage");

  if (!coach) {
    return;
  }

  const noteHtml = tacticalNote
    ? `<div class="coach-tactical-note ${tacticalNote.severity}">${tacticalNote.text}</div>`
    : "";

  coach.innerHTML = `

        <div class="message-label">
            COACH
        </div>

        <h3>
            ${title}
        </h3>

        <p>
            ${message}
        </p>

        ${noteHtml}

    `;
}

// ======================================================
// PROMOTION MODAL
// ======================================================

document.querySelectorAll(".promotion-choice").forEach((button) => {
  button.addEventListener("click", () => {
    const piece = button.dataset.piece;

    closeDialog(document.getElementById("promotionModal"));

    if (promotionResolve) {
      const resolve = promotionResolve;

      promotionResolve = null;

      resolve(piece);
    }
  });
});

const promotionModalEl = document.getElementById("promotionModal");

if (promotionModalEl) {
  promotionModalEl.addEventListener("close", () => {
    if (promotionResolve) {
      const resolve = promotionResolve;

      promotionResolve = null;

      resolve("q");
    }
  });

  promotionModalEl.addEventListener("cancel", (event) => {
    event.preventDefault();
  });
}

// ======================================================
// SETTINGS MODAL
// ======================================================

const settingsButton = document.getElementById("settingsButton");

const settingsModal = document.getElementById("settingsModal");

const settingsClose = document.getElementById("settingsClose");

if (settingsButton) {
  settingsButton.addEventListener("click", () => showDialog(settingsModal));
}

if (settingsClose) {
  settingsClose.addEventListener("click", () => closeDialog(settingsModal));
}

document.querySelectorAll(".skill-option").forEach((button) => {
  button.addEventListener("click", () => {
    setSkill(button.dataset.skill);
  });
});

function setSkill(key) {
  if (!SKILL_LEVELS[key]) {
    return;
  }

  currentSkill = key;

  try {
    localStorage.setItem("chesscoach_skill", key);
  } catch (error) {
    /* best effort only */
  }

  updateSkillUI();
}

function updateSkillUI() {
  document.querySelectorAll(".skill-option").forEach((btn) => {
    const active = btn.dataset.skill === currentSkill;

    btn.setAttribute("aria-checked", active ? "true" : "false");
  });

  const label = document.getElementById("difficultyLabel");

  if (label) {
    label.textContent = SKILL_LEVELS[currentSkill].label.toUpperCase();
  }
}

// ======================================================
// PLAY AS WHITE / BLACK
// ======================================================

document.querySelectorAll(".color-option").forEach((button) => {
  button.addEventListener("click", () => {
    const choice = button.dataset.color;

    const color =
      choice === "random" ? (Math.random() < 0.5 ? "w" : "b") : choice;

    setPlayerColor(color);

    closeDialog(settingsModal);

    startNewGame();
  });
});

function setPlayerColor(color) {
  if (color !== "w" && color !== "b") {
    return;
  }

  playerColor = color;

  try {
    localStorage.setItem("chesscoach_color", color);
  } catch (error) {
    /* best effort only */
  }

  updateColorUI();

  updateSideAvatars();
}

function updateColorUI() {
  document.querySelectorAll(".color-option").forEach((btn) => {
    const isColorButton =
      btn.dataset.color === "w" || btn.dataset.color === "b";

    btn.setAttribute(
      "aria-checked",
      isColorButton && btn.dataset.color === playerColor ? "true" : "false",
    );
  });
}

// ======================================================
// OPENING TRAINER MODAL
// ======================================================

const openingsButton = document.getElementById("openingsButton");

const openingsModal = document.getElementById("openingsModal");

const openingsClose = document.getElementById("openingsClose");

if (openingsButton) {
  openingsButton.addEventListener("click", () => showDialog(openingsModal));
}

if (openingsClose) {
  openingsClose.addEventListener("click", () => closeDialog(openingsModal));
}

function buildOpeningCard(opening) {
  const button = document.createElement("button");

  button.className = "opening-card";

  button.type = "button";

  button.innerHTML = `
    <strong>${opening.name}</strong>
    <span class="opening-tag">${opening.tag}${opening.versusTag ? " · " + opening.versusTag : ""}</span>
    <span class="opening-summary">${opening.summary}</span>
  `;

  button.addEventListener("click", () => {
    closeDialog(openingsModal);

    startOpeningTrainer(opening);
  });

  return button;
}

function renderOpeningsList() {
  const whiteList = document.getElementById("openingsWhiteList");

  const blackList = document.getElementById("openingsBlackList");

  if (whiteList) {
    whiteList.innerHTML = "";

    OPENINGS.w.forEach((opening) =>
      whiteList.appendChild(buildOpeningCard(opening)),
    );
  }

  if (blackList) {
    blackList.innerHTML = "";

    OPENINGS.b.forEach((opening) =>
      blackList.appendChild(buildOpeningCard(opening)),
    );
  }
}

// ======================================================
// SOUND TOGGLE
// ======================================================

const soundToggle = document.getElementById("soundToggle");

if (soundToggle) {
  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    soundToggle.setAttribute("aria-pressed", soundEnabled ? "true" : "false");

    try {
      localStorage.setItem("chesscoach_sound", soundEnabled ? "1" : "0");
    } catch (error) {
      /* best effort only */
    }

    if (soundEnabled) {
      primeAudio();

      playTone(440, 0.08, "triangle", 0.04);
    }
  });
}

// ======================================================
// START APPLICATION
// ======================================================

loadSettings();

updateSkillUI();

updateColorUI();

flipped = playerColor === "b";

if (soundToggle) {
  soundToggle.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
}

renderOpeningsList();

createBoard();

updateMoveHistory();

updateCapturedTray();

updateSideAvatars();

updateTurn();

updateEvaluation();

initializeEngine();
