<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/ref_func.php"));
// if there is no db as input, get all ref and get all ChromInfo for each ref
// otherwise, just return the ChromInfo for the ref given

$req = getRequest();

if ($_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
  // This is not a CORS preflight request
  $result = TRUE;
  try {
    $type = isset($req['type']) ? $req['type'] : NULL;
    $access = isset($req['access']) ? $req['access'] : 'anonymous';
    $trackMetaObj = isset($req['settings']) ? $req['settings'] : [];
    
    if(isset($req['db']) && isset($req['userId']) && isset($req['trackID'])) {
      updateCustomTrackMeta($req['db'], $req['userId'], $req['tableName'],
        $access, $type, $trackMetaObj);
    } else {
      throw new Exception('No db, userId, or trackID specified!');
    }
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
