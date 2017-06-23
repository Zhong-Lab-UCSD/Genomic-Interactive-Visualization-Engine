function loadSelectedTrackIDs(db, IDList) {
	cmnTracksEncode.setIDListOnly(IDList, genemoIsOn? db: null);
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
	return cmnTracksEncode.getIDList(useAllTracks, genemoIsOn? db: null).concat(
		spcArray[spcArray.map[db]].uniTracksEncode.getIDList(useAllTracks));
}

function saveSession(dataObj, callback) {
	var IDPrepQuery = new FormData();
	IDPrepQuery.append('db', dataObj.db);
	IDPrepQuery.append('hgsid', dataObj.hgsid);
	IDPrepQuery.append('selected', JSON.stringify(saveSelectedTrackIDs(dataObj.db)));
	IDPrepQuery.append('email', dataObj.email);
	if(dataObj.url) {
		// no file
		IDPrepQuery.append('url', dataObj.url);
		// check whether the file is bigwig format (.bw or .bigwig)
		var ext = dataObj.url.substr((~-dataObj.url.lastIndexOf(".") >>> 0) + 2).toLowerCase();
		if(ext === 'bw' || ext === 'bigwig') {
			// is bigwig file, add bigwig flag
			IDPrepQuery.append('bwData', true);
		}
	} else {
		IDPrepQuery.append('file', dataObj.file);
	}
	if(dataObj.urlToShow) {
		IDPrepQuery.append('urlToShow', dataObj.urlToShow);
	}
	if(dataObj.searchRange) {
		IDPrepQuery.append('searchRange', dataObj.searchRange);
	}
	// var compDomain = (window.location.search.indexOf('XCGenemoTest') > 0)? (window.location.protocol + '//comp.genemo.org/cpbrowser/'): 'cpbrowser/';
	var compDomain = window.location.protocol + '//comp.genemo.org/cpbrowser/';
	$.ajax({
		url: compDomain + 'uploadPrepare.php',
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
