// ==UserScript==
// @name         Remove Web Limits v5
// @namespace    remove-web-limits-v5
// @version      5.0.0
// @description  Removes copy/paste/select/right-click restrictions. Modernised & enhanced fork.
// @match        *://*/*
// @exclude      *://www.youtube.com/watch*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @run-at       document-start
// @license      LGPLv3
// ==/UserScript==

(function () {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────

  const STORAGE_KEY = 'rwl_v5';
  const STORAGE_NS  = '__rwl5__';

  const HOOK_EVENTS = [
    'contextmenu','select','selectstart','copy','cut',
    'dragstart','beforeunload','mousedown','mouseup'
  ];

  const CSS_UNLOCK = `
    *, *::before, *::after {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      user-select: text !important;
      pointer-events: auto !important;
    }
    ::selection {
      color: #fff !important;
      background: #2563eb !important;
    }
  `;

  const UI_STYLES = `
    #rwl5-root {
      all: initial;
      position: fixed;
      top: var(--rwl-top, 120px);
      left: 0;
      z-index: 2147483647;
      font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      user-select: none;
    }
    #rwl5-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px 5px 8px;
      background: #0f172a;
      border: 1px solid #334155;
      border-left: none;
      border-radius: 0 20px 20px 0;
      color: #94a3b8;
      cursor: pointer;
      transform: translateX(calc(-100% + 6px));
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                  background 0.2s, box-shadow 0.2s;
      box-shadow: 2px 2px 12px rgba(0,0,0,0.4);
      white-space: nowrap;
    }
    #rwl5-root:hover #rwl5-pill,
    #rwl5-root.pinned #rwl5-pill {
      transform: translateX(0);
      background: #1e293b;
      box-shadow: 2px 2px 20px rgba(0,0,0,0.5);
    }
    #rwl5-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #475569;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    #rwl5-root.active #rwl5-dot { background: #22c55e; box-shadow: 0 0 6px #22c55e88; }
    #rwl5-root.partial #rwl5-dot { background: #f59e0b; box-shadow: 0 0 6px #f59e0b88; }
    #rwl5-label { color: #e2e8f0; font-weight: 500; letter-spacing: 0.02em; }
    #rwl5-toggle {
      width: 28px; height: 16px;
      background: #334155;
      border-radius: 8px;
      position: relative;
      transition: background 0.2s;
      flex-shrink: 0;
      cursor: pointer;
    }
    #rwl5-toggle::after {
      content: '';
      position: absolute;
      top: 2px; left: 2px;
      width: 12px; height: 12px;
      border-radius: 50%;
      background: #64748b;
      transition: transform 0.2s, background 0.2s;
    }
    #rwl5-root.active #rwl5-toggle { background: #166534; }
    #rwl5-root.active #rwl5-toggle::after { transform: translateX(12px); background: #22c55e; }
    #rwl5-gear {
      opacity: 0.5;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      transition: opacity 0.2s, transform 0.3s;
      color: #94a3b8;
    }
    #rwl5-gear:hover { opacity: 1; transform: rotate(60deg); }

    /* ── Panel ── */
    #rwl5-panel {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      width: 420px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 14px;
      color: #e2e8f0;
      font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.7);
      z-index: 2147483647;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
      overflow: hidden;
    }
    #rwl5-panel.open {
      opacity: 1;
      pointer-events: all;
      transform: translate(-50%, -50%) scale(1);
    }
    #rwl5-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #1e293b;
      background: #0f172a;
    }
    #rwl5-panel-header h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #f1f5f9;
      letter-spacing: 0.01em;
    }
    #rwl5-close {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      padding: 0;
      transition: color 0.2s;
    }
    #rwl5-close:hover { color: #e2e8f0; }
    #rwl5-panel-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
    .rwl5-section { display: flex; flex-direction: column; gap: 8px; }
    .rwl5-section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
    }
    .rwl5-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: #1e293b;
      border-radius: 8px;
      gap: 10px;
    }
    .rwl5-row span { color: #cbd5e1; }
    .rwl5-switch {
      width: 36px; height: 20px;
      background: #334155;
      border-radius: 10px;
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.2s;
      border: none;
    }
    .rwl5-switch::after {
      content: '';
      position: absolute;
      top: 2px; left: 2px;
      width: 16px; height: 16px;
      border-radius: 50%;
      background: #64748b;
      transition: transform 0.2s, background 0.2s;
    }
    .rwl5-switch.on { background: #166534; }
    .rwl5-switch.on::after { transform: translateX(16px); background: #22c55e; }
    .rwl5-textarea {
      width: 100%;
      box-sizing: border-box;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #e2e8f0;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 11px;
      padding: 10px;
      resize: vertical;
      min-height: 100px;
      outline: none;
      transition: border-color 0.2s;
    }
    .rwl5-textarea:focus { border-color: #2563eb; }
    .rwl5-btn-row {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .rwl5-btn {
      padding: 7px 16px;
      border-radius: 7px;
      border: none;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
      letter-spacing: 0.02em;
    }
    .rwl5-btn:active { transform: scale(0.96); }
    .rwl5-btn.primary { background: #2563eb; color: #fff; }
    .rwl5-btn.primary:hover { opacity: 0.85; }
    .rwl5-btn.danger { background: #991b1b; color: #fca5a5; }
    .rwl5-btn.danger:hover { opacity: 0.85; }
    .rwl5-btn.ghost {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
    }
    .rwl5-btn.ghost:hover { color: #e2e8f0; }
    .rwl5-site-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 5px;
      font-size: 11px;
      color: #94a3b8;
    }
    .rwl5-site-tag.current { border-color: #22c55e44; background: #052e16; color: #86efac; }
    #rwl5-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 2147483646;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      backdrop-filter: blur(2px);
    }
    #rwl5-overlay.open { opacity: 1; pointer-events: all; }
    .rwl5-shortcut-select {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #e2e8f0;
      padding: 4px 8px;
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }
    #rwl5-toast {
      position: fixed;
      bottom: 24px; left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #e2e8f0;
      padding: 8px 16px;
      font-size: 12px;
      font-family: 'SF Pro Display', system-ui, sans-serif;
      z-index: 2147483647;
      opacity: 0;
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
      white-space: nowrap;
    }
    #rwl5-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  `;

  // ─── Default Config ────────────────────────────────────────────────────────

  const DEFAULT_CONFIG = {
    version: 5,
    enabled: true,
    globalMode: false,       // unlock every site without a blacklist
    blockOverlays: true,     // remove copy-blocking overlay divs
    fixIframes: true,        // apply hooks inside iframes
    shortcut: 'ctrlc',       // off | f1 | ctrlf1 | ctrlc | ctrlshift c
    showUI: true,
    uiTop: 120,
    sites: [],               // blacklist of hostnames
  };

  // ─── State ────────────────────────────────────────────────────────────────

  let cfg        = loadConfig();
  let isActive   = false;
  const hostname = location.hostname;

  // Saved originals
  const _addEventListener  = EventTarget.prototype.addEventListener;
  const _docAddEventListener = document.addEventListener.bind(document);
  const _preventDefault    = Event.prototype.preventDefault;

  // ─── Config helpers ───────────────────────────────────────────────────────

  function loadConfig() {
    const saved = GM_getValue(STORAGE_KEY);
    if (!saved) return { ...DEFAULT_CONFIG };
    // Merge so new keys get defaults
    return { ...DEFAULT_CONFIG, ...saved };
  }

  function saveConfig() {
    GM_setValue(STORAGE_KEY, cfg);
  }

  function siteEnabled() {
    if (cfg.globalMode) return true;
    return cfg.sites.some(s => hostname.includes(s));
  }

  function addSite(host) {
    if (!cfg.sites.includes(host)) {
      cfg.sites.push(host);
      cfg.sites.sort();
      saveConfig();
    }
  }

  function removeSite(host) {
    cfg.sites = cfg.sites.filter(s => s !== host);
    saveConfig();
  }

  // ─── Core unlock ──────────────────────────────────────────────────────────

  function hookEvents() {
    // Override addEventListener globally
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (HOOK_EVENTS.includes(type)) {
        // Register a no-op that always returns true
        _addEventListener.call(this, type, returnTrue, opts);
      } else {
        _addEventListener.apply(this, arguments);
      }
    };

    // Override preventDefault
    Event.prototype.preventDefault = function () {
      if (!HOOK_EVENTS.includes(this.type)) {
        _preventDefault.apply(this, arguments);
      }
    };

    // Block returnValue setter for these events
    Object.defineProperty(Event.prototype, 'returnValue', {
      set(v) {
        if (HOOK_EVENTS.includes(this.type)) return;
        this._returnValue = v;
      },
      get() { return this._returnValue ?? true; },
      configurable: true,
    });
  }

  function unhookEvents() {
    EventTarget.prototype.addEventListener = _addEventListener;
    Event.prototype.preventDefault        = _preventDefault;
    try {
      delete Event.prototype.returnValue;
    } catch (_) {}
  }

  function clearDom0() {
    const all = [...document.querySelectorAll('*'), document, window];
    for (const el of all) {
      for (const evt of HOOK_EVENTS) {
        const prop = 'on' + evt;
        try {
          if (el[prop] && el[prop] !== returnTrue) {
            el[prop] = returnTrue;
          }
        } catch (_) {}
      }
    }
    // Ensure mousedown always returns true (common blocker)
    document.onmousedown = returnTrue;
    document.onselectstart = returnTrue;
  }

  function applyCSS() {
    GM_addStyle(CSS_UNLOCK);
  }

  function removeCSS() {
    const el = document.getElementById('__rwl5_css__');
    if (el) el.remove();
  }

  function blockOverlays() {
    if (!cfg.blockOverlays) return;

    // Generic: find large fixed/absolute divs with no text that cover content
    const kill = (selector) => {
      document.querySelectorAll(selector).forEach(el => {
        try { el.remove(); } catch (_) {}
      });
    };

    // Known overlay patterns
    const overlaySelectors = [
      '.marks', '.layui-layer-shade',
      '[class*="protect"]', '[class*="nocopy"]',
      '[class*="no-copy"]', '[class*="antiCopy"]',
      '[class*="noCopy"]', '[id*="noCopy"]',
      '[id*="nocopy"]', '.fullimg',
    ];
    kill(overlaySelectors.join(','));

    // Heuristic: invisible fixed full-screen divs
    document.querySelectorAll('body > div, body > section').forEach(el => {
      const s = getComputedStyle(el);
      if (
        (s.position === 'fixed' || s.position === 'absolute') &&
        (s.pointerEvents === 'none' || s.zIndex > 100) &&
        el.offsetWidth > window.innerWidth * 0.8 &&
        el.offsetHeight > window.innerHeight * 0.8 &&
        !el.textContent?.trim()
      ) {
        el.remove();
      }
    });
  }

  function applyIframes() {
    if (!cfg.fixIframes) return;
    document.querySelectorAll('iframe, frame').forEach(frame => {
      try {
        const fdoc = frame.contentDocument;
        if (!fdoc) return;
        GM_addStyle.call({ document: fdoc }, CSS_UNLOCK);
        fdoc.addEventListener = EventTarget.prototype.addEventListener;
        fdoc.oncontextmenu = returnTrue;
        fdoc.onselectstart = returnTrue;
      } catch (_) {}
    });
  }

  function returnTrue() { return true; }

  // ─── Activation ───────────────────────────────────────────────────────────

  let dom0Timer = null;

  function activate() {
    isActive = true;
    hookEvents();
    applyCSS();
    clearDom0();
    blockOverlays();
    applyIframes();
    dom0Timer = setInterval(() => {
      clearDom0();
      blockOverlays();
      applyIframes();
    }, 5000);
    // Also run on DOM mutations for dynamic sites
    observeDom();
    updateUI();
    toast('✓ Restrictions removed');
  }

  function deactivate() {
    isActive = false;
    unhookEvents();
    removeCSS();
    if (dom0Timer) { clearInterval(dom0Timer); dom0Timer = null; }
    if (domObserver) { domObserver.disconnect(); domObserver = null; }
    updateUI();
    toast('Restrictions restored — reload to fully reset');
  }

  // ─── MutationObserver for dynamic pages ───────────────────────────────────

  let domObserver = null;

  function observeDom() {
    if (domObserver) return;
    domObserver = new MutationObserver(() => {
      clearDom0();
      blockOverlays();
    });
    domObserver.observe(document.documentElement, {
      childList: true, subtree: true, attributes: false,
    });
  }

  // ─── Keyboard shortcut ────────────────────────────────────────────────────

  function handleKey(e) {
    const sc = cfg.shortcut;
    if (sc === 'off') return;
    const key = e.key?.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    let match = false;
    if (sc === 'f1'       && key === 'f1' && !ctrl)          match = true;
    if (sc === 'ctrlf1'   && key === 'f1' &&  ctrl)          match = true;
    if (sc === 'ctrlc'    && key === 'c'  &&  ctrl && !shift) match = true;
    if (sc === 'ctrlshiftc' && key === 'c' && ctrl && shift)  match = true;

    if (match) {
      const text = window.getSelection()?.toString();
      if (text) {
        GM_setClipboard(text);
        toast(`✓ Copied ${text.length} chars`);
      }
    }
  }

  window.addEventListener('keydown', handleKey, true);

  // ─── UI ───────────────────────────────────────────────────────────────────

  function buildUI() {
    if (!cfg.showUI) return;
    if (window.self !== window.top) return; // Don't render in iframes

    GM_addStyle(UI_STYLES);

    // Toast
    const toast_el = document.createElement('div');
    toast_el.id = 'rwl5-toast';
    document.documentElement.appendChild(toast_el);

    // Pill
    const root = document.createElement('div');
    root.id = 'rwl5-root';
    root.style.setProperty('--rwl-top', cfg.uiTop + 'px');
    root.innerHTML = `
      <div id="rwl5-pill">
        <span id="rwl5-dot"></span>
        <span id="rwl5-label">Limits</span>
        <div id="rwl5-toggle"></div>
        <span id="rwl5-gear">⚙</span>
      </div>
    `;
    document.documentElement.appendChild(root);

    // Panel overlay
    const overlay = document.createElement('div');
    overlay.id = 'rwl5-overlay';
    document.documentElement.appendChild(overlay);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'rwl5-panel';
    panel.innerHTML = buildPanelHTML();
    document.documentElement.appendChild(panel);

    // Events
    root.querySelector('#rwl5-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSite();
    });

    root.querySelector('#rwl5-gear').addEventListener('click', (e) => {
      e.stopPropagation();
      openPanel();
    });

    overlay.addEventListener('click', closePanel);
    panel.querySelector('#rwl5-close').addEventListener('click', closePanel);
    panel.querySelector('#rwl5-save').addEventListener('click', savePanel);
    panel.querySelector('#rwl5-reset').addEventListener('click', resetConfig);
    panel.querySelector('#rwl5-add-site').addEventListener('click', () => {
      addSite(hostname);
      if (!isActive) activate();
      closePanel();
    });

    updateUI();
    makeDraggable(root);
  }

  function buildPanelHTML() {
    const siteList = cfg.sites.map(s =>
      `<span class="rwl5-site-tag${s === hostname ? ' current' : ''}">${s}</span>`
    ).join(' ') || '<span style="color:#475569;font-size:11px">No sites added yet</span>';

    return `
      <div id="rwl5-panel-header">
        <h2>⚡ Remove Web Limits v5</h2>
        <button id="rwl5-close">×</button>
      </div>
      <div id="rwl5-panel-body">
        <div class="rwl5-section">
          <div class="rwl5-section-title">Current site</div>
          <div class="rwl5-row">
            <span>${hostname}</span>
            <button id="rwl5-add-site" class="rwl5-btn primary">+ Add site</button>
          </div>
        </div>

        <div class="rwl5-section">
          <div class="rwl5-section-title">Options</div>
          <div class="rwl5-row">
            <span>Global mode (all sites)</span>
            <button class="rwl5-switch${cfg.globalMode ? ' on' : ''}" id="sw-global"></button>
          </div>
          <div class="rwl5-row">
            <span>Block copy overlays</span>
            <button class="rwl5-switch${cfg.blockOverlays ? ' on' : ''}" id="sw-overlays"></button>
          </div>
          <div class="rwl5-row">
            <span>Fix iframes</span>
            <button class="rwl5-switch${cfg.fixIframes ? ' on' : ''}" id="sw-iframes"></button>
          </div>
          <div class="rwl5-row">
            <span>Show UI button</span>
            <button class="rwl5-switch${cfg.showUI ? ' on' : ''}" id="sw-showui"></button>
          </div>
          <div class="rwl5-row">
            <span>Copy shortcut</span>
            <select class="rwl5-shortcut-select" id="rwl5-shortcut">
              <option value="off"       ${cfg.shortcut==='off'        ?'selected':''}>Off</option>
              <option value="f1"        ${cfg.shortcut==='f1'         ?'selected':''}>F1</option>
              <option value="ctrlf1"    ${cfg.shortcut==='ctrlf1'     ?'selected':''}>Ctrl+F1</option>
              <option value="ctrlc"     ${cfg.shortcut==='ctrlc'      ?'selected':''}>Ctrl+C (force copy)</option>
              <option value="ctrlshiftc"${cfg.shortcut==='ctrlshiftc' ?'selected':''}>Ctrl+Shift+C</option>
            </select>
          </div>
        </div>

        <div class="rwl5-section">
          <div class="rwl5-section-title">Site blacklist</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;padding:10px;background:#1e293b;border-radius:8px;min-height:36px">
            ${siteList}
          </div>
          <textarea class="rwl5-textarea" id="rwl5-sites-raw" rows="5">${cfg.sites.join('\n')}</textarea>
        </div>

        <div class="rwl5-btn-row">
          <button class="rwl5-btn danger" id="rwl5-reset">Reset all</button>
          <button class="rwl5-btn ghost" id="rwl5-close2" onclick="document.getElementById('rwl5-overlay').click()">Cancel</button>
          <button class="rwl5-btn primary" id="rwl5-save">Save & reload</button>
        </div>
      </div>
    `;
  }

  function openPanel() {
    document.getElementById('rwl5-panel').innerHTML = buildPanelHTML();
    bindPanelEvents();
    document.getElementById('rwl5-panel').classList.add('open');
    document.getElementById('rwl5-overlay').classList.add('open');
  }

  function bindPanelEvents() {
    const panel = document.getElementById('rwl5-panel');
    panel.querySelector('#rwl5-close').addEventListener('click', closePanel);
    panel.querySelector('#rwl5-save').addEventListener('click', savePanel);
    panel.querySelector('#rwl5-reset').addEventListener('click', resetConfig);
    panel.querySelector('#rwl5-add-site').addEventListener('click', () => {
      addSite(hostname);
      if (!isActive) activate();
      closePanel();
    });

    // Switches
    const switches = {
      'sw-global':   'globalMode',
      'sw-overlays': 'blockOverlays',
      'sw-iframes':  'fixIframes',
      'sw-showui':   'showUI',
    };
    for (const [id, key] of Object.entries(switches)) {
      panel.querySelector(`#${id}`)?.addEventListener('click', function() {
        cfg[key] = !cfg[key];
        this.classList.toggle('on', cfg[key]);
      });
    }
  }

  function closePanel() {
    document.getElementById('rwl5-panel')?.classList.remove('open');
    document.getElementById('rwl5-overlay')?.classList.remove('open');
  }

  function savePanel() {
    const raw = document.getElementById('rwl5-sites-raw').value;
    cfg.sites = raw.split('\n').map(s => s.trim()).filter(Boolean);
    cfg.shortcut = document.getElementById('rwl5-shortcut').value;
    saveConfig();
    closePanel();
    location.reload();
  }

  function resetConfig() {
    GM_deleteValue(STORAGE_KEY);
    location.reload();
  }

  function toggleSite() {
    if (cfg.globalMode) {
      toast('Global mode is on — disable it in settings first');
      return;
    }
    if (isActive) {
      removeSite(hostname);
      deactivate();
    } else {
      addSite(hostname);
      activate();
    }
  }

  function updateUI() {
    const root = document.getElementById('rwl5-root');
    if (!root) return;
    root.classList.toggle('active', isActive);
    root.classList.toggle('partial', !isActive && cfg.globalMode);
  }

  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('rwl5-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function makeDraggable(el) {
    const handle = el.querySelector('#rwl5-pill');
    let startY, startTop;
    handle.addEventListener('mousedown', e => {
      startY   = e.clientY;
      startTop = parseInt(getComputedStyle(el).top);
      const onMove = (e) => {
        const top = Math.max(0, Math.min(window.innerHeight - 40, startTop + e.clientY - startY));
        el.style.top = top + 'px';
        el.style.setProperty('--rwl-top', top + 'px');
      };
      const onUp = () => {
        cfg.uiTop = parseInt(el.style.top);
        saveConfig();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  // ─── Greasemonkey menu ────────────────────────────────────────────────────

  GM_registerMenuCommand('⚡ RWL: Toggle this site', toggleSite);
  GM_registerMenuCommand('⚙ RWL: Settings', openPanel);

  // ─── Init ────────────────────────────────────────────────────────────────

  function init() {
    buildUI();
    if (siteEnabled()) activate();
  }

  // Build UI immediately; hooks run at document-start so they catch everything
  if (document.documentElement) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
