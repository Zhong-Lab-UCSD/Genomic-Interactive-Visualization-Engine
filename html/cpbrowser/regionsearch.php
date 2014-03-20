<?php
require_once (realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
if($_REQUEST["allDataSingleRegion"] == "on") {
	set_time_limit(0);
	$region_arr = explode("\n", trim($_REQUEST["region"]));
	$wigFile_arr = explode("\n", trim($_REQUEST["wigfile"]));
	$wigFileHandle_arr = array();
	foreach($wigFile_arr as $wigfile) {
		try {
			$wigFileHandle_arr[] = new BigWigFile(trim($wigfile), true);
		} catch (Exception $e) {
			error_log($e->getMessage());
		}
	}
	header("Content-Disposition: attachment; filename=\"result.txt\"");
	header("Content-Type: application/octet-stream");
	header("Connection: close");
	echo "#IS_COVERED\tVALUE\r\n";
	foreach($region_arr as $region) {
		echo "#" . $region . "\r\n";
		//error_log($region);
		$regionObject = new ChromRegion(trim($region));
		//error_log($regions[0]);
		foreach($wigFileHandle_arr as $wigFileHandle) {
			echo "#" . $wigFileHandle->getFileName() . "\r\n";
			$result = $wigFileHandle->getAllSummaryStats($regionObject);
			foreach($result as $summary) {
				echo $summary->validCount . "\t" . $summary->sumData . "\r\n";
			}
			//echo "\r\n";
			ob_flush();
			flush();
		}
		//echo "\r\n";
	}
} else {
	$region_arr = explode("\n", trim($_REQUEST["region"]));
	$wigFile_arr = explode("\n", trim($_REQUEST["wigfile"]));
	$wigFileHandle_arr = array();
	foreach($wigFile_arr as $wigfile) {
		try {
			$wigFileHandle_arr[] = new BigWigFile(trim($wigfile), true);
		} catch (Exception $e) {
			error_log($e->getMessage());
		}
	}
	foreach($region_arr as $region) {
		echo $region . "<br />\n";
		//error_log($region);
		$region = new ChromRegion(trim($region));
		//error_log($regions[0]);
		foreach($wigFileHandle_arr as $wigFileHandle) {
			$result = $wigFileHandle->getSummaryStatsSingleRegion($region, 1);
			echo $result[0] . "<br />";
		}
		echo "<br />\n";
	}
}
?>