<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class ChromBPT  {
	const SIG = 0x78CA8C91;
	const ID = 0;
	const SIZE = 1;
	
	private $fileHandle;
	
	private $rootOffset;
	private $blockSize;
	private $keySize;
	private $valSize;
	private $itemCount;
	
	function traverse($blockStart, &$list) {
		// this function is used to traverse BPT and add the chroms to the list
		$this->fileHandle->seek($blockStart);
		$isLeaf = $this->fileHandle->readBits8();
		$this->fileHandle->readBits8();
		$childCount = $this->fileHandle->readBits16();
		if($isLeaf) {
			for($i = 0; $i < $childCount; $i++) {
				$newChrom = array();
				$newChromName = $this->fileHandle->readString($this->keySize);
				$newChrom[self::ID] = $this->fileHandle->readBits32();
				$newChrom[self::SIZE] = $this->fileHandle->readBits32();
				$list[strtolower(trim($newChromName))] = $newChrom;
				// $list[$newChrom['id']] = $newChrom;		// not sure if this is needed, maybe
			}
		} else {
			// get all offsets of children
			$offsets = array();
			for($i = 0; $i < $childCount; $i++) {
				$this->fileHandle->readString($this->keySize);
				$offsets[] = $this->fileHandle->readBits64();
			}
			foreach($offsets as $childOffset) {
				$this->traverse($childOffset, $list);
			}
		}
	}
	
	function getChromList() {
		$list = array();
		$this->traverse($this->rootOffset, $list);
		return $list;
	}
	
	function __construct($fHandle, $tOffset) {
		// $fHandle is a BufferedFile class
		// note that $tOffset is not root offset
		$this->fileHandle = $fHandle;
		$this->fileHandle->seek($tOffset);
		// attach b+ tree, note that swapped is already set in $fHandle
		
		$magic = $this->fileHandle->readBits32();
		if($magic != self::SIG) {
			throw new Exception("File " . $this->fileHandle->getFileName() . " has an invalid chrom b-plus tree index part!");
		}
		$this->blockSize = $this->fileHandle->readBits32();
		$this->keySize = $this->fileHandle->readBits32();
		$this->valSize = $this->fileHandle->readBits32();
		$this->itemCount = $this->fileHandle->readBits64();
		
		$this->fileHandle->readBits64();
		$this->rootOffset = $this->fileHandle->tell();
	}
	
}

?>