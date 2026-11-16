<h2>FPP Overlay Effects</h2>
<p>Select models, submodels, model groups, or buffer views in <b>Lights &amp; models</b>. Choose an effect, edit its colors and options, then press <b>Apply</b>. On a phone, switch between Colors, Effects, Models, and Presets.</p>
<h3>Colors and output configuration</h3>
<p>The wheel changes the active color slot. Each effect supplies its own color slots, palettes, and arguments. RGBW targets expose a separate White channel; single-channel targets use a dimmer. FPP applies each string’s wire order. The plugin reads local output settings for its information panel and never changes them.</p>
<p>A channel-width mismatch must be corrected in the FPP model or xLights export. Wire order and pixel protocol on a network controller must be configured on that controller.</p>
<h3>Live changes and Stop</h3>
<p>Enable Live changes and press Apply once to arm them for the current selection. Completed edits update the lights. Changing targets, loading a preset, refreshing, leaving the tab, or stopping disarms live output.</p>
<p><b>Stop selected</b> stops the selected overlays and releases their pixels to the show. Other targets, playlists, and music continue. Selecting a parent does not select its submodels. Avoid competing overlays on a parent and its children or on a group and its members.</p>
<h3>Status bubbles</h3>
<p>Refresh FPP’s normal Status page after installation or update. Every active overlay has a bubble with its target, look/effect, and Stop button, including solid colors and static Text/Image. Successful commands retain their labels after you leave this page. Fills started before the update appear as Solid / static overlay. When the last overlay is stopped or disabled, the panel disappears completely; saved presets and old history do not keep it visible.</p>
<h3>Presets and MultiSync</h3>
<p>Save a named preset to keep its target names and parameters on this FPP. Load and review it before pressing Apply. Saving the same name replaces it. Favorites filter the effect list.</p>
<p>MultiSync optionally sends commands to selected FPP systems with matching target names and compatible effects. Remote delivery is unacknowledged by FPP. The pixel information and Status bubbles describe the local player.</p>
<p><a href="https://github.com/ravenridgelights-turtle/FPP-Overlay-Effects/releases/latest" target="_blank" rel="noopener">Installation instructions, releases, and full usage guide</a></p>
