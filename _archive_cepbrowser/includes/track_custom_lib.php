<?php
require_once(realpath(dirname(__FILE__) . "/common_func.php"));

// define('LINK_ID', 'kgID');		// this is the ID UCSC used to link knownGene to kgXref

function loadCustomBed($db, $remoteUrl, $chrRegion = NULL, $params = NULL) {
	// remote file should be in BED format
	// so just break all the lines and return as JSON
	
	$result = array();
	$fin = fopen($remoteUrl, 'r');
	// TODO: enable buffering locally
	
	if(!$fin) {
		throw new Exception('File "' . $remoteUrl . '" cannot be opened!');
	}
	if($chrRegion) {
		// filter out bed entries not inside the region
		$chrRegionObj = new ChromRegion($chrRegion);
	} else {
		$chrRegionObj = false;
	}
	while(($line = fgets($fin)) !== false) {
		$tokens = preg_split("/\s+/", trim($line));
		if($chrRegionObj) {
			$chr = trim($tokens[0], " \t\n\r\0\x0B,");
			$start = intval(trim($tokens[1], " \t\n\r\0\x0B,"));
			$end = intval(trim($tokens[2], " \t\n\r\0\x0B,"));
			if(strtolower($chr) !== strtolower($chrRegionObj->chr) ||
				$end < $chrRegionObj->start ||
				$start > $chrRegionObj->end) {
					continue;
			}
		}
		if(!isset($result[$chr])) {
			$result[$chr] = array();
		}
		$newGene = array();
		$newGene['geneBed'] = trim($line);
		$result[$chr] []= $newGene;
	}
	return $result;
	
}

function loadCustomInteraction($db, $remoteUrl, $chrRegion = NULL, $params = NULL) {
	// notice that for interaction tracks, $chrRegion may be an array
}

function loadCustomWig($db, $remoteUrl, $chrRegion = NULL, $params = NULL) {
}

function loadCustomBigWig($db, $remoteUrl, $chrRegion = NULL, $params = NULL) {
}

function loadCustomTrack($db, $remoteUrl, $chrRegion = NULL, $type = NULL, $params = NULL) {
	
	// this is the map mapping different track types 
	//		to their corresponding loading function
	$trackLoadMap = array(
		'bed' => 'loadCustomBed',
		'genebed' => 'loadCustomBed',
		'genepred' => 'loadCustomBed',
		'interaction' => 'loadCustomInteraction',
		'wig' => 'loadCustomWig',
		'bigWig' => 'loadCustomBigWig',
	);

	// if type is not specified, try to determine from file extension (not recommended)
	if(is_null($type)) {
		$type = end(explode('.', $remoteUrl));
	}
	
	// otherwise, directly use the corresponding function
	return $trackLoadMap[$type]($db, $remoteUrl, $chrRegion, $params);
}
