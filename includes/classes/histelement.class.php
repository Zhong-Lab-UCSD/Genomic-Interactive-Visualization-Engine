<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class HistElement {
	
	public $totalCount;
	public $histArray;
	public $minVal;
	public $maxVal;
	public $resolution;			// resolution for samples
	public $binSize;			// size for bins in the histogram
	
	function getBin($value) {
		if(is_string($value)) {
			return $value;
		} elseif(is_numeric($value)) {
			return intval($value / $this->binSize) * $this->binSize;
		}
	}
	
	function addData($value, $size = 1){
		$this->totalCount += $size;
		if(!array_key_exists($value, $this->histArray)) {
			$this->histArray[$value] = 0;
		}
		$this->histArray[$value] += $size;
		$this->minVal = (($this->minVal <= $value)? $this->minVal: $value);
		$this->maxVal = (($this->maxVal >= $value)? $this->maxVal: $value);
	}
	
	function addHist($hist) {
		foreach($hist->histArray as $value => $count) {
			if($hist->binSize != $this->binSize) {
				$value_to_use = $this->getBin($value);
			} else {
				$value_to_use = $value;
			}
			$this->addData($value_to_use, $count);
		}
	}
	
	function __invoke() {
		return ($this->totalCount > 0);
	}
	
	function __construct($res = 1, $bin = 1) {
		$this->totalCount = 0;
		$this->histArray = array();
		$this->histArray[0] = 0;
		$this->minVal = INF;
		$this->maxVal = -INF;
		$this->resolution = $res;
		$this->binSize = intval(ceil($bin));
	}
	
	function __toString() {
		$result = "Resolution: " . $this->resolution . "; Total Count: " . $this->totalCount 
			. "; Min: " . $this->minVal . "; Max: " . $this->maxVal . PHP_EOL;
		foreach($this->histArray as $value => $count) {
			$result .= $value . ": " . $count . PHP_EOL;
		}
		return $result;
	}
}

?>