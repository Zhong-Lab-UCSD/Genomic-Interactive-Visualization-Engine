<?php
require_once(realpath(dirname(__FILE__) . "/../includes/species_func.php"));
// if there is no db as input, get all species and get all ChromInfo for each species
// otherwise, just return the ChromInfo for the species given

$result = array();
$req = getRequest();
if(isset($req['db'])) {
	$result = getTracks($req['db'], (isset($req['grp'])? $req['grp']: NULL));
}
echo json_encode($result);
?>