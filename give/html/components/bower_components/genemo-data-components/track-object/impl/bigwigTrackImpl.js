// JavaScript Document

var GIVe = (function(give) {
	'use strict';

	give.TrackObjectImpl._BigwigDataHandler = function(res, data, chrRegions, resolutions) {
		/*
			Returned data will be made up of different entries
			Each entry will be a flat part of the bigWig file, 
			the format will be a ChromRegion object with {data: {value: <actual value>} }
		*/
		var preConvertData = function(resEntry) {
			return new give.ChromRegion(resEntry.regionString, this.species, { 
				data: (resEntry.data.hasOwnProperty('validCount')?
					   new give.TrackObjectImpl._BigwigSummaryCtor(resEntry.data):
					   resEntry.data),
				resolution: (resEntry.data.hasOwnProperty('validCount')?
							 undefined: 0), 
			});
		}.bind(this);
		
		for(var chrom in res) {
			if(res.hasOwnProperty(chrom) && 
			   data.hasOwnProperty(chrom) && 
			   Array.isArray(res[chrom])) {
				data[chrom].insert(res[chrom].map(preConvertData, this), chrRegions, 
								   null, null, resolutions);
			}
		}

	};

	give.TrackObjectImpl._BigwigLocalFileHandler = function(localFile, regions) {

		var reader = new FileReader();
		// should use bigWig.readSection()
		var datapoints = {};

		reader.onload = (function() {
			var bigWig = new give.bigWigFile(reader.result);
			//bigWig.readAll();
			bigWig.readSection(regions);
			datapoints=bigWig.datapoints;
			console.log(datapoints);
			this.fire('response', {response: datapoints}, {bubbles: false, cancelable: true});

		}).bind(this);
		reader.readAsArrayBuffer(localFile);

	};
	
	give.TrackObjectImpl._BigwigSummaryCtor = function(oldSummary) {
		if(oldSummary) {
			this.validCount = oldSummary.validCount || 0;
			this.sumData = oldSummary.sumData || 0;
			this.sumSquare = oldSummary.sumSquare || 0;
			this.minVal = (typeof oldSummary.minVal === 'number' && !isNaN(oldSummary.minVal))?
				oldSummary.minVal: Number.POSITIVE_INFINITY;
			this.maxVal = (typeof oldSummary.maxVal === 'number' && !isNaN(oldSummary.maxVal))?
				oldSummary.maxVal: Number.NEGATIVE_INFINITY;			
		} else {
			this.validCount = 0;
			this.sumData = 0;
			this.sumSquare = 0;
			this.minVal = Number.POSITIVE_INFINITY;
			this.maxVal = Number.NEGATIVE_INFINITY;
		}
	};
	
	give.TrackObjectImpl._BigwigSummaryCtor.prototype.addSummary = function(summary) {
		this.validCount += summary.validCount;
		this.sumData += summary.sumData;
		this.sumSquares += summary.sumSquares;
		this.minVal = ((this.minVal <= summary.minVal)? this.minVal: summary.minVal);
		this.maxVal = ((this.maxVal >= summary.maxVal)? this.maxVal: summary.maxVal);
	};

	give.TrackObjectImpl._BigwigSummaryCtor.prototype.addData = function(data, length) {
		// data can be either a summary or actual components
		if(data instanceof give.TrackObjectImpl._BigwigSummaryCtor) {
			this.addSummary(data);
		} else {
			this.validCount += length;
			this.sumData += data.value * length;
			this.sumSquares += data.value * data.value * length;
			this.minVal = ((this.minVal <= data.value)? this.minVal: data.value);
			this.maxVal = ((this.maxVal >= data.value)? this.maxVal: data.value);
		}
	};

	give.TrackObjectImpl.DataHandlers.bigwig = give.TrackObjectImpl._BigwigDataHandler;
	
	give.TrackObjectImpl.LocalFileHandlers.bigwig = give.TrackObjectImpl._BigwigLocalFileHandler;
	
	give.TrackObjectImpl.SummaryCtors.bigwig = give.TrackObjectImpl._BigwigSummaryCtor;

	return give;

})(GIVe || {});
