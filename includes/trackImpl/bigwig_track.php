<?php
require_once(realpath(dirname(__FILE__) . "/track_base.php"));

function _loadBigwigFromFile($file, $chrRegion = NULL, $params = NULL) {
  $bwFile = NULL;
  $result = [];
  try {
    $bwFile = new BigWigFile($file);
  } catch (Exception $e) {
    error_log($e->getMessage());
    throw $e;
  }

  if(!is_null($chrRegion)) {
    // load data within a specific range of the bigWig file
    if(!is_array($chrRegion)) {
      $chrRegion = [$chrRegion];
    }
    $strToChrRegion = function($regionStr) {
      return ChromRegion::newFromRegionText($regionStr);
    };
    if(isset($params) && isset($params['resolutions'])) {
      $result = $bwFile->getSummaryOrRaw(array_map($strToChrRegion, $chrRegion), $params['resolutions'], TRUE, TRUE);
    } else {
      $result = $bwFile->getRawDataInRegions(array_map($strToChrRegion, $chrRegion));
    }
  } else {
    // load everything from the bigWig file (should be extremely rare)
    $result = $bwFile->getAllRawData();
  }

  return $result;
}

function _loadBigwig($db, $tableName, $chrRegion = NULL, $type = 'bigwig', $linkedTable = NULL, $linkedKey = NULL, $params = NULL) {
  // bigwig tracks does not have any database entries,
  //    all files will be either locally on the server, or on some remote server
  $mysqli = connectCPB($db);
  $result = array();

  if($mysqli && isset($tableName)) {
    $sqlstmt = "SELECT fileName FROM `" . $mysqli->real_escape_string($tableName) . "`";
    $res = $mysqli->query($sqlstmt);
    if (!$res) {
      $mysqli->close();
      throw new Exception('TableName `' . $mysqli->real_escape_string($tableName) . '` does not exist!');
    }
    $fName = $res->fetch_assoc();
    $fName = $fName['fileName'];
    $result = _loadBigwigFromFile($fName, $chrRegion, $params);
  }
  $res->free();
  $mysqli->close();
  return $result;
}

function _loadCustomBigWig ($ref, $userId, $tableName, $chrRegion = NULL, $params = NULL) {
  // get the actual table name from file db
  $mysqli = connectCPB();
  $stmt = $mysqli->prepare("SELECT * FROM \`" .
    $mysqli->real_escape_string(CUSTOM_TRACK_FILE_TABLE_NAME) .
    "\` WHERE `userId` = ? AND `ref` = ? AND `tableName` = ?");
  $stmt->bind_param('sss', $userId, $ref, $tableName);
  $stmt->execute();
  $tableEntries = $stmt->get_result();
  $result = [];
  if ($tableEntries && $tableEntries->num_rows > 0) {
    // table entry found
    $entry = $tableEntries->fetch_assoc();
    $fileName = $entry['fileName'];
    $result = _loadBigwigFromFile($fileName, $chrRegion, $params);
  } else {
    $mysqli->close();
    throw new Exception('Track not found!');
  }
  $tableEntries->free();
  $mysqli->close();
  return $result;
}

// then registering the methods

if(!isset($trackMap['bigwig'])) {
  $trackMap['bigwig'] = array();
}
$trackMap['bigwig']['loadTrack'] = '_loadBigwig';
$trackMap['bigwig']['loadCustomTrack'] = '_loadCustomBigwig';
