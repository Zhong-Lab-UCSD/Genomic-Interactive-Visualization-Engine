<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

$trackMap = array();

function loadTrack($db, $tableName, $chrRegion = NULL, $type = NULL, $linkedTable = NULL, $linkedKey = NULL, $params = NULL) {

  global $trackMap;   // may need to be rewritten to use class instead
  // this is the map mapping different track types
  //    to their corresponding loading function

  // if type is not specified, read it from trackDb table
  if(is_null($type) || is_null($linkedTable)) {
    $mysqli = connectCPB($db);
    $sqlstmt = "SELECT type, settings FROM trackDb WHERE tableName = ?";
    $stmt = $mysqli->prepare($sqlstmt);
    $stmt->bind_param('s', $tableName);
    $stmt->execute();
    $tracks = $stmt->get_result();
    while($itor = $tracks->fetch_assoc()) {
      if (is_null($type)) {
        $type = strtolower(strtok($itor['type'], " \n\t"));
        strtok('', '');
      }
      if (is_null($linkedTable)) {
        $linkedTableSettings = json_decode($itor['settings'], true);
        if(isset($linkedTableSettings['defaultLinkedTables'])) {
          $linkedTable = $linkedTableSettings['defaultLinkedTables'];
          $linkedKey = $linkedTableSettings['defaultLinkedKeys'];
        }
      }
    }
    $tracks->free();
    $mysqli->close();
  }
  // otherwise, directly use the corresponding function
  return $trackMap[$type]['loadTrack']($db, $tableName, $chrRegion, $type, $linkedTable, $linkedKey, $params);
}

function loadCustomTrack($db, $remoteUrl, $chrRegion = NULL, $type = NULL, $params = NULL) {
  global $trackMap;   // may need to be rewritten to use class instead
  // if type is not specified, try to determine from file extension (not recommended)
  if(is_null($type)) {
    $type = strtolower(end(explode('.', $remoteUrl)));
  } else {
    $type = strtolower($type);
  }

  // otherwise, directly use the corresponding function
  return $trackMap[$type]['loadCustomTrack']($db, $remoteUrl, $chrRegion, $params);
}

function updateCustomTables($db, $fileName, $trackType) {
  // md5 hash will be generated for $file, and compared
  //    against md5hash in customTracks table to see if there is already
  //    a custom table created for that file
  // A MySQL event should be ready to clean up the database for uploaded tracks
  //    and temporary tables
  global $trackMap;   // may need to be rewritten to use class instead

  $fileKey = md5_file($fileName);
  if($mysqli) {
    $stmt = $mysqli->prepare("SELECT * FROM `" .
      $mysqli->real_escape_string(CUSTOM_TRACK_TABLE_NAME) . "` " .
      "WHERE `fileKey` = ? AND `trackType` = ?");
    $stmt->bind_param('ss', $fileKey, $trackType);
    $stmt->execute();
    $tableEntries = $stmt->get_result();
    if (!$tableEntries || $tableEntries->num_rows <= 0) {
      // Old table entries does not exist
      // use corresponding methods to populate the tableNameQuery
      if (function_exists($trackMap[$trackType]['buildCTTable'])) {
        $trackMap[$trackType]['buildCTTable']($fileKey . "_" . $trackType, $filename);
      }
    }

    // update the entry's lastAccessed flag
    $stmt = $mysqli->prepare("INSERT INTO `" .
      $mysqli->real_escape_string(CUSTOM_TRACK_TABLE_NAME) .
      "` (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE `lastAccessed` = NOW()");
    $stmt->bind_param('ssss', $fileKey, $trackType, $fileName,
      $fileKey . "_" . $trackType);
    $stmt->execute();
  }
}
