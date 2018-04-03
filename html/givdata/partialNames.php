<?php
  // First get an array of posts, showing the database and trackDb name
  require_once(realpath(dirname(__FILE__) . "/../../includes/ref_func.php"));
  // notice that this needs to be commented out after debug to improve performance

  $req = getRequest();

  define('MAX_JSON_NAME_ITEMS', 100);

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
            $trackSettings = json_decode($itor['settings']);
            if (!$trackSettings['defaultLinkedTables'] ||
              !$trackSettings['defaultLinkedKeys'] ||
              !($mysqli->query("SHOW COLUMNS FROM `" .
                $mysqli->real_escape_string(
                  $trackSettings['defaultLinkedTables']
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
            }
          } else {
            throw new Exception("Reference db format incorrect: " .
              "no track named '" . $geneCoorTable . "' was found in table " .
              "`trackDb`.", TABLE_NOT_READY);
          }
          $res->free();
        }
        // Now `geneSymbol` column is definitely there.
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
    } catch (Exception $e) {
      if ($e->getCode() !== NO_GENE_SYMBOL_COLUMN) {
        throw $e;
      }
      $refInfo = false;
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

  function findPartialName($ref, $partialName, $refInfo = NULL) {

  }

  if (isset($req['db']) && $refInfo = testRefPartialName($req['db'])) {
    // First read reference information from `ref` table to see if partial
    // gene name feature is supported in the reference

    if (isset($req['name'])) {

    } else {
      // testing purpose only, return "supported" flag
    }
  } else {
    // return "unsupported" flag
  }

  if(isset($req['db']) && isset($req['name'])) {
    if (!isset($req['maxCandidates'])) {
      $req['maxCandidates'] = MAX_JSON_NAME_ITEMS;
    }
    $req['name'] = trim($req['name']) . '%';
    $db = trim($req['db']);

    define('MIN_JSON_QUERY_LENGTH', 2);

    $mysqli = connectCPB($db);
    $result = array();
    // open the genome browser database
    // TODO: try to implement codes for multi-ref lookup
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
  }

?>
