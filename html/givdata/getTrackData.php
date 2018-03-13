<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/ref_func.php"));
require_once(realpath(dirname(__FILE__) . "/../../includes/track_lib.php"));
// if there is no db as input, get all ref and get all ChromInfo for each ref
// otherwise, just return the ChromInfo for the ref given

$result = array();
$req = getRequest();

ini_set('memory_limit', '30G');

if ($_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
  // This is not a CORS preflight request
  try {
    if(isset($req['db'])) {
      if(!isset($req['isCustom']) || !$req['isCustom']) {
        // not custom track with a remote file
        $result = loadTrack($req['db'], $req['trackID'], $req['window'],
                  isset($req['type'])? $req['type']: NULL,
                  isset($req['linkedTable'])? $req['linkedTable']: NULL,
                  isset($req['linkedKey'])? $req['linkedKey']: NULL,
                  isset($req['params'])? $req['params']: NULL);
      } else {
        // is custom track with a remote file
        $result = loadCustomTrack($req['db'], $req['remoteURL'], $req['window'],
                  isset($req['type'])? $req['type']: NULL,
                  isset($req['params'])? $req['params']: NULL);
      } // end if custom track with remote file
    } else {
      throw new Exception('No db specified!');
    }
  } catch(Exception $e) {
    http_response_code(400);
    $result['error'] = $e->getMessage();
  }
  header('Content-Type: application/json');
  echo json_encode($result);
} // end if ($_SERVER['REQUEST_METHOD'] !== 'OPTIONS')
// CORS preflight request is handled by apache
// (may need to be changed to handle here)
