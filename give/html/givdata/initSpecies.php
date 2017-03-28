<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/ref_func.php"));
// if there is no db as input, get all ref and get all ChromInfo for each ref
// otherwise, just return the ChromInfo for the ref given
$req = getRequest();

if(isset($req['db'])) {
	$dblist []= $req['db'];
	$result = getChromInfo($req['db']);
} else {
	// get all db names
	$result = array();
	$dblist = getRefInfoFromArray();
	for($i = 0; $i < count($dblist); $i++) {
		if($dblist[$i]['browserActive']) {
			$result[$dblist[$i]['givdbname']] = $dblist[$i];
			$result[$dblist[$i]['givdbname']]['chromInfo'] = getChromInfo($dblist[$i]['givdbname']);
		}
	}
}
header('Content-Type: application/json');
echo empty($result)? json_encode($result, JSON_FORCE_OBJECT): json_encode($result);
?>
