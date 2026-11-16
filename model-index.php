<?php
require_once __DIR__ . '/lib/model-index.php';
if (!isset($settings['configDirectory'])) {
    http_response_code(500);
    echo json_encode(array('error'=>'Open this endpoint through FPP plugin.php.'));
    return;
}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode(foeModelIndex($settings['configDirectory']), JSON_INVALID_UTF8_SUBSTITUTE);
