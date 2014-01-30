<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class ZoomLevel {
	private $ReductionLevel;
	private $Reserved;
	private $DataOffset;
	private $IndexOffset;
	
	function __construct($reductionlvl, $rsvd, $dataofst, $indexofst) {
		$this->ReductionLevel = $reductionlvl;
		$this->Reserved = $rsvd;
		$this->DataOffset = $dataofst;
		$this->IndexOffset = $indexofst;
	}
	
	function getDataOffset() {
		return $this->DataOffset;
	}
	
	function getIndexOffset() {
		return $this->IndexOffset;
	}
	
	function getReductionLevel() {
		return $this->ReductionLevel;
	}
}
?>