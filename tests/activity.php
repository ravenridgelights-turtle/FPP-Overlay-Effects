<?php
require_once __DIR__.'/../lib/activity.php';
$directory=sys_get_temp_dir().'/foe-activity-test-'.bin2hex(random_bytes(6));mkdir($directory);
function activityCheck($ok,$message){if(!$ok)throw new RuntimeException($message);echo "PASS $message\n";}
try {
    activityCheck(foeActivityStore($directory)['models']===array(),'Missing history is empty without reporting active lights');
    foeActivityStore($directory,array('models'=>array('bottom roof'),'effect'=>'Solid Color','color'=>'#ff0000'));
    $saved=foeActivityStore($directory);
    activityCheck($saved['models']['bottom roof']['effect']==='Solid Color' && $saved['models']['bottom roof']['color']==='#FF0000','Stores successful solid-fill labels by exact target name');
    foeActivityStore($directory,array('models'=>array('Tree_Eyes','All Props'),'effect'=>'Text'));
    activityCheck(count(foeActivityStore($directory)['models'])===3,'Independent targets and browsers preserve previous labels');
    foeActivityStore($directory,array('action'=>'clear','models'=>array('Tree_Eyes')));
    $saved=foeActivityStore($directory);
    activityCheck(count($saved['models'])===2 && !isset($saved['models']['Tree_Eyes']),'Stopping one target clears only its label');
    foeActivityStore($directory,array('models'=>array('bottom roof'),'effect'=>'Image'));
    activityCheck(foeActivityStore($directory)['models']['bottom roof']['effect']==='Image','A new static look replaces the previous look name');
    foreach (array(array('models'=>array()),array('models'=>array('--All Models--'),'effect'=>'Text'),array('models'=>array('Bad,Name'),'effect'=>'Text'),array('models'=>array('Tree'),'effect'=>''),array('models'=>array('Tree'),'effect'=>'Solid Color','color'=>'javascript:alert(1)')) as $invalid) {
        $rejected=false;try{foeActivityStore($directory,$invalid);}catch(InvalidArgumentException $error){$rejected=true;}
        activityCheck($rejected,'Rejects invalid activity changes');
    }
    file_put_contents($directory.'/plugin.FPP-Overlay-Effects.activity.json','broken JSON');
    $rejected=false;try{foeActivityStore($directory,array('models'=>array('Tree'),'effect'=>'Text'));}catch(RuntimeException $error){$rejected=true;}
    activityCheck($rejected,'Corrupt labels are not silently overwritten');
}finally{foreach(glob($directory.'/*') as $file)unlink($file);rmdir($directory);}
