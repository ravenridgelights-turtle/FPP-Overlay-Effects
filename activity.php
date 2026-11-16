<?php
require_once __DIR__.'/lib/activity.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
try {
    if (!isset($settings['configDirectory'])) throw new RuntimeException('Open this endpoint through FPP plugin.php.');
    $method=$_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'GET') $data=foeActivityStore($settings['configDirectory']);
    elseif ($method === 'POST') {
        if (stripos($_SERVER['CONTENT_TYPE'] ?? '','application/json') !== 0) {
            http_response_code(415);echo json_encode(array('error'=>'Send JSON activity data.'));return;
        }
        $raw=file_get_contents('php://input',false,null,0,1048577);
        if ($raw === false || strlen($raw)>1048576) throw new InvalidArgumentException('Invalid activity data.');
        $input=json_decode($raw,true);
        if (!is_array($input)) throw new InvalidArgumentException('Invalid activity data.');
        $data=foeActivityStore($settings['configDirectory'],$input);
    } else {
        header('Allow: GET, POST');http_response_code(405);echo json_encode(array('error'=>'Method not supported.'));return;
    }
    $data['models']=(object)$data['models'];
    echo json_encode($data,JSON_INVALID_UTF8_SUBSTITUTE);
} catch (InvalidArgumentException $error) {
    http_response_code(400);echo json_encode(array('error'=>$error->getMessage()));
} catch (Throwable $error) {
    http_response_code(500);echo json_encode(array('error'=>$error->getMessage()));
}
