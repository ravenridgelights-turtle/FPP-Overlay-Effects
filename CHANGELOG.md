# Changelog

## 1.0.1 — 2026-11-16

- Fix missing home-screen bubbles for solid colors and static Text/Image: use live enabled-overlay state instead of the animations-only running endpoint.
- Save successful look labels per target so static looks remain named after navigation; current FPP state always decides visibility.
- Show fills already active before updating, even without saved labels. A label-storage failure cannot hide active targets or prevent Stop.
- Preserve per-target Stop and hide the entire panel after the last overlay is released.
- Add regressions for Apply → Status navigation with real fill state transitions, static Text/Image, mixed active looks, and stale/failed history.

## 1.0.0 — 2026-11-16

- Rename the plugin to FPP Overlay Effects and rebuild its web interface around native FPP effects.
- Target the released FPP 10.4 APIs and read each effect’s ordered argument schema dynamically.
- Add a touch/keyboard color wheel, per-effect color slots, RGBW white control, single-channel intensity, and native brightness/palette controls.
- Discover lazy xLights submodels, groups, and buffer views alongside ordinary models.
- Read local pixel strings to show port, receiver, virtual string, protocol, and wire order; detect incompatible node widths without changing output configuration.
- Add searchable effects, favorites, shared presets, manual Apply, and serialized/coalesced Live changes.
- Add active-only Status bubbles with per-target Stop and Stop shown; hide the entire panel when the last running effect stops.
- Preserve targeted Stop semantics, handle plain-text command replies, and isolate optional MultiSync discovery failures from local control.
- Add PHP, command-contract, and desktop/mobile browser integration checks, plus automatic release packaging after successful checks.
