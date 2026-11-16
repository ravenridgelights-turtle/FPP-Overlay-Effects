# FPP 10.4 contracts used by this plugin

Source reviewed: FalconChristmas/fpp `v10.4`, commit `123b8ca089b98a54f7f5c0b7ee7b72ed18217f21`.

| Operation | Endpoint / contract | Source |
| --- | --- | --- |
| Models and live state | GET `api/overlays/models` | `src/overlays/PixelOverlay.cpp`, `render_GET` |
| Lazy submodel/group names | GET `api/models?simple=true&submodels=true` | `PixelOverlayManager::loadSubModelIndex` and `render_GET` |
| Effect names | GET `api/overlays/effects` | `PixelOverlay.cpp` |
| One effect’s ordered args | GET `api/overlays/effects/{encodedName}` | `Commands.cpp`, `Command::getDescription` |
| Fonts / images / other choices | Same-origin `contentListUrl` declared by each argument | `CommandArg` metadata |
| Running-effect bubbles | GET `api/overlays/running`, each `{Name, effect:{name,...}}` | `PixelOverlayManager::getActiveOverlayEffects` |
| Run native effect | POST `api/command`, `command: "Overlay Model Effect"`, `args: [names, visibility, effect, ...orderedValues]` | `ApplyEffectOverlayCommand` |
| Solid fill | `Overlay Model Fill`, `[names, state, "#RRGGBB[WW]"]` | `FillOverlayCommand` |
| Stop and release | `Overlay Model Effect`, `[names, "Enabled", "Stop Effects"]` | `StopEffect` and auto-disable |
| Save configuration | GET / POST `api/configfile/plugin.FPP-Overlay-Effects.json` | `www/api/controllers/configfile.php` |
| Optional systems | GET `api/fppd/multiSyncSystems`; commands with `multisyncCommand` and explicit `multisyncHosts` | `CommandManager::run(const Json::Value&)` |

Command success bodies can be **text/plain**. Do not force JSON parsing on them.

`lib/model-index.php` mirrors the compact discovery approach used by FPP’s own `www/pixeloverlaymodels.php`. It reads fixed local filenames and emits names/types/dimensions and output-profile references, never full grids. `grid` submodels use `ParentStartChannel - 1 + (node - 1) * ChannelCountPerNode`; `channelgrid` cells contain 1-based absolute channels, including `&`-joined members. Rectangular submodels inherit a parent’s possible outputs and are labeled approximate.

`PixelOverlayModel.cpp` derives logical `ColorOrder` from node width. `src/channeloutput/PixelString.cpp` applies the actual hardware order: incoming data is RGB/RGBW. Virtual-string starts are **zero-based**, ordinary model StartChannel is **one-based**, grouping reduces the consumed source nodes, and null pixels do not consume source channels. The browser must never pre-permute color bytes for a GRB/WRGB string.

FPP 10.4 retires old effects during fill. This plugin therefore sends the native Fill command directly, without the old stop/poll/fill sequence that could race an asynchronous stop. Status bubbles use only the running API: enabled static overlays are not mislabeled as running animations.
