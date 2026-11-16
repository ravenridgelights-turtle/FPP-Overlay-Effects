<li><a href="plugin.php?_menu=status&amp;plugin=FPP-Overlay-Effects&amp;page=overlay-effects.php">FPP Overlay Effects</a></li>
<?php
// Use FPP's existing menu extension hook, as After Show Hours Radio does.
// No core FPP file or native player-status value is changed.
if (basename($_SERVER['SCRIPT_NAME'] ?? $_SERVER['PHP_SELF'] ?? '') === 'index.php') {
    $foeStatusRef = substr(hash_file('sha256', __DIR__ . '/assets/status.js'), 0, 12);
    $foeStyleRef = substr(hash_file('sha256', __DIR__ . '/assets/status.css'), 0, 12);
    echo '<link rel="stylesheet" href="plugin.php?plugin=FPP-Overlay-Effects&amp;file=assets/status.css&amp;nopage=1&amp;ref=' . $foeStyleRef . '">';
    echo '<script defer src="plugin.php?plugin=FPP-Overlay-Effects&amp;file=assets/status.js&amp;nopage=1&amp;ref=' . $foeStatusRef . '"></script>';
}
?>
