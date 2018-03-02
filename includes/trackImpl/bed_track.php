<?php
require_once(realpath(dirname(__FILE__) . "/track_base.php"));

define('LINK_ID', 'kgID');    // this is the ID UCSC used to link knownGene to kgXref

function _BedFromAssoc(&$assoc, $attrAs13thColumn = FALSE) {
  // get BED string from associate array (name is par UCSC database naming convention)
  $resultArr = [];
  // BED 3
  $resultArr []= $assoc['chrom'];
  unset($assoc['chrom']);
  $resultArr []= $assoc['txStart'];
  unset($assoc['txStart']);
  $resultArr []= $assoc['txEnd'];
  unset($assoc['txEnd']);

  // add additional columns as needed, notice that for additional stuff count
  //    '.' needs to be filled for previous fields
  if (!is_null($assoc['name'])) {
    // BED 4 (optional)
    $resultArr []= $assoc['name'];
    unset($assoc['name']);
  }

  if (!is_null($assoc['score'])) {
    // BED 5 (optional)
    $resultArr = array_pad($resultArr, 4, ".");
    $resultArr []= $assoc['score'];
    unset($assoc['score']);
  }

  if (!is_null($assoc['strand'])) {
    // BED 6 (optional)
    $resultArr = array_pad($resultArr, 5, ".");
    $resultArr []= ((isset($assoc['strand']) && $assoc['strand'] !== "")
      ? $itor['strand'] : ".");
    unset($assoc['strand']);
  }

  if (!is_null($assoc['cdsEnd'])) {
    // BED 8 (optional)
    $resultArr = array_pad($resultArr, 6, ".");
    $resultArr []= $assoc['cdsStart'];
    $resultArr []= $assoc['cdsEnd'];
    unset($assoc['cdsStart']);
    unset($assoc['cdsEnd']);
  }

  if (!is_null($assoc['itemRGB'])) {
    // BED 9 (optional)
    $resultArr = array_pad($resultArr, 8, ".");
    $resultArr []= $assoc['itemRGB'];
    unset($assoc['itemRGB']);
  }

  if (!is_null($assoc['exonCount'])) {
    // BED 12 (optional)
    $resultArr = array_pad($resultArr, 9, ".");
    $resultArr []= $assoc['exonCount'];
    unset($assoc['exonCount']);
    // convert UCSC format to BED12
    $exonStartsArr = explode(',', $assoc['exonStarts']);
    $exonEndsArr = explode(',', $assoc['exonEnds']);
    if (intval($exonStartsArr[0]) !== 0){
      $exonLengths = '';
      $exonStarts = '';
      for($i = 0; $i < intval($assoc['exonCount']); $i++) {
        $exonStarts .= strval(intval($exonStartsArr[$i]) - intval($resultArr[1])) . ',';
        $exonLengths .= strval(intval($exonEndsArr[$i]) - intval($exonStartsArr[$i])) . ',';
      }
      $resultArr []= $exonLengths;
      $resultArr []= $exonStarts;
    } else {
      // it's already BED 12 format
      $resultArr []= $assoc['exonEnds'];
      $resultArr []= $assoc['exonStarts'];
    }
    unset($assoc['exonEnds']);
    unset($assoc['exonStarts']);
  }

  if ($attrAs13thColumn && !empty($assoc)) {
    $resultArr = array_pad($resultArr, 12, ".");
    $resultArr []= json_encode($assoc);
  }

  return implode("\t", $resultArr);
}

function _loadBed($db, $tableName, $chrRegion = NULL, $linkedTable = NULL, $linkedKey = NULL, $params = NULL) {
  // if chrRegion is provided (as an array of ChromRegion class object)
  // then filtering will be carried out (results needs to be overlapping with at least one region)
  // otherwise (unlikely situation) no filtering will be done
  // tableName is trackID
  // NOTICE that UCSC data format is exon *START* and exon *ENDS*
  // so needs to be converted to proper BED12 format

  $mysqli = connectCPB($db);
  $result = array();

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
      $sqlstmt .= " WHERE " . implode(' OR ', array_fill(0, count($chrRegion), '(chrom = ? AND txStart < ? AND txEnd > ?)')) . " ORDER BY txStart";
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
      $sqlstmt .= " ORDER BY txStart";
      $genes = $mysqli->query($sqlstmt);
    }
    while($itor = $genes->fetch_assoc()) {
      if(!isset($result[$itor['chrom']])) {
        $result[$itor['chrom']] = array();
      }
      // convert UCSC format to BED12
      $exonStartsArr = explode(',', $itor['exonStarts']);
      $exonEndsArr = explode(',', $itor['exonEnds']);
      $exonLengths = '';
      $exonStarts = '';
      for($i = 0; $i < intval($itor['exonCount']); $i++) {
        $exonStarts .= strval(intval($exonStartsArr[$i]) - intval($itor['txStart'])) . ',';
        $exonLengths .= strval(intval($exonEndsArr[$i]) - intval($exonStartsArr[$i])) . ',';
      }
      $newGene = array();
      $newGene['geneBed'] = _BedFromAssoc($itor);
      if (!empty($itor)) {
        $newGene['attr'] = $itor;
      }
      if(isset($itor['geneSymbol'])) {
        $newGene['geneSymbol'] = $itor['geneSymbol'];
      }
      $result[$itor['chrom']] [] = $newGene;

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
