<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

$trackMap = array();

function loadTrack(
  $db, $tableName, $chrRegion = NULL, $type = NULL, $linkedTable = NULL,
  $linkedKey = NULL, $params = NULL
) {
  global $trackMap;   // may need to be rewritten to use class instead
  // this is the map mapping different track types
  //    to their corresponding loading function

  // if type is not specified, read it from trackDb table
  if(is_null($type) || is_null($linkedTable)) {
    $mysqli = connectCPB($db);
    $sqlstmt = "SELECT \`type\`, \`settings\` FROM \`trackDb\` " .
      "WHERE \`tableName\` = ?";
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

function loadCustomTrack (
  $db, $userId, $tableName, $chrRegion = NULL, $type = NULL, $params = NULL
) {
  global $trackMap;   // may need to be rewritten to use class instead
  // if type is not specified, try to determine from file extension (not recommended)
  if(is_null($type)) {
    $type = strtolower(end(explode('.', $remoteUrl)));
  } else {
    $type = strtolower($type);
  }

  // otherwise, directly use the corresponding function
  return $trackMap[$type]['loadCustomTrack'](
    $db, $userId, $tableName, $chrRegion, $params);
}

/**
 * Read the meta data of custom tracks
 * @param string $ref The reference database name ('hg38', etc.)
 * @param string $userId The userId (for non-anonymous tracks) or sessionId
 *   (for anonymous tracks).
 * @param string $tableName The track name. If not provided, get all matching
 *   tracks.
 * @return array<object> Returns the meta objects of the track if successful,
 *   empty array otherwise
 */
function readCustomTrackMeta ($ref, $userId, $tableName = NULL) {
  $mysqli = connectCPB(CUSTOM_TRACK_DB_NAME);
  try {
    $sqlstmt = "SELECT * FROM \`" .
      $mysqli->real_escape_string(CUSTOM_TRACK_META_TABLE_NAME) . "\` " .
      "WHERE \`userId\` = ? AND \`ref\` = ?";
    $stmt = NULL;
    if (isset($tableName) && !empty($tablename)) {
      $sqlstmt .= " AND \`tableName\` = ? ORDER BY priority";
      $stmt = $mysqli->prepare($sqlstmt);
      $stmt->bind_param('sss', $userId, $ref, $tableName);
    } else {
      $sqlstmt .= " ORDER BY priority";
      $stmt = $mysqli->prepare($sqlstmt);
      $stmt->bind_param('ss', $userId, $ref);
    }
    $stmt->execute();
    $tracks = $stmt->get_result();
    $result = [];
    while ($itor = $tracks->fetch_assoc()) {
      // needs to redo settings part
      // settings should be a json object
      $itor['settings'] = json_decode($itor['settings'], true);
      $result []= $itor;
    }
  } catch (Exception $e) {
    error_log('Custom track not supported.');
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

/**
 * Add a custom track
 * @param string $ref The reference database name ('hg38', etc.)
 * @param string $userId The userId (for non-anonymous tracks) or sessionId
 *   (for anonymous tracks).
 * @param string $fileName The path of the file or the URL of the remote file
 * @param string $access The access of the track, one of the following:
 *   'anonymous', 'nonListed', 'private', 'public'
 * @param string $type The type of the track, one of the following:
 *   'bed', 'geneanno', 'bigwig', 'interaction'
 * @param array $trackMetaObj The meta data object of the track
 * @param boolean $overrideHash Whether to override hash conflicts
 * @return array Returns the meta object of the track if successful,
 *   null if the same track has been added before, a list of track metas with
 *   the same hash value otherwise.
 */
function addCustomTrack(
  $ref, $userId, $fileName, $access, $type, $trackMetaObj, $overrideHash = false
) {
  // md5 hash will be generated for $file, and compared
  //    against md5hash in customTracks table to see if there is already
  //    a custom table created for that file
  // A MySQL event should be ready to clean up the database for uploaded tracks
  //    and temporary tables
  // Rationale:
  // 1. First generate the key hash of the file (if it exists)
  // 2. Compare the file key plus ID in database.
  //   2a. If it already exists,
  //     i.  If $overrideHash is not set, return the existing track meta to
  //       verify;
  //       (If it is matching we are gonna return without processing anyway)
  //     ii. If $overrideHash is set, check if the new entry is matching, if so
  //       just return NULL (indicating no insertion happened),
  //       otherwise go to 2b;
  //   2b. Otherwise, add the entry into customTrackFiles, then:
  //     i.  If the track has an importFile function, run that to build a table
  //     ii. Append the meta to customTrackMeta and return the meta.
  global $trackMap;   // may need to be rewritten to use class instead
  $mysqli = connectCPB(CUSTOM_TRACK_DB_NAME);

  if (!is_uploaded_file($fileName)) {
    // is not a locally uploaded file
    if (!filter_var($fileName, FILTER_VALIDATE_URL)) {
      // file does not exist, throw an error
      throw new Exception('File does not exist or is not an uploaded file: ' .
        $fileName);
    }
  }
  if (!isset($ref) || empty($ref)) {
    throw new Exception('Reference is not set!');
  }
  if (!isset($userId) || empty($userId)) {
    throw new Exception('UserId is not set!');
  }
  if (!isset($access) || empty($access)) {
    throw new Exception('Access is not set!');
  }
  if (!isset($trackMetaObj) || empty($trackMetaObj)) {
    throw new Exception('TrackMetaObj is not set!');
  }
  // Also: merge default settings from the track implementations if possible
  if (function_exists($trackMap[$trackType]['getDefaultSettings'])) {
    $trackMetaObj = array_merge($trackMap[$trackType]['getDefaultSettings'](),
      $trackMetaObj
    );
  }
  // if type is not specified, read it from trackMetaObj
  if (!isset($type) || is_null($type)) {
    if (!array_key_exists('type', $trackMetaObj)) {
      throw new Exception('Type is not defined!');
    }
    $type = strtolower(strtok($trackMetaObj['type'], " \n\t"));
    strtok('', '');
  }
  if ($mysqli) {
    // 1. First generate the key hash of the file (if it exists)
    $fileKey = filter_var($fileName, FILTER_VALIDATE_URL)
      ? md5($fileName) : md5_file($fileName);
    // 2. Compare the file key plus ID in database if $overrideHash is not set.
    $stmt = $mysqli->prepare("SELECT * FROM \`" .
      $mysqli->real_escape_string(CUSTOM_TRACK_FILE_TABLE_NAME) . "\` " .
      "WHERE \`fileHash\` = ? AND \`userId\` = ?");
    $stmt->bind_param('ss', $fileKey, $userId);
    $stmt->execute();
    $tableEntries = $stmt->get_result();
    if (isset($tableEntries) && $tableEntries->num_rows > 0) {
      // 2a. If it already exists, return the existing track meta to verify;
      if (!$overrideHash) {
        // get the meta of the track
        $result = [];
        while ($itor = $tableEntries->fetch_assoc()) {
          // needs to redo settings part
          // settings should be a json object
          $result = array_merge(
            $result,
            readCustomTrackMeta($ref, $userId, $itor['tableName'])
          );
        }
        return $result;
      } else {
        while ($itor = $tableEntries->fetch_assoc()) {
          if ($itor['tableName'] === $trackMetaObj['tableName']) {
            return NULL;
          }
        }
      }
    }
    $tableEntries->free();

    // 2b. Otherwise, add the entry into customTrackFiles, then:
    //   i.  If the track has an importFile function, run that to build a table
    //   ii. Append the meta to customTrackMeta and return
    $fileNameToWrite = NULL;
    // Generate a table name first and put it into fileName field
    do {
      $fileNameToWrite = 
        (function_exists($trackMap[$trackType]['importFile'])
          ? CUSTOM_TRACK_TABLE_PREFIX
          : CUSTOM_TRACK_UPLOAD_DIR) .
        generateRandomString(CUSTOM_TRACK_TABLE_LENGTH);
      $stmt = $mysqli->prepare("SELECT * FROM `" .
        $mysqli->real_escape_string(CUSTOM_TRACK_FILE_TABLE_NAME) . "` " .
        "WHERE `fileName` = ?");
      $stmt->bind_param('s', $fileNameToWrite);
      $stmt->execute();
      $tableEntries = $stmt->get_result();
    } while ($tableEntries && $tableEntries->num_rows > 0);
    if (function_exists($trackMap[$trackType]['importFile'])) {
      $trackMap[$trackType]['importFile'](
        $fileNameToWrite, $fileName, $ref, $trackMetaObj);
    } else if (is_uploaded_file($fileName)) {
      move_uploaded_file($fileName, $fileNameToWrite);
    } else {
      $fileNameToWrite = $fileName;
    }

    // Append to customTrackFiles table first, then append to customTrackMeta
    $stmt = $mysqli->prepare("INSERT INTO \`" .
      $mysqli->real_escape_string(CUSTOM_TRACK_FILE_TABLE_NAME) .
      "\` (?, ?, ?, ?, ?) ON DUPLICATE KEY " .
      "UPDATE \`tableName\` = \`tableName\`");
    $stmt->bind_param('sssss', $ref, $userId, $trackMetaObj['tableName'],
      $fileKey, $fileNameToWrite);
    $stmt->execute();
    $stmt = $mysqli->prepare("INSERT INTO \`" .
      $mysqli->real_escape_string(CUSTOM_TRACK_FILE_META_NAME) .
      "\` (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE " .
      "\`tableName\` = \`tableName\`");
    $stmt->bind_param(
      'sssssdssss',
      $access,
      $ref,
      $userId,
      $trackMetaObj['tableName'],
      $type,
      array_key_exists('priority', $trackMetaObj)
        ? $trackMetaObj['priority'] : 0,
      '',
      '',
      json_encode($trackMetaObj, JSON_FORCE_OBJECT)
    );
    $stmt->execute();
    $mysqli->close();
    return $trackMetaObj;
  }
}

function updateCustomTrackMeta (
  $ref, $userId, $tableName, $access, $type = NULL, $trackMetaObj = []
) {
  global $trackMap;   // may need to be rewritten to use class instead
  $mysqli = connectCPB(CUSTOM_TRACK_DB_NAME);

  if (!isset($ref) || empty($ref)) {
    throw new Exception('Reference is not set!');
  }
  if (!isset($userId) || empty($userId)) {
    throw new Exception('UserId is not set!');
  }
  if (!isset($access) || empty($access)) {
    throw new Exception('Access is not set!');
  }
  if (!isset($tableName) || empty($tableName)) {
    throw new Exception('TableName is not set!');
  }
  if ($mysqli) {
    // Also: merge old settings from the track implementations if possible
    // and make sure the old track record does exist
    $stmt = $mysqli->prepare("SELECT * FROM `" .
      $mysqli->real_escape_string(CUSTOM_TRACK_META_TABLE_NAME) . "` " .
      "WHERE `userId` = ? AND `ref` = ? AND `tableName` = ?");
    $stmt->bind_param('sss', $userId, $ref, $tableName);
    $stmt->execute();
    $tableEntries = $stmt->get_result();
    if (isset($tableEntries) && $tableEntries->num_rows > 0) {
      $entry = $tableEntries->fetch_assoc();
      $trackMetaObj = array_merge(json_decode($entry['settings'](), true),
        $trackMetaObj || []
      );
      $tableEntries->free();
    } else {
      $tableEntries->free();
      $mysqli->close();
      throw new Exception('Track not found!');
    }
    // if type is not specified, read it from trackMetaObj
    if (!isset($type) || is_null($type)) {
      if (!array_key_exists('type', $trackMetaObj)) {
        throw new Exception('Type is not defined!');
      }
      $type = strtolower(strtok($trackMetaObj['type'], " \n\t"));
      strtok('', '');
    }
    // 2. Compare the file key plus ID in database if $overrideHash is not set.
    $stmt = $mysqli->prepare("UPDATE `" .
      $mysqli->real_escape_string(CUSTOM_TRACK_META_TABLE_NAME) . "` " .
      "SET `lastUpdate` = NOW(), `access` = ?, `settings` = ?" .
      "WHERE `userId` = ? AND `ref` = ? AND `tableName` = ?");
    $stmt->bind_param('sssss',
      $access, json_encode($trackMetaObj, JSON_FORCE_OBJECT),
      $userId, $ref, $tableName
    );
    $stmt->execute();
    $mysqli->close();
  }
}

function deleteCustomTrack ($ref, $userId, $tableName) {
  // Rationale: if there is a custom table, drop the table
  // Then remove everything from customTrackFiles and customTrackMeta
  $mysqli = connectCPB(CUSTOM_TRACK_DB_NAME);
  $stmt = $mysqli->prepare("SELECT * FROM `" .
    $mysqli->real_escape_string(CUSTOM_TRACK_FILE_TABLE_NAME) .
    "` WHERE `userId` = ? AND `ref` = ? AND `tableName` = ?");
  $stmt->bind_param('sss', $userId, $ref, $tableName);
  $stmt->execute();
  $tableEntries = $stmt->get_result();
  if ($tableEntries && $tableEntries->num_rows > 0) {
    // table entry found
    $entry = $tableEntries->fetch_assoc();
    $fileName = $entry['fileName'];
    if (substr(
      $fileName, 0, strlen(CUSTOM_TRACK_TABLE_PREFIX)
    ) === CUSTOM_TRACK_TABLE_PREFIX) {
      // is a table
      $mysqli->query("DROP TABLE `" . $mysqli->real_escape_string($fileName) .
        "`");
    } else if (!filter_var($fileName, FILTER_VALIDATE_URL)) {
      // is a local file that needs to be deleted
      unlink($fileName);
    }
  } else {
    $tableEntries->free();
    $mysqli->close();
    throw new Exception('Track not found!');
  }
  $tableEntries->free();
  $stmt = $mysqli->prepare("DELETE FROM `" .
    $mysqli->real_escape_string(CUSTOM_TRACK_FILE_TABLE_NAME) .
    "` WHERE `userId` = ? AND `ref` = ? AND `tableName` = ?");
  $stmt->bind_param('sss', $userId, $ref, $tableName);
  $stmt->execute();
  $tableEntries->free();
  $stmt = $mysqli->prepare("DELETE FROM `" .
    $mysqli->real_escape_string(CUSTOM_TRACK_META_TABLE_NAME) .
    "` WHERE `userId` = ? AND `ref` = ? AND `tableName` = ?");
  $stmt->bind_param('sss', $userId, $ref, $tableName);
  $stmt->execute();
  $tableEntries->free();
  $mysqli->close();
}

