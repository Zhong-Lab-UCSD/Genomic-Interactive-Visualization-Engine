<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/ref_func.php"));
// if there is no db as input, get all ref and get all ChromInfo for each ref
// otherwise, just return the ChromInfo for the ref given

$result = array();
$req = getRequest();
if(isset($req['db'])) {
	$result = getTracks($req['db'], (isset($req['grp'])? $req['grp']: NULL));
}
header('Content-Type: application/json');
echo json_encode($result);
?>