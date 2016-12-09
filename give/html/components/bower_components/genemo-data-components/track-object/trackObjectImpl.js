var GIVe = (function(give) {
	'use strict';

	give.TrackObjectImpl = {
		DataHandlers: {},
		
		LocalFileHandlers: {},
		
		SummaryCtors: {},
		
		DefaultDataHandler: function(response, chromBPTree, queryRegions) {
		},
		
		DefaultLocalFileHandler: function(localFile, queryRegions) {
		},
		
		DefaultSummaryCtor: null,
		
	};

	return give;

})(GIVe || {});
