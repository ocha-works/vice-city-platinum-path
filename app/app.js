// Vice City Platinum Path — the tracker and guide logic.
// Loads the official list from data/trophies.json (a file of this app, so it works with the
// network off), keeps progress in localStorage, and renders the checklist, the roadmap to the
// platinum, the missable watch list and one cited guide per trophy.

const STORAGE_KEY = 'vice-city-platinum-path/v1';
const TROPHY_DATA_URL = 'data/trophies.json';

const KIND_LABELS = {
  story: 'Story',
  collectibles: 'Collectibles',
  activities: 'Activities',
  completion: 'Completion',
};

// The roadmap, built from the official descriptions: the story chapters and named missions
// first, then the stranger strands, the collectible sets and counts, the activity grinds,
// the free-roam feats and money, and finally the 100% trophy and the platinum itself.
const ROADMAP = [
  {
    title: 'The story, start to finish',
    text: 'Play the chapters in order — Gone Fishing opens the game, then Chapters 1 to 4, the named missions the list calls out (Breakfast Run, The Cartel Heist, Child\u2019s Play, Headliners, VCIA Takedown, Operation Savage Glory) as they unlock, and the final mission last. Keep a separate save before the final mission: two trophies below turn on choices.',
    trophyIds: [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 7],
  },
  {
    title: 'Strangers and strands',
    text: 'Between chapters, work the stranger strands to their final missions. Andy, Kenton, Billy, Randy and Tyrone each carry a trophy, and any eight completed strands earn Strangers & Freaks — so start strands early and finish them as their episodes unlock.',
    trophyIds: [22, 23, 24, 25, 26, 27],
  },
  {
    title: 'See all of Leonida',
    text: 'The collectible layer: uncover the whole state, meditate at every spot, complete three card sets, WAiNK at 100 locations, discover 100 vehicles and register 10 of them. One long tour of a region serves several of these at once.',
    trophyIds: [42, 28, 30, 31, 35, 55],
  },
  {
    title: 'Activities and grinds',
    text: 'The counted middle game: 250 stunts, gold in all 42 shooting-range challenges, a drone-race win at every location, 20 different race wins, 50 challenges, one of every activity type, Cal\u2019s fishing challenge, Bret\u2019s unique-animal hunt and one full arcade game.',
    trophyIds: [16, 15, 17, 18, 19, 32, 20, 29, 21],
  },
  {
    title: 'Free-roam feats, heists and money',
    text: 'The open-world layer, best done while both protagonists are available: the partner trophies, robberies from jewelry stores to five bank vaults, the one-off set pieces the descriptions hint at, and the money totals — $250,000 laundered, $100,000 spent, every garage bought.',
    trophyIds: [33, 34, 36, 39, 40, 41, 43, 37, 38, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
  },
  {
    title: '100% and the platinum',
    text: 'Close with A Long Road: work the in-game completion checklist until it reads 100%. The platinum, Vice Got a Price!, follows on its own when the other 54 are in.',
    trophyIds: [14, 1],
  },
];

const state = loadState();
let trophies = [];
let activeKind = 'all';
let activeGrade = 'all';
let searchText = '';
let openTrophyId = null;

function emptyState() {
  return { earned: {}, counts: {}, spoilers: false, hideEarned: false };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyState(), ...JSON.parse(raw) };
  } catch {
    // A blocked or corrupt store just means a fresh tracker.
  }
  return emptyState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); the tracker still works for the session.
  }
}

function isEarned(trophy) {
  return state.earned[trophy.id] === true;
}

function countOf(trophy) {
  return Number(state.counts[trophy.id] ?? 0);
}

function formatCount(n) {
  return n.toLocaleString('en-US');
}

function countStep(trophy) {
  return trophy.count >= 10000 ? 1000 : 1;
}

function setCount(trophy, value) {
  const clamped = Math.max(0, Math.min(Number(value) || 0, trophy.count * 10));
  state.counts[trophy.id] = clamped;
  if (clamped >= trophy.count) state.earned[trophy.id] = true;
  else if (state.earned[trophy.id] && clamped < trophy.count) state.earned[trophy.id] = false;
  saveState();
  renderAll(false);
  if (openTrophyId === trophy.id) renderDetail(trophy);
}

function setEarned(trophy, earned) {
  state.earned[trophy.id] = earned;
  saveState();
  renderAll(false);
  if (openTrophyId === trophy.id) renderDetail(trophy);
}

function cupSvg(grade) {
  return `<svg class="cup ${grade}" viewBox="0 0 48 48" aria-hidden="true"><path d="M14 6h20v6h6a10 10 0 0 1-10.6 10A13 13 0 0 1 26 25.9V34h5v6H17v-6h5v-8.1A13 13 0 0 1 18.6 22 10 10 0 0 1 8 12h6V6zm-2 10a6 6 0 0 0 5.4 6A16 16 0 0 1 16 16h-4zm24 0h-4a16 16 0 0 1-1.4 6A6 6 0 0 0 36 16z" fill="currentColor"/></svg>`;
}

function isSpoilerHidden(trophy) {
  return state.spoilers && trophy.kind === 'story' && !isEarned(trophy);
}

function visibleTrophies() {
  return trophies.filter((trophy) => {
    if (activeKind === 'watch' && !trophy.watch) return false;
    if (activeKind !== 'all' && activeKind !== 'watch' && trophy.kind !== activeKind) return false;
    if (activeGrade !== 'all' && trophy.grade !== activeGrade) return false;
    if (state.hideEarned && isEarned(trophy)) return false;
    if (searchText) {
      const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
      if (!haystack.includes(searchText)) return false;
    }
    return true;
  });
}

function renderSummary() {
  const total = trophies.length;
  const earned = trophies.filter(isEarned).length;
  const pct = total === 0 ? 0 : Math.round((earned / total) * 100);
  const ring = document.getElementById('ring-fill');
  ring.style.strokeDashoffset = String(194.8 * (1 - earned / Math.max(total, 1)));
  document.getElementById('ring-text').textContent = `${pct}%`;
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  document.getElementById('grade-tally').innerHTML = grades
    .map((grade) => {
      const all = trophies.filter((t) => t.grade === grade);
      const got = all.filter(isEarned).length;
      return `<span><span class="g-${grade}">●</span> ${grade}: <b>${got} / ${all.length}</b></span>`;
    })
    .join('');
}

function renderRoadmap() {
  const byId = new Map(trophies.map((t) => [t.id, t]));
  document.getElementById('roadmap-stages').innerHTML = ROADMAP.map((stage, i) => {
    const chips = stage.trophyIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((t) => `<button type="button" data-open="${t.id}" class="${isEarned(t) ? 'done' : ''}">${escapeHtml(t.name)}</button>`)
      .join('');
    return `<article class="stage"><h3><span class="stage-no">${i + 1}</span>${escapeHtml(stage.title)}</h3><p>${escapeHtml(stage.text)}</p><ul>${chips}</ul></article>`;
  }).join('');
}

function renderWatchList() {
  document.getElementById('watch-list').innerHTML = trophies
    .filter((t) => t.watch)
    .map(
      (t) => `<article class="watch-card"><h3><span class="watch-flag">⚑</span> ${escapeHtml(t.name)}</h3><p>${escapeHtml(t.watchNote ?? '')}</p></article>`,
    )
    .join('');
}

function renderList() {
  const list = document.getElementById('trophy-list');
  const shown = visibleTrophies();
  document.getElementById('list-status').textContent =
    `Showing ${shown.length} of ${trophies.length} trophies — click any trophy to open its guide and sources. Progress saves in this browser as you go.`;
  list.innerHTML = shown.map(trophyRowHtml).join('');
}

function trophyRowHtml(trophy) {
  const hidden = isSpoilerHidden(trophy);
  const name = hidden ? 'Hidden story trophy' : trophy.name;
  const desc = hidden ? 'Earn this story trophy to reveal its name and description.' : trophy.description;
  const count = trophy.count
    ? `<div class="count-box"><span class="count-now">${formatCount(countOf(trophy))}</span> <span class="count-of">/ ${formatCount(trophy.count)} ${escapeHtml(trophy.countUnit ?? '')}</span></div>`
    : '<div></div>';
  const tags = [
    `<span class="tag grade-${trophy.grade}">${trophy.grade}</span>`,
    `<span class="tag">${KIND_LABELS[trophy.kind] ?? trophy.kind}</span>`,
    trophy.watch ? '<span class="tag watch">⚑ missable watch</span>' : '',
    trophy.count ? `<span class="tag">${formatCount(trophy.count)} ${escapeHtml(trophy.countUnit ?? '')}</span>` : '',
  ].join('');
  return `<li class="trophy ${isEarned(trophy) ? 'earned' : ''} ${hidden ? 'spoiler-hidden' : ''}" data-id="${trophy.id}" tabindex="0" role="button" aria-label="Open guide for ${escapeHtml(name)}">
    <input type="checkbox" data-earn="${trophy.id}" ${isEarned(trophy) ? 'checked' : ''} aria-label="Mark ${escapeHtml(name)} as earned">
    ${cupSvg(trophy.grade)}
    <div><div class="name">${escapeHtml(name)}</div><div class="desc">${escapeHtml(desc)}</div><div class="meta">${tags}</div></div>
    ${count}
  </li>`;
}

function renderDetail(trophy) {
  const body = document.getElementById('detail-body');
  const countCtl = trophy.count
    ? `<div class="earn-row"><span>Progress:</span><span class="counter-ctl">
        <button type="button" data-count="-1" aria-label="Decrease count">−</button>
        <input type="number" id="detail-count" value="${countOf(trophy)}" min="0" aria-label="Current count">
        <button type="button" data-count="1" aria-label="Increase count">+</button>
        <span>of ${formatCount(trophy.count)} ${escapeHtml(trophy.countUnit ?? '')}</span></span></div>`
    : '';
  body.innerHTML = `
    ${cupSvg(trophy.grade)}
    <h2>${escapeHtml(trophy.name)}</h2>
    <div class="meta"><span class="tag grade-${trophy.grade}">${trophy.grade}</span> <span class="tag">${KIND_LABELS[trophy.kind] ?? trophy.kind}</span>${trophy.watch ? ' <span class="tag watch">⚑ missable watch</span>' : ''}</div>
    <div class="official"><div class="desc">“${escapeHtml(trophy.description)}”</div><div class="section-intro">— the official description, as PlayStation publishes it</div></div>
    <div class="earn-row"><button type="button" id="detail-earn" class="${isEarned(trophy) ? 'is-earned' : ''}">${isEarned(trophy) ? '✓ Earned — tap to undo' : 'Mark as earned'}</button></div>
    ${countCtl}
    <h3>The guide</h3>
    <p>${escapeHtml(trophy.guide)}</p>
    ${trophy.watchNote ? `<h3>When it can be missed</h3><p class="watch-note">${escapeHtml(trophy.watchNote)}</p>` : ''}
    <h3>Sources</h3>
    <ul class="sources">${(trophy.sources ?? []).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`;
  document.getElementById('detail-earn').addEventListener('click', () => setEarned(trophy, !isEarned(trophy)));
  body.querySelectorAll('[data-count]').forEach((btn) =>
    btn.addEventListener('click', () => setCount(trophy, countOf(trophy) + Number(btn.dataset.count) * countStep(trophy))),
  );
  const input = document.getElementById('detail-count');
  if (input) input.addEventListener('change', () => setCount(trophy, Number(input.value)));
}

function openDetail(trophy) {
  openTrophyId = trophy.id;
  renderDetail(trophy);
  document.getElementById('detail-panel').hidden = false;
}

function closeDetail() {
  openTrophyId = null;
  document.getElementById('detail-panel').hidden = true;
}

function renderAll(rerenderDetail = true) {
  renderSummary();
  renderRoadmap();
  renderWatchList();
  renderList();
  if (rerenderDetail && openTrophyId !== null) {
    const trophy = trophies.find((t) => t.id === openTrophyId);
    if (trophy) renderDetail(trophy);
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function exportProgress() {
  const payload = JSON.stringify(
    { app: 'vice-city-platinum-path', version: 1, exportedAt: new Date().toISOString(), earned: state.earned, counts: state.counts },
    null,
    2,
  );
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

function importProgress(file) {
  file.text().then((text) => {
    try {
      const data = JSON.parse(text);
      if (typeof data.earned !== 'object' || typeof data.counts !== 'object') throw new Error('shape');
      state.earned = data.earned;
      state.counts = data.counts;
      saveState();
      renderAll();
    } catch {
      document.getElementById('list-status').textContent = 'That file is not a progress export from this tracker — nothing was imported.';
    }
  });
}

// A fixed sample state used only for screenshots (?demo=1): it never touches the saved store.
function seedDemoState() {
  for (const id of [2, 3, 8, 16, 21, 33, 44]) state.earned[id] = true;
  Object.assign(state.counts, { 15: 87, 17: 19, 25: 3, 31: 34, 35: 52 });
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  if (params.has('demo')) seedDemoState();
  if (params.get('spoilers') === 'on') state.spoilers = true;
  if (params.get('kind')) {
    activeKind = params.get('kind');
    document.querySelectorAll('#kind-filters .chip').forEach((chip) =>
      chip.classList.toggle('active', chip.dataset.kind === activeKind),
    );
  }
  if (params.get('grade')) {
    activeGrade = params.get('grade');
    document.getElementById('grade-filter').value = activeGrade;
  }
  return params;
}

function scrollToView(params) {
  const view = params.get('view');
  const target =
    view === 'roadmap' ? 'roadmap' : view === 'watch' ? 'missable-watch' : view === 'list' ? 'checklist' : null;
  if (target) document.getElementById(target).scrollIntoView({ behavior: 'instant', block: 'start' });
}

function wireControls() {
  document.getElementById('search').addEventListener('input', (event) => {
    searchText = event.target.value.trim().toLowerCase();
    renderList();
  });
  document.getElementById('kind-filters').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-kind]');
    if (!chip) return;
    activeKind = chip.dataset.kind;
    document.querySelectorAll('#kind-filters .chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderList();
  });
  document.getElementById('grade-filter').addEventListener('change', (event) => {
    activeGrade = event.target.value;
    renderList();
  });
  const spoilerToggle = document.getElementById('spoiler-toggle');
  spoilerToggle.checked = state.spoilers;
  spoilerToggle.addEventListener('change', () => {
    state.spoilers = spoilerToggle.checked;
    saveState();
    renderList();
  });
  const hideEarnedToggle = document.getElementById('hide-earned');
  hideEarnedToggle.checked = state.hideEarned;
  hideEarnedToggle.addEventListener('change', () => {
    state.hideEarned = hideEarnedToggle.checked;
    saveState();
    renderList();
  });
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-file').addEventListener('change', (event) => {
    if (event.target.files[0]) importProgress(event.target.files[0]);
    event.target.value = '';
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Clear all saved progress for this tracker?')) {
      Object.assign(state, emptyState());
      saveState();
      spoilerToggle.checked = false;
      hideEarnedToggle.checked = false;
      renderAll();
    }
  });
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDetail();
  });
  document.body.addEventListener('click', (event) => {
    const openBtn = event.target.closest('[data-open]');
    if (openBtn) {
      const trophy = trophies.find((t) => t.id === Number(openBtn.dataset.open));
      if (trophy) openDetail(trophy);
      return;
    }
    const checkbox = event.target.closest('[data-earn]');
    if (checkbox) {
      const trophy = trophies.find((t) => t.id === Number(checkbox.dataset.earn));
      if (trophy) setEarned(trophy, checkbox.checked);
      return;
    }
    const row = event.target.closest('.trophy');
    if (row) {
      const trophy = trophies.find((t) => t.id === Number(row.dataset.id));
      if (trophy) openDetail(trophy);
    }
  });
}

async function loadTrophies() {
  const response = await fetch(TROPHY_DATA_URL);
  const data = await response.json();
  trophies = Array.isArray(data) ? data : data.trophies;
}

async function main() {
  await loadTrophies();
  const params = applyUrlParams();
  document.getElementById('spoiler-toggle').checked = state.spoilers;
  wireControls();
  renderAll();
  const openId = Number(params.get('open'));
  if (openId) {
    const trophy = trophies.find((t) => t.id === openId);
    if (trophy) openDetail(trophy);
  }
  scrollToView(params);
}

main();
