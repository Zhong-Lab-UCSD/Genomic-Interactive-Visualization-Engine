<?php
require_once(realpath(dirname(__FILE__) . "/track_base.php"));

define('LINK_ID', 'kgID');    // this is the ID UCSC used to link knownGene to kgXref

function _BedFromAssoc(&$assoc, $isGenePred = FALSE, $attrAs13thColumn = FALSE) {
  // get BED string from associate array (name is par UCSC database naming convention)
  $resultArr = [];
  // BED 3
  $resultArr []= $assoc['chrom'];
  unset($assoc['chrom']);

  if ($isGenePred) {
    $resultArr []= $assoc['txStart'];
    unset($assoc['txStart']);
    $resultArr []= $assoc['txEnd'];
    unset($assoc['txEnd']);
  } else {
    $resultArr []= $assoc['chromStart'];
    unset($assoc['chromStart']);
    $resultArr []= $assoc['chromEnd'];
    unset($assoc['chromEnd']);
  }

  // add additional columns as needed, notice that for additional stuff count
  //    '.' needs to be filled for previous fields
  if (isset($assoc['name'])) {
    // BED 4 (optional)
    $resultArr []= $assoc['name'];
    unset($assoc['name']);
  }

  if (!$isGenePred && isset($assoc['score'])) {
    // BED 5 (optional)
    $resultArr = array_pad($resultArr, 4, ".");
    $resultArr []= $assoc['score'];
    unset($assoc['score']);
  }

  if (isset($assoc['strand'])) {
    // BED 6 (optional)
    $resultArr = array_pad($resultArr, 5, ".");
    $resultArr []= ((isset($assoc['strand']) && $assoc['strand'] !== "")
      ? $assoc['strand'] : ".");
    unset($assoc['strand']);
  }

  if ($isGenePred && isset($assoc['cdsEnd'])) {
    // BED 8 (optional)
    $resultArr = array_pad($resultArr, 6, ".");
    $resultArr []= $assoc['cdsStart'];
    $resultArr []= $assoc['cdsEnd'];
    unset($assoc['cdsStart']);
    unset($assoc['cdsEnd']);
  } elseif (!$isGenePred && isset($assoc['thickEnd'])) {
    // BED 8 (optional)
    $resultArr = array_pad($resultArr, 6, ".");
    $resultArr []= $assoc['thickStart'];
    $resultArr []= $assoc['thickEnd'];
    unset($assoc['thickStart']);
    unset($assoc['thickEnd']);
  }

  if (!$isGenePred && isset($assoc['itemRGB'])) {
    // BED 9 (optional)
    $resultArr = array_pad($resultArr, 8, ".");
    $resultArr []= $assoc['itemRGB'];
    unset($assoc['itemRGB']);
  }

  if ($isGenePred && isset($assoc['exonCount'])) {
    // BED 12 (optional)
    $resultArr = array_pad($resultArr, 9, ".");
    $resultArr []= $assoc['exonCount'];
    // convert UCSC format to BED12
    $exonStartsArr = explode(',', $assoc['exonStarts']);
    $exonEndsArr = explode(',', $assoc['exonEnds']);
    $exonLengths = '';
    $exonStarts = '';
    for($i = 0; $i < intval($assoc['exonCount']); $i++) {
      $exonStarts .= strval(intval($exonStartsArr[$i]) - intval($resultArr[1])) . ',';
      $exonLengths .= strval(intval($exonEndsArr[$i]) - intval($exonStartsArr[$i])) . ',';
    }
    $resultArr []= $exonLengths;
    $resultArr []= $exonStarts;
    unset($assoc['exonCount']);
    unset($assoc['exonEnds']);
    unset($assoc['exonStarts']);
  } elseif (!$isGenePred && isset($assoc['blockCount'])) {
    // BED 12 (optional)
    $resultArr = array_pad($resultArr, 9, ".");
    $resultArr []= $assoc['blockCount'];
    unset($assoc['blockCount']);
    $resultArr []= $assoc['blockSizes'];
    $resultArr []= $assoc['blockStarts'];
    unset($assoc['blockSizes']);
    unset($assoc['blockStarts']);
  }

  if ($attrAs13thColumn && !empty($assoc)) {
    $resultArr = array_pad($resultArr, 12, ".");
    $resultArr []= json_encode($assoc);
  }

  return implode("\t", $resultArr);
}

function _loadBed($db, $tableName, $chrRegion = NULL, $type = 'bed', $linkedTable = NULL, $linkedKey = NULL, $params = NULL) {
  // if chrRegion is provided (as an array of ChromRegion class object)
  // then filtering will be carried out (results needs to be overlapping with at least one region)
  // otherwise (unlikely situation) no filtering will be done
  // tableName is trackID
  // NOTICE that UCSC data format is exon *START* and exon *ENDS*
  // so needs to be converted to proper BED12 format

  $mysqli = connectCPB($db);
  $result = array();
  $isGenePred = (strtolower($type) === 'genepred');
  if (!$isGenePred) {
    $startField = 'chromStart';
    $endField = 'chromEnd';
  } else {
    $startField = 'txStart';
    $endField = 'txEnd';
  }


  if($mysqli && isset($tableName)) {
    $sqlstmt = "SELECT * FROM `" . $mysqli->real_escape_string($tableName) . "`";
    if(!is_null($linkedTable)) {
      // need to link the table via the following: 'name' = LINK_ID
      $sqlstmt .= " LEFT JOIN `" . $mysqli->real_escape_string($linkedTable) . "` ON `"
            . $mysqli->real_escape_string($tableName) . "`.`name` = `"
            . $mysqli->real_escape_string($linkedTable) . "`.`"
            . $mysqli->real_escape_string($linkedKey) . "`";
    }
    if(!is_null($chrRegion)) {
      // add filtering part
      // convert $chrRegion string to give.ChromRegion class
      $sqlstmt .= " WHERE "
        . implode(' OR ',
          array_fill(0, count($chrRegion),
            '(chrom = ? AND ' . $startField . ' < ? AND ' . $endField . ' > ?)'))
        . " ORDER BY " . $startField;
      $stmt = $mysqli->prepare($sqlstmt);
      $a_params = array();
      $ref_params = array();
      $a_params []= str_repeat('sii', count($chrRegion));
      foreach($chrRegion as $region) {
        $chrRegionObj = ChromRegion::newFromRegionText($region);
        array_push($a_params, $chrRegionObj->chr, $chrRegionObj->end, $chrRegionObj->start);
      }
      for($i = 0; $i < count($a_params); $i++) {
        $ref_params []= & $a_params[$i];
      }
      call_user_func_array(array($stmt, 'bind_param'), $ref_params);

      $stmt->execute();
      $genes = $stmt->get_result();
    } else {
      $sqlstmt .= " ORDER BY " . $startField;
      $genes = $mysqli->query($sqlstmt);
    }
    while($itor = $genes->fetch_assoc()) {
      $chrom = $itor['chrom'];
      if(!isset($result[$chrom])) {
        $result[$chrom] = array();
      }
      $newGene = array();
      $newGene['geneBed'] = _BedFromAssoc($itor, $isGenePred);
      if (isset($itor['attr'])) {
        $newGene['attr'] = json_decode($itor['attr'], true);
        unset($itor['attr']);
      }
      if (!empty($itor)) {
        foreach ($itor as $key => $value) {
          if (!isset($newGene['attr'][$key])) {
            $newGene['attr'][$key] = $value;
          }
        }
      }
      $result[$chrom] [] = $newGene;

    }
    $genes->free();
    $mysqli->close();
  }

  return $result;
}

/**
 * Load a custom track when it's already in the database
 */
function _loadCustomBed($ref, $userId, $tableName, $chrRegion = NULL, $params = NULL) {
  // get the actual table name from file db
  $mysqli = connectCPB();
  $stmt = $mysqli->prepare("SELECT * FROM `" .
    $mysqli->real_escape_string(CUSTOM_TRACK_FILE_TABLE_NAME) .
    "` WHERE `userId` = ? AND `ref` = ? AND `tableName` = ?");
  $stmt->bind_param('sss', $userId, $ref, $tableName);
  $stmt->execute();
  $tableEntries = $stmt->get_result();
  $result = [];
  if ($tableEntries && $tableEntries->num_rows > 0) {
    // table entry found
    $entry = $tableEntries->fetch_assoc();
    $realTableName = $entry['fileName'];
    $result = _loadBed(CUSTOM_TRACK_DB_NAME, $realTableName, $chrRegion, 'bed',
      NULL, NULL, $params);
  } else {
    $mysqli->close();
    throw new Exception('Track not found!');
  }
  $tableEntries->free();
  $mysqli->close();
  return $result;
}

function _importBedFile ($tableName, $fileName, $ref, $trackMetaObj) {
  $needToUnlink = FALSE;
  if (filter_var($fileName, FILTER_VALIDATE_URL)) {
    file_put_contents(
      CUSTOM_TRACK_DOWNLOAD_TEMP_DIR . 'temp', fopen($fileName));
    $fileName = CUSTOM_TRACK_DOWNLOAD_TEMP_DIR . 'temp';
    $needToUnlink = TRUE;
  } else if (!file_exists($fileName)) {
    // file does not exist, throw an error
    throw new Exception('File does not exist: ' . $fileName);
  }
  $mysqli = connectCPB(CUSTOM_TRACK_DB_NAME);
  if ($mysqli) {
    // create temporary table then fill with file contents
    $stmt = "CREATE TABLE `" . $mysqli->real_escape_string($tableName) ."` " .
      "(`chrom` varchar(255) NOT NULL DEFAULT '', " .
      "`chromStart` int(10) unsigned NOT NULL DEFAULT '0', " .
      "`chromEnd` int(10) unsigned NOT NULL DEFAULT '0', " .
      "`name` varchar(255) NOT NULL DEFAULT '', " .
      "`score` int(10) unsigned DEFAULT NULL, " .
      "`strand` char(1) NOT NULL DEFAULT '', " .
      "`thickStart` int(10) unsigned DEFAULT NULL, " .
      "`thickEnd` int(10) unsigned DEFAULT NULL, " .
      "`itemRGB` longblob DEFAULT NULL, " .
      "`blockCount` int(10) unsigned DEFAULT NULL, " .
      "`blockSizes` longblob DEFAULT NULL, " .
      "`blockStarts` longblob DEFAULT NULL, " .
      "KEY `name` (`name`), " .
      "KEY `chrom` (`chrom`(16), `chromStart`), " .
      "KEY `chrom_2` (`chrom`(16), `chromEnd`) " .
      ")";
    $mysqli->query($stmt);

    $stmt = "LOAD DATA LOCAL INFILE '" . $mysqli->real_escape_string($fileName) . 
      "' INTO TABLE `" . $mysqli->real_escape_string($tableName) . "`";
    $mysqli->query($stmt);
    $mysqli->close();
    if ($needToUnlink) {
      unlink($fileName);
    }
  }
}

// then registering the methods and aliases

if(!isset($trackMap['bed'])) {
  $trackMap['bed'] = array();
}
$trackMap['bed']['loadTrack'] = '_loadBed';
$trackMap['bed']['loadCustomTrack'] = '_loadCustomBed';
$trackMap['bed']['importFile'] = '_importBedFile';

if(!isset($trackMap['genebed'])) {
  $trackMap['genebed'] = &$trackMap['bed'];
}

if(!isset($trackMap['genepred'])) {
  $trackMap['genepred'] = &$trackMap['bed'];
}
