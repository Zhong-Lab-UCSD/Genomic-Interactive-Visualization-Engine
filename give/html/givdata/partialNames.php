<?php
  // First get an array of posts, showing the database and trackDb name
  require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
  // notice that this needs to be commented out after debug to improve performance

  $req = getRequest();

  var_error_log($req);

  define('MAX_JSON_NAME_ITEMS', 100);

  if (!isset($req['maxCandidates'])) {
    $req['maxCandidates'] = MAX_JSON_NAME_ITEMS;
  }
  $req['name'] = trim($req['name']) . '%';
  $db = trim($req['db']);

  define('MIN_JSON_QUERY_LENGTH', 2);

  $mysqli = connectCPB($db);
  $result = array();
  // open the genome browser database
  // TODO: try to implement codes for multi-species lookup
  if(strlen($mysqli->real_escape_string(trim($req['name']))) >= MIN_JSON_QUERY_LENGTH) {
    $queryStmt = $mysqli->prepare("SELECT `T`.`alias` AS `alias`, `T`.`Symbol` AS `name`, "
      . "`_NcbiGeneInfo`.`description` AS `description`, "
      . "CONCAT(`kGFilter`.`chrom`, ':', "
      . "MIN(`kGFilter`.`txStart`), '-', MAX(`kGFilter`.`txEnd`)) AS `coor` "
      . "FROM ((SELECT * FROM `_AliasTable` WHERE `alias` LIKE ? "
      . "ORDER BY `isSymbol` DESC, `Symbol`) AS `T` "
      . "INNER JOIN `_NcbiGeneInfo` ON `T`.`Symbol` = `_NcbiGeneInfo`.`Symbol`) "
      . "CROSS JOIN "
      . "((SELECT * FROM `knownGene` WHERE `chrom` NOT LIKE '%\_%') AS `kGFilter`"
      . " LEFT JOIN `kgXref` ON `kGFilter`.`name` = `kgXref`.`kgID`) "
      . "ON `T`.`Symbol` = `kgXref`.`geneSymbol` GROUP BY `kgXref`.`geneSymbol`");
    error_log($queryStmt);
    error_log($req['name']);
    $queryStmt->bind_param('s', $req['name']);
    $queryStmt->execute();
    $generesult = $queryStmt->get_result();
    if($generesult->num_rows <= MAX_JSON_NAME_ITEMS) {
      while($row = $generesult->fetch_assoc()) {
        $result[$row["name"]] = $row;
      }
    } else {
      // too many results
      $result["(max_exceeded)"] = TRUE;
    }
    $generesult->free();
  }

  $mysqli->close();
  echo json_encode($result);

?>
