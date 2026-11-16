# First run on a real player

Automated tests use simulated FPP responses. The following checks still require physical lights.

1. Install on FPP 10.4+ and start with one small prop at low brightness.
2. Use Solid Color for red, green, blue, white, and black. Compare Output & pixel information with the correct controller port / virtual string. Correct wire order at the owning output/controller if needed.
3. On an RGBW target, test the separate white channel. Select an RGB and RGBW target together and verify both. Check one single-channel target with its dimmer.
4. Select a lazy submodel, then a group, then a buffer view individually. Confirm only the intended pixels respond. Avoid simultaneous overlapping selections while verifying geometry.
5. Try at least two WLED effects with different sliders; try Text with a font and a message. Test switching animation → fill → animation.
6. Start a sequence and an overlay. Confirm the Status bubble names the target and actual effect. Use its Stop; verify sequence pixels return and the bubble disappears. Repeat with multiple targets and Stop shown. Confirm the radio panel is unaffected.
7. Enable Live changes, Apply, change a color, and immediately Stop. Verify the stopped lights stay released. Change targets and verify Apply is required again.
8. Save a preset, reload on a phone, load it, and confirm no lights start until Apply.
9. If using MultiSync, verify matching target names and schema on each remote independently; UDP command delivery has no remote acknowledgment.

For a report, include FPP version, plugin version, target type, pixel protocol / node width, and any visible error. Do not include passwords or private access URLs.
