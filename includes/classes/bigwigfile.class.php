<?php
require_once("../common_func.php");

class BigWigFile {
	const SIG = 0x888FFC26;
	const CHROMBPTSIG = 0x78CA8C91;
	private $fName;
	private $fileHandle;			// this is the handle of bufferedfile
	private $isSwapped;
	
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
	
	private function tell() {
		// tell the current position of the file
		return $this->fileHandle->tell();
	}
	
	private function readBasicParameters() {
		// read basic parameters
		// check isSwapped
		$this->isSwapped = FALSE;
		$magic = $this->readBits32();
		if($magic != bigWigFile::SIG) {
			$magic = byteSwap32($magic);
			$this->isSwapped = TRUE;
			if($magic != bigWigFile::SIG) {
				throw new Exception('File ' . $this->fName . ' is not a bigWig file!');
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
	}
	
	private function readZoomLevels() {
		// read zoom levels
		$this->zoomLevelList = array();
		for($i = 0; $i < $this->zoomLevels; $i++) {
			$reductionLevel = $this->readBits32();
			$reserved = $this->readBits32();
			$dataOffset = $this->readBits64();
			$indexOffset = $this->readBits64();
			$this->zoomLevelList[] = new ZoomLevel($reductionLevel, $reserved, $dataOffset, $indexOffset);
		}
	}
	
	private function readChromIDs() {
		// first attach b+ tree
		$this->seek($this->chromTreeOffset);
		$magic = $this->readBits32();
		if($magic != BigWigFile::CHROMBPTSIG) {
			throw new Exception("File " . $this->fName . " has an invalid chrom b-plus tree index part!");
		}
		$bptBlockSize = $this->readBits32();
		$bptKeySize = $this->readBits32();
		$bptValSize = $this->readBits32();
		$bptItemCount = $this->readBits64();
		
		$this->readBits64();
		$bptRootOffset = $this->tell();
		
		// then get all chrom ID and name
		
	}
	
	function __construct($fpathname, $isRemote) {
		$this->fileHandle = new BufferedFile($fpathname, $isRemote);
		$this->fName = $fpathname;
		$this->readBasicParameters();
		// next is zoom levels
		$this->readZoomLevels();
		
		// next use chromBPT to get all ID and chrom names
		$this->readChromIDs();		
	}
	
	function __destruct() {
	}
}
?>