<?php
require_once(realpath(dirname(__FILE__) . "/../common_func.php"));

class BufferedFile {
	private $buffer;		// this is the buffer for the file, ordered by blocks
	private $file;			// this is the handle or curl_resource for the file
	private $fname;
	private $type;
	private $curr_offset;		// current offset of the file
	private $file_length;		// length of the file
	private $is_swapped;		// same endian or different endian

	private static $isBigEndian;
	
	public static function checkBigEndian() {
		$arr = unpack("n", pack("S", 0x0123));
		self::$isBigEndian = ($arr[1] == 0x0123);
	}
	
	const BLOCKSIZE = 16384;	// block size for buffers
	const LOCAL = 0;
	const REMOTE = 1;
	const MEMORY = 2;
	
	function setSwapped($swapped) {
		$this->is_swapped = $swapped;
	}
	
	function getSwapped() {
		return $this->is_swapped;
	}
	
	function flipSwapped() {
		// change "swapped-ness"
		$this->is_swapped = !$this->is_swapped;
		return $this->is_swapped;
	}
	
	function getFileName() {
		return $this->fname;
	}
	
	function getFileLength() {
		return $this->file_length;
	}
	
	function __construct($filename, $ftype, $isSwapped = false) {
		$this->curr_offset = 0;
		$this->fname = $filename;
		$this->type = $ftype;
		$this->buffer = array();
		$this->is_swapped = $isSwapped;
		if($this->type == self::REMOTE) {
			$this->file = curl_init();
			curl_setopt($this->file, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);
			//error_log($this->fname);
			curl_setopt($this->file, CURLOPT_URL, $this->fname);
			curl_setopt($this->file, CURLOPT_FOLLOWLOCATION, 1);
			// get the file length first
			curl_setopt($this->file, CURLOPT_NOBODY, 1);
			curl_setopt($this->file, CURLOPT_HEADER, 1);
			curl_setopt($this->file, CURLOPT_RETURNTRANSFER, 1);
			curl_exec($this->file);
			if(curl_errno($this->file)) {
				throw new Exception($this->fname . " is not accessible! Curl error: " . curl_error($this->file));
			}
			$this->file_length = curl_getinfo($this->file, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
			
			// file length get
			curl_setopt($this->file, CURLOPT_HEADER, 0);
			curl_setopt($this->file, CURLOPT_NOBODY, 0);
		} else if($this->type == self::LOCAL) {
			$this->file = fopen($this->fname, "rb");
			if(!$this->file) {
				$last_error = error_get_last();
				throw new Exception($this->fname . " is not accessible! Fopen error: " . $last_error['message']);
			}
			fseek($this->file, 0, SEEK_END);
			$this->file_length = ftell($this->file);
			fseek($this->file, $this->curr_offset);
		} else {
			// is memory, data is in $filename
			$this->buffer[0] = $filename;
			$this->fname = "Memory";
			$this->file_length = strlen($this->buffer[0]);
		}
	}
	
	function __destruct() {
		if($this->type == self::REMOTE) {
			curl_close($this->file);
		} else if($this->type == self::LOCAL) {
			fclose($this->file);
		}
	}
	
	private function readFromFile($begin, $end) {
		if($end > $this->file_length) {
			$end = $this->file_length;
		}
		if($end <= $begin || $begin < 0) return NULL;
		$result = "";
		if($this->type == self::REMOTE) {
			// this is a remote file
			// need to convert offset and length to indices
			$range = $begin . '-' . ($end - 1);
			curl_setopt($this->file, CURLOPT_RANGE, $range);
			$result = curl_exec($this->file);
		} else if($this->type == self::LOCAL) {
			fseek($this->fname, $begin);
			$result = fread($this->fname, $end - $begin);
		}
		return $result;
	}
	
	private function checkBuffer($begin, $end) {
		// check whether the location from $begin to $end are already there
		// in buffer, if not, get the data from file and replenish buffer
		if($this->type == self::MEMORY) {
			return;
		}
		$begin_index = (int) ($begin / self::BLOCKSIZE);
		$end_index = (int) ($end / self::BLOCKSIZE) + 1;
		$array_empty = array();
		$last_empty_begin = -1;
		$last_empty_length = 0;
		for($i = $begin_index; $i < $end_index; $i++) {
			if(!array_key_exists($i, $this->buffer)) {
				// this block is not retrieved yet
				if($i == $last_empty_begin + $last_empty_length) {
					// this is continuous
					$last_empty_length++;
				} else {
					if($last_empty_begin >= 0) {
						// push the previous empty region into $array_empty
						$array_empty[$last_empty_begin] = $last_empty_length;
					}
					$last_empty_begin = $i;
					$last_empty_length = 1;
				}
			}					
		}
		if($last_empty_begin >= 0) {
			// push the previous empty region into $array_empty
			$array_empty[$last_empty_begin] = $last_empty_length;
		}
		// now retrieve all empty regions in $array_empty
		foreach($array_empty as $start => $length) {
			$tempBuffer = $this->readFromFile($start * self::BLOCKSIZE,
				($start + $length) * self::BLOCKSIZE);
			$this->buffer[$start] = substr($tempBuffer, 0, self::BLOCKSIZE);
			for($i = 1; $i < $length; $i++) {
				$tempBuffer = substr($tempBuffer, self::BLOCKSIZE);
				$this->buffer[$start + $i] = substr($tempBuffer, 0, self::BLOCKSIZE);
			}
		}
	}
	
	private function readFromBuffer($length) {
		// NOTICE THAT this will shift the offset value
		// House cleaning for rogue offset / length values
		if($this->curr_offset + $length > $this->file_length) {
			$length = $this->file_length - $this->curr_offset;
		}
		$result = "";
		if($length <= 0) return $result;
		if($this->type == self::MEMORY) {
			$result = substr($this->buffer[0], $this->curr_offset, $length);
		} else {
			$this->checkBuffer($this->curr_offset, $this->curr_offset + $length);
			$bufferIndex = (int) ($this->curr_offset / self::BLOCKSIZE);
			$result = substr($this->buffer[$bufferIndex], 
				$this->curr_offset - $bufferIndex * self::BLOCKSIZE, $length);
			while(strlen($result) < $length) {
				$bufferIndex++;
				$result .= substr($this->buffer[$bufferIndex], 0, $length - strlen($result));
			}
		}
		$this->curr_offset += $length;
		return $result;
	}
	
	function seek($offset) {
		if($offset >= 0 && $offset < $this->file_length) {
			$this->curr_offset = $offset;
		}			
	}
	
	function tell() {
		return $this->curr_offset;
	}
	
	function readString($length, $offset = NULL) {
		if(!is_null($offset)) {
			$this->seek($offset);
		}			
		return $this->readFromBuffer($length);
	}
	
	function readBits8() {
		$arr = unpack("C", $this->readString(1));
		return $arr[1];
	}
	
	function readBits16() {
		// if not swapped
		$str = $this->readString(2);
		if($this->is_swapped) {
			// Different Endian
			$str = strrev($str);
		}
		$arr = unpack("S", $str);
		return $arr[1];
	}
	
	function readBits32() {
		// if not swapped
		$str = $this->readString(4);
		if($this->is_swapped) {
			// Different Endian
			$str = strrev($str);
		}
		$arr = unpack("L", $str);
		return $arr[1];
	}
	
	function readBits64() {
		// Big Endian
		$format = "Nb/Na";
		if($this->is_swapped == self::$isBigEndian) {
			// Different Endian
			$format = "Va/Vb";
		}
		$arr = unpack($format, $this->readString(8));
        return $arr['a'] + ($arr['b'] << 32);
	}
	
	function readFloat() {
		// read a 4B float
		$str = $this->readString(4);
		if($this->is_swapped) {
			// Different Endian
			$str = strrev($str);
		}
		$arr = unpack("f", $str);
		return $arr[1];
	}
}

BufferedFile::checkBigEndian();

?>