<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
// if there is no db as input, get all ref and get all ChromInfo for each ref
// otherwise, just return the ChromInfo for the ref given

$req = getRequest();

if ($_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
  // This is not a CORS preflight request
  $result = NULL;
  try {
    // just generate a random string that is not in customTrackMeta
    $result = generateUniqueUserId(USER_ID_LENGTH);
  } catch(Exception $e) {
    http_response_code(400);
    $result = [];
    $result['error'] = $e->getMessage();
  }
  header('Content-Type: application/json');
  echo json_encode($result);
} // end if ($_SERVER['REQUEST_METHOD'] !== 'OPTIONS')
// CORS preflight request is handled by apache
// (may need to be changed to handle here)
