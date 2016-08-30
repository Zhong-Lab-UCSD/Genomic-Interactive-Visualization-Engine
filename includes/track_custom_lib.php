<?php
require_once(realpath(dirname(__FILE__) . "/common_func.php"));

// define('LINK_ID', 'kgID');		// this is the ID UCSC used to link knownGene to kgXref

function loadCustomBed($db, $remoteUrl, $chrRegion = NULL, $params = NULL) {
	// remote file should be in BED format
	// so just break all the lines and return as JSON
	
	$result = array();
	$fin = fopen($remoteUrl);
	// TODO: enable buffering locally
	
	if(!$fin) {
		throw new Exception('File \"' . htmlspecialchars($remoteUrl) . '\" cannot be opened!');
	}
	while(($line = fgets($fin)) !== false) {
		$tokens = preg_split("/\s+/", trim($line));
		$chr = $tokens[0];
		if(!isset($result[$chr])) {
			$result[$chr] = array();
		}
		$newGene = array();
		$newGene['genebed'] = trim($line);
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
		'bed' => 'loadBed',
		'genebed' => 'loadBed',
		'genepred' => 'loadBed',
		'interaction' => 'loadInteraction',
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
