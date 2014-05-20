<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class ChromIDRegion {
	public $chromID;
	public $start;
	public $end;
	
	function getLength() {
		return $this->end - $this->start;
	}
	
	function __construct($chromID, $start, $end) {
		$this->chromID = $chromID;
		$this->start = $start;
		$this->end = $end;
	}
}

?>