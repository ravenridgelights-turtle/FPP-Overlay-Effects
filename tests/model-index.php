<?php
require_once __DIR__.'/../lib/model-index.php';
$temp=sys_get_temp_dir().'/foe-test-'.bin2hex(random_bytes(6));mkdir($temp);
function check($condition,$message){if(!$condition)throw new RuntimeException($message);echo "PASS $message\n";}
function put($path,$value){file_put_contents($path,json_encode($value));}
try {
 put($temp.'/co-pixelStrings.json',array('channelOutputs'=>array(array('enabled'=>1,'type'=>'DPIPixels','outputs'=>array(
  array('portNumber'=>0,'protocol'=>'ws2811','virtualStrings'=>array(array('startChannel'=>0,'pixelCount'=>100,'colorOrder'=>'GRB','groupCount'=>2,'nullNodes'=>5,'description'=>'Tree'))),
  array('portNumber'=>1,'protocol'=>'sk6812','virtualStringsB'=>array(array('startChannel'=>300,'pixelCount'=>20,'colorOrder'=>'WRGB','description'=>'RGBW strip')))
 )))));
 put($temp.'/model-overlays.json',array('models'=>array(array('Name'=>'Tree','Type'=>'Channel','StartChannel'=>1,'ChannelCount'=>150,'ChannelCountPerNode'=>3))));
 put($temp.'/xlights-submodels.json',array('submodels'=>array(array('Name'=>'Tree_Eyes','Parent'=>'Tree','Type'=>'Sub','SubType'=>'grid','ParentStartChannel'=>1,'Grid'=>'1,2;;3,','ChannelCountPerNode'=>3))));
 put($temp.'/xlights-modelgroups.json',array('modelgroups'=>array(array('Name'=>'All Props','Type'=>'Sub','SubType'=>'channelgrid','Grid'=>'1&301,4','ChannelCountPerNode'=>3),array('Name'=>'Polar Tree','Type'=>'Sub','SubType'=>'channelgrid','BufferStyle'=>'Polar','Grid'=>'1,4','ChannelCountPerNode'=>3))));
 $index=foeModelIndex($temp);$map=array_column($index['models'],null,'Name');
 check(count($index['profiles'])===2,'Reads virtual strings and smart-receiver banks');
 check($index['profiles'][0]['start']===0 && $index['profiles'][0]['end']===149,'Handles zero-based starts, grouping and null nodes correctly');
 check($index['profiles'][1]['order']==='WRGB' && $index['profiles'][1]['channels']===4 && $index['profiles'][1]['receiver']==='B','Preserves RGBW wire order and receiver');
 check($map['Tree_Eyes']['profiles']===array(0),'Maps lazy submodel grid through parent start channels');
 check($map['All Props']['profiles']===array(0,1),'Maps every channel-grid member across ports');
 check($map['Polar Tree']['kind']==='buffer','Identifies buffer views separately from model groups');
 check(!isset($map['All Props']['Grid']),'Does not send potentially huge pixel grids to the browser');
 $rect=foeProfileMatches(array('Type'=>'Sub','Parent'=>'Tree'),$index['profiles'],array('Tree'=>array('StartChannel'=>1,'ChannelCount'=>150,'Type'=>'Channel')));
 check($rect['mapping']==='parent','Marks rectangular submodel port information as inherited');
 check(foeModelIndex($temp.'/missing')===array('models'=>array(),'profiles'=>array()),'Missing configuration produces empty metadata without failures');
 $_SERVER['SCRIPT_NAME']='/index.php';ob_start();include __DIR__.'/../status_menu.inc';$menu=ob_get_clean();check(strpos($menu,'assets/status.js')!==false,'Status assets load through the existing FPP menu hook');
 $_SERVER['SCRIPT_NAME']='/plugins.php';ob_start();include __DIR__.'/../status_menu.inc';$menu=ob_get_clean();check(strpos($menu,'assets/status.js')===false,'Other FPP pages do not load Status bubbles');
}finally{foreach(glob($temp.'/*') as $f)unlink($f);rmdir($temp);}
