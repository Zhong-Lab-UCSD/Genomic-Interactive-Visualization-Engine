<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class ChromRegion {
	// this is used to parse things like "chrX:XXXXX-XXXXX" into chrom regions
	public $chr;				// this is name
	public $start;
	public $end;
	
	const BEGINNING = 1;		// may be 0, needs to refer to bigWig format
	
	function getLength() {
		return $this->end - $this->start;
	}
	
    function __construct() 
    { 
        $a = func_get_args(); 
        $i = func_num_args(); 
        if (method_exists($this,$f='__construct'.$i)) { 
            call_user_func_array(array($this,$f),$a); 
        } 
    } 
    
    function __construct1($region) 
    { 
		$tokens = preg_split("/\s*(:|-|\s)\s*/i", $region);
		$this->chr = trim($tokens[0]);
		$this->start = intval(trim($tokens[1], " \t\n\r\0\x0B,"));
		$this->end = intval(trim($tokens[2], " \t\n\r\0\x0B,"));
    } 
    
    function __construct2($chr, $start, $end) 
    { 
		$this->chr = $chr;
		$this->start = $start;
		$this->end = $end;
    } 
	
	function __toString() {
		return($this->chr . ":" . $this->start . "-" . $this->end);
	}
	
	function breakRegions($number) {
		// break this region into $number consecutive regions
		$result = array();
		$newend = $this->start;
		for($i = 0; $i < $number; $i++) {
			$newstart = $newend;
			$newend = $this->start + round($this->getLength() / $number * ($i + 1));
			if($newend > $this->end) {
				$newend = $this->end;
			}
			$result []= new ChromRegion($this->chr, $newstart, $newend);
		}
		return $result;
	}
}

?>