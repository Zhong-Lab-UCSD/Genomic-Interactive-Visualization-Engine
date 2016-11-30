// JavaScript Document

var GIVe = (function(give) {
	'use strict';

	give.TrackObjectImpl._BigwigDataHandler = function(res, data, chrRegions) {
		/*read file will turn in an object with data for at least one chromosome.
		datapoints[chromosome#][base pair #] will be the signal strength.
		datapoints is the object given to this class.
		datapoints is an array with objects that are chromosomes. For example, datapoints[12] holds all the info for chromosome 12.
		each chromosome object isn an array, containing point values. These point values are arrays containing two numbers: the base pair and the strength value.
		For example, the object datapoints[12][2] is an array with two numbers in it. It is also the third point stored in chromosome 12. Since the wiggle tracks are in the 
		format of 
		Base Strength
		xxxx xxxx
		xxxx xxxx
		the points will be added to the chromosome object just in the order they are written in the wiggle file, when being read.

		*/
		var resToRegion = function(resEntry) {
			return new give.ChromRegion(resEntry.regionString, 
										this.species, resEntry.data);
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
			var bigWig = new bigWigFile(reader.result);
			bigWig.readAll();
			datapoints=bigWig.datapoints;
			console.log(datapoints);
			this.fire('response', {response: datapoints}, {bubbles: false, cancelable: true});

		}).bind(this);
		reader.readAsArrayBuffer(file);

	};

	give.TrackObjectImpl.DataHandlers.bigwig = give.TrackObjectImpl._BigwigDataHandler;
	
	give.TrackObjectImpl.LocalFileHandlers.bigwig = give.TrackObjectImpl._BigwigLocalFileHandler;

	return give;

})(GIVe || {});
