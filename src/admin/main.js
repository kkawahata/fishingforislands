import { QUESTS, ISLANDS, RESOURCES, DIALOGUES } from '../data.js';
import { VERSION } from '../version.js';
import { QuestEditor } from './QuestEditor.js';

const versionEl = document.getElementById('admin-version');
if (versionEl) versionEl.textContent = `v${VERSION}`;

const editor = new QuestEditor({
  quests: QUESTS,
  islands: ISLANDS,
  resources: RESOURCES,
  dialogues: DIALOGUES,
});
editor.mount();
