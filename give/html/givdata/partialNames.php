<?php
  // First get an array of posts, showing the database and trackDb name
  require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
  // notice that this needs to be commented out after debug to improve performance

  $req = getRequest();

  define('MAX_JSON_NAME_ITEMS', 100);

  if (!isset($req['maxCandidates'])) {
    $req['maxCandidates'] = MAX_JSON_NAME_ITEMS;
  }
  $req['name'] = trim($req['name']) + '%';

  define('MIN_JSON_QUERY_LENGTH', 2);

  $mysqli = connectCPB();
  $result = array();
  // open the genome browser database
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
    $queryStmt->bind_param('s', $req['name']);
    $queryStmt->execute();
    $generesult = $queryStmt->get_result();
    if($generesult->num_rows <= MAX_JSON_NAME_ITEMS) {
      while($row = $generesult->fetch_assoc()) {
        $result[$row["alias"]] = $row;
      }
    } else {
      // too many results
      $result["(too_many)"] = "too_many";
    }
    $generesult->free();
  }

  $mysqli->close();
  echo json_encode($result);

?>
