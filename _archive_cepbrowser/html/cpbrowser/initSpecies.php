<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/species_func.php"));
// if there is no db as input, get all species and get all ChromInfo for each species
// otherwise, just return the ChromInfo for the species given

if(isset($_REQUEST['db'])) {
	$dblist []= $_REQUEST['db'];
	$result = getChromInfo($_REQUEST['db']);
} else {
	// get all db names
	$result = array();
	$dblist = getSpeciesInfoFromArray();
	for($i = 0; $i < count($dblist); $i++) {
		if($dblist[$i]['browserActive']) {
			$result[$dblist[$i]['givdbname']] = $dblist[$i];
			$result[$dblist[$i]['givdbname']]['chromInfo'] = getChromInfo($dblist[$i]['givdbname']);
		}
	}
}
echo json_encode($result, JSON_FORCE_OBJECT);
?>