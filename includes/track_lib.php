<?php
require_once(realpath(dirname(__FILE__) . "/common_func.php"));

define('LINK_ID', 'kgID');		// this is the ID UCSC used to link knownGene to kgXref

function loadBed($db, $tableName, $chrRegion = NULL, $linkedTable = NULL) {
	// if chrRegion is provided (as a ChromRegion class object)
	// then filtering will be carried out
	// otherwise (unlikely situation) no filtering will be done
	// tableName is trackID
	// NOTICE that UCSC data format is exon *START* and exon *ENDS*
	// so needs to be converted to proper BED12 format
	
	$mysqli = connectCPB($db);
	$result = array();
	
	if($mysqli && isset($tableName)) {
		$sqlstmt = "SELECT * FROM `" . $mysqli->real_escape_string($tableName) . "`";
		if(!is_null($linkedTable)) {
			// need to link the table via the following: 'name' = LINK_ID
			$sqlstmt .= " LEFT JOIN `" . $mysqli->real_escape_string($linkedTable) . "` ON `" 
						. $mysqli->real_escape_string($tableName) . "`.`name` = `" 
						. $mysqli->real_escape_string($linkedTable) . "`.`" . LINK_ID . "`";
		}
		if(!is_null($chrRegion)) {
			// add filtering part
			// convert $chrRegion string to ChrRegion class
			$chrRegionObj = new ChromRegion($chrRegion);
			$sqlstmt .= " WHERE chrom = ? AND txStart < ? AND txEnd > ? ORDER BY txStart";
			$stmt = $mysqli->prepare($sqlstmt);
			$stmt->bind_param('sii', $chrRegionObj->chr, $chrRegionObj->end, $chrRegionObj->start);
			$stmt->execute();
			$genes = $stmt->get_result();
		} else {
			$sqlstmt .= " ORDER BY txStart";
			$genes = $mysqli->query($sqlstmt);
		}
		while($itor = $genes->fetch_assoc()) {
			if(!isset($result[$itor['chrom']])) {
				$result[$itor['chrom']] = array();
			}
			// convert UCSC format to BED12
			$exonStartsArr = explode(',', $itor['exonStarts']);
			$exonEndsArr = explode(',', $itor['exonEnds']);
			$exonLengths = '';
			$exonStarts = '';
			for($i = 0; $i < intval($itor['exonCount']); $i++) {
				$exonStarts .= strval(intval($exonStartsArr[$i]) - intval($itor['txStart'])) . ',';
				$exonLengths .= strval(intval($exonEndsArr[$i]) - intval($exonStartsArr[$i])) . ',';
			}
			$newGene = array();
			$newGene['geneBed'] = $itor['chrom']
								. "\t" . $itor['txStart']
								. "\t" . $itor['txEnd']
								. "\t" . $itor['name']
								. "\t1\t" . $itor['strand']
								. "\t" . $itor['cdsStart']
								. "\t" . $itor['cdsEnd']
								. "\t0,0,0\t" . $itor['exonCount']
								. "\t" . $exonLengths
								. "\t" . $exonStarts;
			if(isset($itor['geneSymbol'])) {
				$newGene['geneSymbol'] = $itor['geneSymbol'];
			}
			$result[$itor['chrom']] [] = $newGene;
			
		}	
		$genes->free();
		$mysqli->close();
	}
	
	return $result;
}

function loadInteraction($db, $tableName, $chrRegion = NULL, $linkedTable = NULL) {
	// notice that for interaction tracks, $chrRegion may be an array
	$mysqli = connectCPB($db);
	$result = array();
	
	if($mysqli && isset($tableName)) {
		$sqlstmt = "SELECT * FROM `" . $mysqli->real_escape_string($tableName) . "`";
		if(!is_null($chrRegion)) {
			// add filtering part
			if(!is_array($chrRegion)) {
				$chrRegion = [$chrRegion];
			}
			// create temporary table in memory first for performance considerations
			$sqlstmtTTable = "CREATE TEMPORARY TABLE `linkIDTable` (" 
						. "linkID INT UNSIGNED PRIMARY KEY NOT NULL"
						. ") ENGINE=MEMORY AS SELECT DISTINCT linkID FROM `" 
						. $mysqli->real_escape_string($tableName) . "` WHERE "
						. implode(' OR ', array_fill(0, count($chrRegion), '(chrom = ? AND start < ? AND end > ?)'));
			$stmt = $mysqli->prepare($sqlstmtTTable);
			$a_params = array();
			$ref_params = array();
			$a_params []= str_repeat('sii', count($chrRegion));
			foreach($chrRegion as $region) {
				$chrRegionObj = new ChromRegion($region);
				array_push($a_params, $chrRegionObj->chr, $chrRegionObj->end, $chrRegionObj->start);
			}
			for($i = 0; $i < count($a_params); $i++) {
				$ref_params []= & $a_params[$i];
			}
			call_user_func_array(array($stmt, 'bind_param'), $ref_params);
			if(!$stmt->execute()) {
				error_log($stmt->error);
			}
			
			$sqlstmt .= " WHERE linkID IN (SELECT linkID FROM `linkIDTable`) ORDER BY start";
		} else {
			$sqlstmt .= " ORDER BY start";
		}
		$regions = $mysqli->query($sqlstmt);
		while($itor = $regions->fetch_assoc()) {
			if(!isset($result[$itor['chrom']])) {
				$result[$itor['chrom']] = array();
			}
			$newRegion = array();
			$newRegion['regionString'] = $itor['chrom'] . ':' . $itor['start'] . '-' . $itor['end'];
			$newRegion['ID'] = $itor['ID'];
			$newRegion['linkID'] = $itor['linkID'];
			$newRegion['value'] = $itor['value'];
			$result[$itor['chrom']] []= $newRegion;
		}	
		$regions->free();
		$mysqli->close();
	}
	
	return $result;
}

function loadTrack($db, $tableName, $chrRegion = NULL, $type = NULL, $linkedTable = NULL) {
	
	// this is the map mapping different track types 
	//		to their corresponding loading function
	$trackLoadMap = array(
		'bed' => 'loadBed',
		'genebed' => 'loadBed',
		'genepred' => 'loadBed',
		'interaction' => 'loadInteraction'
	);

	// if type is not specified, read it from trackDb table
	if(is_null($type) || is_null($linkedTable)) {
		$mysqli = connectCPB($db);
		$sqlstmt = "SELECT type, settings FROM trackDb WHERE tableName = ?";
		$stmt = $mysqli->prepare($sqlstmt);
		$stmt->bind_param('s', $tableName);
		$stmt->execute();
		$tracks = $stmt->get_result();
		while($itor = $tracks->fetch_assoc()) {
			$type = strtolower(strtok($itor['type'], " \n\t"));
			strtok('', '');
			$linkedTableSettings = json_decode($itor['settings'], JSON_FORCE_OBJECT);
			if(isset($linkedTableSettings['defaultLinkedTables'])) {
				$linkedTable = $linkedTableSettings['defaultLinkedTables'];
			}
		}
		$tracks->free();
		$mysqli->close();
	}
	
	// otherwise, directly use the corresponding function
	return $trackLoadMap[$type]($db, $tableName, $chrRegion, $linkedTable);
}
?>