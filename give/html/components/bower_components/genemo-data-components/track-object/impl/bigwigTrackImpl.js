// JavaScript Document

var GIVe = (function(give) {
	'use strict';

	give.TrackObjectImpl._BigwigDataHandler = function(res, data, chrRegions) {
		/*
			Returned data will be made up of different entries
			Each entry will be a flat part of the bigWig file, 
			the format will be a ChromRegion object with {data: {value: <actual value>} }
		*/
		var resToRegion = function(resEntry) {
			return new give.ChromRegion(resEntry.regionString, 
										this.species, {data: resEntry.data});
		}.bind(this);
		
		for(var chrom in res) {
			if(res.hasOwnProperty(chrom) && Array.isArray(res[chrom])) {
				data[chrom].insert(res[chrom].map(resToRegion, this), chrRegions);
			}
		}

	};

	give.TrackObjectImpl._BigwigLocalFileHandler = function(localFile, regions) {

		var reader = new FileReader();
		// should use bigWig.readSection()
		var datapoints = {};

		reader.onload = (function() {
			var bigWig = new give.bigWigFile(reader.result);
			bigWig.readAll();
			datapoints=bigWig.datapoints;
			console.log(datapoints);
			this.fire('response', {response: datapoints}, {bubbles: false, cancelable: true});

		}).bind(this);
		reader.readAsArrayBuffer(localFile);

	};

	give.TrackObjectImpl.DataHandlers.bigwig = give.TrackObjectImpl._BigwigDataHandler;
	
	give.TrackObjectImpl.LocalFileHandlers.bigwig = give.TrackObjectImpl._BigwigLocalFileHandler;

	return give;

})(GIVe || {});
