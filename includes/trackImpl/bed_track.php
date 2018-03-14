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
      ? $itor['strand'] : ".");
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
        $newGene['attr'] = json_decode($itor['attr'], JSON_FORCE_OBJECT);
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

function _loadCustomBed($db, $remoteUrl, $chrRegion = NULL, $params = NULL) {
  // remote file should be in BED format
  // so just break all the lines and return as JSON

  $result = array();
  $fin = fopen($remoteUrl, 'r');
  // TODO: enable buffering locally

  if(!$fin) {
    throw new Exception('File "' . $remoteUrl . '" cannot be opened!');
  }
  if($chrRegion) {
    // filter out bed entries not inside the region
    if(!is_array($chrRegion)) {
      $chrRegion = [$chrRegion];
    }
    $strToChrRegion = function($regionStr) {
      return ChromRegion::newFromRegionText($regionStr);
    };
    $chrRegionObj = array_map($strToChrRegion, $chrRegion);
  } else {
    $chrRegionObj = false;
  }
  while(($line = fgets($fin)) !== false) {
    if (trim($line, " \t\n\r\0\x0B,")[0] !== '#') {
      if($chrRegionObj) {
        $tokens = preg_split("/\s+/", trim($line));
        $chr = trim($tokens[0], " \t\n\r\0\x0B,");
        $start = intval(trim($tokens[1], " \t\n\r\0\x0B,"));
        $end = intval(trim($tokens[2], " \t\n\r\0\x0B,"));

        $overlapFlag = false;
        for ($i = 0, $chrRegionObjLen = count($chrRegionObj); $i < $chrRegionObjLen; $i++) {
          if(strtolower($chr) === strtolower($chrRegionObj[$i]->chr) &&
            $end > $chrRegionObj[$i]->start &&
            $start < $chrRegionObj[$i]->end) {
              $overlapFlag = true;
              break;
          }
        }
      }
      if ($overlapFlag) {
        if(!isset($result[$chr])) {
          $result[$chr] = array();
        }
        $newGene = array();
        $newGene['geneBed'] = trim($line);
        $result[$chr] []= $newGene;
      }
    }
  }
  return $result;

}

function _buildBedCTTable ($tableName, $file) {
  $mysqli = connectCPB();
  if ($mysqli) {
    // create temporary table then fill with file contents
    $stmt = "CREATE TABLE `" . $mysqli->real_escape_string($tableName) . "`";
  }
}

// then registering the methods and aliases

if(!isset($trackMap['bed'])) {
  $trackMap['bed'] = array();
}
$trackMap['bed']['loadTrack'] = '_loadBed';
$trackMap['bed']['loadCustomTrack'] = '_loadCustomBed';

if(!isset($trackMap['genebed'])) {
  $trackMap['genebed'] = &$trackMap['bed'];
}

if(!isset($trackMap['genepred'])) {
  $trackMap['genepred'] = &$trackMap['bed'];
}
