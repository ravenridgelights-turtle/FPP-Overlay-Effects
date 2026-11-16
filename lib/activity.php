<?php
/* Last successful look names, not a source of truth for active output.
 * FPP Overlay Effects, GPL-2.0-or-later. */
function foeActivityPayload($input) {
    if (!is_array($input) || !isset($input['models']) || !is_array($input['models']) || count($input['models']) < 1 || count($input['models']) > 5000) {
        throw new InvalidArgumentException('Select at least one target.');
    }
    $names=array();
    foreach ($input['models'] as $name) {
        if (!is_string($name) || $name === '' || strlen($name) > 512 || strpos($name, ',') !== false || strpos($name, "\0") !== false || $name === '--All Models--') {
            throw new InvalidArgumentException('Invalid overlay target name.');
        }
        $names[$name]=true;
    }
    $action=$input['action'] ?? 'apply';
    if (!in_array($action,array('apply','clear'),true)) throw new InvalidArgumentException('Unknown activity action.');
    $effect=$input['effect'] ?? '';
    if ($action === 'apply' && (!is_string($effect) || trim($effect) === '' || strlen($effect) > 512)) throw new InvalidArgumentException('Missing effect name.');
    $color=$input['color'] ?? '';
    if (!is_string($color) || ($color !== '' && !preg_match('/^#[0-9a-f]{6}([0-9a-f]{2})?$/iD',$color))) throw new InvalidArgumentException('Invalid color.');
    return array('action'=>$action,'models'=>array_keys($names),'effect'=>$effect,'color'=>strtoupper($color));
}

function foeActivityReadUnlocked($directory) {
    $path=$directory.'/plugin.FPP-Overlay-Effects.activity.json';
    if (!is_file($path)) return array('version'=>1,'models'=>array());
    $raw=file_get_contents($path);
    $data=$raw === false ? null : json_decode($raw,true);
    if (!is_array($data) || !isset($data['models']) || !is_array($data['models'])) throw new RuntimeException('Could not read overlay activity labels.');
    return $data;
}

function foeActivityStore($directory, $input=null) {
    // A stable lock file protects all browser tabs while the JSON is replaced atomically.
    $lock=fopen($directory.'/plugin.FPP-Overlay-Effects.activity.lock','c');
    if ($lock === false) throw new RuntimeException('Could not lock overlay activity labels.');
    $temporary=null;
    try {
        if (!flock($lock,$input === null ? LOCK_SH : LOCK_EX)) throw new RuntimeException('Could not lock overlay activity labels.');
        $data=foeActivityReadUnlocked($directory);
        if ($input === null) return $data;
        $change=foeActivityPayload($input);
        foreach ($change['models'] as $name) {
            if ($change['action'] === 'clear') unset($data['models'][$name]);
            else $data['models'][$name]=array('effect'=>$change['effect'],'color'=>$change['color'],'updatedAt'=>microtime(true));
        }
        $temporary=tempnam($directory,'foe-activity-');
        if ($temporary === false) throw new RuntimeException('Could not save overlay activity labels.');
        $json=json_encode($data,JSON_INVALID_UTF8_SUBSTITUTE | JSON_PRETTY_PRINT);
        if ($json === false || file_put_contents($temporary,$json) === false) throw new RuntimeException('Could not save overlay activity labels.');
        chmod($temporary,0664);
        if (!rename($temporary,$directory.'/plugin.FPP-Overlay-Effects.activity.json')) throw new RuntimeException('Could not save overlay activity labels.');
        $temporary=null;
        return $data;
    } finally {
        if ($temporary && is_file($temporary)) unlink($temporary);
        flock($lock,LOCK_UN);fclose($lock);
    }
}
