<?php
require_once (realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
$region_arr = explode("\n", trim($_REQUEST["region"]));
$wigFile_arr = explode("\n", trim($_REQUEST["wigfile"]));
$wigFileHandle_arr = array();
foreach($wigFile_arr as $wigfile) {
	$wigFileHandle_arr[] = new BigWigFile(trim($wigfile), true);
}
foreach($region_arr as $region) {
	echo $region . "<br />\n";
	error_log($region);
	$regions = array(new ChromRegion(trim($region)));
	error_log($regions[0]);
	foreach($wigFileHandle_arr as $wigFileHandle) {
		$result = $wigFileHandle->getSummaryStats($regions, 1);
		echo $result[0][0] . "<br />";
	}
	echo "<br />\n";
}
?>