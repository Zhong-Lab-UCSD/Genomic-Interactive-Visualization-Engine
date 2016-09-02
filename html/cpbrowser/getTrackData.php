<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/species_func.php"));
require_once(realpath(dirname(__FILE__) . "/../../includes/track_lib.php"));
require_once(realpath(dirname(__FILE__) . "/../../includes/track_custom_lib.php"));
// if there is no db as input, get all species and get all ChromInfo for each species
// otherwise, just return the ChromInfo for the species given

$result = array();
$req = json_decode(file_get_contents('php://input'), true);

ini_set('memory_limit', '30G');

try {
	if(isset($req['db'])) {
		if(!isset($req['isCustom']) || !$req['isCustom']) {
			// not custom track with a remote file
			$result = loadTrack($req['db'], $req['trackID'], $req['window'], 
								isset($req['type'])? $req['type']: NULL,
								isset($req['linkedTable'])? $req['linkedTable']: NULL,
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
echo json_encode($result);
?>