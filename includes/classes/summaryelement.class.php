<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class SummaryElement {
	
	const DATASIZE = 32;			// bytes of summary element
	
	public $chromRegion;
	
	public $validCount;
	public $minVal;
	public $maxVal;
	public $sumData;
	public $sumSquares;
	
	function addData($value, $size = 1){
		$this->validCount += $size;
		$this->sumData += $size * $value;
		$this->sumSquares += $size * $value * $value;
		$this->minVal = (($this->minVal <= $value)? $this->minVal: $value);
		$this->maxVal = (($this->maxVal >= $value)? $this->maxVal: $value);
	}
	
	function addSummaryData($summary, $overlap = 1) {
		$overlapFactor = $overlap / ($summary->chromRegion->end - $summary->chromRegion->start);
		$this->validCount += $summary->validCount * $overlapFactor;
		$this->sumData += $summary->sumData * $overlapFactor;
		$this->sumSquares += $summary->sumSquares * $overlapFactor;
		$this->minVal = (($this->minVal <= $summary->minVal)? $this->minVal: $summary->minVal);
		$this->maxVal = (($this->maxVal >= $summary->maxVal)? $this->maxVal: $summary->maxVal);
	}
	
	function __invoke() {
		return ($this->validCount > 0);
	}
	
	function __construct($chromregion = NULL, $filehandle = NULL) {
		if(is_null($filehandle)) {
			$this->validCount = 0;
			$this->sumData = 0.0;
			$this->sumSquares = 0.0;
			$this->minVal = INF;
			$this->maxVal = -INF;
			$this->chromRegion = $chromregion;
		} else {
			// read from file (already seeked)
			$chromID = $filehandle->readBits32();
			$start = $filehandle->readBits32();
			$end = $filehandle->readBits32();
			$this->chromRegion = new ChromIDRegion($chromID, $start, $end);
			$this->validCount = $filehandle->readBits32();
			$this->minVal = $filehandle->readFloat();
			$this->maxVal = $filehandle->readFloat();
			$this->sumData = $filehandle->readFloat();
			$this->sumSquares = $filehandle->readFloat();
		}
	}
	
	function __toString() {
		return "Valid Count: " . $this->validCount . "; Min: " . $this->minVal . "; Max: " . $this->maxVal
			. "; Sum: " . $this->sumData . "; Sum of squares: " . $this->sumSquares . ".";
	}
}

?>