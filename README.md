# FPP Overlay Effects

A WLED-style interface for **FPP’s own native overlay effects**, rebuilt for **FPP 10.4+**. It runs on your existing FPP player and uses its effect engine, models, and output configuration. A separate WLED controller is not required.

- Touch color wheel, RGB hex entry, color slots, quick colors, and brightness.
- Effect-specific sliders, switches, palettes, text, fonts, and other arguments read from the connected FPP.
- Models, lazy xLights submodels, model groups, and polar/buffer views, with search and type filters.
- RGB, RGBW white-channel control, and an intensity control for single-channel targets.
- Local port / virtual-string / protocol / wire-order information, including smart-receiver banks.
- Favorites and named presets stored on the FPP, shared between browsers.
- Compact **Status-page bubbles: prop name + running effect + Stop**. Nothing is shown when no effects are running.
- Optional native MultiSync commands to explicitly selected FPP systems.

## Install

**[Installation manifest — copy this link into FPP](https://raw.githubusercontent.com/ravenridgelights-turtle/FPP-Overlay-Effects/main/pluginInfo.json)**

```text
https://raw.githubusercontent.com/ravenridgelights-turtle/FPP-Overlay-Effects/main/pluginInfo.json
```

1. Use **FPP 10.4 or later**. In **Content Setup → Plugin Manager**, paste the manifest URL into the plugin search / URL field. Some versions label this menu **Plugins**.
2. FPP 10.4 restricts loading unlisted plugin URLs to the **Developer** user-interface level. If the URL does not load, temporarily select **Developer** for **User Interface Level** in FPP Settings and return to Plugin Manager.
3. Load the plugin information, choose **Install**, and wait for completion. This plugin needs no additional packages or daemon service.
4. Refresh the browser. Open **Status/Control → FPP Overlay Effects**. Refresh the normal Status page to load its effect bubbles.
5. You may restore your preferred FPP interface level after installation. Use Plugin Manager’s Update button for subsequent updates.

The release page also contains this link and full usage instructions: **[Latest release](https://github.com/ravenridgelights-turtle/FPP-Overlay-Effects/releases/latest)**.

### Replacing fpp-WledEffects

Stop active effects in the old plugin first. Install this as **FPP-Overlay-Effects**, then use its new menu entry. It uses its own settings file and does not change or delete the original plugin’s configuration. Remove the old plugin through Plugin Manager when you no longer need it. Old FPPMobile builds that only detect `fpp-WledEffects` will need their shortcut updated separately.

## Use

1. In **Lights & models**, choose your targets. Search also matches a submodel’s parent. **Subs**, **Groups**, and **Buffers** include targets that FPP has not materialized yet.
2. Select **Solid Color**, a native effect such as Text or Bars, or a built-in **WLED** effect. The controls are loaded from that effect’s FPP description, in its exact argument order.
3. Choose a color slot and use the wheel, swatches, system picker, or hex entry. For RGBW targets, **White channel** edits the separate W component. Set brightness and any effect options.
4. Press **Apply**. Model selection and page/preset loading do not start output.
5. For **Live changes**, enable the switch and press Apply once. Each completed drag or control edit sends an update; wheel movement itself does not flood FPP. Changing targets, loading a preset, leaving the tab, refreshing, or stopping disarms live output until Apply is pressed again.
6. **Stop selected** stops effects and solid fills on exactly the selected targets, releases the overlays, and allows sequence data to show again. It does not stop a playlist, music, or other models.

On a phone, use the **Colors / Effects / Models / Presets** tabs.

### Models, submodels, and groups

Selecting a parent selects that target only; it does not silently select its submodels. Select a submodel directly to control only those pixels. Model groups use their own FPP group buffer. A parent and one of its submodels can overlap, as can a group and its members; avoid competing effects on the same pixels unless that is intentional.

If newly exported submodels/groups do not appear, refresh this page and check FPP’s own Pixel Overlay Models page. Re-upload the relevant xLights model data and follow FPP’s restart instructions if its lazy model index is stale.

### Smart colors and mixed outputs

FPP’s channel buffers use logical RGB or RGBW. Its output drivers apply each virtual string’s configured wire order (GRB, BRG, WRGB, etc.), grouping, reversal, null pixels, gamma, and output brightness. The plugin **does not swap channels a second time**.

The read-only **Output & pixel information** panel matches models to local pixel strings. Grid submodels and channel-grid groups are checked using their mapped channels. Rectangular submodels show inherited parent information, labeled as such. Unknown hardware mappings are labeled unavailable instead of guessed.

RGB and RGBW models may be selected together: color arguments and solid fills are adapted per model. Single-channel targets receive grayscale intensity. A detected conflict between an overlay’s channels per node and its mapped string prevents Apply; fix the model/export or use separate compatible targets. A group spanning different node widths needs compatible group geometry in FPP; the plugin cannot repair a fundamentally mismatched FPP channel grid.

FPP generally cannot inspect the physical pixel protocol or wire order of a separate network controller. Configure those on that controller. RGBW color arguments are passed to the native FPP effect engine; procedural palettes and effects determine their own use of white.

### Running-effect bubbles on Status

The normal FPP Status page shows one compact bubble per running overlay: **target name, effect name, Stop**. Bubbles support models, submodels, and groups. **Stop shown** appears when several effects are listed. Stopping the last effect hides the entire panel; there is no empty heading or placeholder. The display works while a sequence is running and coexists with After Show Hours Radio.

The source is FPP’s actual `/api/overlays/running` response, so an effect started elsewhere also appears. A solid/static fill is not a running effect in FPP’s API and does not create a bubble; use **Stop selected** in this plugin to release a fill. Normal refresh is approximately 3 seconds while active and 8 seconds while idle. Polling pauses in a hidden browser tab.

### Presets and favorites

Click a star to favorite an effect. Enter a preset name and **Save preset** to save its targets, visibility, color, and parameters. Saving an existing name replaces that preset. **Load** a preset, review its current targets, then Apply. Missing models are reported; unavailable effects are rejected. Presets store parameters by name and are rebuilt against the current FPP schema.

Settings are in `config/plugin.FPP-Overlay-Effects.json`. If this file cannot be read, saving is disabled so existing presets cannot be overwritten accidentally. A visible save indicator reports write failures.

### MultiSync

Open **MultiSync commands**, enable it, and select individual systems. This sends the same target names and native command arguments to those FPP players in addition to local output. Each remote needs matching model names and compatible effects. FPP’s UDP MultiSync command delivery is unacknowledged; the UI reports **sent**, not confirmed remote playback. Pixel information and Status bubbles describe the local FPP. MultiSync is off on each page load until explicitly enabled.

## Compatibility and verification

Implemented against the released [FPP 10.4 source, commit 123b8ca](https://github.com/FalconChristmas/fpp/tree/123b8ca089b98a54f7f5c0b7ee7b72ed18217f21) (November 9, 2026), including command responses as plain text, ordered argument metadata, lazy submodel discovery, and fill/stop effect retirement. Later versions are supported through runtime discovery as long as these APIs remain compatible.

The automated suite checks command payloads, RGB/RGBW/mono handling, mixed strings, model/group/submodel discovery, presets, races, Stop behavior, desktop/mobile layout, and Status bubbles against a **simulated FPP HTTP service**. It does not replace physical-light validation on a real FPP player. Start with one prop at low brightness and verify red, green, blue, and white against your actual wiring.

Development checks (Node/Playwright are not required on the FPP):

```sh
npm ci
npm test
php tests/model-index.php
npx playwright install chromium
npm run test:ui
```

## Credits and license

Derived from [Adam Coulombe’s fpp-WledEffects](https://github.com/adamcoulombe/fpp-WledEffects), upstream commit `6e0bbe88f593948766faf23279f52c6b06b53a46`. The web interface and discovery code have been rebuilt. The original GNU GPL v2 license is preserved in [LICENSE](LICENSE).

The design was also informed by the owner’s FPPMobile `FPP_10_VBAN` controls and After Show Hours Radio’s use of FPP’s Status menu hook. This repository does not include their application source. FPP and WLED are the respective projects’ names; this is a community plugin.
