<?php
  // First get an array of posts, showing the database and trackDb name
  require_once(realpath(dirname(__FILE__) . "/../../includes/ref_func.php"));
  // notice that this needs to be commented out after debug to improve performance

  define('MAX_JSON_NAME_ITEMS', 100);
  define('MIN_JSON_QUERY_LENGTH', 2);

  /**
   * Helper functions
   */

  function testRefPartialName($ref) {
    try {
      $refInfo = getRefInfoFromArray();
      if (!isset($refInfo[$ref])) {
        throw(new Exception("No reference named " . $ref . ".", NO_REF_NAMED));
      }
      $refInfo = $refInfo[$ref];
      $refInfo['settings'] = json_decode($refInfo['settings']);
      $settings =& $refInfo['settings'];
      if (isset($settings['geneCoorTable'])) {
        // verify if the table is there
        $mysqli = connectCPB($ref);
        $geneSymbolCol = $mysqli->real_escape_string(
          (!isset($settings['geneSymbolColumn']) ||
          is_null($settings['geneSymbolColumn']))
            ? 'name' : $settings['geneSymbolColumn']
        );
        $geneCoorTable = $mysqli->real_escape_string(
          trim($settings['geneCoorTable']));
        if (!($mysqli->query("SHOW COLUMNS FROM `" . $geneCoorTable .
          "` WHERE `Field` = '" . $geneSymbolCol . "'")->num_rows)
        ) {
          // No 'geneSymbol' column for `geneCoorTable`
          // test for linked tables
          $res = $mysqli->query("SELECT * FROM `trackDb` WHERE" .
            " `tableName` = '" . $geneCoorTable . "'");
          if ($itor = $res->fetch_assoc()) {
            $trSettings = json_decode($itor['settings']);
            if (!$trSettings['defaultLinkedTables'] ||
              !$trSettings['defaultLinkedKeys'] ||
              !($mysqli->query("SHOW COLUMNS FROM `" .
                $mysqli->real_escape_string(
                  $trSettings['defaultLinkedTables']
                ) . "` WHERE `Field` = '" .
                $geneSymbolCol . "'")->num_rows
              )
            ) {
              // Either there is no linked table, or the column is not in the
              // linked table.
              throw new Exception("Reference db format incorrect: " .
                "no column named '" . $geneSymbolCol . "' was found in table " .
                "`" . $geneCoorTable . "` or linked table(s).",
                NO_GENE_SYMBOL_COLUMN);
            } else {
              $refInfo['linkedCoorTable'] = $trSettings['defaultLinkedTables'];
              $refInfo['linkedCoorKeys'] = $trSettings['defaultLinkedKeys'];
            }
          } else {
            throw new Exception("Reference db format incorrect: " .
              "no track named '" . $geneCoorTable . "' was found in table " .
              "`trackDb`.", TABLE_NOT_READY);
          }
          $res->free();
        }
        // Now `geneSymbol` column is definitely there.
        // Test for `chromStart` / `txStart`
        if ($mysqli->query("SHOW COLUMNS FROM `" . $geneCoorTable .
          "` WHERE `Field` IN ('chromStart', 'chromEnd')")->num_rows < 2
        ) {
          // No `chromStart` and `chromEnd` column, test for `txStart`
          if ($mysqli->query("SHOW COLUMNS FROM `" . $geneCoorTable .
            "` WHERE `Field` IN ('txStart', 'txEnd')")->num_rows < 2
          ) {
            throw new Exception("Reference table format incorrect: " .
              "no start and/or end column specified in '" . $geneCoorTable .
              "'.", TABLE_FORMAT_ERROR);
          }
          $refInfo['startCol'] = 'txStart';
          $refInfo['endCol'] = 'txEnd';
        } else {
          $refInfo['startCol'] = 'chromStart';
          $refInfo['endCol'] = 'chromEnd';
        }
        // Test the other two tables
        if (isset($settings['geneDescTable'])) {
          // verify if the table is there
          $descSymbolCol = $mysqli->real_escape_string(
            (!isset($settings['descSymbolColumn']) ||
            is_null($settings['descSymbolColumn']))
              ? 'Symbol' : $settings['descSymbolColumn']
          );
          if (!($mysqli->query("SHOW COLUMNS FROM `" .
            $mysqli->real_escape_string(trim($settings['geneDescTable'])) .
            "` WHERE `Field` = '" . $descSymbolCol . "'")->num_rows)
          ) {
            unset($settings['geneDescTable']);
            unset($settings['descSymbolColumn']);
          }
        }
        if (isset($settings['aliasTable'])) {
          // verify if the table is there
          $aliasSymbolCol = $mysqli->real_escape_string(
            (!isset($settings['aliasSymbolColumn']) ||
            is_null($settings['aliasSymbolColumn']))
              ? 'Symbol' : $settings['aliasSymbolColumn']
          );
          if (!($mysqli->query("SHOW COLUMNS FROM `" .
            $mysqli->real_escape_string(trim($settings['aliasTable'])) .
            "` WHERE `Field` = '" . $aliasSymbolCol . "'")->num_rows)
          ) {
            unset($settings['aliasTable']);
            unset($settings['aliasSymbolColumn']);
          }
        }
      } else {
        $refInfo = false;
      }
    } finally {
      if ($res) {
        $res->free();
      }
      if ($stmt) {
        $stmt->close();
      }
      if ($mysqli) {
        $mysqli->close();
      }
    }
    return $refInfo;
  }

  function findPartialName($ref, $partialName, $refInfo,
    $maxCandidates = MAX_JSON_NAME_ITEMS
  ) {
    // $partialName should be already there and has a length greater than
    // MIN_JSON_QUERY_LENGTH
    // $refInfo should have valid value (otherwise `testRefPartialName` won't
    // pass).
    $partialName .= '%';
    try {
      $mysqli = connectCPB($ref);
      $result = [];
      // TODO: try to implement codes for multi-ref lookup

      // Construct SQL components separately
      // Build query strings based on $refInfo
      // coordinate field
      $selectExpr = "CONCAT(`geneFilter`.`chrom`, ':', " .
        "MIN(`geneFilter`.`" . $refInfo['startCol'] . "`), '-', " .
        "MAX(`geneFilter`.`" . $refInfo['endCol'] . "`)) AS `coor`, `" .
        ($refInfo['linkedCoorTable'] ?
        $refInfo['linkedCoorTable'] : "geneFilter") . "`.`" .
        $refInfo['geneSymbolColumn'] . "` AS `name`";

      $tableReference = "(SELECT * FROM `" . $refInfo['geneCoorTable'] .
        "` WHERE `chrom` NOT LIKE '%\_%') AS `geneFilter`";
      if ($refInfo['linkedCoorTable']) {
        $tableReference = "(" . $tableReference . " LEFT JOIN `" .
          $refInfo['linkedCoorTable'] . "` ON `geneFilter`.`name` = `" .
          $refInfo['linkedCoorTable'] . "`.`" .
          $refInfo['linkedCoorKeys'] . "`)";
      }

      $whereCondition = "`" . ($refInfo['linkedCoorTable'] ?
        $refInfo['linkedCoorTable'] : "geneFilter") . "`.`" .
        $refInfo['geneSymbolColumn'] . "` LIKE ?";

      $groupByExpr = "`" .
        ($refInfo['linkedCoorTable'] ? $refInfo['linkedCoorTable'] :
        "geneFilter") .  "`.`" . $refInfo['geneSymbolColumn'] . "`";

      $orderByExpr = "`name`";

      // gene description field
      if ($refInfo['geneDescTable']) {
        $selectExpr .= ", `" . $refInfo['geneDescTable'] .
          "`.`description` AS `description`";
        $tableReference .= " INNER JOIN `" . $refInfo['geneDescTable'] .
          "` ON `" . ($refInfo['linkedCoorTable'] ?
          $refInfo['linkedCoorTable'] : "geneFilter") . "`.`" .
          $refInfo['geneSymbolColumn'] . "` = `" .
          $refInfo['geneDescTable'] . "`.`" .
          $refInfo['descSymbolColumn'] . "`) ";
      }

      // alias field
      if ($refInfo['aliasTable']) {
        $selectExpr .= ", `" . $refInfo['aliasTable'] . "`.`alias` AS `alias`";
        $tableReference .= " INNER JOIN `" . $refInfo['aliasTable'] . "` ON `" .
          ($refInfo['linkedCoorTable'] ?
          $refInfo['linkedCoorTable'] : "geneFilter") . "`.`" .
          $refInfo['geneSymbolColumn'] . "` = `" .
          $refInfo['aliasTable'] . "`.`" .
          $refInfo['aliasSymbolColumn'] . "`";
        $whereCondition = "`" . $refInfo['aliasTable'] . "`.`alias` LIKE ?";
        $orderByExpr = "`" . $refInfo['aliasTable'] . "`.`isSymbol` DESC " .
          $orderByExpr;
      }

      $queryStmt = $mysqli->prepare("SELECT " . $selectExpr .
        " FROM " . $tableReference . " WHERE " . $whereCondition .
        " GROUP BY " . $groupByExpr . " ORDER BY " . $orderByExpr
      );
      $queryStmt->bind_param('s', $partialName);
      $queryStmt->execute();
      $generesult = $queryStmt->get_result();
      if($generesult->num_rows <= $maxCandidates) {
        while($row = $generesult->fetch_assoc()) {
          $result[$row["name"]] = $row;
        }
      } else {
        // too many results
        $result["(max_exceeded)"] = TRUE;
      }
      return $result;
    } finally {
      if ($generesult) {
        $generesult->free();
      }
      if ($queryStmt) {
        $queryStmt->close();
      }
      if ($mysqli) {
        $mysqli->close();
      }
    }
  }


  /**
   * Formal processing procedures here.
   */

  $req = getRequest();
  $db = trim($req['db']);
  $partialName = trim($req['name']);
  $maxCandidates = is_int(trim($req['maxCandidates']))
    ? intval(trim($req['maxCandidates'])) : MAX_JSON_NAME_ITEMS;
  if ($maxCandidates <= 0) {
    $maxCandidates = MAX_JSON_NAME_ITEMS;
  }

  $result = [];

  header('Content-Type: application/json');
  if ($db && $refInfo = testRefPartialName($db)) {
    // First read reference information from `ref` table to see if partial
    // gene name feature is supported in the reference

    if ($partialName && strlen($partialName) >= MIN_JSON_QUERY_LENGTH) {
      $result['input'] = $req['name'];
      $result['list'] =
        findPartialName($db, $partialName, $refInfo, $maxCandidates);
    } else {
      // testing purpose only, return "supported" flag
      $result['supported'] = true;
    }
  } else {
    // return "unsupported" flag
    $result['supported'] = false;
  }
  echo json_encode($result);
