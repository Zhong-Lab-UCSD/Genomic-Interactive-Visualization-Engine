function loadSelectedTrackIDs(db, IDList) {
	cmnTracksEncode.setIDListOnly(IDList);
	spcArray[spcArray.map[db]].uniTracksEncode.setIDListOnly(IDList);
}

function loadSession(sessionObj) {
	try {
		loadSelectedTrackIDs(sessionObj.db, $.parseJSON(sessionObj.list)) 
	} catch(jsonExcept) {
		// something is wrong with JSON (which means something wrong when the PHP code tries to process input)
		console.log(sessionObj.list);
		UI.alert("Session data corrupted. Please contact us with your following sessionID to see if the results can be still retrieved.\n\nSession ID: " + sessionObj.id);
	}
}

function saveSelectedTrackIDs(db) {
	var useAllTracks = $('#useAllTracks').prop('checked');
	return cmnTracksEncode.getIDList(useAllTracks).concat(
		spcArray[spcArray.map[db]].uniTracksEncode.getIDList(useAllTracks));
}

function saveSession(db, hgsid, email, url, file, urlToShow, callback) {
	var IDPrepQuery = new FormData();
	IDPrepQuery.append('db', db);
	IDPrepQuery.append('hgsid', hgsid);
	IDPrepQuery.append('selected', JSON.stringify(saveSelectedTrackIDs(db)));
	IDPrepQuery.append('email', email);
	if(url) {
		// no file
		IDPrepQuery.append('url', url);
	} else {
		IDPrepQuery.append('file', file);
	}
	if(urlToShow) {
		IDPrepQuery.append('urlToShow', urlToShow);
	}
	$.ajax({
		url: 'cpbrowser/uploadPrepare.php',
		type: 'POST',
		data: IDPrepQuery,
		cache: false,
		processData: false,
		contentType: false,
		success: callback,
		error: function(jqXHR, status, e) {
		}
	}); // end ajax for hgCustom
}
