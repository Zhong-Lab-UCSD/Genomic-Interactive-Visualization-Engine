<?php
require_once("../common_func.php");

class BufferedFile {
	private $buffer;		// this is the buffer for the file, ordered by blocks
	private $file;			// this is the handle or curl_resource for the file
	private $fname;
	private $is_remote;
	private $curr_offset;		// current offset of the file
	private $file_length;		// length of the file
	const BLOCKSIZE = 16384;	// block size for buffers
	
	function __constructor($filename, $isRemote) {
		$this->curr_offset = 0;
		$this->fname = $filename;
		$this->is_remote = $isRemote;
		$this->buffer = array();
		if($this->is_remote) {
			$this->file = curl_init();
			curl_setopt($this->file, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);
			curl_setopt($this->file, CURLOPT_URL, $this->fname);
			curl_setopt($this->file, CURLOPT_FOLLOWLOCATION, 1);
			// get the file length first
			curl_setopt($this->file, CURLOPT_NOBODY, 1);
			curl_setopt($this->file, CURLOPT_HEADER, 1);
			curl_setopt($this->file, CURLOPT_RETURNTRANSFER, 1);
			curl_exec($this->file);
			$this->file_length = curl_getinfo($this->file, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
			
			// file length get
			curl_setopt($this->file, CURLOPT_HEADER, 0);
			curl_setopt($this->file, CURLOPT_NOBODY, 0);
		} else {
			$this->file = fopen($this->fname, "rb");
			fseek($this->file, 0, SEEK_END);
			$this->file_length = ftell($this->file);
			fseek($this->file, $this->curr_offset);
		}
	}
	
	function __destructor() {
		if($this->is_remote) {
			curl_close($this->file);
		} else {
			fclose($this->file);
		}
	}
	
	private function readFromFile($begin, $end) {
		if($end > $this->file_length) {
			$end = $this->file_length;
		}
		if($end <= $begin || $begin < 0) return NULL;
		if($this->is_remote) {
			// this is a remote file
			// first check if the block of data is already in buffer
			// need to convert offset and length to indices
			$range = $begin . '-' . ($end - 1);
			curl_setopt($this->file, CURLOPT_RANGE, $range);
			$result = curl_exec($this->file);
		} else {
			fseek($this->fname, $begin);
			$result = fread($this->fname, $end - $begin);
		}
		return $result;
	}
	
	private function checkBuffer($begin, $end) {
		// check whether the location from $begin to $end are already there
		// in buffer, if not, get the data from file and replenish buffer
		$begin_index = (int) ($begin / BufferedFile::BLOCKSIZE);
		$end_index = (int) ($end / BufferedFile::BLOCKSIZE) + 1;
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
			$tempBuffer = $this->readFromFile($start * BufferedFile::BLOCKSIZE,
				($start + $length) * BufferedFile::BLOCKSIZE);
			$this->buffer[$start] = substr($tempBuffer, 0, BufferedFile::BLOCKSIZE);
			for($i = 1; $i < $length; $i++) {
				$tempBuffer = substr($tempBuffer, BufferedFile::BLOCKSIZE);
				$this->buffer[$start + $i] = substr($tempBuffer, 0, BufferedFile::BLOCKSIZE);
			}
		}
	}
	
	private function readFromBuffer($length) {
		// NOTICE THAT this will shift the offset value
		// House cleaning for rogue offset / length values
		if($this->curr_offset + $length > $this->file_length) {
			$length = $this->file_length - $this->curr_offset;
		}
		if($length <= 0) return "";
		$this->checkBuffer($this->curr_offset, $this->curr_offset + $length);
		$bufferIndex = (int) ($this->curr_offset / BufferedFile::BLOCKSIZE);
		$result = substr($this->buffer[$bufferIndex], 
			$this->curr_offset - $bufferIndex * BufferedFile::BLOCKSIZE, $length);
		while(strlen($result) < $length) {
			$bufferIndex++;
			$result .= substr($this->buffer[$bufferIndex], 0, $length - strlen($result));
		}
		$this->curr_offset += $length;
		return $result;
	}
	
	function seek($offset) {
		if($offset >= 0 && $offset < $this->file_length) {
			$this->curr_offset = $offset;
		}			
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
	
	function readBits16($isSwapped) {
		// if not swapped, should be Big Endian
		$format = "n";
		if($isSwapped) {
			// Little Endian
			$format = "v";
		}
		$arr = unpack($format, $this->readString(2));
		return $arr[1];
	}
	
	function readBits32($isSwapped) {
		// if not swapped, should be Big Endian
		$format = "N";
		if($isSwapped) {
			// Little Endian
			$format = "V";
		}
		$arr = unpack($format, $this->readString(4));
		return $arr[1];
	}
	
	function readBits64($isSwapped) {
		// if not swapped, should be Big Endian
		$format = "Nb/Na";
		if($isSwapped) {
			// Little Endian
			$format = "Va/Vb";
		}
		$arr = unpack($format, $this->readString(8));
        return $arr['a'] + ($arr['b'] << 32);
	}
	
}
?>