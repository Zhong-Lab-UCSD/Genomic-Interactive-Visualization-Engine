<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class BigWigFile  {
	const SIG = 0x888FFC26;
	const CHR = 0;
	const START = 1;
	const END = 2;
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
	
	private $chromNameID; 			// associative array for chrom name and ID
	private $unzoomedCir;			// unzoomed cirTree
	
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
		$this->fileHandle->readBits64();				// remove the reserved bits
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
				$mergedBuf = $this->fileHandle->readString($mergedSize, $mergedOffset);
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
	
	private function intervalSlice($baseStart, $baseEnd, &$intervalList) {
		$interval = current($intervalList);
		$summary = new SummaryElement();
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
	
	private function summarySlice($baseStart, $baseEnd, &$summaryList) {
		$oldSummary = current($summaryList);
		$newSummary = new SummaryElement();
		if($oldSummary !== false) {
			while($oldSummary !== false && $oldSummary->chromRegion->start < $baseEnd) {
				$overlap = rangeIntersection($baseStart, $baseEnd, $oldSummary->chromRegion->start, $oldSummary->chromRegion->end);
				if($overlap > 0) {
					$newSummary->addSummaryData($oldSummary, $overlap);
				}
				$oldSummary = next($summaryList);
			}
		}
		return $newSummary;
	}
	
	function getSummaryArrayFromFull($chromIx, $start, $end, $summarySize) {
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
		for($i = 0; $i < $summarySize; $i++) {
			$baseEnd = $start + $baseCount * ($i + 1) / $summarySize;
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
			$result[] = $summary;
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
	
	function getSummaryArrayFromZoom($zoom, $chromIx, $start, $end, $summarySize) {
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
				$mergedBuf = $this->fileHandle->readString($mergedSize, $mergedOffset);
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
				$summaryElement = new SummaryElement(NULL, &$memFileHandle);
				if($summaryElement->chromRegion->chromID == $chromIx) {
					$s = max($summaryElement->chromRegion->start, $start);
					$e = min($summaryElement->chromRegion->end, $end);
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
			for($i = 0; $i < $summarySize; $i++) {
				$baseEnd = $start + $baseCount * ($i + 1) / $summarySize;
				$end1 = $baseEnd;
				if($end1 == $baseStart) {
					$end1++;
				}
				while($oldSummary !== false && $oldSummary->chromRegion->end <= $baseStart) {
					$oldSummary = next($sumList);
				}
				$summary = $this->summarySlice($baseStart, $baseEnd, $sumList);
				$oldSummary = current($sumList);
				$baseStart = $baseEnd;
				$result[] = $summary;
			}
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
	
	function getSummaryStats($regions, $summarySize) {
		// $regions is an array of ChromRegion, the return value will also be an array of summary stats 
		// (maybe more, like an array of array to enable fine-grained summary, not exactly sure now)
		// notice that need to translate every region into chromIx
		// also the zoom part will be handled here (not now)
		$summaryList = array();
		foreach($regions as $region) {
			$summaryList[] = $this->getSummaryStatsSingleRegion($region, $summarySize);
		}
		return $summaryList;
	}
	
	function getAllSummaryStats($region) {
		// get all data from a single region
		return $this->getSummaryStatsSingleRegion($region, $region->end - $region->start);
	}
	
	function __construct($fpathname, $isRemote) {
		$this->fileHandle = new BufferedFile($fpathname, $isRemote? BufferedFile::REMOTE: BufferedFile::LOCAL);
		$this->readBasicParameters();
		
		// next is zoom levels
		$this->readZoomLevels();
		
		// next use chromBPT to get all ID and chrom names
		$this->readChromIDs();		
	}
	
}
?>