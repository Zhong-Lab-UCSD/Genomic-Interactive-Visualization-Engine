<?php
require_once(realpath(dirname(__FILE__) . "/../../includes/ref_func.php"));
// if there is no db as input, get all ref and get all ChromInfo for each ref
// otherwise, just return the ChromInfo for the ref given
$req = getRequest();

if(isset($req['db'])) {
  $dblist []= $req['db'];
  $result = getChromInfo($req['db']);
} else {
  // get all db names
  $result = array();
  $dblist = getRefInfoFromArray()['array'];
  foreach ($dblist as $dbName => $dbEntry) {
    if($dbEntry['browserActive']) {
      try {
        $dbName = $dbEntry['givdbname']
          ? $dbEntry['givdbname'] : $dbName;
        $dbEntry['chromInfo'] = getChromInfo($dbName);
        $result[$dbName] = $dbEntry;
      } catch (Exception $e) {

      }
    }
  }
}
header('Content-Type: application/json');
echo empty($result)? json_encode($result, JSON_FORCE_OBJECT): json_encode($result);
?>
