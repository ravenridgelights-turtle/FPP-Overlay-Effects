# First run on a real player

Automated tests use simulated FPP responses. The following checks still require physical lights.

1. Install on FPP 10.4+ and start with one small prop at low brightness.
2. Use Solid Color for red, green, blue, white, and black. Compare Output & pixel information with the correct controller port / virtual string. Correct wire order at the owning output/controller if needed.
3. On an RGBW target, test the separate white channel. Select an RGB and RGBW target together and verify both. Check one single-channel target with its dimmer.
4. Select a lazy submodel, then a group, then a buffer view individually. Confirm only the intended pixels respond. Avoid simultaneous overlapping selections while verifying geometry.
5. Try at least two WLED effects with different sliders; try Text with a font and a message. Test switching animation → fill → animation.
6. Apply a solid color, open Status, and confirm its target/solid-color bubble appears. Repeat for static Text, static Image, and an animation on another model or submodel/group. Use one bubble’s Stop; verify only those pixels return to the sequence. Use Stop shown for the rest; the entire bubble panel must disappear. Confirm the radio panel is unaffected. A fill started before updating may have the generic Solid / static overlay label.
7. Enable Live changes, Apply, change a color, and immediately Stop. Verify the stopped lights stay released. Change targets and verify Apply is required again.
8. Save a preset, reload on a phone, load it, and confirm no lights start until Apply.
9. If using MultiSync, verify matching target names and schema on each remote independently; UDP command delivery has no remote acknowledgment.

For a report, include FPP version, plugin version, target type, pixel protocol / node width, and any visible error. Do not include passwords or private access URLs.
