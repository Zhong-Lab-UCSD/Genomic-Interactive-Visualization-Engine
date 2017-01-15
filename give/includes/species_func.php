<?php

// this file is for updating all species information, including
// all chromosome lengths and centromeme locations
// input will be database name ("mm9" or "hg19" or others)
// currently the return format will be JSON chromosome information
// may incorporate other data (such as chromosomal bands) in the future
// JSON format: {chr10: {chrRegion: "chr10:1-135374737", cent: "chr10: 38800000-42100000"}}
require_once(realpath(dirname(__FILE__) . "/common_func.php"));

function getChromInfo($db) {
	if (version_compare(phpversion(), '7.0.0', '<')) {
		define('PHP_INT_MIN', ~PHP_INT_MAX);		// this should be remove by PHP 7.0
	}
	$result = [];
	if(isset($db)) {
		$mysqli = connectCPB($db);
		if($mysqli) {
			$chromIdeos = $mysqli->query("SELECT * FROM cytoBandIdeo ORDER BY chrom");
			if($chromIdeos && $chromIdeos->num_rows > 0) {
				$chromName = "";
				$chrom = [];
				$chromStart = PHP_INT_MAX;
				$chromEnd = PHP_INT_MIN;
				$chromCentStart = PHP_INT_MAX;
				$chromCentEnd = PHP_INT_MIN;
				while($chromRow = $chromIdeos->fetch_assoc()) {
					if($chromName !== $chromRow["chrom"]) {
						if($chromName) {
							// old chrom is there
							$chrom["chrRegion"] = $chromName . ":" . $chromStart . "-" . $chromEnd;
							if($chromCentStart < PHP_INT_MAX) {
								$chrom["cent"] = $chromName . ":" . $chromCentStart . "-" . $chromCentEnd;
							}
							$result[$chromName] = $chrom;
						}
						$chromName = $chromRow["chrom"];
						$chrom = [];
						$chromStart = PHP_INT_MAX;
						$chromEnd = PHP_INT_MIN;
						$chromCentStart = PHP_INT_MAX;
						$chromCentEnd = PHP_INT_MIN;

					}

					if($chromRow["gieStain"] === "acen") {
						// it's centromere
						$chromCentStart = min($chromCentStart, $chromRow["chromStart"]);
						$chromCentEnd = max($chromCentEnd, $chromRow["chromEnd"]);
					}
					$chromStart = min($chromStart, $chromRow["chromStart"]);
					$chromEnd = max($chromEnd, $chromRow["chromEnd"]);
				}
				if($chromName) {
					// old chrom is there
					$chrom["chrRegion"] = $chromName . ":" . $chromStart . "-" . $chromEnd;
					if($chromCentStart < PHP_INT_MAX) {
						$chrom["cent"] = $chromName . ":" . $chromCentStart . "-" . $chromCentEnd;
					}
					$result[$chromName] = $chrom;
				}
				$chromIdeos->free();
			}
		}
		$mysqli->close();
	}
	return $result;
}

function getTracks($db, $grp = NULL) {
	$result = [];
	if(isset($db)) {
		$mysqli = connectCPB($db);
		// first get group information
		$sqlstmt = "SELECT * FROM grp";
		if(!is_null($grp)) {		// whether grp is specified
			$sqlstmt .= " WHERE name = ?";
			$stmt = $mysqli->prepare($sqlstmt);
			$stmt->bind_param('s', $grp);
			$stmt->execute();
			$groups = $stmt->get_result();
		} else {
			$groups = $mysqli->query($sqlstmt);
		}
		while($itor = $groups->fetch_assoc()) {
			// needs to redo settings part
			// settings should be a json object
			$result[$itor['name']] = $itor;
			$result[$itor['name']]['tracks'] = [];
		}
		$result['_ungrouped'] = [];
		$result['_ungrouped']['tracks'] = [];	// this is to hold ungrouped tracks
		$groups->free();

		// then get track information
		$sqlstmt = "SELECT * FROM trackDb";
		if(!is_null($grp)) {		// whether grp is specified
			$sqlstmt .= " WHERE grp = ? ORDER BY priority";
			$stmt = $mysqli->prepare($sqlstmt);
			$stmt->bind_param('s', $grp);
			$stmt->execute();
			$tracks = $stmt->get_result();
		} else {
      $sqlstmt .= " ORDER BY priority";
			$tracks = $mysqli->query($sqlstmt);
		}
		while($itor = $tracks->fetch_assoc()) {
			// needs to redo settings part
			// settings should be a json object
			$itor['settings'] = json_decode($itor['settings']);
			if(array_key_exists($itor['grp'], $result)) {
				$result[$itor['grp']]['tracks'] []= $itor;
			} else {
				$result['_ungrouped']['tracks'] []= $itor;
			}
		}
		$tracks->free();
		$mysqli->close();
	}
	return $result;
}

function getSpeciesDbNames() {
	// return a full list of species db names
	$mysqli = connectCPB();
	$result = array();
	$species = $mysqli->query("SELECT dbname FROM species");
	while($spcitor = $species->fetch_assoc()) {
		$result[] = $spcitor["dbname"];
	}
	$species->free();
	$mysqli->close();
	return $result;
}

function getSpeciesInfoFromArray($spcDbNameList = NULL) {
	// return everything about species from db indicated by spcDbNameList
	$mysqli = connectCPB();
	$spcinfo = array();
	$sqlstmt = "SELECT * FROM species";
	if(!empty($spcDbNameList)) {
		$sqlstmt .= " WHERE dbname IN ('hg19'" . str_repeat(', ?', count($spcDbNameList)) . ")";
		$stmt = $mysqli->prepare($sqlstmt);
		$sqltype = str_repeat('s', count($spcDbNameList));
		$a_params = array();
		$a_params []= & $sqltype;
		for($i = 0; $i < count($spcDbNameList); $i++) {
			$a_params []= & $spcDbNameList[$i];
		}
		call_user_func_array(array($stmt, 'bind_param'), $a_params);
		$stmt->execute();
		$species = $stmt->get_result();
	} else {
		$species = $mysqli->query($sqlstmt);
	}
	while($spcitor = $species->fetch_assoc()) {
    $spcitor['settings'] = json_decode($spcitor['settings']);
		$spcinfo[] = $spcitor;
	}
	$species->free();
	$mysqli->close();
	return $spcinfo;
}

function getSpeciesDatabaseFromGapInfo($gap, $spcDbName) {
	// return the database name according the gap value from each species
	$mysqli = connectCPB();
	$spcinfo = array();
	$spcinfo = $mysqli->query("SELECT * FROM $spcDbName WHERE gap<=$gap ORDER BY gap DESC LIMIT 1");
	while($specdb = $spcinfo->fetch_assoc()){
		$bb = $specdb['databaseName'];
	}
	$spcinfo->free();
	$mysqli->close();
	return $bb;
}
