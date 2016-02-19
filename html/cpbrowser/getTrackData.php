<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/species_func.php"));
require_once(realpath(dirname(__FILE__) . "/../../includes/track_lib.php"));
// if there is no db as input, get all species and get all ChromInfo for each species
// otherwise, just return the ChromInfo for the species given

$result = array();
$req = json_decode(file_get_contents('php://input'), true);
if(isset($req['db'])) {
	$result = loadTrack($req['db'], $req['trackID'], $req['window'], 
						isset($req['type'])? $req['type']: NULL,
						isset($req['linkedTable'])? $req['linkedTable']: NULL);
} else {
	die('No db specified!');
}
echo json_encode($result);
?>