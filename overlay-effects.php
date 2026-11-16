<link rel="stylesheet" href="plugin.php?plugin=FPP-Overlay-Effects&amp;file=assets/overlay-effects.css&amp;nopage=1&amp;v=1.0.0">
<div id="foe" class="foe" data-version="1.0.0">
  <header class="foe-header">
    <div class="foe-brand"><span class="foe-logo" aria-hidden="true">◉</span><div><strong>OVERLAY EFFECTS</strong><span>FPP native light control</span></div></div>
    <div class="foe-header-actions"><span id="foe-connection" class="foe-pill" role="status">Connecting…</span><button id="foe-refresh" type="button" title="Refresh effects, models, and port configuration">↻ <span>Refresh</span></button><a class="foe-icon-link" href="plugin.php?plugin=FPP-Overlay-Effects&amp;page=help/overlay-effects.php" title="Usage guide">?</a></div>
  </header>
  <div id="foe-notice" class="foe-notice" role="status" aria-live="polite">Loading your FPP models and effects…</div>
  <div class="foe-now">
    <div><span class="foe-eyebrow">EDITING</span><h2 id="foe-effect-name">Solid Color</h2><span id="foe-selection-summary" class="foe-muted">Choose the lights to control</span></div>
    <div class="foe-now-actions"><label class="foe-switch"><input id="foe-live" type="checkbox"><span>Live changes</span></label><button id="foe-apply" type="button" class="foe-primary" disabled>▶ Apply</button><button id="foe-stop" type="button" class="foe-danger" disabled title="Stop effects and solid fills on selected targets, releasing them to the show">⏻ Stop selected</button></div>
  </div>
  <nav class="foe-mobile-tabs" aria-label="Control panels"><button type="button" data-panel="colors" aria-pressed="true">Colors</button><button type="button" data-panel="effects" aria-pressed="false">Effects</button><button type="button" data-panel="models" aria-pressed="false">Models</button><button type="button" data-panel="presets" aria-pressed="false">Presets</button></nav>
  <div class="foe-grid">
    <section class="foe-card foe-color-card" data-section="colors" aria-label="Colors">
      <div class="foe-card-heading"><h3>Colors</h3><span id="foe-color-label" class="foe-muted">Solid fill</span></div>
      <div id="foe-color-slots" class="foe-color-slots"></div>
      <div class="foe-wheel-wrap"><canvas id="foe-wheel" width="300" height="300" tabindex="0" role="slider" aria-label="Color wheel" aria-valuemin="0" aria-valuemax="360" aria-valuenow="24" aria-valuetext="Orange. Use left and right for hue, up and down for saturation."></canvas></div>
      <p id="foe-no-colors" class="foe-muted" hidden>This effect generates its own colors. Its palette and other controls are in Effects.</p>
      <div class="foe-color-entry"><input id="foe-native-color" type="color" value="#ff6600" aria-label="System color picker"><label for="foe-hex" class="foe-sr-only">Color hex value</label><input id="foe-hex" type="text" value="#FF6600" maxlength="9" spellcheck="false" autocapitalize="characters"><button id="foe-copy-color" type="button" title="Copy color hex">Copy</button></div>
      <div id="foe-swatches" class="foe-swatches" aria-label="Quick colors"></div>
      <label class="foe-control" id="foe-color-level-row"><span>Color level <output id="foe-color-level-value">100%</output></span><input id="foe-color-level" type="range" min="0" max="100" value="100" aria-label="Color level"></label>
      <label class="foe-control" id="foe-white-row" hidden><span>White channel <output id="foe-white-value">0</output></span><input id="foe-white" type="range" min="0" max="255" value="0" aria-label="White channel"></label>
      <div id="foe-brightness"></div>
      <div id="foe-color-preview" class="foe-color-preview" aria-label="Selected colors"></div>
      <p class="foe-help">The wheel edits the selected color slot. FPP applies each output’s configured wire order.</p>
    </section>
    <div class="foe-center" data-section="effects">
      <section class="foe-card">
        <div class="foe-card-heading"><h3>Effects</h3><span id="foe-effect-count" class="foe-pill">…</span></div>
        <label class="foe-sr-only" for="foe-effect-search">Search effects</label><input id="foe-effect-search" class="foe-search" type="search" placeholder="Search native & WLED effects…">
        <div class="foe-filters" id="foe-effect-filters"><button type="button" data-filter="all" aria-pressed="true">All</button><button type="button" data-filter="wled" aria-pressed="false">WLED</button><button type="button" data-filter="native" aria-pressed="false">Native</button><button type="button" data-filter="favorites" aria-pressed="false">★ Favorites</button></div>
        <div id="foe-effects" class="foe-effects" aria-label="Available effects"></div>
      </section>
      <section class="foe-card foe-parameters"><div class="foe-card-heading"><h3>Effect controls</h3><button id="foe-defaults" type="button" class="foe-text-button">Reset values</button></div><form id="foe-arguments" autocomplete="off"></form><div class="foe-separator"></div><label class="foe-control"><span>Model visibility</span><select id="foe-visibility"><option>Enabled</option><option>Transparent</option><option>Transparent RGB</option></select></label><p class="foe-help" id="foe-visibility-help">Enabled replaces the selected model’s show pixels. Stop selected returns control to the show.</p></section>
    </div>
    <section class="foe-card foe-model-card" data-section="models">
      <div class="foe-card-heading"><h3>Lights & models</h3><span id="foe-model-count" class="foe-pill">…</span></div>
      <label class="foe-sr-only" for="foe-model-search">Search models, submodels, groups, or parents</label><input id="foe-model-search" class="foe-search" type="search" placeholder="Search models & submodels…">
      <div class="foe-filters" id="foe-model-filters"><button type="button" data-filter="all" aria-pressed="true">All</button><button type="button" data-filter="model" aria-pressed="false">Models</button><button type="button" data-filter="submodel" aria-pressed="false">Subs</button><button type="button" data-filter="group" aria-pressed="false">Groups</button><button type="button" data-filter="buffer" aria-pressed="false">Buffers</button></div>
      <div class="foe-model-actions"><button id="foe-select-visible" type="button" class="foe-text-button">Select visible</button><button id="foe-clear-selection" type="button" class="foe-text-button">Clear selection</button></div>
      <div id="foe-models" class="foe-models" aria-label="Available targets"></div>
      <p id="foe-overlap" class="foe-help" hidden></p>
      <details class="foe-details"><summary>Output & pixel information</summary><div id="foe-output-info" class="foe-output-info">Select a target to see its configured outputs.</div></details>
      <details class="foe-details"><summary>MultiSync commands</summary><label class="foe-switch"><input id="foe-multisync" type="checkbox"><span>Also send to selected FPP systems</span></label><div id="foe-systems"></div><p class="foe-help">Remote players must have the same target names and effect arguments. This page’s pixel information describes this FPP only. Remote delivery is unacknowledged by FPP.</p></details>
    </section>
    <section class="foe-card foe-preset-card" data-section="presets"><div class="foe-card-heading"><h3>Presets</h3><span class="foe-muted">Saved on this FPP</span></div><div class="foe-preset-save"><label class="foe-sr-only" for="foe-preset-name">Preset name</label><input id="foe-preset-name" type="text" maxlength="80" placeholder="Name this look…"><button id="foe-preset-save" class="foe-primary" type="button" disabled>+ Save preset</button></div><div id="foe-presets" class="foe-presets"></div><p class="foe-help">Load a preset to review its targets and values, then press Apply. Loading a page or preset never starts lights.</p></section>
  </div>
  <footer class="foe-footer"><span id="foe-save-status" role="status">Settings ready</span><span>FPP Overlay Effects <span id="foe-version">1.0.0</span> · <a href="https://github.com/ravenridgelights-turtle/FPP-Overlay-Effects/releases" target="_blank" rel="noopener">Releases & help ↗</a></span></footer>
</div>
<script src="plugin.php?plugin=FPP-Overlay-Effects&amp;file=assets/core.js&amp;nopage=1&amp;v=1.0.0"></script>
<script src="plugin.php?plugin=FPP-Overlay-Effects&amp;file=assets/app.js&amp;nopage=1&amp;v=1.0.0"></script>
