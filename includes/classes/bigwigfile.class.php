<?php
/**
 * BigWigFile class
 * Note that all the coordinates here is 0-based, same as ChromRegion Class
 */
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class BigWigFile  {
  const SIG = 0x888FFC26;
  const CHR = 0;
  const START = 1;
  const END = 2;
  const DEFAULT_SUMMARY_SIZE = 1000;

  private $fileHandle;

  private $version;
  private $zoomLevels;
  private $zoomLevelList;
  private $chromTreeOffset;
  private $unzoomedDataOffset;
  private $unzoomedIndexOffset;
  private $fieldCount;
  private $definedFieldCount;
  private $asOffset;
  private $totalSummaryOffset;
  private $uncompressBufSize;

  private $chromNameID;       // associative array for chrom name and ID (and length)
  private $unzoomedCir;      // unzoomed cirTree

  function getFileName() {
    return $this->fileHandle->getFileName();
  }

  private function readBasicParameters() {
    // read basic parameters
    // check isSwapped
    $magic = $this->fileHandle->readBits32();
    if($magic != self::SIG) {
      $magic = byteSwap32($magic);
      $this->fileHandle->flipSwapped();
      if($magic != self::SIG) {
        throw new Exception('File ' . $this->fileHandle->getFileName() . ' is not a bigWig file!');
      }
    }
    $this->version = $this->fileHandle->readBits16();
    $this->zoomLevels = $this->fileHandle->readBits16();
    $this->chromTreeOffset = $this->fileHandle->readBits64();
    $this->unzoomedDataOffset = $this->fileHandle->readBits64();
    $this->unzoomedIndexOffset = $this->fileHandle->readBits64();
    $this->fieldCount = $this->fileHandle->readBits16();
    $this->definedFieldCount = $this->fileHandle->readBits16();
    $this->asOffset = $this->fileHandle->readBits64();
    $this->totalSummaryOffset = $this->fileHandle->readBits64();
    $this->uncompressBufSize = $this->fileHandle->readBits32();
    $this->fileHandle->readBits64();        // remove the reserved bits
  }

  private function readZoomLevels() {
    // read zoom levels
    $this->zoomLevelList = array();
    for($i = 0; $i < $this->zoomLevels; $i++) {
      $reductionLevel = $this->fileHandle->readBits32();
      $reserved = $this->fileHandle->readBits32();
      $dataOffset = $this->fileHandle->readBits64();
      $indexOffset = $this->fileHandle->readBits64();
      $this->zoomLevelList[] = new ZoomLevel($reductionLevel, $reserved, $dataOffset, $indexOffset);
    }
  }

  private function readChromIDs() {
    $bpt = new chromBPT($this->fileHandle, $this->chromTreeOffset);
    $this->chromNameID = $bpt->getChromList();
  }

  private function mergeBlocks($blocklist) {
    // return a series of merged block (offset => size) to improve efficiency
    $mergedBlocks = array();
    $oldOffset = -1;
    $oldSize = -1;
    foreach($blocklist as $offset => $size) {
      if($oldOffset + $oldSize < $offset) {
        // gap happened
        if($oldOffset >= 0) {
          $mergedBlocks[$oldOffset] = $oldSize;
        }
        $oldOffset = $offset;
        $oldSize = $size;
      } else {
        $oldSize += $size;
      }
    }
    if($oldOffset >= 0) {
      $mergedBlocks[$oldOffset] = $oldSize;
    }
    return $mergedBlocks;
  }

  private function intervalQuery($chromIx, $start, $end) {
    // take $chromIx as chrom ID
    $this->unzoomedCir = new CirTree($this->fileHandle, $this->unzoomedIndexOffset);
    $blocklist = $this->unzoomedCir->findOverlappingBlocks($chromIx, $start, $end);

    // implement efficiency based reading loop
    $mergedBlocks = $this->mergeBlocks($blocklist);
    reset($mergedBlocks);
    $mergedBuf = "";
    $mergedOffset = 0;
    $mergedSize = 0;
    $result = array();
    foreach($blocklist as $offset => $size) {
      if($offset >= $mergedOffset + $mergedSize) {
        // need to read
        list($mergedOffset, $mergedSize) = each($mergedBlocks);
        $mergedBuf = $this->fileHandle->readRawBuffer($mergedSize, $mergedOffset);
      }
      $blockBuf = substr($mergedBuf, $offset - $mergedOffset, $size);
      if($this->uncompressBufSize > 0) {
        // need uncompression
        $blockBuf = gzuncompress($blockBuf);
      }
      // now buffer is here
      // begin doing stuff
      $memFileHandle = new BufferedFile($blockBuf, BufferedFile::MEMORY, $this->fileHandle->getSwapped());
      $BwgSection = new BWGSection($memFileHandle, 0);
      $tempresult = $BwgSection->readBlock($start, $end);
      $result = array_merge($result, $tempresult);
    }
    return $result;
  }

  private function intervalSlice($chromIx, $baseStart, $baseEnd, &$intervalList) {
    // get the summary of interval slices that fall between $baseStart and $baseEnd
    $interval = current($intervalList);
    $summary = SummaryElement::newFromCoordinates($chromIx, $baseStart, $baseEnd);
    if($interval !== false) {
      while($interval !== false && $interval[BWGSection::START] < $baseEnd) {
        $overlap = rangeIntersection($baseStart, $baseEnd, $interval[BWGSection::START], $interval[BWGSection::END]);
        if($overlap > 0) {
          $summary->addData($interval[BWGSection::VALUE], $overlap);
        }
        $interval = next($intervalList);
      }
      if($interval === false) {
        $interval = end($intervalList);
      } else {
        $interval = prev($intervalList);
        if($interval === false) {
          $interval = reset($intervalList);
        }
      }
    }
    return $summary;
  }

  private function summarySlice($chromIx, $baseStart, $baseEnd, &$summaryList) {
    $oldSummary = current($summaryList);
    $newSummary = SummaryElement::newFromCoordinates($chromIx, $baseStart, $baseEnd);
    if($oldSummary !== false) {
      while($oldSummary !== false && $oldSummary->start < $baseEnd) {
        $overlap = $newSummary->overlap($oldSummary);
        if($overlap > 0) {
          $newSummary->addSummaryData($oldSummary, $overlap);
        }
        $oldSummary = next($summaryList);
      }
    }
    return $newSummary;
  }

  function getSummaryArrayFromFull($chromIx, $start, $end, $summarySize, $summarySpan = NULL) {
    // this will return an array[$summarySize] of summaries
    $intervalList = $this->intervalQuery($chromIx, $start, $end);
    $result = array();
    if(count($intervalList) <= 0) {
      return $result;
    }
    $baseStart = $start;
    $baseCount = $end - $start;
    reset($intervalList);
    $interval = current($intervalList);
    for($i = 0; $i < $summarySize && $baseStart < $end; $i++) {
      if(is_null($summarySpan)) {
        $baseEnd = $start + intval(floor($baseCount * ($i + 1) / $summarySize));
      } else {
        $baseEnd = $baseStart + $summarySpan;
      }
      if($baseEnd == $baseStart) {
        $baseEnd++;
      } elseif ($baseEnd > $end) {
        $baseEnd = $end;
      }
      while($interval !== false && $interval[BWGSection::END] <= $baseStart) {
        $interval = next($intervalList);
      }
      $summary = $this->intervalSlice($chromIx, $baseStart, $baseEnd, $intervalList);
      $interval = current($intervalList);
      $baseStart = $baseEnd;
      $result[] = $summary;
    }
    return $result;
  }

  function &getHistFromFull($chromIx, $start, $end, &$result) {
    // this will merge the current region into an existing histogram
    // $result should be a HistElement object
    $intervalList = $this->intervalQuery($chromIx, $start, $end);
    $baseStart = $start;
    $baseCount = $end - $start;
    $windowCount = intval(($baseCount - 1) / $result->resolution) + 1;
    if(count($intervalList) <= 0) {
      $result->addData(0, $windowCount);
      return $result;
    }
    reset($intervalList);
    $interval = current($intervalList);
    for($i = 0; $i < $windowCount; $i++) {
      $baseEnd = $start + ($i + 1) * $result->resolution;
      if($baseEnd > $end) {
        $baseEnd = $end;
      }
      $end1 = $baseEnd;
      if($end1 == $baseStart) {
        $end1++;
      }
      while($interval !== false && $interval[BWGSection::END] <= $baseStart) {
        $interval = next($intervalList);
      }
      $summary = $this->intervalSlice($baseStart, $end1, $intervalList);
      $interval = current($intervalList);
      $baseStart = $baseEnd;
//      if($summary->validCount > 0) {
//        echo "getHistFromFull ";
//        echo($summary->sumData);
//      }
      $result->addData($result->getBin($summary->sumData), 1);
    }
    return $result;
  }

  function bestZoom($reduction) {
    if($reduction <= 1) {
      return NULL;
    }
    $closestDiff = PHP_INT_MAX;
    $closestZoom = NULL;
    foreach($this->zoomLevelList as $level) {
      $diff = $reduction - $level->getReductionLevel();
      if($diff >= 0 && $diff < $closestDiff) {
        $closestDiff = $diff;
        $closestZoom = $level;
      }
    }
    return $closestZoom;
  }

  function getSummaryArrayFromZoom($zoom, $chromIx, $start, $end, $summarySize, $summarySpan = NULL) {
    $zoomedCir = new CirTree($this->fileHandle, $zoom->getIndexOffset());
    $blocklist = $zoomedCir->findOverlappingBlocks($chromIx, $start, $end);

    $mergedBlocks = $this->mergeBlocks($blocklist);
    reset($mergedBlocks);
    $mergedBuf = "";
    $mergedOffset = 0;
    $mergedSize = 0;
    $sumList = array();
    $result = array();

    foreach($blocklist as $offset => $size) {
      if($offset >= $mergedOffset + $mergedSize) {
        // need to read
        list($mergedOffset, $mergedSize) = each($mergedBlocks);
        $mergedBuf = $this->fileHandle->readRawBuffer($mergedSize, $mergedOffset);
      }
      $blockBuf = substr($mergedBuf, $offset - $mergedOffset, $size);
      if($this->uncompressBufSize > 0) {
        // need uncompression
        $blockBuf = gzuncompress($blockBuf);
      }
      // now buffer is here
      // begin doing stuff
      $memFileHandle = new BufferedFile($blockBuf, BufferedFile::MEMORY, $this->fileHandle->getSwapped());
      $itemCount = strlen($blockBuf) / SummaryElement::DATASIZE;
      for($i = 0; $i < $itemCount; $i++) {
        $summaryElement = new SummaryElement($memFileHandle);
        if($summaryElement->chr == $chromIx) {
          $s = max($summaryElement->start, $start);
          $e = min($summaryElement->end, $end);
          if($s < $e) {
            $sumList[] = $summaryElement;
          }
        }
      }
    }

    // then slice $sumList to match $summarySize
    if(!empty($sumList)) {
      $baseStart = $start;
      $baseCount = $end - $start;
      reset($sumList);
      $oldSummary = current($sumList);
      for($i = 0; $i < $summarySize && $baseStart < $end; $i++) {
        if(is_null($summarySpan)) {
          $baseEnd = $start + intval(floor($baseCount * ($i + 1) / $summarySize));
        } else {
          $baseEnd = $baseStart + $summarySpan;
        }
        if($baseEnd == $baseStart) {
          $baseEnd++;
        } elseif ($baseEnd > $end) {
          $baseEnd = $end;
        }
        while($oldSummary !== false && $oldSummary->end <= $baseStart) {
          $oldSummary = next($sumList);
        }
        $summary = $this->summarySlice($chromIx, $baseStart, $baseEnd, $sumList);
        $oldSummary = current($sumList);
        $baseStart = $baseEnd;
        $result[] = $summary;
      }
    }

    return $result;
  }

  private function &histSlice($baseStart, $baseEnd, &$summaryList, &$histResult) {
    $oldSummary = current($summaryList);
    if($oldSummary !== false) {
      while($oldSummary !== false && $oldSummary->start < $baseEnd) {
        $overlap = rangeIntersection($baseStart, $baseEnd, $oldSummary->start, $oldSummary->end);
        if($overlap > 0) {
          $histResult->addData($histResult->getBin($oldSummary->sumData), $overlap);
        }
        $oldSummary = next($summaryList);
      }
    }
    return $histResult;
  }

  function &getHistFromZoom($zoom, $chromIx, $start, $end, &$result) {
    $zoomedCir = new CirTree($this->fileHandle, $zoom->getIndexOffset());
    $blocklist = $zoomedCir->findOverlappingBlocks($chromIx, $start, $end);

    $mergedBlocks = $this->mergeBlocks($blocklist);
    reset($mergedBlocks);
    $mergedBuf = "";
    $mergedOffset = 0;
    $mergedSize = 0;
    $sumList = array();

    foreach($blocklist as $offset => $size) {
      if($offset >= $mergedOffset + $mergedSize) {
        // need to read
        list($mergedOffset, $mergedSize) = each($mergedBlocks);
        $mergedBuf = $this->fileHandle->readRawBuffer($mergedSize, $mergedOffset);
      }
      $blockBuf = substr($mergedBuf, $offset - $mergedOffset, $size);
      if($this->uncompressBufSize > 0) {
        // need uncompression
        $blockBuf = gzuncompress($blockBuf);
      }
      // now buffer is here
      // begin doing stuff
      $memFileHandle = new BufferedFile($blockBuf, BufferedFile::MEMORY, $this->fileHandle->getSwapped());
      $itemCount = strlen($blockBuf) / SummaryElement::DATASIZE;
      for($i = 0; $i < $itemCount; $i++) {
        $summaryElement = new SummaryElement($memFileHandle);
        if($summaryElement->chr == $chromIx) {
          $s = max($summaryElement->start, $start);
          $e = min($summaryElement->end, $end);
          if($s < $e) {
            $sumList[] = $summaryElement;
          }
        }
      }
    }

    // then slice $sumList to match $summarySize
    $baseStart = $start;
    $baseCount = $end - $start;
    $windowCount = floor(($baseCount - 1) / $result->resolution) + 1;
    if(!empty($sumList)) {
      reset($sumList);
      $oldSummary = current($sumList);
      for($i = 0; $i < $windowCount; $i++) {
        $baseEnd = $start + ($i + 1) * $result->resolution;
        if($baseEnd > $end) {
          $baseEnd = $end;
        }
        $end1 = $baseEnd;
        if($end1 == $baseStart) {
          $end1++;
        }
        while($oldSummary !== false && $oldSummary->end <= $baseStart) {
          $oldSummary = next($sumList);
        }
        $this->histSlice($baseStart, $baseEnd, $sumList, $result);
        $oldSummary = current($sumList);
        $baseStart = $baseEnd;
      }
    } else {
      $result->addData(0, $windowCount);
    }

    return $result;
  }

  function getSummaryStatsSingleRegion($region, $summarySize) {
    if(!array_key_exists(strtolower($region->chr), $this->chromNameID)) {
      throw new Exception("Chromosome " . $region->chr . " is invalid.");
    }
    $chromIx = $this->chromNameID[$region->chr][ChromBPT::ID];

    $zoomLevel = ($region->end - $region->start) / $summarySize / 2;
    $zoomLevel = $zoomLevel < 0? 0: $zoomLevel;

    // get the zoom level
    $zoom = $this->bestZoom($zoomLevel);
    if(is_null($zoom)) {
      return $this->getSummaryArrayFromFull($chromIx, $region->start, $region->end, $summarySize);
    } else {
      return $this->getSummaryArrayFromZoom($zoom, $chromIx, $region->start, $region->end, $summarySize);
    }
  }

  function &getHistSingleRegion($region, &$histResult) {
    if(!array_key_exists(strtolower($region->chr), $this->chromNameID)) {
      throw new Exception("Chromosome " . $region->chr . " is invalid.");
    }
    $chromIx = $this->chromNameID[$region->chr][ChromBPT::ID];

    $zoomLevel = ceil($histResult->resolution / 2);

    // get the zoom level
    $zoom = $this->bestZoom($zoomLevel);
    if(is_null($zoom)) {
      return $this->getHistFromFull($chromIx, $region->start, $region->end, $histResult);
    } else {
      return $this->getHistFromZoom($zoom, $chromIx, $region->start, $region->end, $histResult);
    }
  }

  function getSummaryStats($regions, $params, $paramIsResolution = FALSE) {
    // $regions is an array of ChromRegion, the return value will also be an array of summary stats
    // (maybe more, like an array of array to enable fine-grained summary, not exactly sure now)
    // notice that need to translate every region into chromIx
    // also the zoom part will be handled here (not now)
    $result = [];

    foreach($regions as $index => $region) {
      if(!array_key_exists(strtolower($region->chr), $this->chromNameID)) {
        throw new Exception("Chromosome " . $region->chr . " is invalid.");
      }
      if(!array_key_exists($region->chr, $result)) {
        $result[$region->chr] = [];
      }
      if(isset($params) && isset($params[$index])) {
        $summarySize = $paramIsResolution? intval(ceil($region->getLength() / $params[$index])): $params[$index];
        $summary = $this->getSummaryStatsSingleRegion($region, $summarySize);
        foreach($summary as $summaryEntry) {
          $summaryEntry->chr = $this->chromNameID[$summaryEntry->chr][ChromBPT::NAME];
          $result[$summaryEntry->chr][] = array(
            'regionString' => $summaryEntry->regionToString(),
            'data' => $summaryEntry,
          );
        }
      } else {
        $result[$region->chr] = array_merge($result[$region->chr], $this->getRawDataInSingleRegion($region));
      }
    }
    return $result;
  }

  function getSummaryOrRaw($regions, $params, $paramIsResolution = FALSE, $regionStringAsKey = FALSE) {
    // $regions is an array of ChromRegion, the return value will also be an array of summary stats
    // (maybe more, like an array of array to enable fine-grained summary, not exactly sure now)
    // notice that need to translate every region into chromIx
    // also the zoom part will be handled here (not now)
    $result = [];

    foreach($regions as $index => $region) {
      if(!array_key_exists(strtolower(trim($region->chr)), $this->chromNameID)) {
        throw new Exception("Chromosome " . $region->chr . " is invalid.");
      }
      $regionKey = $regionStringAsKey ? $region->regionToString() : $region->chr;
      if(!array_key_exists($regionKey, $result)) {
        $result[$regionKey] = [];
      }
      $zoom = NULL;
      if(isset($params) && isset($params[$index])) {
        $summarySize = $paramIsResolution? intval(ceil($region->getLength() / $params[$index])): $params[$index];
        $zoomLevel = $paramIsResolution? $params[$index]: intval(floor($region->getLength() / $params[$index]));
        // get the zoom level
        $zoom = $this->bestZoom($zoomLevel);
        $chromIx = $this->chromNameID[strtolower(trim($region->chr))][ChromBPT::ID];
        if(!is_null($zoom)) {
          $summary = $this->getSummaryArrayFromZoom($zoom, $chromIx, $region->start, $region->end, $summarySize,
            $paramIsResolution ? $zoomLevel : NULL);
        } else {
          $summary = $this->getSummaryArrayFromFull($chromIx, $region->start, $region->end, $summarySize,
            $paramIsResolution ? $zoomLevel : NULL);
        }
        foreach($summary as $summaryEntry) {
          if($summaryEntry->validCount > 0) {
            $summaryEntry->chr = $this->chromNameID[$summaryEntry->chr][ChromBPT::NAME];
            $result[$regionKey][] = array(
              'regionString' => $summaryEntry->regionToString(),
              'data' => $summaryEntry,
            );
          }
        }
      } else {
        $result[$regionKey] = array_merge($result[$regionKey], $this->getRawDataInSingleRegion($region));
      }
    }
    return $result;
  }

  function getHistogram($regions, $histResolution = 1, $binSize = 1, $logChrException = false, $throwChrException = false) {
    // $regions is an array of ChromRegion, the return value will also be an array of summary stats
    // (maybe more, like an array of array to enable fine-grained summary, not exactly sure now)
    // notice that need to translate every region into chromIx
    // also the zoom part will be handled here (not now)
    $histElement = new HistElement($histResolution, $binSize);
    foreach($regions as $region) {
      try {
        $this->getHistSingleRegion($region, $histElement);
        //error_log($histElement);
      } catch (Exception $e) {
        if($logChrException) {
          error_log($e->getMessage());
        }
        if($throwChrException) {
          throw $e;
        }
      }
    }
    return $histElement;
  }

  function getAllRegions() {
    $regions = array();
    foreach($this->chromNameID as $name => $idsize) {
      if(gettype($name) === 'string') {
        $regions[] = ChromRegion::newFromCoordinates($name, ChromRegion::BEGINNING, $idsize[ChromBPT::SIZE]);
      }
    }
    return $regions;
  }

  function getRawDataInSingleRegion($region) {

    $result = [];
    $chromIx = $this->chromNameID[$region->chr][ChromBPT::ID];
    $regionResult = $this->intervalQuery($chromIx, $region->start, $region->end);
    foreach($regionResult as $resultEntry) {
      $result[] = array(
        'regionString' => strval(ChromRegion::newFromCoordinates($region->chr,
                                     $resultEntry[BWGSection::START],
                                     $resultEntry[BWGSection::END])),
        'data' => array(
          'value' => $resultEntry[BWGSection::VALUE]
        )
      );
    }
    return $result;

  }

  function getRawDataInRegions($regions) {
    // get raw bigWig data (in bedGraph format) within all regions
    $result = [];
    foreach($regions as $region) {
      if(!array_key_exists(strtolower($region->chr), $this->chromNameID)) {
        throw new Exception("Chromosome " . $region->chr . " is invalid.");
      }
      if(!array_key_exists($region->chr, $result)) {
        $result[$region->chr]= [];
      }
      $result[$region->chr] = array_merge($result[$region->chr], $this->getRawDataInSingleRegion($region));
    }
    return $result;
  }

  function getAllRawData() {
    return $this->getRawDataInRegions($this->getAllRegions());
  }

  function getAllSummaryStats($region) {
    // get all data from a single region
    return $this->getSummaryStatsSingleRegion($region, $region->end - $region->start);
  }

  function getAllHistogram($histResolution = 1, $binSize = 1) {
    return $this->getHistogram($this->getAllRegions(), $histResolution, $binSize);
  }

  function __construct($fpathname) {
    $fileType = BufferedFile::LOCAL;
    if(substr($fpathname, 0, 7) === 'http://' || substr($fpathname, 0, 8) === 'https://') {
      // is a remote file
      $fileType = BufferedFile::REMOTE;
    }
    $this->fileHandle = new BufferedFile($fpathname, $fileType);
    $this->readBasicParameters();

    // next is zoom levels
    $this->readZoomLevels();

    // next use chromBPT to get all ID and chrom names
    $this->readChromIDs();
  }

}
