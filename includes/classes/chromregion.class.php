<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class ChromRegion {
	// this is used to parse things like "chrX:XXXXX-XXXXX" into chrom regions
	public $chr;				// this is name
	public $start;
	public $end;
	
	function getLength() {
		return $this->end - $this->start;
	}
	
	function __construct($region) {
		$tokens = preg_split("/\s*(:|-|\s)\s*/i", $region);
		$this->chr = trim($tokens[0]);
		$this->start = intval(trim($tokens[1], " \t\n\r\0\x0B,"));
		$this->end = intval(trim($tokens[2], " \t\n\r\0\x0B,"));
	}
	
	function __toString() {
		return($this->chr . ":" . $this->start . "-" . $this->end);
	}
}

?>