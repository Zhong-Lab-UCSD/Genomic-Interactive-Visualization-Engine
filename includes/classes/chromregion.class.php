<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

/**
 * ChromRegion class
 * This is used to parse things like "chrX:XXXXX-XXXXX" into chrom regions.
 * And also provide some limited region operations.
 * Note that all the coordinates here is 0-based.
 * This is adjustable by changing self::BEGINNING
 */
class ChromRegion {
	public $chr;				// this is name
	public $start;
	public $end;

	const BEGINNING = 0;

	function getLength() {
		return $this->end - $this->start;
	}

    function __construct()
    {
    }

	public static function newFromRegionText($region) {
		$inst = new self();
		$inst->loadFromRegionText($region);
		return $inst;
	}

	public static function newFromCoordinates($chr, $start, $end) {
		$inst = new self();
		$inst->loadFromCoordinates($chr, $start, $end);
		return $inst;
	}

    function loadFromRegionText($region)
    {
		$tokens = preg_split("/\s*(:|-|\s)\s*/i", $region);
		$this->chr = trim($tokens[0]);
		$this->start = intval(trim($tokens[1], " \t\n\r\0\x0B,")) - (1 - static::BEGINNING);
		$this->end = intval(trim($tokens[2], " \t\n\r\0\x0B,"));
    }

    function loadFromCoordinates($chr, $start, $end)
    {
		$this->chr = $chr;
		$this->start = $start;
		$this->end = $end;
    }

	function overlap($chrRegion) {
		if($this->chr !== $chrRegion->chr) {
			return 0;
		}
		return rangeIntersection($this->start, $this->end, $chrRegion->start, $chrRegion->end);
	}

	function __toString() {
		return $this->regionToString();
	}

	function regionToString() {
		return($this->chr . ":" . ($this->start + 1 - static::BEGINNING) . "-" . $this->end);
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
			$result []= static::newFromCoordinates($this->chr, $newstart, $newend);
		}
		return $result;
	}
}
