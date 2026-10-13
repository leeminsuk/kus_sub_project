/* Local-only adapter. The original game renderer and gameplay remain in assets/. */
(() => {
  'use strict';
  const SAVE_KEY = 'coastal_savestate';
  const SETTING_KEYS = ['player_position', 'audio-muted', 'webgl_quality'];
  let app;
  let dialog;
  let previousMenu;
  const data = window.__DATA;
  data.project.url = `${location.origin}/`;
  data.project.origin = location.origin;
  data.page.route.url = `${location.origin}/`;
  data.site.home.description = 'Your journey is saved automatically in this browser.';
  data.site.home.button.login = 'Manage local saves';
  data.site.hint.register.title = 'Keep a backup';
  data.site.hint.register.description = 'Export your progress to a file and restore it on this computer.';
  data.site.cta.login = 'Local saves';
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved?.sessionToken) {
      saved.sessionToken = null;
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    }
  } catch { /* The game's save loader handles invalid local data. */ }

  const notify = message => {
    const target = document.getElementById('local-save-status');
    if (target) target.textContent = message;
  };
  const saveNow = async () => {
    const save = await app.$savestate.getSaveObject();
    save.sessionToken = null;
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    notify('Saved on this browser.');
    return save;
  };
  const exportSave = async () => {
    const save = await saveNow();
    const settings = {};
    for (const key of SETTING_KEYS) {
      if (localStorage.getItem(key) !== null) settings[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify({ format: 'coastalworld-local', version: 1, save, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'coastalworld-save.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Backup downloaded.');
  };
  const importSave = async file => {
    if (!file || file.size > 5 * 1024 * 1024) throw new Error('Choose a Coastal World save file smaller than 5 MB.');
    const payload = JSON.parse(await file.text());
    const save = payload?.save;
    if (payload.format !== 'coastalworld-local' || payload.version !== 1 ||
        !save || typeof save.saveID !== 'string' || !save.saveID ||
        !save.game || typeof save.game !== 'object' || !save.game.player ||
        !save.game.vars || typeof save.game.currentScene !== 'string') {
      throw new Error('This is not a valid Coastal World backup.');
    }
    // Validate the encoded game with the game's loader before replacing the current save.
    const previous = localStorage.getItem(SAVE_KEY);
    const safeSave = { ...save, windowID: app.$savestate.windowID, sessionToken: null, savedAt: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(safeSave));
    try {
      await app.$savestate.preload();
      const decoded = app.$savestate._preLocal?.game;
      if (!decoded?.player || !decoded.vars || typeof decoded.currentScene !== 'string' ||
          !app.$manifest.content.scenes[decoded.currentScene]) throw new Error('Invalid encoded game');
    } catch {
      if (previous === null) localStorage.removeItem(SAVE_KEY);
      else localStorage.setItem(SAVE_KEY, previous);
      throw new Error('The save file is damaged. Your current progress was kept.');
    }
    // Prevent reactive autosave from replacing the imported save before navigation.
    app.$savestate.isDeadEnd = true;
    for (const [key, value] of Object.entries(payload.settings || {})) {
      if (SETTING_KEYS.includes(key) && typeof value === 'string') {
        localStorage.setItem(key, value);
      }
    }
    location.assign('/');
  };
  const openSaves = () => {
    if (!app || dialog?.open) return;
    if (!dialog) {
      const style = document.createElement('style');
      style.textContent = `
        #local-save-dialog{border:0;border-radius:24px;padding:32px;color:#3b3777;background:#fff;max-width:480px;width:calc(100% - 40px);font:16px Gilmer,sans-serif;box-shadow:0 20px 70px #24204755}
        #local-save-dialog::backdrop{background:#29265588}
        #local-save-dialog h2{font-size:28px;margin:0 32px 16px 0}
        #local-save-dialog p{line-height:1.5;margin:12px 0}
        #local-save-dialog .local-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
        #local-save-dialog button{border:0;border-radius:22px;padding:12px 20px;background:#00bea9;color:#fff;font:inherit;cursor:pointer}
        #local-save-dialog button:focus-visible{outline:3px solid #3b3777;outline-offset:3px}
        #local-save-dialog .local-close{position:absolute;right:16px;top:16px;background:#3b3777;padding:8px 13px}
        #local-save-status{min-height:24px;font-size:14px}
      `;
      document.head.append(style);
      dialog = document.createElement('dialog');
      dialog.id = 'local-save-dialog';
      dialog.setAttribute('aria-labelledby', 'local-save-title');
      dialog.innerHTML = `<button type="button" class="local-close" aria-label="Close local saves">×</button>
        <h2 id="local-save-title">Local saves</h2>
        <p>Your progress is saved automatically in this browser. No account or email is needed.</p>
        <p>Download a backup before clearing browser data, or restore a previous backup.</p>
        <div class="local-actions"><button type="button" data-save="now">Save now</button><button type="button" data-save="export">Download backup</button><button type="button" data-save="import">Restore backup</button></div>
        <input type="file" accept=".json,application/json" hidden>
        <p id="local-save-status" role="status" aria-live="polite"></p>`;
      document.body.append(dialog);
      dialog.querySelector('.local-close').onclick = () => dialog.close();
      dialog.querySelector('[data-save="now"]').onclick = () => saveNow().catch(error => notify(error.message));
      dialog.querySelector('[data-save="export"]').onclick = () => exportSave().catch(error => notify(error.message));
      const input = dialog.querySelector('input');
      dialog.querySelector('[data-save="import"]').onclick = () => input.click();
      input.onchange = () => importSave(input.files[0]).catch(error => { notify(error.message); input.value = ''; });
      dialog.addEventListener('close', () => { app.$store.isMenuOpen = previousMenu; });
    }
    previousMenu = app.$store.isMenuOpen;
    app.$store.isMenuOpen = true;
    notify('');
    dialog.showModal();
  };

  window.addEventListener('keydown', event => {
    if (dialog?.open && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.CoastalLocal = {
    install(instance, watch) {
      app = instance;
      // Guest mode already has complete local autosave; cloud authentication is not used.
      app.$api.load = async () => false;
      app.$api.save = async () => false;
      app.$api.auth = async () => ({ error: 'local-only' });
      app.$api.register = async () => ({ error: 'local-only' });
      app.$analytics.init = () => {};
      app.$analytics.rawEvent = () => {};
      app.$onetrust.init = () => {};
      app.$onetrust.cookieSettingsText.value = 'Local saves';
      watch(() => app.$store.isFormOpen, value => {
        if (value) { app.$store.isFormOpen = false; openSaves(); }
      }, { flush: 'sync' });
      document.addEventListener('click', event => {
        if (event.target.closest?.('.ot-sdk-show-settings')) { event.preventDefault(); openSaves(); }
      });
    },
    openSaves
  };
})();
