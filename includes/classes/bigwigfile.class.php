<?php
require_once("../common_func.php");

class bigWigFile {
	const SIG = 0x888FFC26;
	private $fileHandle;			// this is the handle of bufferedfile
	private $isSwapped;
	
	private $version;
	private $zoomLevels;
	private $chromTreeOffset;
	private $unzoomedDataOffset;
	private $unzoomedIndexOffset;
	private $fieldCount;
	private $definedFieldCount;
	private $asOffset;
	private $totalSummaryOffset;
	private $uncompressBufSize;
	
	private function readBits8() {
		return $this->fileHandle->readBits8();
	}
	
	private function readBits16() {
		return $this->fileHandle->readBits16($isSwapped);
	}
	
	private function readBits32() {
		return $this->fileHandle->readBits32($isSwapped);
	}
	
	private function readBits64() {
		return $this->fileHandle->readBits64($isSwapped);
	}
	
	private function readString($length, $offset = NULL) {
		return $this->fileHandle->readString($length, $offset);
	}
	
	private function seek($offset) {
		$this->fileHandle->seek($offset);
	}	
	
	function __construct($fpathname, $isRemote) {
		$this->fileHandle = new BufferedFile($fpathname, $isRemote);
		// check isSwapped
		$this->isSwapped = FALSE;
		$magic = $this->readBits32();
		if($magic != bigWigFile::SIG) {
			$magic = byteSwap32($magic);
			$this->isSwapped = TRUE;
			if($magic != bigWigFile::SIG) {
				throw new Exception('File ' . $fpathname . ' is not a bigWig file!');
			}
		}
		$this->version = $this->readBits16();
		$this->zoomLevels = $this->readBits16();
		$this->chromTreeOffset = $this->readBits64();
		$this->unzoomedDataOffset = $this->readBits64();
		$this->unzoomedIndexOffset = $this->readBits64();
		$this->fieldCount = $this->readBits16();
		$this->definedFieldCount = $this->readBits16();
		$this->asOffset = $this->readBits64();
		$this->totalSummaryOffset = $this->readBits64();
		$this->uncompressBufSize = $this->readBits32();
		$this->readBits64();				// remove the reserved bits
		
		// next is zoom levels
		
		// next attach chromID trees
		
	}
	
	function __destruct() {
	}
}
?>