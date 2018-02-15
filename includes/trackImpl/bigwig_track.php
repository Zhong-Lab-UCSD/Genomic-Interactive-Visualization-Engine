<?php
require_once(realpath(dirname(__FILE__) . "/track_base.php"));

function _loadBigwig($db, $tableName, $chrRegion = NULL, $linkedTable = NULL, $params = NULL) {
  // bigwig tracks does not have any database entries,
  //    all files will be either locally on the server, or on some remote server
  $mysqli = connectCPB($db);
  $result = array();

  if($mysqli && isset($tableName)) {
    $sqlstmt = "SELECT fileName FROM `" . $mysqli->real_escape_string($tableName) . "`";
    $res = $mysqli->query($sqlstmt);
    if (!$res) {
      error_log('TableName `' . $mysqli->real_escape_string($tableName) . '` does not exist!');
    }
    $fName = $res->fetch_assoc();
    try {
      $bwFile = new BigWigFile($fName['fileName']);
    } catch (Exception $e) {
      error_log($e->getMessage());
    }
    $res->free();
    $mysqli->close();

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
  }

  return $result;
}

function _loadCustomBigWig($db, $remoteUrl, $chrRegion = NULL, $params = NULL) {
  // note that this *MUST* be a remote file (cannot be a local file)
  if(substr($remoteUrl, 0, 7) !== 'http://' && substr($remoteUrl, 0, 8) !== 'https://') {
    error_log('RemoteURL is not a remote URL: ' . $remoteUrl);
    throw new Exception('RemoteURL is not a remote URL!');
  }
  try {
    $bwFile = new BigWigFile($remoteUrl);
  } catch (Exception $e) {
    error_log($e->getMessage());
  }

  if(!is_null($chrRegion)) {
    // load data within a specific range of the bigWig file
    // TODO: implement a zoomed level?
    if(!is_array($chrRegion)) {
      $chrRegion = [$chrRegion];
    }
    $strToChrRegion = function($regionStr) {
      return ChromRegion::newFromRegionText($regionStr);
    };
    error_log('Params:');
    var_error_log($params);
    if(isset($params) && isset($params['resolutions'])) {
      $result = $bwFile->getSummaryOrRaw(array_map($strToChrRegion, $chrRegion), $params['resolutions'], TRUE);
    } else {
      $result = $bwFile->getRawDataInRegions(array_map($strToChrRegion, $chrRegion));
    }
  } else {
    // load everything from the bigWig file (should be extremely rare)
    $result = $bwFile->getAllRawData();
  }
  return $result;
}

// then registering the methods

if(!isset($trackMap['bigwig'])) {
  $trackMap['bigwig'] = array();
}
$trackMap['bigwig']['loadTrack'] = '_loadBigwig';
$trackMap['bigwig']['loadCustomTrack'] = '_loadCustomBigwig';
