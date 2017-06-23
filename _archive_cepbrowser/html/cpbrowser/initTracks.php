<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/species_func.php"));
// if there is no db as input, get all species and get all ChromInfo for each species
// otherwise, just return the ChromInfo for the species given

$result = array();
if(isset($_REQUEST['db'])) {
	$result = getTracks($_REQUEST['db'], (isset($_REQUEST['grp'])? $_REQUEST['grp']: NULL));
}
echo json_encode($result);
?>