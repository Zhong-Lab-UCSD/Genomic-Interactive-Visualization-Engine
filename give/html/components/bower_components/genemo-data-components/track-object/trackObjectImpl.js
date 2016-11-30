var GIVe = (function(give) {
	'use strict';

	give.TrackObjectImpl = {
		DataHandlers: {},
		
		LocalFileHandlers: {},
		
		DefaultDataHandler: function(response, chromBPTree, queryRegions) {
		},
		
		DefaultLocalFileHandler: function(localFile, queryRegions) {
		},
		
	};

	return give;

})(GIVe || {});
