<?php
require_once (realpath(dirname(__FILE__) . "/../../includes/common_func.php"));

define('REGION_LENGTH_SPLIT_THRESHOLD', 2000000);


if($_REQUEST["allDataSingleRegion"] == "on") {
	set_time_limit(0);
	ini_set("memory_limit", "-1");
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
		$regionObject = new ChromRegion(trim($region));
		$regionarray = array();
		if($regionObject->getLength() > REGION_LENGTH_SPLIT_THRESHOLD) {
			$regionarray = $regionObject->breakRegions(ceil($regionObject->getLength() / REGION_LENGTH_SPLIT_THRESHOLD));
		} else {
			$regionarray []= $regionObject;
		}
		//error_log($region);
		//error_log($regions[0]);
		foreach($wigFileHandle_arr as $wigFileHandle) {
			$count = 0;
			echo "#" . $wigFileHandle->getFileName() . "\r\n";
			foreach($regionarray as $regionfragment) {
				$result = $wigFileHandle->getAllSummaryStats($regionfragment);
				foreach($result as $summary) {
					echo $summary->validCount . "\t" . $summary->sumData . "\r\n";
					$count++;
					if(!($count % 100000)) {
						ob_flush();
						flush();
					}
				}
				error_log($regionfragment);
				//echo "\r\n";
				ob_flush();
				flush();
				if(connection_aborted()) {
					break;
				}
			}
			if(connection_aborted()) {
				break;
			}
		}
		if(connection_aborted()) {
			break;
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