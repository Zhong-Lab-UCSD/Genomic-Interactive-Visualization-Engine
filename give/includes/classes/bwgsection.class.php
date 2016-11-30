<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class BWGSection {
	const BEDGRAPH = 1;
	const VARIABLESTEP = 2;
	const FIXEDSTEP = 3;
	
	const START = 1;
	const END = 2;
	const VALUE = 3;
	
	private $fileHandle;
	private $chromID;
	private $start;
	private $chromend;
	private $itemStep;
	private $itemSpan;
	private $type;
	private $itemCount;
	
	function readBlock($start, $endbase) {
		$result = array();
		switch($this->type) {
			case self::BEDGRAPH:
				for($i = 0; $i < $this->itemCount; $i++) {
					$s = $this->fileHandle->readBits32();
					$e = $this->fileHandle->readBits32();
					$val = $this->fileHandle->readFloat();
					if($s < $start) {
						$s = $start;
					}
					if($e > $endbase) {
						$e = $endbase;
					}
					if($s < $e) {
						$result[] = array(self::START => $s, self::END => $e, self::VALUE => $val);
					}
				}
				break;
			case self::VARIABLESTEP:
				for($i = 0; $i < $this->itemCount; $i++) {
					$s = $this->fileHandle->readBits32();
					$e = $s + $this->itemSpan;
					$val = $this->fileHandle->readFloat();
					if($s < $start) {
						$s = $start;
					}
					if($e > $endbase) {
						$e = $endbase;
					}
					if($s < $e) {
						$result[] = array(self::START => $s, self::END => $e, self::VALUE => $val);
					}
				}
				break;
			case self::FIXEDSTEP:
				$s = $this->start;
				$e = $s + $this->itemSpan;
				for($i = 0; $i < $this->itemCount; $i++) {
					$val = $this->fileHandle->readFloat();
					$clippedS = $s;
					$clippedE = $e;
					if($clippedS < $start) {
						$clippedS = $start;
					}
					if($clippedE > $endbase) {
						$clippedE = $endbase;
					}
					if($clippedS < $clippedE) {
						$result[] = array(self::START => $clippedS, self::END => $clippedE, self::VALUE => $val);
					}
					$s += $this->itemStep;
					$e += $this->itemStep;
				}
				break;
			default:
				throw new Exception("Wigfile content type error!");
		}
		return $result;
	}
	
	function __construct($fHandle, $offset) {
		// construct BWGSection from BufferedFile
		$this->fileHandle = $fHandle;
		$this->fileHandle->seek($offset);
		$this->chromID = $this->fileHandle->readBits32();
		$this->start = $this->fileHandle->readBits32();
		$this->chromend = $this->fileHandle->readBits32();
		$this->itemStep = $this->fileHandle->readBits32();
		$this->itemSpan = $this->fileHandle->readBits32();
		$this->type = $this->fileHandle->readBits8();
		$this->fileHandle->readBits8();
		$this->itemCount = $this->fileHandle->readBits16();
	}
}

?>