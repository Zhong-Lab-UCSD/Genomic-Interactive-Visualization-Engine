<?php

// this file is for updating all ref information, including
// all chromosome lengths and centromeme locations
// input will be database name ("mm9" or "hg19" or others)
// currently the return format will be JSON chromosome information
// may incorporate other data (such as chromosomal bands) in the future
// JSON format: {chr10: {chrRegion: "chr10:1-135374737", cent: "chr10: 38800000-42100000"}}
require_once(realpath(dirname(__FILE__) . "/common_func.php"));

function getChromInfo($db) {
  if (version_compare(phpversion(), '7.0.0', '<')) {
    define('PHP_INT_MIN', ~PHP_INT_MAX);    // this should be remove by PHP 7.0
  }
  try {
    $result = [];
    $mysqli = connectCPB($db);
    $chromIdeos = $mysqli->query("SELECT * FROM cytoBandIdeo ORDER BY chrom");
    if (!$chromIdeos) {
      throw new Exception("cytoBandIdeo table does not exist for reference `" .
        $db . "`");
    }
    $chromName = "";
    $chrom = [];
    $chromStart = PHP_INT_MAX;
    $chromEnd = PHP_INT_MIN;
    $chromCentStart = PHP_INT_MAX;
    $chromCentEnd = PHP_INT_MIN;
    while($chromRow = $chromIdeos->fetch_assoc()) {
      if($chromName !== $chromRow["chrom"]) {
        if($chromName && ($chromEnd - $chromStart > 0)) {
          // old and valid chrom is there
          $chrom["chrRegion"] = $chromName . ":" .
            ($chromStart + 1 - ChromRegion::BEGINNING) .
            "-" . $chromEnd;
          if($chromCentStart >= $chromStart && $chromCentStart < $chromEnd &&
            $chromCentEnd >= $chromStart && $chromCentEnd < $chromEnd
          ) {
            $chrom["cent"] = $chromName . ":" .
              ($chromCentStart + 1 - ChromRegion::BEGINNING) .
              "-" . $chromCentEnd;
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
    if($chromName && ($chromEnd - $chromStart > 0)) {
      // old and valid chrom is there
      $chrom["chrRegion"] = $chromName . ":" .
        ($chromStart + 1 - ChromRegion::BEGINNING) .
        "-" . $chromEnd;
      if($chromCentStart >= $chromStart && $chromCentStart < $chromEnd &&
        $chromCentEnd >= $chromStart && $chromCentEnd < $chromEnd) {
          $chrom["cent"] = $chromName . ":" .
          ($chromCentStart + 1 - ChromRegion::BEGINNING) .
          "-" . $chromCentEnd;
      }
      $result[$chromName] = $chrom;
    }
  } finally {
    if (!empty($chromIdeos)) {
      $chromIdeos->free();
    }
    if (!empty($mysqli)) {
      $mysqli->close();
    }
  }
  return $result;
}

function getTracks($db, $grp = NULL) {
  $result = [];
  $mysqli = connectCPB($db);
  $tracks = null;
  $stmt = null;
  // first get group information
  try {
    $sqlstmt = "SELECT * FROM grp";
    if(!is_null($grp)) {    // whether grp is specified
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
      // convert integer, boolean and floats to correct format
      $itor['priority'] = floatval($itor['priority']);
      $itor['defaultIsClosed'] = ($itor['defaultIsClosed'] === '1');
      $itor['singleChoice'] = ($itor['singleChoice'] === '1');

      $result[$itor['name']] = $itor;
      $result[$itor['name']]['tracks'] = [];
    }
  } catch (Exception $e) {
  } finally {
    if (!empty($groups)) {
      $groups->free();
    }
    if (!empty($stmt)) {
      $stmt->close();
    }
  }

  $result['_ungrouped'] = [];
  $result['_ungrouped']['tracks'] = [];  // this is to hold ungrouped tracks
  try {
    // then get track information
    $sqlstmt = "SELECT * FROM trackDb";
    if(!is_null($grp)) {    // whether grp is specified
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
      $itor['settings'] = json_decode($itor['settings'], true);
      if(array_key_exists($itor['grp'], $result)) {
        $result[$itor['grp']]['tracks'] []= $itor;
      } else {
        $result['_ungrouped']['tracks'] []= $itor;
      }
    }
  } finally {
    if (!empty($tracks)) {
      $tracks->free();
    }
    if (!empty($stmt)) {
      $stmt->close();
    }
    if (!empty($mysqli)) {
      $mysqli->close();
    }
  }
  return $result;
}

function getRefDbNames() {
  // return a full list of ref db names
  $mysqli = connectCPB();
  $ref = null;
  $result = [];
  try {
    $ref = $mysqli->query("SELECT dbname FROM ref");
    while($spcitor = $ref->fetch_assoc()) {
      $result[] = $spcitor["dbname"];
    }
    return $result;
  } finally {
    if (!empty($ref)) {
      $ref->free();
    }
    if (!empty($mysqli)) {
      $mysqli->close();
    }
  }
}

function getRefInfoFromArray($spcDbNameList = NULL) {
  // return everything about ref from db indicated by spcDbNameList
  try {
    $stmt = null;
    $mysqli = connectCPB();
    $spcinfo = [];
    $sqlstmt = "SELECT * FROM ref";
    if(!empty($spcDbNameList)) {
      $sqlstmt .= " WHERE dbname IN (?" .
        str_repeat(', ?', count($spcDbNameList) - 1) . ")";
      $stmt = $mysqli->prepare($sqlstmt);
      $sqltype = str_repeat('s', count($spcDbNameList));
      $a_params = array();
      $a_params []= & $sqltype;
      for($i = 0; $i < count($spcDbNameList); $i++) {
        $a_params []= & $spcDbNameList[$i];
      }
      call_user_func_array(array($stmt, 'bind_param'), $a_params);
      $stmt->execute();
      $ref = $stmt->get_result();
    } else {
      $ref = $mysqli->query($sqlstmt);
    }
    while($spcitor = $ref->fetch_assoc()) {
      $spcitor['settings'] = json_decode($spcitor['settings'], true);
      $spcinfo[$spcitor['dbname']] = $spcitor;
    }
    return $spcinfo;
  } finally {
    if (!empty($ref)) {
      $ref->free();
    }
    if (!empty($stmt)) {
      $stmt->close();
    }
    if (!empty($mysqli)) {
      $mysqli->close();
    }
  }
}

function getRefDatabaseFromGapInfo($gap, $spcDbName) {
  // return the database name according the gap value from each ref
  $mysqli = connectCPB();
  $spcinfo = array();
  try {
    $spcinfo = $mysqli->query("SELECT * FROM $spcDbName WHERE gap<=$gap ORDER BY gap DESC LIMIT 1");
    while($specdb = $spcinfo->fetch_assoc()){
      $bb = $specdb['databaseName'];
    }
    return $bb;
  } finally {
    if (!empty($spcinfo)) {
      $spcinfo->free();
    }
    if (!empty($mysqli)) {
      $mysqli->close();
    }
  }
}
