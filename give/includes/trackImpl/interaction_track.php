<?php
require_once(realpath(dirname(__FILE__) . "/track_base.php"));

function _loadInteraction($db, $tableName, $chrRegion = NULL, $linkedTable = NULL, $params = NULL) {
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
        $chrRegionObj = ChromRegion::newFromRegionText($region);
        array_push($a_params, $chrRegionObj->chr, $chrRegionObj->end, $chrRegionObj->start);
      }
      for($i = 0; $i < count($a_params); $i++) {
        $ref_params []= & $a_params[$i];
      }
      call_user_func_array(array($stmt, 'bind_param'), $ref_params);
      if(!$stmt->execute()) {
        error_log($stmt->error);
      }

      $sqlstmt .= " WHERE linkID IN (SELECT linkID FROM `linkIDTable`) AND ("
        . implode(' OR ', array_fill(0, count($chrRegion), 'chrom = ?'))
        . ") ORDER BY start";
      $stmt = $mysqli->prepare($sqlstmt);
      $a_params = array();
      $ref_params = array();
      $a_params []= str_repeat('s', count($chrRegion));
      foreach($chrRegion as $region) {
        $chrRegionObj = ChromRegion::newFromRegionText($region);
        array_push($a_params, $chrRegionObj->chr);
      }
      for($i = 0; $i < count($a_params); $i++) {
        $ref_params []= & $a_params[$i];
      }
      call_user_func_array(array($stmt, 'bind_param'), $ref_params);
      if(!$stmt->execute()) {
        error_log($stmt->error);
      }
      $regions = $stmt->get_result();

    } else {
      $sqlstmt .= " ORDER BY start";
      $regions = $mysqli->query($sqlstmt);
    }
    while($itor = $regions->fetch_assoc()) {
      if(!isset($result[$itor['chrom']])) {
        $result[$itor['chrom']] = array();
      }
      $newRegion = array();
      $newRegion['regionString'] = $itor['chrom'] . ':' . $itor['start'] . '-' . $itor['end'];
      $newRegion['ID'] = $itor['ID'];
      $newRegion['linkID'] = $itor['linkID'];
      $newRegion['value'] = $itor['value'];
      if(isset($itor['dirFlag']) && $itor['dirFlag'] >= 0) {
        $newRegion['dirFlag'] = $itor['dirFlag'];
      }
      $result[$itor['chrom']] []= $newRegion;
    }
    $regions->free();
    $mysqli->close();
  }

  return $result;
}

function _loadCustomInteraction($db, $remoteUrl, $chrRegion = NULL, $params = NULL) {
  // notice that for interaction tracks, $chrRegion may be an array
}


// then registering the methods

if(!isset($trackMap['interaction'])) {
  $trackMap['interaction'] = array();
}
$trackMap['interaction']['loadTrack'] = '_loadInteraction';
$trackMap['interaction']['loadCustomTrack'] = '_loadCustomInteraction';
