// Quest Editor — a dev-only page for viewing and editing QUESTS.
// Loads the runtime QUESTS object from data.js, normalizes each quest into
// an editable model (checks stored as source strings, not live functions),
// and exports a new JS/JSON representation on demand.

import { saveOverride, clearOverride, hasOverride } from '../questsOverride.js';

export class QuestEditor {
  constructor({ quests, islands, resources, dialogues }) {
    this.islands = islands;
    this.resources = resources;
    this.dialogues = dialogues;
    this.allIslandIds = Object.keys(islands).concat(['turtle']); // turtle kept as an unlock flag even without an ISLANDS entry
    this.allDialogueKeys = Object.keys(dialogues);

    // Build the editable model from the source QUESTS.
    this.model = {};
    for (const [id, q] of Object.entries(quests)) {
      this.model[id] = normalizeQuest(id, q);
    }
    this.order = Object.keys(this.model); // preserve original ordering
    this.selectedId = null;
    this.dirty = new Set();
    this.query = '';

    // DOM refs filled in by mount()
    this.listEl = null;
    this.detailEl = null;
    this.searchEl = null;
  }

  mount() {
    this.listEl = document.getElementById('quest-list');
    this.detailEl = document.getElementById('quest-detail');
    this.searchEl = document.getElementById('quest-search');

    this.searchEl.addEventListener('input', () => {
      this.query = this.searchEl.value.toLowerCase().trim();
      this.renderList();
    });

    document.getElementById('admin-new').addEventListener('click', () => this.newQuest());
    document.getElementById('admin-delete').addEventListener('click', () => this.deleteSelected());
    document.getElementById('admin-copy').addEventListener('click', () => this.copyJs());
    document.getElementById('admin-export-js').addEventListener('click', () => this.downloadJs());
    document.getElementById('admin-export-json').addEventListener('click', () => this.downloadJson());
    document.getElementById('admin-apply').addEventListener('click', () => this.applyToGame());
    document.getElementById('admin-clear-override').addEventListener('click', () => this.clearOverrideConfirm());

    this.refreshOverrideStatus();
    this.renderList();
    this.renderDetail();
  }

  refreshOverrideStatus() {
    const el = document.getElementById('admin-override-status');
    if (!el) return;
    if (hasOverride()) {
      el.textContent = '● override active';
      el.style.color = 'var(--accent)';
    } else {
      el.textContent = '○ no override';
      el.style.color = 'var(--muted)';
    }
  }

  applyToGame() {
    try {
      saveOverride(this.serializeForOverride());
      this.dirty.clear();
      this.refreshOverrideStatus();
      this.renderList();
      this.toast('Saved — reload the game tab to see changes');
    } catch (err) {
      console.error(err);
      this.toast('Save failed: ' + err.message);
    }
  }

  clearOverrideConfirm() {
    if (!hasOverride()) {
      this.toast('No override to clear');
      return;
    }
    if (!window.confirm('Remove the localStorage override and revert the game to code-defined quests? (The editor will keep your in-memory edits.)')) return;
    clearOverride();
    this.refreshOverrideStatus();
    this.toast('Override cleared — reload the game tab to see base quests');
  }

  // Shape mirrors the JSON export but preserves check sources as strings.
  serializeForOverride() {
    const out = {};
    for (const id of this.order) {
      const m = this.model[id];
      out[id] = {
        id: m.id,
        name: m.name,
        description: m.description,
        islands: m.islands,
        island: m.islands[0] || undefined,
        requiresQuests: m.requiresQuests,
        requiresDay: m.requiresDay ?? null,
        completesDay: !!m.completesDay,
        hidden: !!m.hidden,
        rewards: { ...m.rewards },
        dialogue: { ...m.dialogue },
        steps: m.steps.map(s => ({ id: s.id, text: s.text, check: s.check })),
      };
    }
    return out;
  }

  // ── List ──
  renderList() {
    const q = this.query;
    this.listEl.innerHTML = '';
    for (const id of this.order) {
      const m = this.model[id];
      if (q && !matchesQuery(m, q)) continue;
      const li = document.createElement('li');
      li.innerHTML = `<strong>${escapeHtml(m.name || '(unnamed)')}</strong><span class="qid">${escapeHtml(id)}</span>`;
      if (id === this.selectedId) li.classList.add('active');
      if (this.dirty.has(id)) li.classList.add('dirty');
      li.addEventListener('click', () => {
        this.selectedId = id;
        this.renderList();
        this.renderDetail();
      });
      this.listEl.appendChild(li);
    }
  }

  // ── Detail ──
  renderDetail() {
    if (!this.selectedId) {
      this.detailEl.className = 'empty';
      this.detailEl.innerHTML = '<div>Select a quest to edit, or create a new one.</div>';
      return;
    }
    const m = this.model[this.selectedId];
    this.detailEl.className = '';
    this.detailEl.innerHTML = '';

    // ID (read-only display + rename button)
    const idField = document.createElement('div');
    idField.className = 'id-field';
    idField.textContent = m.id;
    this.detailEl.appendChild(idField);

    // Name
    this.detailEl.appendChild(this.makeTextField('Name', m.name, v => { m.name = v; this.markDirty(); this.renderList(); }));
    // Description
    this.detailEl.appendChild(this.makeTextArea('Description', m.description, v => { m.description = v; this.markDirty(); }, 60));

    // Islands (multi chips)
    this.detailEl.appendChild(this.makeChips('Islands (gating)', m.islands, this.allIslandIds, v => { m.islands = v; this.markDirty(); }));

    // requiresQuests
    const allQuestIds = this.order.filter(id => id !== m.id);
    this.detailEl.appendChild(this.makeChips('Requires Quests', m.requiresQuests, allQuestIds, v => { m.requiresQuests = v; this.markDirty(); }));

    // requiresDay & hidden & completesDay
    const metaRow = document.createElement('div');
    metaRow.className = 'field row';
    metaRow.innerHTML = `
      <div>
        <label>Requires Day</label>
        <input type="number" min="0" value="${m.requiresDay ?? ''}" />
      </div>
      <div class="meta-flags" style="align-items:flex-end;">
        <label><input type="checkbox" ${m.completesDay ? 'checked' : ''}> completesDay</label>
        <label><input type="checkbox" ${m.hidden ? 'checked' : ''}> hidden</label>
      </div>
    `;
    metaRow.querySelector('input[type="number"]').addEventListener('input', (e) => {
      const v = e.target.value;
      m.requiresDay = v === '' ? null : Number(v);
      this.markDirty();
    });
    const [completesCb, hiddenCb] = metaRow.querySelectorAll('input[type="checkbox"]');
    completesCb.addEventListener('change', () => { m.completesDay = completesCb.checked; this.markDirty(); });
    hiddenCb.addEventListener('change', () => { m.hidden = hiddenCb.checked; this.markDirty(); });
    this.detailEl.appendChild(metaRow);

    // Rewards
    this.detailEl.appendChild(this.makeSectionTitle('Rewards'));
    this.detailEl.appendChild(this.makeRewardsEditor(m));

    // Dialogue refs
    this.detailEl.appendChild(this.makeSectionTitle('Dialogue'));
    this.detailEl.appendChild(this.makeDialoguePicker('On Start', m.dialogue.onStart, v => { m.dialogue.onStart = v; this.markDirty(); }));
    this.detailEl.appendChild(this.makeDialoguePicker('On Complete', m.dialogue.onComplete, v => { m.dialogue.onComplete = v; this.markDirty(); }));

    // Steps
    this.detailEl.appendChild(this.makeSectionTitle('Steps'));
    for (let i = 0; i < m.steps.length; i++) {
      this.detailEl.appendChild(this.makeStepEditor(m, i));
    }
    const addBtn = document.createElement('button');
    addBtn.className = 'add-step';
    addBtn.textContent = '+ Add Step';
    addBtn.addEventListener('click', () => {
      m.steps.push({ id: `step_${m.steps.length + 1}`, text: '', check: '(gs) => false' });
      this.markDirty();
      this.renderDetail();
    });
    this.detailEl.appendChild(addBtn);
  }

  // ── Field builders ──
  makeTextField(label, value, onInput) {
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = `<label>${escapeHtml(label)}</label><input type="text" />`;
    const input = field.querySelector('input');
    input.value = value ?? '';
    input.addEventListener('input', () => onInput(input.value));
    return field;
  }

  makeTextArea(label, value, onInput, minHeight = 60) {
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = `<label>${escapeHtml(label)}</label><textarea style="min-height:${minHeight}px"></textarea>`;
    const ta = field.querySelector('textarea');
    ta.value = value ?? '';
    ta.addEventListener('input', () => onInput(ta.value));
    return field;
  }

  makeSectionTitle(text) {
    const el = document.createElement('div');
    el.className = 'section-title';
    el.textContent = text;
    return el;
  }

  makeChips(label, values, allOptions, onChange) {
    const field = document.createElement('div');
    field.className = 'field';
    const heading = document.createElement('label');
    heading.textContent = label;
    field.appendChild(heading);

    const chipsEl = document.createElement('div');
    chipsEl.className = 'chips';
    field.appendChild(chipsEl);

    const rerender = () => {
      chipsEl.innerHTML = '';
      for (const val of values) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = `${escapeHtml(val)}<span class="remove">×</span>`;
        chip.querySelector('.remove').addEventListener('click', () => {
          const idx = values.indexOf(val);
          if (idx >= 0) values.splice(idx, 1);
          onChange(values);
          rerender();
        });
        chipsEl.appendChild(chip);
      }
      const add = document.createElement('button');
      add.className = 'chips-add';
      add.textContent = '+ add';
      add.addEventListener('click', (ev) => {
        ev.preventDefault();
        const remaining = allOptions.filter(o => !values.includes(o));
        if (remaining.length === 0) {
          this.toast('No more options available');
          return;
        }
        const pick = window.prompt(`Add one of:\n${remaining.join(', ')}`, remaining[0]);
        if (!pick) return;
        if (!allOptions.includes(pick)) {
          this.toast(`"${pick}" is not a valid option`);
          return;
        }
        if (values.includes(pick)) return;
        values.push(pick);
        onChange(values);
        rerender();
      });
      chipsEl.appendChild(add);
    };
    rerender();
    return field;
  }

  makeRewardsEditor(m) {
    const field = document.createElement('div');
    field.className = 'field';
    const rerender = () => {
      field.innerHTML = '';
      for (const [key, count] of Object.entries(m.rewards)) {
        const row = document.createElement('div');
        row.className = 'field row';
        row.style.marginBottom = '6px';
        row.innerHTML = `
          <div><input type="text" value="${escapeHtml(key)}" placeholder="resource id" /></div>
          <div style="flex:0 0 100px;"><input type="number" min="1" value="${count}" /></div>
          <div style="flex:0 0 auto;"><button class="chips-add">remove</button></div>
        `;
        const [keyIn, countIn] = row.querySelectorAll('input');
        const rmBtn = row.querySelector('button');
        keyIn.addEventListener('input', () => {
          const newKey = keyIn.value.trim();
          if (!newKey || newKey === key) return;
          const v = m.rewards[key];
          delete m.rewards[key];
          m.rewards[newKey] = v;
          this.markDirty();
        });
        countIn.addEventListener('input', () => {
          m.rewards[keyIn.value.trim() || key] = Number(countIn.value) || 0;
          this.markDirty();
        });
        rmBtn.addEventListener('click', () => {
          delete m.rewards[keyIn.value.trim() || key];
          this.markDirty();
          rerender();
        });
        field.appendChild(row);
      }
      const add = document.createElement('button');
      add.className = 'chips-add';
      add.textContent = '+ add reward';
      add.addEventListener('click', (e) => {
        e.preventDefault();
        const existingKeys = Object.keys(m.rewards);
        let newKey = 'coins';
        let i = 1;
        while (existingKeys.includes(newKey)) newKey = `item_${i++}`;
        m.rewards[newKey] = 1;
        this.markDirty();
        rerender();
      });
      field.appendChild(add);
    };
    rerender();
    return field;
  }

  makeDialoguePicker(label, currentValue, onChange) {
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = `<label>${escapeHtml(label)}</label>`;
    const row = document.createElement('div');
    row.className = 'dialog-picker';

    const sel = document.createElement('select');
    const emptyOpt = document.createElement('option');
    emptyOpt.value = ''; emptyOpt.textContent = '(none)';
    sel.appendChild(emptyOpt);
    for (const key of this.allDialogueKeys) {
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = key;
      if (key === currentValue) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => onChange(sel.value || null));
    row.appendChild(sel);
    field.appendChild(row);
    return field;
  }

  makeStepEditor(m, stepIdx) {
    const step = m.steps[stepIdx];
    const wrap = document.createElement('div');
    wrap.className = 'step';

    const head = document.createElement('div');
    head.className = 'step-head';
    head.innerHTML = `
      <input type="text" placeholder="id" style="flex:0 0 140px; font-family: ui-monospace, monospace;" />
      <input type="text" placeholder="Player-facing text" />
      <div class="controls">
        <button title="Move up">↑</button>
        <button title="Move down">↓</button>
        <button class="danger" title="Remove step">✕</button>
      </div>
    `;
    const [idIn, textIn] = head.querySelectorAll('input');
    idIn.value = step.id || '';
    textIn.value = step.text || '';
    const [upBtn, downBtn, rmBtn] = head.querySelectorAll('button');
    idIn.addEventListener('input', () => { step.id = idIn.value.trim(); this.markDirty(); });
    textIn.addEventListener('input', () => { step.text = textIn.value; this.markDirty(); });
    upBtn.addEventListener('click', () => {
      if (stepIdx === 0) return;
      [m.steps[stepIdx - 1], m.steps[stepIdx]] = [m.steps[stepIdx], m.steps[stepIdx - 1]];
      this.markDirty();
      this.renderDetail();
    });
    downBtn.addEventListener('click', () => {
      if (stepIdx === m.steps.length - 1) return;
      [m.steps[stepIdx + 1], m.steps[stepIdx]] = [m.steps[stepIdx], m.steps[stepIdx + 1]];
      this.markDirty();
      this.renderDetail();
    });
    rmBtn.addEventListener('click', () => {
      m.steps.splice(stepIdx, 1);
      this.markDirty();
      this.renderDetail();
    });
    wrap.appendChild(head);

    const checkLabel = document.createElement('div');
    checkLabel.className = 'check-label';
    checkLabel.textContent = 'check (arrow fn or function expression, takes gameState)';
    wrap.appendChild(checkLabel);

    const checkTa = document.createElement('textarea');
    checkTa.style.minHeight = '52px';
    checkTa.value = step.check;
    checkTa.addEventListener('input', () => { step.check = checkTa.value; this.markDirty(); });
    wrap.appendChild(checkTa);

    return wrap;
  }

  // ── Mutations ──
  markDirty() {
    if (this.selectedId) this.dirty.add(this.selectedId);
    this.renderList();
  }

  newQuest() {
    let id = `quest_${Object.keys(this.model).length + 1}`;
    while (this.model[id]) id = `quest_${Math.random().toString(36).slice(2, 7)}`;
    const prompt = window.prompt('New quest id (letters, numbers, underscores):', id);
    if (!prompt) return;
    const cleaned = prompt.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (!cleaned || this.model[cleaned]) {
      this.toast(this.model[cleaned] ? 'That id is already in use' : 'Invalid id');
      return;
    }
    this.model[cleaned] = emptyQuest(cleaned);
    this.order.push(cleaned);
    this.selectedId = cleaned;
    this.dirty.add(cleaned);
    this.renderList();
    this.renderDetail();
  }

  deleteSelected() {
    if (!this.selectedId) return;
    if (!window.confirm(`Delete quest ${this.selectedId}?`)) return;
    delete this.model[this.selectedId];
    this.order = this.order.filter(id => id !== this.selectedId);
    this.dirty.add(this.selectedId); // so export reflects the removal
    this.selectedId = null;
    this.renderList();
    this.renderDetail();
  }

  // ── Export ──
  buildJsSource() {
    const lines = [
      '// QUESTS — exported from the in-repo Quest Editor.',
      '// Paste into src/data.js, replacing the current QUESTS export.',
      'export const QUESTS = {',
    ];
    for (const id of this.order) {
      const m = this.model[id];
      lines.push(formatQuestAsJs(m));
    }
    lines.push('};');
    lines.push('');
    return lines.join('\n');
  }

  buildJsonSource() {
    const out = {};
    for (const id of this.order) {
      const m = this.model[id];
      out[id] = {
        id: m.id,
        name: m.name,
        description: m.description,
        islands: m.islands,
        requiresQuests: m.requiresQuests,
        requiresDay: m.requiresDay ?? null,
        completesDay: !!m.completesDay,
        hidden: !!m.hidden,
        rewards: { ...m.rewards },
        dialogue: { ...m.dialogue },
        steps: m.steps.map(s => ({ id: s.id, text: s.text, check: s.check })),
      };
    }
    return JSON.stringify(out, null, 2);
  }

  async copyJs() {
    const src = this.buildJsSource();
    try {
      await navigator.clipboard.writeText(src);
      this.toast('JS copied to clipboard');
    } catch (err) {
      this.toast('Clipboard blocked — try Export .js instead');
    }
  }

  downloadJs() {
    downloadFile('quests.js', 'text/javascript', this.buildJsSource());
    this.toast('Downloaded quests.js');
  }

  downloadJson() {
    downloadFile('quests.json', 'application/json', this.buildJsonSource());
    this.toast('Downloaded quests.json');
  }

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2200);
  }
}

// ── Helpers ──

function normalizeQuest(id, q) {
  // Normalize the island → islands[] migration.
  const islands = Array.isArray(q.islands) && q.islands.length
    ? [...q.islands]
    : (q.island ? [q.island] : []);
  return {
    id: q.id || id,
    name: q.name || '',
    description: q.description || '',
    islands,
    requiresQuests: Array.isArray(q.requiresQuests) ? [...q.requiresQuests] : [],
    requiresDay: q.requiresDay ?? null,
    completesDay: !!q.completesDay,
    hidden: !!q.hidden,
    rewards: q.rewards ? { ...q.rewards } : {},
    dialogue: {
      onStart: q.dialogue?.onStart || null,
      onComplete: q.dialogue?.onComplete || null,
    },
    steps: (q.steps || []).map((s, i) => ({
      id: s.id || `step_${i + 1}`,
      text: s.text || '',
      check: typeof s.check === 'function' ? s.check.toString() : (s.check || '(gs) => false'),
    })),
  };
}

function emptyQuest(id) {
  return {
    id,
    name: '',
    description: '',
    islands: [],
    requiresQuests: [],
    requiresDay: null,
    completesDay: false,
    hidden: false,
    rewards: {},
    dialogue: { onStart: null, onComplete: null },
    steps: [],
  };
}

function matchesQuery(m, q) {
  if (m.id.toLowerCase().includes(q)) return true;
  if (m.name.toLowerCase().includes(q)) return true;
  if (m.description.toLowerCase().includes(q)) return true;
  if (m.islands.some(i => i.toLowerCase().includes(q))) return true;
  if (m.steps.some(s => s.text.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))) return true;
  return false;
}

function formatQuestAsJs(m) {
  const pad = '    ';
  const lines = [`  ${m.id}: {`];
  lines.push(`${pad}id: ${jsStr(m.id)},`);
  if (m.islands.length === 1) {
    // Keep single-island form for source compatibility; GameState reads both.
    lines.push(`${pad}island: ${jsStr(m.islands[0])},`);
  } else {
    lines.push(`${pad}islands: [${m.islands.map(jsStr).join(', ')}],`);
  }
  lines.push(`${pad}name: ${jsStr(m.name)},`);
  lines.push(`${pad}description: ${jsStr(m.description)},`);
  if (m.requiresQuests.length) {
    lines.push(`${pad}requiresQuests: [${m.requiresQuests.map(jsStr).join(', ')}],`);
  }
  if (m.requiresDay != null) lines.push(`${pad}requiresDay: ${m.requiresDay},`);
  if (m.completesDay) lines.push(`${pad}completesDay: true,`);
  if (m.hidden) lines.push(`${pad}hidden: true,`);
  if (Object.keys(m.rewards).length) {
    const rewardLines = Object.entries(m.rewards).map(([k, v]) => `${pad}  ${jsKey(k)}: ${v}`);
    lines.push(`${pad}rewards: {`);
    lines.push(rewardLines.join(',\n'));
    lines.push(`${pad}},`);
  }
  if (m.dialogue.onStart || m.dialogue.onComplete) {
    lines.push(`${pad}dialogue: {`);
    if (m.dialogue.onStart) lines.push(`${pad}  onStart: ${jsStr(m.dialogue.onStart)},`);
    if (m.dialogue.onComplete) lines.push(`${pad}  onComplete: ${jsStr(m.dialogue.onComplete)},`);
    lines.push(`${pad}},`);
  }
  lines.push(`${pad}steps: [`);
  for (const s of m.steps) {
    const checkSrc = s.check.trim().replace(/\n/g, `\n${pad}     `);
    lines.push(`${pad}  { id: ${jsStr(s.id)}, text: ${jsStr(s.text)}, check: ${checkSrc} },`);
  }
  lines.push(`${pad}],`);
  lines.push('  },');
  return lines.join('\n');
}

function jsStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
function jsKey(k) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : jsStr(k);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function downloadFile(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
