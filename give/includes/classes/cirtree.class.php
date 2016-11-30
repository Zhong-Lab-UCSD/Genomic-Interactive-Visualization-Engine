<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class CirTree {
	const SIG = 0x2468ACE0;
	//const OFFSET = 0;
	//const SIZE = 1;
	
	private $fileHandle;
	
	private $rootOffset;
	
	private $blockSize;
	private $itemCount;
	private $startChromIx;
	private $startBase;
	private $endChromIx;
	private $endBase;
	private $fileSize;
	private $itemsPerSlot;
	
	function regionOverlap($qChrom, $qStart, $qEnd, $rStartChrom, $rStartBase, $rEndChrom, $rEndBase) {
		return (cmpTwoBits($qChrom, $qStart, $rEndChrom, $rEndBase) > 0
			&& cmpTwoBits($qChrom, $qEnd, $rStartChrom, $rStartBase) < 0);
	}
	
	function rFindOverlappingBlocks($level, $offset, $chromIx, $start, $end, &$blocklist) {
		$this->fileHandle->seek($offset);
		$isLeaf = $this->fileHandle->readBits8();
		$this->fileHandle->readBits8();
		$childCount = $this->fileHandle->readBits16();
		
		if($isLeaf) {
			for($i = 0; $i < $childCount; $i++) {
				$sChromIx = $this->fileHandle->readBits32();
				$sChromBase = $this->fileHandle->readBits32();
				$eChromIx = $this->fileHandle->readBits32();
				$eChromBase = $this->fileHandle->readBits32();
				$blockoffset = $this->fileHandle->readBits64();
				$blocksize = $this->fileHandle->readBits64();
				if($this->regionOverlap($chromIx, $start, $end, $sChromIx, $sChromBase, $eChromIx, $eChromBase)) {
					$blocklist[$blockoffset] = $blocksize;
				}
			}
		} else {
			$sChromIxs = array();
			$sChromBases = array();
			$eChromIxs = array();
			$eChromBases = array();
			$offsets = array();
			for($i = 0; $i < $childCount; $i++) {
				$sChromIxs[$i] = $this->fileHandle->readBits32();
				$sChromBases[$i] = $this->fileHandle->readBits32();
				$eChromIxs[$i] = $this->fileHandle->readBits32();
				$eChromBases[$i] = $this->fileHandle->readBits32();
				$blockoffsets[$i] = $this->fileHandle->readBits64();
			}
			for($i = 0; $i < $childCount; $i++) {
				if($this->regionOverlap($chromIx, $start, $end, 
					$sChromIxs[$i], $sChromBases[$i], $eChromIxs[$i], $eChromBases[$i])) {
						$this->rFindOverlappingBlocks($level + 1, $blockoffsets[$i], 
							$chromIx, $start, $end, $blocklist);
				}
			}			
		}
	}
	
	function findOverlappingBlocks($chromIx, $start, $end) {
		$blocklist = array();
		$this->rFindOverlappingBlocks(0, $this->rootOffset, $chromIx, $start, $end, $blocklist);
		ksort($blocklist);
		return $blocklist;
	}
	
	function __construct($fHandle, $cirTreeOffset) {
		// $fHandle is a BufferedFile class
		$this->fileHandle = $fHandle;
		$this->fileHandle->seek($cirTreeOffset);
		// attach b+ tree, note that swapped is already set in $fHandle
		
		$magic = $this->fileHandle->readBits32();
		if($magic != self::SIG) {
			throw new Exception("File " . $this->fileHandle->getFileName() . " has an invalid cirTree index part!");
		}
		$this->blockSize = $this->fileHandle->readBits32();
		$this->itemCount = $this->fileHandle->readBits64();
		$this->startChromIx = $this->fileHandle->readBits32();
		$this->startBase = $this->fileHandle->readBits32();
		$this->endChromIx = $this->fileHandle->readBits32();
		$this->endBase = $this->fileHandle->readBits32();
		$this->fileSize = $this->fileHandle->readBits64();
		$this->itemsPerSlot = $this->fileHandle->readBits32();
		
		$this->fileHandle->readBits32();
		$this->rootOffset = $this->fileHandle->tell();
	}
}

?>