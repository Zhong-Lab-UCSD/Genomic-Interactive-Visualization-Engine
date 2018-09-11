<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
// this is the script used to convert UCSC track settings to GIVe track settings format (json_encode)
if($_REQUEST['db']) {
  // load the track to see if it's json format
  $mysqli = connectCPBWriter($_REQUEST['db']);
  $sqlstmt = "SELECT * FROM trackDb";
  if($_REQUEST['track']) {
    $sqlstmt .= " WHERE tableName = ?";
    $stmt = $mysqli->prepare($sqlstmt);
    $stmt->bind_param('s', $_REQUEST['track']);
    $stmt->execute();
    $tracks = $stmt->get_result();
  } else {
    $tracks = $mysqli->query($sqlstmt);
  }
  // check whether settings is json
  while($itor = $tracks->fetch_assoc()) {
    json_decode($itor['settings'], true);
    if(json_last_error() !== JSON_ERROR_NONE) {
      // is not json, convert
      echo $itor['settings'];
      $settingsObj = [];
      $items = explode("\n", $itor['settings']);
      foreach($items as $setting) {
        $kvpair = preg_split("/\s+/", trim($setting), 2);
        if($kvpair[0]) {
          if ($kvpair[0] !== 'priority') {
            if (is_numeric($kvpair[1])) {
              $settingsObj[$kvpair[0]] = floatval($kvpair[1]);
            } else if (strtolower($kvpair[1]) === 'on' || strtolower($kvpair[1]) === 'off') {
              $settingsObj[$kvpair[0]] = (strtolower($kvpair[1]) === 'on');
            } else {
              $settingsObj[$kvpair[0]] = $kvpair[1];
            }
          } else {
            $settingsObj['priority'] = floatval($itor['priority']);
          }
        }
      }
      $settingsJSON = empty($settingsObj)
        ? json_encode($settingsObj, JSON_FORCE_OBJECT)
        : json_encode($settingsObj);
      $updateSqlStmt = "UPDATE trackDb SET settings = ? WHERE tableName = ?";
      $updateStmt = $mysqli->prepare($updateSqlStmt);
      $updateStmt->bind_param('ss', $settingsJSON, $itor['tableName']);
      $updateStmt->execute();
      echo "\n\nCONVERTED:\n";
      echo $settingsJSON;
    }
  }
  $tracks->free();
  $mysqli->close();
}
?>
