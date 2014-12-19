<?php
	require_once(realpath(dirname(__FILE__) . "/../../includes/session.php"));
	require('queryregionlist.php');
	require('querygenelist.php');
//	require('writeGeneList.php');
	
	if(empty($_REQUEST)) {
		// new page, doesn't do anything
	} else {
		$spcDbName = getSpeciesDbNames();
		
		$isError = false;
		$directsubmit = (isset($_REQUEST["direct"]) && $_REQUEST["direct"] == "true");
		
		$query = $_REQUEST["geneName"];
		
		if(!isset($_REQUEST["writeTableOnly"]) || $_REQUEST["writeTableOnly"] != "true") {
		// This will be changed once the function moves to JavaScript
			for($i = 0; $i < count($spcDbName); $i++) {
				if(!isset($_REQUEST[$spcDbName[$i]])) { 
					array_splice($spcDbName, $i, 1);
				}
			}
			
			$chrPattern = "/^chr\w+\s*(:|\s)\s*[0-9,]+\s*(-|\s)\s*[0-9,]+/i";
			if(preg_match($chrPattern, $_REQUEST["geneName"])) {
				if(!isset($_REQUEST["species"]) || $_REQUEST["species"] == "gene") {
					$isError = true;
					$result['error'] = "Please specify the species of the coordinates.";
				} else {
					$result = mergeRegion($_REQUEST["species"], $_REQUEST["geneName"], $spcDbName);
				}
			} else if(!isset($_REQUEST["species"]) || $_REQUEST["species"] == "gene") {
				$result = findGeneList($_REQUEST["geneName"], $directsubmit, $spcDbName);
			} else {
				$isError = true;
				$result['error'] = "Please specify coordinates in \"chrX:XXXXX-XXXXX\" format or \"chrX XXXXX XXXXX\" format or select \"Gene name\" to query a gene across all species. ";
			}
		
//		// the following will be changed once the function moves to JavaScript
//		} else {
//			$result = json_decode($_REQUEST["result"], true);
		}
		
		echo json_encode($result);
			
//		echo outputGeneListTable($result, $spcDbName, $directsubmit, $isError, $query, $in_debug);
	}
?>
