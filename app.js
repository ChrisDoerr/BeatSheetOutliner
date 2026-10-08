const STORAGE_KEY = 'beat-sheet-outliner-state';

const defaultBeatDefinitions = [
  { id: 'opening-image', label: 'Opening Image', percent: 0, description: 'An image of the ordinary world that establishes the protagonist’s reality and emotional state.' },
  { id: 'setup', label: 'Setup', percent: 5, description: 'The story world expands, the main character is introduced, and the central conflict begins to take shape.' },
  { id: 'theme-stated', label: 'Theme Stated', percent: 10, description: 'The emotional or thematic problem is identified clearly, often through an event, conversation, or character choice.' },
  { id: 'catalyst', label: 'Catalyst', percent: 20, description: 'An inciting incident disrupts the status quo and forces the hero into the story’s central problem.' },
  { id: 'debate', label: 'Debate', percent: 25, description: 'The hero wrestles with the change, hesitates, and debates whether to act.' },
  { id: 'break-into-two', label: 'Break into Two', percent: 50, description: 'The protagonist fully commits to the journey and the story splits into the new world and the old one.' },
  { id: 'b-story', label: 'B-Story', percent: 60, description: 'The supporting relationship or secondary story deepens the emotional stakes and enriches the theme.' },
  { id: 'fun-and-games', label: 'Fun and Games', percent: 70, description: 'The hero explores the new world, experiments with the rules, and enjoys the surface pleasures and challenges of the adventure.' },
  { id: 'midpoint', label: 'Midpoint', percent: 75, description: 'A major reversal or shift in momentum raises the stakes and changes the rules of the story.' },
  { id: 'bad-guys-close-in', label: 'Bad Guys Close In', percent: 80, description: 'Pressure mounts as forces of conflict intensify and the protagonist’s weaknesses are exploited.' },
  { id: 'all-is-lost', label: 'All Is Lost', percent: 85, description: 'A crushing defeat or disaster strips the hero of hope, forcing a desperate reassessment.' },
  { id: 'dark-night-of-the-soul', label: 'Dark Night of the Soul', percent: 90, description: 'The protagonist hits emotional rock bottom and confronts the deeper truth of the journey.' },
  { id: 'finale', label: 'Finale', percent: 95, description: 'The hero applies the lesson, resolves the central conflict, and chooses the final action.' },
  { id: 'final-image', label: 'Final Image', percent: 100, description: 'The new normal is shown: the emotional transformation is reflected in the world and the hero’s life.' },
];

function generateSceneId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createScene(beatId, text = '') {
  return {
    id: generateSceneId(),
    beatId,
    text,
  };
}

function createBeatEntry(definition) {
  return {
    id: definition.id,
    label: definition.label,
    percent: definition.percent,
    description: definition.description,
    storyText: '',
    scenes: [createScene(definition.id)],
  };
}

function createDefaultState() {
  return {
    title: 'My Story',
    totalPages: 450,
    wordsPerPage: 250,
    pagesPerScene: 5,
    beats: defaultBeatDefinitions.map(createBeatEntry),
  };
}

function normalizeState(rawState) {
  const base = createDefaultState();
  const incoming = rawState && typeof rawState === 'object' ? rawState : {};

  const normalizedBeats = defaultBeatDefinitions.map((definition) => {
    const sourceBeat = Array.isArray(incoming.beats)
      ? incoming.beats.find((beat) => beat && (beat.id === definition.id || beat.label === definition.label)) || {}
      : {};

    const incomingScenes = Array.isArray(sourceBeat.scenes) && sourceBeat.scenes.length
      ? sourceBeat.scenes.map((scene) => ({
          id: scene && scene.id ? scene.id : generateSceneId(),
          beatId: definition.id,
          text: scene && typeof scene.text === 'string' ? scene.text : '',
        }))
      : [createScene(definition.id)];

    return {
      id: definition.id,
      label: sourceBeat.label || definition.label,
      percent: Number(sourceBeat.percent ?? definition.percent),
      description: typeof sourceBeat.description === 'string' ? sourceBeat.description : definition.description,
      storyText: typeof sourceBeat.storyText === 'string' ? sourceBeat.storyText : '',
      scenes: incomingScenes,
    };
  });

  return {
    title: typeof incoming.title === 'string' && incoming.title.trim() ? incoming.title : base.title,
    totalPages: clampNumber(incoming.totalPages, 1, base.totalPages),
    wordsPerPage: clampNumber(incoming.wordsPerPage, 1, base.wordsPerPage),
    pagesPerScene: clampNumber(incoming.pagesPerScene, 0.5, base.pagesPerScene),
    beats: normalizedBeats,
  };
}

let state = loadState();

const storyTitleInput = document.querySelector('#story-title');
const totalPagesInput = document.querySelector('#total-pages');
const wordsPerPageInput = document.querySelector('#words-per-page');
const pagesPerSceneInput = document.querySelector('#pages-per-scene');
const beatTableBody = document.querySelector('#beat-table-body');
const beatPlanList = document.querySelector('#beat-plan-list');
const totalWordsDisplay = document.querySelector('#total-words');
const totalScenesDisplay = document.querySelector('#total-scenes');
const sceneLengthSummaryDisplay = document.querySelector('#scene-length-summary');
const resetButton = document.querySelector('#reset-button');
const exportButton = document.querySelector('#export-button');
const importButton = document.querySelector('#import-button');
const importFileInput = document.querySelector('#import-file');

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return createDefaultState();
  }

  try {
    return normalizeState(JSON.parse(saved));
  } catch (error) {
    return createDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clampNumber(value, min, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, numeric);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function formatPageRange(startPage, endPage) {
  return `${startPage}–${endPage}`;
}

function findBeatById(beatId) {
  return state.beats.find((beat) => beat.id === beatId) || state.beats[0];
}

function ensureBeatSceneCount(beat, targetCount) {
  if (!Array.isArray(beat.scenes) || beat.scenes.length === 0) {
    beat.scenes = [];
  }

  while (beat.scenes.length < targetCount) {
    beat.scenes.push(createScene(beat.id));
  }

  return beat.scenes;
}

function getBeatRows() {
  const beats = state.beats;
  const totalPages = clampNumber(state.totalPages, 1, 1);
  const pagesPerScene = clampNumber(state.pagesPerScene, 0.5, 1);
  const wordsPerPage = clampNumber(state.wordsPerPage, 1, 1);

  return beats.map((beat, index) => {
    const nextBeat = beats[index + 1] || { percent: 100 };
    const startPercent = beat.percent;
    const endPercent = nextBeat.percent;
    const startPage = Math.round((startPercent / 100) * totalPages);
    const endPage = Math.round((endPercent / 100) * totalPages);
    const pageSpan = Math.max(1, endPage - startPage);
    const estimatedSceneCount = Math.max(1, Math.ceil(pageSpan / pagesPerScene));
    const words = pageSpan * wordsPerPage;
    const scenes = ensureBeatSceneCount(beat, estimatedSceneCount);

    return {
      ...beat,
      startPercent,
      endPercent,
      startPage,
      endPage,
      pageSpan,
      estimatedSceneCount,
      words,
      scenes,
    };
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function syncTitleAndInputs() {
  storyTitleInput.value = state.title;
  totalPagesInput.value = state.totalPages;
  wordsPerPageInput.value = state.wordsPerPage;
  pagesPerSceneInput.value = state.pagesPerScene;
}

function renderBeatTable(rows) {
  beatTableBody.innerHTML = rows
    .map((row) => {
      const pageRange = formatPageRange(row.startPage, row.endPage);
      return `
        <tr>
          <td>${row.startPercent}%</td>
          <td>
            <div class="beat-definition-block">
              <div class="beat-definition-label">${escapeHtml(row.label)}</div>
              <div class="beat-definition-text">${escapeHtml(row.description || '')}</div>
            </div>
          </td>
          <td>${pageRange}</td>
          <td>${row.estimatedSceneCount}</td>
          <td>${formatNumber(row.words)}</td>
        </tr>
      `;
    })
    .join('');
}

function renderPlanCards(rows) {
  beatPlanList.innerHTML = rows
    .map((row) => {
      const cards = row.scenes.map((scene, sceneIndex) => `
        <div class="scene-item">
          <label>
            <span>Scene ${sceneIndex + 1}</span>
            <input
              type="text"
              value="${escapeHtml(scene.text)}"
              data-role="scene-text"
              data-scene-id="${scene.id}"
              data-beat-id="${row.id}"
            />
          </label>
          <button
            type="button"
            class="mini-button danger"
            data-role="delete-scene"
            data-scene-id="${scene.id}"
            data-beat-id="${row.id}"
          >
            Remove
          </button>
        </div>
      `).join('');

      return `
        <article class="beat-plan-card">
          <div class="beat-plan-header">
            <div>
              <span class="beat-plan-percent">${row.startPercent}%</span>
              <strong>${escapeHtml(row.label)}</strong>
            </div>
            <span class="beat-plan-range">${formatPageRange(row.startPage, row.endPage)}</span>
          </div>

          <label class="story-note-field">
            <span>My beat</span>
            <textarea
              rows="3"
              data-role="story-text"
              data-beat-id="${row.id}"
            >${escapeHtml(row.storyText || '')}</textarea>
          </label>

          <div class="scene-list">
            ${cards || '<p class="empty-state">No scenes yet — add one below.</p>'}
          </div>

          <button
            type="button"
            class="secondary-button compact"
            data-role="add-scene"
            data-beat-id="${row.id}"
          >
            Add scene
          </button>
        </article>
      `;
    })
    .join('');
}

function render() {
  syncTitleAndInputs();

  state.beats.forEach((beat) => {
    const nextBeat = state.beats[state.beats.indexOf(beat) + 1] || { percent: 100 };
    const startPercent = beat.percent;
    const endPercent = nextBeat.percent;
    const totalPages = clampNumber(state.totalPages, 1, 1);
    const pagesPerScene = clampNumber(state.pagesPerScene, 0.5, 1);
    const startPage = Math.round((startPercent / 100) * totalPages);
    const endPage = Math.round((endPercent / 100) * totalPages);
    const pageSpan = Math.max(1, endPage - startPage);
    const targetSceneCount = Math.max(1, Math.ceil(pageSpan / pagesPerScene));
    ensureBeatSceneCount(beat, targetSceneCount);
  });

  const rows = getBeatRows();
  const totalWords = state.totalPages * state.wordsPerPage;
  const totalScenes = rows.reduce((sum, row) => sum + row.scenes.length, 0);

  totalWordsDisplay.textContent = formatNumber(totalWords);
  totalScenesDisplay.textContent = formatNumber(totalScenes);
  sceneLengthSummaryDisplay.textContent = `${state.pagesPerScene} pages`;

  renderBeatTable(rows);
  renderPlanCards(rows);
}

function updateStateFromInputs() {
  state.title = storyTitleInput.value.trim() || 'My Story';
  state.totalPages = clampNumber(totalPagesInput.value, 1, 450);
  state.wordsPerPage = clampNumber(wordsPerPageInput.value, 1, 250);
  state.pagesPerScene = clampNumber(pagesPerSceneInput.value, 0.5, 5);
  saveState();
  render();
}

function updateBeatLabel(beatId, value) {
  const beat = findBeatById(beatId);
  if (!beat) return;
  beat.label = value.trim() || 'Custom beat';
  saveState();
  render();
}

function updateBeatStoryText(beatId, value) {
  const beat = findBeatById(beatId);
  if (!beat) return;
  beat.storyText = value;
  saveState();
  render();
}

function updateSceneText(beatId, sceneId, value) {
  const beat = findBeatById(beatId);
  if (!beat) return;
  const scene = beat.scenes.find((item) => item.id === sceneId);
  if (!scene) return;
  scene.text = value;
  saveState();
  render();
}

function addSceneToBeat(beatId) {
  const beat = findBeatById(beatId);
  if (!beat) return;
  beat.scenes.push(createScene(beatId));
  saveState();
  render();
}

function removeSceneFromBeat(beatId, sceneId) {
  const beat = findBeatById(beatId);
  if (!beat) return;
  beat.scenes = beat.scenes.filter((scene) => scene.id !== sceneId);
  if (!beat.scenes.length) {
    beat.scenes.push(createScene(beatId));
  }
  saveState();
  render();
}

function exportStateToJson() {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const safeTitle = (state.title || 'story-outline').trim().toLowerCase().replace(/\s+/g, '-');
  anchor.download = `${safeTitle || 'story-outline'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importStateFromFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      state = normalizeState(parsed);
      saveState();
      render();
    } catch (error) {
      alert('This JSON file could not be imported. Please choose a valid Beat Sheet Outliner export.');
    } finally {
      importFileInput.value = '';
    }
  };
  reader.readAsText(file);
}

function resetDefaults() {
  state = createDefaultState();
  saveState();
  render();
}

storyTitleInput.addEventListener('input', updateStateFromInputs);
totalPagesInput.addEventListener('input', updateStateFromInputs);
wordsPerPageInput.addEventListener('input', updateStateFromInputs);
pagesPerSceneInput.addEventListener('input', updateStateFromInputs);
resetButton.addEventListener('click', resetDefaults);
exportButton.addEventListener('click', exportStateToJson);
importButton.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', importStateFromFile);

beatPlanList.addEventListener('input', (event) => {
  const target = event.target;
  const beatId = target.dataset.beatId;

  if (target.dataset.role === 'story-text') {
    updateBeatStoryText(beatId, target.value);
  }

  if (target.dataset.role === 'scene-text') {
    updateSceneText(beatId, target.dataset.sceneId, target.value);
  }
});

beatPlanList.addEventListener('click', (event) => {
  const target = event.target;
  const beatId = target.dataset.beatId;

  if (target.dataset.role === 'add-scene') {
    addSceneToBeat(beatId);
    return;
  }

  if (target.dataset.role === 'delete-scene') {
    removeSceneFromBeat(beatId, target.dataset.sceneId);
  }
});

render();
