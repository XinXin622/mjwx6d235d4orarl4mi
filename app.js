const view = document.getElementById("view");
const storageKey = "almaMiniGameScores";

const levels = [
  { name: "简单", lo: 1, hi: 50, tries: 8 },
  { name: "普通", lo: 1, hi: 100, tries: 8 },
  { name: "困难", lo: 1, hi: 200, tries: 7 },
  { name: "地狱", lo: 1, hi: 500, tries: 7 },
];

const memoryLevels = [
  { name: "入门", pairs: 6, cols: 3 },      // 12 cards, 3x4
  { name: "简单", pairs: 8, cols: 4 },      // 16 cards, 4x4
  { name: "中等", pairs: 12, cols: 4 },     // 24 cards, 4x6
  { name: "困难", pairs: 18, cols: 6 },     // 36 cards, 6x6
];

// Memory card icons (using emoji for simplicity, styled with CSS)
const memoryIcons = ['⚡', '⭐', '🎮', '🏆', '💎', '🔥', '🌟', '🎯', '🚀', '💫', '🔮', '👑', '🎪', '🎨', '🎭', '🎪'];

const rpsOptions = ["石头", "剪刀", "布"];
const rpsSlugMap = { 石头: "rock", 剪刀: "scissors", 布: "paper" };

const state = {
  view: "menu",
  scores: loadScores(),
  guess: null,
  rps: null,
  reaction: null,
  reactionNotice: "",
  memory: null,
  timers: [],
};

view.addEventListener("click", (event) => {
  const base = event.target instanceof Element ? event.target : event.target.parentElement;
  const target = base ? base.closest("[data-action]") : null;
  if (!target) return;
  handleAction(target.dataset.action, target);
});

view.addEventListener("submit", (event) => {
  const form = event.target;
  if (form.dataset.form === "guess") {
    event.preventDefault();
    const input = form.querySelector("input[name='guess']");
    handleGuessSubmit(input ? input.value : "");
  }
});

render();

function handleAction(action, target) {
  switch (action) {
    case "menu":
      setView("menu");
      break;
    case "guess-select":
      setView("guess-select");
      break;
    case "guess-start":
      startGuess(Number(target.dataset.level));
      break;
    case "guess-giveup":
      setView("guess-select");
      break;
    case "guess-retry":
      if (state.guess) startGuess(state.guess.levelIndex);
      break;
    case "rps":
      startRps();
      break;
    case "rps-play":
      playRps(target.dataset.choice);
      break;
    case "reaction-setup":
      setView("reaction-setup");
      break;
    case "reaction-start":
      startReactionFromInput();
      break;
    case "reaction-main":
      reactionMain();
      break;
    case "reaction-retry":
      setView("reaction-setup");
      break;
    case "memory-select":
      setView("memory-select");
      break;
    case "memory-start":
      startMemory(Number(target.dataset.level));
      break;
    case "memory-flip":
      flipMemoryCard(Number(target.dataset.index));
      break;
    case "memory-retry":
      if (state.memory) startMemory(state.memory.levelIndex);
      break;
    case "scores":
      setView("scores");
      break;
    default:
      break;
  }
}

function setView(name) {
  clearTimers();
  state.view = name;
  render();
}

function clearTimers() {
  state.timers.forEach((id) => clearTimeout(id));
  state.timers = [];
  if (state.reaction && state.reaction.waitTimer) {
    clearTimeout(state.reaction.waitTimer);
    state.reaction.waitTimer = null;
  }
}

function render() {
  switch (state.view) {
    case "menu":
      renderMenu();
      break;
    case "guess-select":
      renderGuessSelect();
      break;
    case "guess-play":
      renderGuessPlay();
      break;
    case "rps":
      renderRps();
      break;
    case "reaction-setup":
      renderReactionSetup();
      break;
    case "reaction-play":
      renderReactionPlay();
      break;
    case "memory-select":
      renderMemorySelect();
      break;
    case "memory-play":
      renderMemoryPlay();
      break;
    case "scores":
      renderScores();
      break;
    default:
      renderMenu();
      break;
  }
}

function renderMenu() {
  const highlights = buildScoreHighlights();
  view.innerHTML = `
    <section class="panel">
      <h2>主菜单</h2>
      <p>选择小游戏，保持原版规则，再加一点新味道。</p>
      <div class="menu-grid">
        <button class="card-btn" data-action="guess-select" style="--delay: 0s">
          <span class="tag">01</span>
          <div class="title">猜数字</div>
          <div class="meta">范围推理 + 次数挑战</div>
        </button>
        <button class="card-btn" data-action="rps" style="--delay: 0.05s">
          <span class="tag">02</span>
          <div class="title">石头剪刀布</div>
          <div class="meta">即时对决，追踪战绩</div>
        </button>
        <button class="card-btn" data-action="reaction-setup" style="--delay: 0.1s">
          <span class="tag">03</span>
          <div class="title">反应测试</div>
          <div class="meta">GO! 出现就点</div>
        </button>
        <button class="card-btn" data-action="memory-select" style="--delay: 0.15s">
          <span class="tag">04</span>
          <div class="title">记忆翻牌</div>
          <div class="meta">配对记忆 + 速度挑战</div>
        </button>
        <button class="card-btn" data-action="scores" style="--delay: 0.2s">
          <span class="tag">05</span>
          <div class="title">查看记录</div>
          <div class="meta">浏览器本地记录</div>
        </button>
      </div>
    </section>
    <section class="panel">
      <h2>速览</h2>
      ${highlights}
    </section>
  `;
}

function buildScoreHighlights() {
  const entries = [];
  const reaction = state.scores["reaction:best_seconds"];
  if (typeof reaction === "number") {
    entries.push(`最快反应：${formatSeconds(reaction)}`);
  }
  levels.forEach((level) => {
    const key = `guess_number:${level.name}`;
    const record = state.scores[key];
    if (record && typeof record === "object") {
      entries.push(`${level.name}：${record.attempts} 次 / ${record.seconds}s`);
    }
  });
  if (!entries.length) {
    return "<p>暂无记录，先来一局热热身。</p>";
  }
  return `<ul>${entries.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function renderGuessSelect() {
  view.innerHTML = `
    <section class="panel">
      <h2>选择难度</h2>
      <p>范围越大，试错越刺激。</p>
      <div class="menu-grid">
        ${levels
          .map(
            (level, index) => `
          <button class="card-btn" data-action="guess-start" data-level="${index}" style="--delay: ${index * 0.05}s">
            <span class="tag">${level.name}</span>
            <div class="title">${level.lo} - ${level.hi}</div>
            <div class="meta">次数：${level.tries}</div>
          </button>
        `
          )
          .join("")}
      </div>
      <div class="action-row">
        <button class="btn ghost" data-action="menu">返回主菜单</button>
      </div>
    </section>
  `;
}

function startGuess(levelIndex) {
  const level = levels[levelIndex];
  if (!level) return;
  state.guess = {
    levelIndex,
    level,
    target: randInt(level.lo, level.hi),
    used: [],
    startTime: performance.now(),
    narrowedLo: level.lo,
    narrowedHi: level.hi,
    attempts: 0,
    logs: [],
    notice: "",
    shouldScroll: false,
    finished: false,
    won: false,
  };
  setView("guess-play");
}

function renderGuessPlay() {
  const g = state.guess;
  if (!g) {
    setView("guess-select");
    return;
  }
  const triesLeft = g.level.tries - g.attempts;
  const range = calcRangePercent(g.narrowedLo, g.narrowedHi, g.level.lo, g.level.hi);
  const usedText = g.used.length ? g.used.slice(-8).join(", ") : "（无）";
  const logItems = g.logs.length ? g.logs.map((log) => `<li>${log}</li>`).join("") : "<li>输入你的猜测开始。</li>";

  view.innerHTML = `
    <section class="panel">
      <h2>猜数字 - ${g.level.name}</h2>
      <div class="status-grid">
        <div class="status-card">
          <div class="label">范围</div>
          <div class="value">${g.level.lo} - ${g.level.hi}</div>
        </div>
        <div class="status-card">
          <div class="label">建议范围</div>
          <div class="value">${g.narrowedLo} - ${g.narrowedHi}</div>
        </div>
        <div class="status-card">
          <div class="label">剩余次数</div>
          <div class="value">${triesLeft}</div>
        </div>
        <div class="status-card">
          <div class="label">已猜</div>
          <div class="value">${usedText}</div>
        </div>
      </div>
      <div class="range-bar" role="img" aria-label="建议范围 ${g.narrowedLo} 到 ${g.narrowedHi}" style="--start: ${range.start}%; --end: ${range.end}%;">
        <div class="range-bar__window"></div>
      </div>
      <div class="log"><ul>${logItems}</ul></div>
      ${renderGuessControls(g)}
    </section>
  `;

  const logBox = view.querySelector(".log");
  if (g.shouldScroll && logBox) {
    logBox.scrollTop = logBox.scrollHeight;
    g.shouldScroll = false;
  }

  if (!g.finished) {
    const input = view.querySelector("input[name='guess']");
    if (input) input.focus();
  }
}

function renderGuessControls(g) {
  if (g.finished) {
    return `
      <div class="action-row">
        <button class="btn primary" data-action="guess-retry">再来一局</button>
        <button class="btn ghost" data-action="guess-select">返回难度</button>
        <button class="btn ghost" data-action="menu">回主菜单</button>
      </div>
    `;
  }

  return `
    <form class="input-row" data-form="guess">
      <input type="number" name="guess" min="${g.level.lo}" max="${g.level.hi}" placeholder="输入数字" required>
      <button class="btn primary" type="submit">提交</button>
      <button class="btn ghost" type="button" data-action="guess-giveup">放弃本局</button>
    </form>
    ${g.notice ? `<div class="notice">${g.notice}</div>` : ""}
  `;
}

function handleGuessSubmit(raw) {
  const g = state.guess;
  if (!g || g.finished) return;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    g.notice = "请输入整数。";
    render();
    return;
  }
  if (value < g.level.lo || value > g.level.hi) {
    g.notice = `请输入 ${g.level.lo}-${g.level.hi} 之间的数字。`;
    render();
    return;
  }
  g.notice = "";
  g.attempts += 1;
  g.used.push(value);

  if (value === g.target) {
    const duration = (performance.now() - g.startTime) / 1000;
    g.logs.push(`猜对了！答案是 ${g.target}`);
    g.logs.push(`用时：${duration.toFixed(2)}s`);
    g.logs.push(`次数：${g.attempts}`);
    const isRecord = recordBestGuessScore(g.level.name, g.attempts, duration);
    if (isRecord) g.logs.push("新纪录！");
    g.shouldScroll = true;
    g.finished = true;
    g.won = true;
    render();
    return;
  }

  if (value < g.target) {
    g.logs.push("太小了。");
    g.narrowedLo = Math.max(g.narrowedLo, value + 1);
  } else {
    g.logs.push("太大了。");
    g.narrowedHi = Math.min(g.narrowedHi, value - 1);
  }

  g.logs.push(`位置：${value}（${formatRangePercent(value, g.level.lo, g.level.hi)}）`);
  if (g.narrowedLo <= g.narrowedHi) {
    const mid = Math.floor((g.narrowedLo + g.narrowedHi) / 2);
    g.logs.push(`建议范围中点：${mid}（${formatRangePercent(mid, g.level.lo, g.level.hi)}）`);
  }

  if (g.attempts >= g.level.tries) {
    g.logs.push(`次数用完了！答案是 ${g.target}。`);
    g.finished = true;
    g.won = false;
  }

  g.shouldScroll = true;
  render();
}

function startRps() {
  if (!state.rps) {
    state.rps = {
      scores: { win: 0, lose: 0, draw: 0 },
      history: [],
      last: null,
    };
  }
  setView("rps");
}

function rpsSlug(choice) {
  return rpsSlugMap[choice] || "unknown";
}

function rpsOutcomeClass(outcome) {
  if (outcome === "你赢了") return "is-win";
  if (outcome === "你输了") return "is-lose";
  return "is-draw";
}

function rpsWinner(outcome) {
  if (outcome === "你赢了") return "you";
  if (outcome === "你输了") return "bot";
  return "draw";
}

function renderRpsIcon(choice, className = "") {
  const slug = rpsSlug(choice);
  const extra = className ? ` ${className}` : "";
  switch (slug) {
    case "rock":
      return `<svg class="rps-icon${extra}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M16 30c0-8 6-14 14-14h4c8 0 14 6 14 14v8c0 8-6 14-14 14H30c-8 0-14-6-14-14v-8z" fill="currentColor"/>
        <path d="M22 26c4-6 14-8 20-3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
      </svg>`;
    case "scissors":
      return `<svg class="rps-icon${extra}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="20" cy="22" r="7" fill="none" stroke="currentColor" stroke-width="3"/>
        <circle cx="44" cy="22" r="7" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M24 28l16 18M40 28L24 46" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
    case "paper":
      return `<svg class="rps-icon${extra}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M18 12h22l8 8v32H18z" fill="currentColor" opacity="0.9"/>
        <path d="M40 12v8h8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
      </svg>`;
    default:
      return "";
  }
}

function renderRpsCard(role, choice, outcome) {
  const hasChoice = Boolean(choice);
  const slug = hasChoice ? rpsSlug(choice) : "unknown";
  const label = hasChoice ? choice : "等待出拳";
  const winner = outcome ? rpsWinner(outcome) : "";
  const isWinner = winner === role;
  const isLoser = winner && winner !== "draw" && winner !== role;
  const resultClass = isWinner ? "is-winner" : isLoser ? "is-loser" : "";
  const badge = isWinner
    ? '<div class="rps-badge is-win">WIN</div>'
    : isLoser
    ? '<div class="rps-badge is-lose">LOSE</div>'
    : "";
  const cardClass = `rps-card rps-card--${role} ${hasChoice ? `rps-choice--${slug}` : "is-idle"} ${resultClass}`.trim();
  const icon = hasChoice ? renderRpsIcon(choice) : '<div class="rps-placeholder">?</div>';
  return `
    <div class="${cardClass}">
      ${badge}
      ${icon}
      <div class="rps-card-label">${label}</div>
    </div>
  `;
}

function renderRpsButtons(selectedChoice) {
  return rpsOptions
    .map((choice) => {
      const slug = rpsSlug(choice);
      const selectedClass = choice === selectedChoice ? "is-selected" : "";
      return `
        <button class="rps-btn rps-choice--${slug} ${selectedClass}" data-action="rps-play" data-choice="${choice}">
          ${renderRpsIcon(choice, "rps-btn-icon")}
          <span>${choice}</span>
        </button>
      `;
    })
    .join("");
}

function renderRps() {
  const rps = state.rps || { scores: { win: 0, lose: 0, draw: 0 }, history: [], last: null };
  const historyItems = rps.history.length
    ? rps.history.slice(-6).map((item) => `<li>${item}</li>`).join("")
    : "<li>暂无对局</li>";
  const lastMatch = rps.last
    ? `你：${rps.last.you} / 我：${rps.last.bot} → ${rps.last.outcome}`
    : "准备出拳吧。";
  const outcome = rps.last ? rps.last.outcome : "";
  const outcomeClass = outcome ? rpsOutcomeClass(outcome) : "";
  const stageClass = `rps-stage ${rps.last ? "is-active" : "is-idle"} ${outcomeClass}`.trim();
  const resultClass = `rps-result ${rps.last ? outcomeClass : "is-idle"}`.trim();
  const resultText = outcome || "出拳后显示结果";

  view.innerHTML = `
    <section class="panel">
      <h2>石头剪刀布</h2>
      <div class="${stageClass}">
        <div class="rps-side">
          <div class="rps-label">你</div>
          ${renderRpsCard("you", rps.last ? rps.last.you : "", outcome)}
        </div>
        <div class="rps-vs">VS</div>
        <div class="rps-side">
          <div class="rps-label">系统</div>
          ${renderRpsCard("bot", rps.last ? rps.last.bot : "", outcome)}
        </div>
      </div>
      <div class="${resultClass}">${resultText}</div>
      <div class="rps-grid">
        ${renderRpsButtons(rps.last ? rps.last.you : "")}
      </div>
      <div class="score-row">
        <div class="score-pill">胜 ${rps.scores.win}</div>
        <div class="score-pill">负 ${rps.scores.lose}</div>
        <div class="score-pill">平 ${rps.scores.draw}</div>
        <div class="score-pill">最新：${lastMatch}</div>
      </div>
      <div class="log"><ul>${historyItems}</ul></div>
      <div class="action-row">
        <button class="btn ghost" data-action="menu">返回主菜单</button>
      </div>
    </section>
  `;
}


function playRps(choice) {
  const options = rpsOptions;
  if (!options.includes(choice)) return;
  if (!state.rps) {
    state.rps = { scores: { win: 0, lose: 0, draw: 0 }, history: [], last: null };
  }
  const bot = options[randInt(0, options.length - 1)];
  const winAgainst = { 石头: "剪刀", 剪刀: "布", 布: "石头" };

  let outcome = "平局";
  if (choice === bot) {
    outcome = "平局";
    state.rps.scores.draw += 1;
  } else if (winAgainst[choice] === bot) {
    outcome = "你赢了";
    state.rps.scores.win += 1;
  } else {
    outcome = "你输了";
    state.rps.scores.lose += 1;
  }

  state.rps.last = { you: choice, bot, outcome };
  state.rps.history.push(`${choice} vs ${bot} → ${outcome}`);
  if (state.rps.history.length > 6) {
    state.rps.history = state.rps.history.slice(-6);
  }
  render();
}

function renderReactionSetup() {
  view.innerHTML = `
    <section class="panel">
      <h2>反应测试</h2>
      <p>看到 GO! 就立刻点击。提前点击会算犯规。</p>
      <div class="input-row">
        <input type="number" id="reaction-rounds" min="1" max="10" value="5" aria-label="轮数">
        <button class="btn primary" data-action="reaction-start">开始测试</button>
        <button class="btn ghost" data-action="menu">返回主菜单</button>
      </div>
      ${state.reactionNotice ? `<div class="notice">${state.reactionNotice}</div>` : ""}
    </section>
  `;
}

function startReactionFromInput() {
  const input = document.getElementById("reaction-rounds");
  const value = Number(input ? input.value : 0);
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    state.reactionNotice = "请输入 1-10 的整数。";
    render();
    return;
  }
  state.reactionNotice = "";
  initReaction(value);
  setView("reaction-play");
}

function initReaction(rounds) {
  state.reaction = {
    rounds,
    current: 0,
    times: [],
    fouls: 0,
    status: "idle",
    message: "点击开始本回合",
    lastResult: "",
    waitTimer: null,
    waitStart: 0,
    goTime: 0,
  };
}

function renderReactionPlay() {
  const r = state.reaction;
  if (!r) {
    setView("reaction-setup");
    return;
  }

  let buttonClass = "reaction-button";
  if (r.status === "waiting") buttonClass += " waiting";
  if (r.status === "go") buttonClass += " go";

  const mainAction = r.status === "done" ? "reaction-retry" : "reaction-main";
  const mainLabel = r.status === "done" ? "再测一次" : reactionButtonLabel(r.status);
  const summary = r.status === "done" ? renderReactionSummary(r) : "";

  view.innerHTML = `
    <section class="panel">
      <h2>反应测试</h2>
      <div class="status-grid">
        <div class="status-card">
          <div class="label">回合</div>
          <div class="value">${Math.min(r.current + 1, r.rounds)} / ${r.rounds}</div>
        </div>
        <div class="status-card">
          <div class="label">有效次数</div>
          <div class="value">${r.times.length}</div>
        </div>
        <div class="status-card">
          <div class="label">犯规</div>
          <div class="value">${r.fouls}</div>
        </div>
      </div>
      <div class="reaction-pad" style="margin-top: 16px;">
        <div class="reaction-status">${r.message}</div>
        <button class="${buttonClass}" data-action="${mainAction}">${mainLabel}</button>
        ${r.lastResult ? `<div class="log" style="margin-top: 16px;"><ul><li>${r.lastResult}</li></ul></div>` : ""}
      </div>
      ${summary}
      <div class="action-row">
        <button class="btn ghost" data-action="menu">返回主菜单</button>
      </div>
    </section>
  `;
}

function reactionButtonLabel(status) {
  switch (status) {
    case "idle":
      return "开始本回合";
    case "waiting":
      return "等待 GO!";
    case "go":
      return "现在点击";
    case "result":
      return "下一回合";
    case "done":
      return "再测一次";
    default:
      return "开始";
  }
}

function reactionMain() {
  const r = state.reaction;
  if (!r) return;

  if (r.status === "idle") {
    beginReactionWait();
    return;
  }

  if (r.status === "waiting") {
    handleReactionFoul("犯规 - 你可能在 GO! 前就按了。", true);
    return;
  }

  if (r.status === "go") {
    const dt = (performance.now() - r.goTime) / 1000;
    if (dt < 0.08) {
      handleReactionFoul(`犯规（${Math.round(dt * 1000)}ms）- 你可能在 GO! 前就按了。`, false);
    } else {
      r.times.push(dt);
      r.lastResult = `第 ${r.current + 1} 回合：${Math.round(dt * 1000)}ms`;
      r.current += 1;
      r.status = r.current >= r.rounds ? "done" : "result";
      r.message = r.status === "done" ? "完成" : "回合结束";
      if (r.status === "done") finalizeReaction(r);
    }
    render();
    return;
  }

  if (r.status === "result") {
    r.status = "idle";
    r.message = "点击开始本回合";
    r.lastResult = "";
    render();
  }
}

function beginReactionWait() {
  const r = state.reaction;
  if (!r) return;
  r.status = "waiting";
  r.message = "准备...等待 GO!";
  r.lastResult = "";
  r.waitStart = performance.now();

  const delay = randInt(1500, 4000);
  r.waitTimer = setTimeout(() => {
    r.status = "go";
    r.message = "GO!";
    r.goTime = performance.now();
    r.waitTimer = null;
    render();
  }, delay);
  state.timers.push(r.waitTimer);
  render();
}

function handleReactionFoul(message, early) {
  const r = state.reaction;
  if (!r) return;
  if (r.waitTimer) {
    clearTimeout(r.waitTimer);
    r.waitTimer = null;
  }
  r.fouls += 1;
  r.lastResult = message;
  r.current += 1;
  r.status = r.current >= r.rounds ? "done" : "result";
  r.message = early ? "提前点击" : "犯规";
  if (r.status === "done") finalizeReaction(r);
  render();
}

function renderReactionSummary(r) {
  if (!r.times.length) {
    return `
      <div class="panel" style="margin-top: 16px;">
        <h2>结果</h2>
        <p>没有有效成绩（犯规 ${r.fouls}）。</p>
      </div>
    `;
  }

  const best = Math.min(...r.times);
  const avg = r.times.reduce((sum, t) => sum + t, 0) / r.times.length;
  const perRound = r.times
    .slice(0, 8)
    .map((t, i) => `<li>第${i + 1}次：${Math.round(t * 1000)}ms</li>`)
    .join("");

  return `
    <div class="panel" style="margin-top: 16px;">
      <h2>结果</h2>
      <div class="result-grid">
        <div class="status-card">
          <div class="label">有效次数</div>
          <div class="value">${r.times.length} / ${r.rounds}</div>
        </div>
        <div class="status-card">
          <div class="label">犯规</div>
          <div class="value">${r.fouls}</div>
        </div>
        <div class="status-card">
          <div class="label">最快</div>
          <div class="value">${Math.round(best * 1000)}ms</div>
        </div>
        <div class="status-card">
          <div class="label">平均</div>
          <div class="value">${Math.round(avg * 1000)}ms</div>
        </div>
      </div>
      <div class="log" style="margin-top: 12px;"><ul>${perRound}</ul></div>
    </div>
  `;
}

function finalizeReaction(r) {
  if (!r.times.length) return;
  const best = Math.min(...r.times);
  recordBestReaction(best);
}

function renderScores() {
  const entries = Object.entries(state.scores).sort((a, b) => a[0].localeCompare(b[0]));
  const lines = entries.length
    ? entries
        .map(([key, value]) => `<li><span class="badge">${key}</span> ${formatScoreValue(value)}</li>`)
        .join("")
    : "<li>暂无记录。</li>";

  view.innerHTML = `
    <section class="panel">
      <h2>本地记录</h2>
      <div class="log"><ul>${lines}</ul></div>
      <div class="action-row">
        <button class="btn ghost" data-action="menu">返回主菜单</button>
      </div>
    </section>
  `;
}

function recordBestGuessScore(levelName, attempts, seconds) {
  const key = `guess_number:${levelName}`;
  const current = { attempts, seconds: round(seconds, 3) };
  const existing = state.scores[key];
  let better = true;

  if (existing && typeof existing === "object") {
    const bestAttempts = Number(existing.attempts);
    const bestSeconds = Number(existing.seconds);
    if (Number.isFinite(bestAttempts) && Number.isFinite(bestSeconds)) {
      better = attempts < bestAttempts || (attempts === bestAttempts && seconds < bestSeconds);
    }
  }

  if (better) {
    state.scores[key] = current;
    saveScores();
  }

  return better;
}

function recordBestReaction(bestSeconds) {
  const key = "reaction:best_seconds";
  const existing = state.scores[key];
  if (typeof existing === "number" && bestSeconds >= existing) {
    return false;
  }
  state.scores[key] = round(bestSeconds, 4);
  saveScores();
  return true;
}

function formatScoreValue(value) {
  if (value && typeof value === "object") {
    return `次数 ${value.attempts} / ${value.seconds}s`;
  }
  if (typeof value === "number") {
    return `${value}s`;
  }
  return String(value);
}

function formatSeconds(seconds) {
  return `${seconds.toFixed(3)}s`;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function randInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function calcRangePercent(start, end, lo, hi) {
  if (hi <= lo) {
    return { start: 0, end: 100 };
  }
  const safeStart = Math.min(Math.max(start, lo), hi);
  const safeEnd = Math.min(Math.max(end, lo), hi);
  const range = hi - lo;
  const startPct = round(((safeStart - lo) / range) * 100, 2);
  const endPct = round(((safeEnd - lo) / range) * 100, 2);
  return { start: Math.min(startPct, endPct), end: Math.max(startPct, endPct) };
}

function formatRangePercent(value, lo, hi) {
  if (hi <= lo) {
    return "0%";
  }
  const safeValue = Math.min(Math.max(value, lo), hi);
  const percent = Math.round(((safeValue - lo) / (hi - lo)) * 100);
  return `${percent}%`;
}

function loadScores() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveScores() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state.scores));
  } catch (error) {
    // Ignore storage failures
  }
}

/* ============================================
   ARCADE SCENES - Dynamic Game Animations
   ============================================ */

// Scene templates with their HTML structures
const sceneTemplates = {
  'scene-pacman': `
    <div class="maze"></div>
    <div class="pacman"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="ghost"></div>
  `,
  'scene-invaders': `
    <div class="stars"></div>
    <div class="invader-row">
      <div class="invader"></div>
      <div class="invader"></div>
      <div class="invader"></div>
      <div class="invader"></div>
    </div>
    <div class="laser"></div>
    <div class="ship"></div>
    <div class="explosion"></div>
  `,
  'scene-tetris': `
    <div class="grid"></div>
    <div class="falling-piece"></div>
    <div class="landed-piece"></div>
    <div class="line-flash"></div>
  `,
  'scene-breakout': `
    <div class="bricks">
      <div class="brick"></div>
      <div class="brick"></div>
      <div class="brick"></div>
      <div class="brick"></div>
      <div class="brick"></div>
      <div class="brick"></div>
      <div class="brick"></div>
      <div class="brick"></div>
    </div>
    <div class="ball"></div>
    <div class="paddle"></div>
  `,
  'scene-snake': `
    <div class="snake-segment snake-head"></div>
    <div class="snake-segment snake-body-1"></div>
    <div class="snake-segment snake-body-2"></div>
    <div class="snake-segment snake-body-3"></div>
    <div class="snake-segment snake-body-4"></div>
    <div class="food"></div>
  `,
  'scene-pong': `
    <div class="center-line"></div>
    <div class="score score-left">2</div>
    <div class="score score-right">1</div>
    <div class="paddle paddle-left"></div>
    <div class="paddle paddle-right"></div>
    <div class="ball"></div>
  `,
  'scene-dino': `
    <div class="ground"></div>
    <div class="cactus"></div>
    <div class="dino"></div>
    <div class="cloud"></div>
  `
};

// Configuration
const SCENE_CONFIG = {
  maxScenes: 4,            // Maximum number of scenes on screen
  spawnInterval: 3500,     // Time between spawns (ms)
  minLifetime: 8000,       // Minimum display time (ms)
  maxLifetime: 14000,      // Maximum display time (ms)
  padding: 40              // Padding from edges
};

// Track active scenes
const activeScenes = new Set();

// Get all available scene types
const sceneTypes = Object.keys(sceneTemplates);

// Initialize the arcade scenes system
function initArcadeGhosts() {
  const container = document.getElementById('arcadeGhosts');
  if (!container) return;

  // Start spawning scenes
  spawnScene();

  // Set up interval for spawning new scenes
  setInterval(() => {
    if (activeScenes.size < SCENE_CONFIG.maxScenes) {
      spawnScene();
    }
  }, SCENE_CONFIG.spawnInterval);
}

// Create a single game scene
function spawnScene() {
  const container = document.getElementById('arcadeGhosts');
  if (!container) return;

  const scene = document.createElement('div');
  const sceneType = sceneTypes[Math.floor(Math.random() * sceneTypes.length)];

  scene.className = `game-scene ${sceneType}`;
  scene.innerHTML = sceneTemplates[sceneType];

  // Get existing scene positions for overlap detection
  const existingPositions = [];
  activeScenes.forEach(existingScene => {
    const rect = existingScene.getBoundingClientRect();
    existingPositions.push({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    });
  });

  // Random position (avoiding center and other scenes)
  const position = getRandomPosition(existingPositions, sceneType);
  scene.style.left = `${position.x}px`;
  scene.style.top = `${position.y}px`;

  // Random animation delay for more natural feel
  const delay = Math.random() * 3;
  scene.style.animationDelay = `${delay}s`;

  // Random scale variation (subtle, since scenes are detailed)
  const scale = 0.85 + Math.random() * 0.25;
  scene.style.transform = `scale(${scale})`;

  // Set lifetime
  const lifetime = SCENE_CONFIG.minLifetime + Math.random() * (SCENE_CONFIG.maxLifetime - SCENE_CONFIG.minLifetime);

  container.appendChild(scene);
  activeScenes.add(scene);

  // Remove scene after lifetime with fade out
  setTimeout(() => {
    scene.style.transition = 'opacity 2.5s ease';
    scene.style.opacity = '0';
    setTimeout(() => {
      if (scene.parentNode) {
        scene.parentNode.removeChild(scene);
      }
      activeScenes.delete(scene);

      // Spawn a replacement (most of the time)
      if (Math.random() > 0.25) {
        setTimeout(spawnScene, 800 + Math.random() * 2000);
      }
    }, 2500);
  }, lifetime);
}

// Get random position avoiding the center content area and other scenes
function getRandomPosition(existingPositions = [], sceneType) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = SCENE_CONFIG.padding;

  // Scene dimensions based on type
  const sceneDimensions = {
    'scene-pacman': { width: 120, height: 80 },
    'scene-invaders': { width: 120, height: 100 },
    'scene-tetris': { width: 100, height: 120 },
    'scene-breakout': { width: 120, height: 100 },
    'scene-snake': { width: 100, height: 100 },
    'scene-pong': { width: 120, height: 80 },
    'scene-dino': { width: 140, height: 70 }
  };

  const dims = sceneDimensions[sceneType] || { width: 120, height: 100 };

  // Define the "safe zone" in the center (where the app content is)
  const safeZone = {
    x: viewportWidth * 0.25,
    y: viewportHeight * 0.2,
    width: viewportWidth * 0.5,
    height: viewportHeight * 0.6
  };

  let x, y;
  let attempts = 0;
  const maxAttempts = 30;

  do {
    // Random position within viewport
    x = padding + Math.random() * (viewportWidth - padding * 2 - dims.width);
    y = padding + Math.random() * (viewportHeight - padding * 2 - dims.height);

    attempts++;

    // Check if position is outside safe zone
    const inSafeZone = (
      x > safeZone.x - dims.width - 20 &&
      x < safeZone.x + safeZone.width &&
      y > safeZone.y - dims.height - 20 &&
      y < safeZone.y + safeZone.height
    );

    // Check if position overlaps with existing scenes
    let overlapsExisting = false;
    for (const existing of existingPositions) {
      // Add buffer zone for overlap detection
      const buffer = 30;
      if (
        x < existing.x + existing.width + buffer &&
        x + dims.width + buffer > existing.x &&
        y < existing.y + existing.height + buffer &&
        y + dims.height + buffer > existing.y
      ) {
        overlapsExisting = true;
        break;
      }
    }

    if ((!inSafeZone && !overlapsExisting) || attempts >= maxAttempts) {
      break;
    }
  } while (true);

  return { x: Math.floor(x), y: Math.floor(y) };
}

/* ============================================
   MEMORY MATCH GAME
   ============================================ */

function renderMemorySelect() {
  view.innerHTML = `
    <section class="panel">
      <h2>选择难度</h2>
      <p>卡片数量越多，对记忆力的考验越大。</p>
      <div class="menu-grid">
        ${memoryLevels
          .map(
            (level, index) => `
          <button class="card-btn" data-action="memory-start" data-level="${index}" style="--delay: ${index * 0.05}s">
            <span class="tag">${level.name}</span>
            <div class="title">${level.pairs * 2} 张卡片</div>
            <div class="meta">${level.pairs} 对配对</div>
          </button>
        `
          )
          .join("")}
      </div>
      <div class="action-row">
        <button class="btn ghost" data-action="menu">返回主菜单</button>
      </div>
    </section>
  `;
}

function startMemory(levelIndex) {
  const level = memoryLevels[levelIndex];
  if (!level) return;

  // Create and shuffle cards
  const icons = memoryIcons.slice(0, level.pairs);
  const cards = [...icons, ...icons];
  shuffleArray(cards);

  state.memory = {
    levelIndex,
    level,
    cards: cards.map((icon, index) => ({
      id: index,
      icon: icon,
      isFlipped: false,
      isMatched: false
    })),
    flipped: [],
    matched: 0,
    moves: 0,
    startTime: performance.now(),
    isLocked: false,
    finished: false
  };

  setView("memory-play");
}

function renderMemoryPlay() {
  const m = state.memory;
  if (!m) {
    setView("memory-select");
    return;
  }

  const elapsed = ((performance.now() - m.startTime) / 1000).toFixed(1);
  const progress = `${m.matched}/${m.level.pairs} 对`;

  // Calculate grid layout
  const rows = Math.ceil(m.cards.length / m.level.cols);

  view.innerHTML = `
    <section class="panel">
      <h2>记忆翻牌 - ${m.level.name}</h2>
      <div class="status-grid">
        <div class="status-card">
          <div class="label">进度</div>
          <div class="value">${progress}</div>
        </div>
        <div class="status-card">
          <div class="label">翻牌次数</div>
          <div class="value">${m.moves}</div>
        </div>
        <div class="status-card">
          <div class="label">用时</div>
          <div class="value">${elapsed}s</div>
        </div>
      </div>
      <div class="memory-grid" style="grid-template-columns: repeat(${m.level.cols}, 1fr);">
        ${m.cards.map((card, index) => renderMemoryCard(card, index)).join("")}
      </div>
      ${renderMemoryControls(m)}
    </section>
  `;

  // Update elapsed time every 100ms
  if (!m.finished) {
    setTimeout(() => {
      const currentView = state.view;
      if (currentView === "memory-play") {
        render();
      }
    }, 100);
  }
}

function renderMemoryCard(card, index) {
  let classes = "memory-card";
  if (card.isFlipped || card.isMatched) classes += " is-flipped";
  if (card.isMatched) classes += " is-matched";

  return `
    <button
      class="${classes}"
      data-action="memory-flip"
      data-index="${index}"
      ${card.isFlipped || card.isMatched || state.memory?.isLocked ? 'disabled' : ''}
      aria-label="${card.isFlipped || card.isMatched ? card.icon : '翻牌'}"
    >
      <div class="memory-card-inner">
        <div class="memory-card-front">${card.icon}</div>
        <div class="memory-card-back">?</div>
      </div>
    </button>
  `;
}

function renderMemoryControls(m) {
  if (m.finished) {
    const duration = ((performance.now() - m.startTime) / 1000).toFixed(2);
    const isNewRecord = recordBestMemoryScore(m.level.name, m.moves, duration);

    return `
      <div class="action-row">
        <button class="btn primary" data-action="memory-retry">再来一局</button>
        <button class="btn ghost" data-action="memory-select">返回难度</button>
        <button class="btn ghost" data-action="menu">回主菜单</button>
      </div>
      <div class="log" style="margin-top: 16px;">
        <ul>
          <li>🎉 完成！</li>
          <li>用时：${duration}秒</li>
          <li>翻牌：${m.moves} 次</li>
          ${isNewRecord ? '<li style="color: var(--neon-yellow);">✨ 新纪录！</li>' : ''}
        </ul>
      </div>
    `;
  }

  return "";
}

function flipMemoryCard(index) {
  const m = state.memory;
  if (!m || m.isLocked || m.finished) return;

  const card = m.cards[index];
  if (card.isFlipped || card.isMatched) return;

  // Flip the card
  card.isFlipped = true;
  m.flipped.push(index);
  m.moves++;

  // Check if two cards are flipped
  if (m.flipped.length === 2) {
    m.isLocked = true;

    const [firstIndex, secondIndex] = m.flipped;
    const firstCard = m.cards[firstIndex];
    const secondCard = m.cards[secondIndex];

    if (firstCard.icon === secondCard.icon) {
      // Match found!
      firstCard.isMatched = true;
      secondCard.isMatched = true;
      m.matched++;
      m.flipped = [];
      m.isLocked = false;

      // Check if game is complete
      if (m.matched === m.level.pairs) {
        m.finished = true;
        const duration = (performance.now() - m.startTime) / 1000;
        recordBestMemoryScore(m.level.name, m.moves, duration);
      }
    } else {
      // No match, flip back after delay
      setTimeout(() => {
        firstCard.isFlipped = false;
        secondCard.isFlipped = false;
        m.flipped = [];
        m.isLocked = false;
        render();
      }, 800);
    }
  }

  render();
}

function recordBestMemoryScore(levelName, moves, seconds) {
  const key = `memory:${levelName}`;
  const current = { moves, seconds: round(seconds, 2) };
  const existing = state.scores[key];
  let better = true;

  if (existing && typeof existing === "object") {
    const bestMoves = Number(existing.moves);
    const bestSeconds = Number(existing.seconds);
    if (Number.isFinite(bestMoves) && Number.isFinite(bestSeconds)) {
      better = moves < bestMoves || (moves === bestMoves && seconds < bestSeconds);
    }
  }

  if (better) {
    state.scores[key] = current;
    saveScores();
  }

  return better;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Start the arcade scenes system when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArcadeGhosts);
} else {
  initArcadeGhosts();
}
