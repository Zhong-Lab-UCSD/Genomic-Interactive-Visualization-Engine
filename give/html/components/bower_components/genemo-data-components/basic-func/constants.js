// JavaScript Document
var GIVe = (function(give) {
	'use strict';

	give.VERBOSE_MAJ_ERROR = 1;
	give.VERBOSE_MIN_ERROR = 2;
	give.VERBOSE_WARNING = 3;
	give.VERBOSE_DEBUG = 4;
	give.VERBOSE_DEBUG_MORE = 5;

	give.verboseLvl = give.VERBOSE_DEBUG;

	give.metaDataPath = null;		// use default metadata path (in meta-entries/metaDataEntries.js)
	give.metaColumnPath = null;		// use default column data path (in meta-entries/metaColumnTypes.js)

	give.TASKSCHEDULER_EVENT_NAME = '_give-check-scheduled-task';

	return give;
}) (GIVe || {});
