<?php
	// this file is to generate an ID and store corresponding 
	require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
	
	$hgsid = substr(trim($_REQUEST['hgsid']), 0, 6);
	$idbase = bin2hex(openssl_random_pseudo_bytes(12));
	$generatedID = $hgsid . '_' . $idbase;
	$result = array();
	$result['id'] = $generatedID;
	$filename = '../upload/file_' . $idbase;
	$orifilename = '';
	
	if(!isset($_REQUEST['bwData'])) {
		if(isset($_REQUEST['url'])) {
			// use url, not file
			if(!copy($_REQUEST['url'], $filename)) {
				$result['error'] = "Cannot open file at " . htmlspecialchars($_REQUEST['url']) . " . ";
				echo json_encode($result);
				exit();
			}
			$customTrackURL = $_REQUEST['url'];
			$orifilename = basename($_REQUEST['url']);
		} else {
			// is uploaded file
			if((!empty($_FILES['file'])) && ($_FILES['file']['error'] == 0)){
				if ($_FILES['file']['size'] < MAX_UPLOAD_FILE_SIZE){
					if (!file_exists($filename)) {
						//Attempt to move the uploaded file to it's new place
						if (!move_uploaded_file($_FILES['file']['tmp_name'], $filename)){
							$result['error'] = "Error: A problem occurred during file uploading!";
							echo json_encode($result);
							exit();
						}
					} else {
						$result['error'] = "Error: File " . htmlspecialchars($_FILES['file']['name']) . " already exists.";
						echo json_encode($result);
						exit();
					}
				} else {
					$result['error'] = "Error: File size " . $_FILES['file']['size'] . " exceeded maximum size of " . MAX_UPLOAD_FILE_SIZE . " bytes.";
					echo json_encode($result);
					exit();
				}
			} else {
				$result['error'] = "Error: No file was uploaded. " . $_FILES['file']['error'];
				echo json_encode($result);
				exit();
			}
			$customTrackURL = "http://" . getenv('SERVER_NAME') . ":" . getenv('SERVER_PORT') . "/upload/file_" . $idbase;
			$orifilename = basename($_FILES['file']['name']);
		}
	}
	
	
	if(isset($_REQUEST['urlToShow']) || isset($_REQUEST['bwData'])) {
		$urlToShow = isset($_REQUEST['bwData'])? $_REQUEST['url']: $_REQUEST['urlToShow'];
		$filename = isset($_REQUEST['bwData'])? $_REQUEST['url']: $filename;
		if($_REQUEST['bwData']) {
			$result['bwFlag'] = true;
		}
		if(strpos(trim($urlToShow), 'track') !== 0) {
			$ch = curl_init($urlToShow);
		
			curl_setopt($ch, CURLOPT_NOBODY, true);
			curl_exec($ch);
			$retcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
			// $retcode >= 400 -> not found, $retcode = 200, found.
			curl_close($ch);
			if($retcode >= 400) {
				$result['error'] = "Cannot open file at " . htmlspecialchars($urlToShow) . " . ";
				echo json_encode($result);
				exit();
			}
			
			if((strlen($urlToShow) >= 6 && strpos(strtolower($urlToShow), 'bigwig', strlen($urlToShow) - 6) >= 0)
				|| (strlen($urlToShow) >= 2 && strpos(strtolower($urlToShow), 'bw', strlen($urlToShow) - 2) >= 0)) {
				// the file ends with 'bigwig' or 'bw', add annotation line
				$orifilename = basename($urlToShow);
				$urlToShow = "track type=bigWig name=\"" . basename($urlToShow). "\" description=\"Tracks to show as input\" bigDataUrl=" . $urlToShow;
			}
			$customTrackURL = $urlToShow;
		} else {
			// otherwise it's track definition, directly hand over to UCSC
			$customTrackURL = substr($urlToShow, strpos(strtolower($urlToShow), "bigdataurl=") + 11);
			$customTrackURL = preg_split("/\s+/", $customTrackURL)[0];
		}

	}
	
	$result['urlToShow'] = $customTrackURL;
	
	// return id and urlToShow, save others to database
	
	$db = trim($_REQUEST['db']);
	$selected = trim($_REQUEST['selected']);
	$email = trim($_REQUEST['email']);
	$searchRange = (isset($_REQUEST['searchRange'])? trim($_REQUEST['searchRange']): '');
	
	$mysqli = connectCPB();
	$stmt = $mysqli->prepare("INSERT INTO `userInput` (`id`, `db`, `email`, `selected_tracks`, `fileName`, `display_file_url`, `original_file_name`, `search_range`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
	$stmt->bind_param('ssssssss', $generatedID, $db, $email, $selected, $filename, $customTrackURL, $orifilename, $searchRange);
	$stmt->execute();
	echo json_encode($result);
	$stmt->close();
	$mysqli->close();
	
	
?>