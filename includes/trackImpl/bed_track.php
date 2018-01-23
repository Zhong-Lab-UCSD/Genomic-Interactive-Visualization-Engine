<?php
require_once(realpath(dirname(__FILE__) . "/track_base.php"));

define('LINK_ID', 'kgID');    // this is the ID UCSC used to link knownGene to kgXref

function _BedFromAssoc($assoc) {
  // get BED string from associate array (name is par UCSC database naming convention)

  // BED 3
  $result = $assoc['chrom'] . "\t" . $assoc['txStart'] . "\t" . $assoc['txEnd'];

  // add additional columns as needed, notice that for additional stuff count
  //    '.' needs to be filled for previous fields
  if (!is_null($assoc['name'])) {
    $result .= $assoc['name'];
    if (!is_null()) {

    }
  }

}

function _loadBed($db, $tableName, $chrRegion = NULL, $linkedTable = NULL, $params = NULL) {
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
            . $mysqli->real_escape_string($linkedTable) . "`.`" . LINK_ID . "`";
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
      $newGene['geneBed'] = $itor['chrom']
                . "\t" . $itor['txStart']
                . "\t" . $itor['txEnd']
                . "\t" . $itor['name']
                . "\t1\t"
                . ((isset($itor['strand']) && $itor['strand'] !== "")
                  ? $itor['strand'] : ".")
                . "\t" . $itor['cdsStart']
                . "\t" . $itor['cdsEnd']
                . "\t0,0,0\t" . $itor['exonCount']
                . "\t" . $exonLengths
                . "\t" . $exonStarts;
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
