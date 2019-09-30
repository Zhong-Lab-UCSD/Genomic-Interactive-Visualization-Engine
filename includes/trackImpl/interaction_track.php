<?php
require_once(realpath(dirname(__FILE__) . "/track_base.php"));

function _loadInteraction($db, $tableName, $chrRegion = NULL, $type = "interaction", $linkedTable = NULL, $linkedKey = NULL, $params = NULL) {
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
            . "linkID VARCHAR(100) PRIMARY KEY NOT NULL"
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

function _loadCustomInteraction($metaDb, $userId, $ref, $tableName, $chrRegion = NULL, $params = NULL) {
  // notice that for interaction tracks, $chrRegion may be an array
  // get the actual table name from file db
  $mysqli = connectCPB();
  $stmt = $mysqli->prepare("SELECT * FROM `" .
    $mysqli->real_escape_string(CUSTOM_TRACK_FILE_TABLE_NAME) .
    "` WHERE `userId` = ? AND `ref` = ? AND `tableName` = ?");
  $stmt->bind_param('sss', $userId, $ref, $tableName);
  $stmt->execute();
  $tableEntries = $stmt->get_result();
  $result = [];
  if ($tableEntries && $tableEntries->num_rows > 0) {
    // table entry found
    $entry = $tableEntries->fetch_assoc();
    $realTableName = $entry['fileName'];
    $result = _loadInteraction(CUSTOM_TRACK_DB_NAME, $realTableName, $chrRegion,
      'interaction', NULL, NULL, $params);
  } else {
    $mysqli->close();
    throw new Exception('Track not found!');
  }
  $tableEntries->free();
  $mysqli->close();
  return $result;
}

function _importInteractionFile ($tableName, $fileName, $ref, $trackMetaObj) {
  $needToUnlink = FALSE;
  if (filter_var($fileName, FILTER_VALIDATE_URL)) {
    file_put_contents(
      CUSTOM_TRACK_DOWNLOAD_TEMP_DIR . 'temp', fopen($fileName));
    $fileName = CUSTOM_TRACK_DOWNLOAD_TEMP_DIR . 'temp';
    $needToUnlink = TRUE;
  } else if (!file_exists($fileName)) {
    // file does not exist, throw an error
    throw new Exception('File does not exist: ' . $fileName);
  }
  $mysqli = connectCPB(CUSTOM_TRACK_DB_NAME);
  if ($mysqli) {
    // create temporary table then fill with file contents
    $stmt = "CREATE TABLE `$ref`.`$track_name` (" .
      "`ID` int(10) unsigned NOT NULL AUTO_INCREMENT, " .
      "`chrom` varchar(255) NOT NULL DEFAULT '', " .
      "`start` int(10) unsigned NOT NULL DEFAULT '0', " .
      "`end` int(10) unsigned NOT NULL DEFAULT '0', " .
      "`linkID` VARCHAR(100) NOT NULL, " .
      "`value` float NOT NULL DEFAULT '0', " .
      "`dirFlag` tinyint(4) NOT NULL DEFAULT '-1', " .
      "PRIMARY KEY (`ID`), " .
      "KEY `chrom` (`chrom`(16),`start`), " .
      "KEY `chrom_2` (`chrom`(16),`end`), " .
      "KEY `linkID` (`linkID`)" .
      ")";
    $mysqli->query($stmt);

    $stmt = "LOAD DATA LOCAL INFILE '" . $mysqli->real_escape_string($fileName) . 
      "' INTO TABLE `" . $mysqli->real_escape_string($tableName) . "` " .
      "(chrom, start, end, linkID, value, dirFlag)";
    $mysqli->query($stmt);
    $mysqli->close();
    if ($needToUnlink) {
      unlink($fileName);
    }
  }
}

// then registering the methods

if(!isset($trackMap['interaction'])) {
  $trackMap['interaction'] = array();
}
$trackMap['interaction']['loadTrack'] = '_loadInteraction';
$trackMap['interaction']['loadCustomTrack'] = '_loadCustomInteraction';
$trackMap['interaction']['importFile'] = '_importInteractionFile';
