<?php
/* Read-only, compact discovery of lazy xLights targets and local pixel strings.
 * FPP Overlay Effects, GPL-2.0-or-later. No output configuration is modified. */
function foeReadJSON($directory, $name) {
    $path = $directory . '/' . $name;
    if (!is_file($path) || !is_readable($path)) return array();
    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : array();
}

function foeOutputProfiles($directory) {
    $profiles = array();
    foreach (array('co-bbbStrings.json', 'co-pixelStrings.json', 'channeloutputs.json', 'co-other.json') as $file) {
        $data = foeReadJSON($directory, $file);
        foreach (($data['channelOutputs'] ?? array()) as $output) {
            if (empty($output['enabled'])) continue;
            foreach (($output['outputs'] ?? array()) as $port) {
                foreach (array('virtualStrings', 'virtualStringsB', 'virtualStringsC', 'virtualStringsD', 'virtualStringsE', 'virtualStringsF') as $bank => $key) {
                    foreach (($port[$key] ?? array()) as $i => $string) {
                        $pixels = (int)($string['pixelCount'] ?? 0);
                        if ($pixels < 1) continue;
                        $order = strtoupper((string)($string['colorOrder'] ?? 'RGB'));
                        $channels = in_array($order, array('W','1','ONE','SINGLE')) ? 1 : strlen($order);
                        if (!in_array($channels, array(1,3,4))) continue;
                        $groups = max(1, (int)($string['groupCount'] ?? 1));
                        // PixelString.cpp reads zero-based virtual-string channel starts.
                        $start = (int)($string['startChannel'] ?? 0);
                        $profiles[] = array('id'=>count($profiles), 'port'=>(int)($port['portNumber'] ?? 0)+1,
                            'receiver'=>chr(65+$bank), 'string'=>$i+1, 'description'=>(string)($string['description'] ?? ''),
                            'driver'=>(string)($output['type'] ?? ''), 'protocol'=>(string)($port['protocol'] ?? 'unknown'),
                            'order'=>$order, 'channels'=>$channels, 'start'=>$start, 'end'=>$start+(int)ceil($pixels/$groups)*$channels-1);
                    }
                }
            }
        }
    }
    return $profiles;
}

function foeProfileMatches($model, $profiles, $models, $depth=0) {
    if ($depth > 8) return array('ids'=>array(), 'mapping'=>'unknown');
    $ids=array(); $cpn=(int)($model['ChannelCountPerNode'] ?? 3);
    $match = function($start, $end) use (&$ids, $profiles) {
        foreach ($profiles as $p) if ($start <= $p['end'] && $end >= $p['start']) $ids[$p['id']]=true;
    };
    if (($model['SubType'] ?? '') === 'channelgrid' || ($model['SubType'] ?? '') === 'grid') {
        $absolute=($model['SubType']==='channelgrid');
        $base=max(0,(int)($model['ParentStartChannel'] ?? 1)-1);
        // Walk the grid on the server; never send grids or channel maps to the UI.
        $grid=(string)($model['Grid'] ?? '');
        $offset=0; $length=strlen($grid);
        while ($offset < $length) {
            $count=strcspn($grid, ',;&', $offset);
            $token=substr($grid,$offset,$count); $offset+=$count+1;
            if (!preg_match('/^[0-9]+$/D', $token) || (int)$token < 1) continue;
            $start=$absolute?(int)$token-1:$base+((int)$token-1)*$cpn;
            $match($start,$start+$cpn-1);
        }
        return array('ids'=>array_keys($ids),'mapping'=>'grid');
    }
    $parent=$model['Parent'] ?? '';
    if ($parent && isset($models[$parent])) {
        $result=foeProfileMatches($models[$parent],$profiles,$models,$depth+1);
        // A rectangular Sub inherits a parent; report this as inherited, not exact.
        $result['mapping']='parent'; return $result;
    }
    $start=(int)($model['StartChannel'] ?? 0)-1; $count=(int)($model['ChannelCount'] ?? 0);
    if ($start >= 0 && $count > 0 && ($model['Type'] ?? '') !== 'Sub') {
        $match($start,$start+$count-1);
        return array('ids'=>array_keys($ids),'mapping'=>'range');
    }
    return array('ids'=>array(),'mapping'=>'unknown');
}

function foeModelIndex($directory) {
    $models=array();
    foreach (array(array('model-overlays.json','models','model'),array('xlights-submodels.json','submodels','submodel'),array('xlights-modelgroups.json','modelgroups','group')) as $source) {
        $data=foeReadJSON($directory,$source[0]);
        foreach (($data[$source[1]] ?? array()) as $m) {
            if (!is_array($m) || !isset($m['Name']) || !is_string($m['Name'])) continue;
            $m['kind']=!empty($m['BufferStyle'])?'buffer':(($m['Type'] ?? '')==='Sub' && $source[2]==='model'?'submodel':$source[2]);
            $models[$m['Name']]=$m;
        }
    }
    $profiles=foeOutputProfiles($directory); $compact=array();
    foreach ($models as $m) {
        $entry=array_intersect_key($m,array_flip(array('Name','DisplayName','Type','Parent','Width','Height','ChannelCountPerNode','ColorOrder','BufferStyle','MemberCount','PixelCount','kind')));
        $match=foeProfileMatches($m,$profiles,$models);
        $entry['profiles']=$match['ids']; $entry['mapping']=$match['mapping'];
        $compact[]=$entry;
    }
    return array('models'=>$compact,'profiles'=>$profiles);
}
