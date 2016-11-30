// JavaScript Document
var GIVe = (function(give) {
	'use strict';

	give.GeneObject = function(mainParams, species, additionalParams) {
		give.ChromRegion.apply(this, arguments);
	};
	
	give.extend(give.ChromRegion, give.GeneObject);

	give.GeneObject.prototype.regionFromString = function(regionString) {
		this.regionFromObject(new give.TranscriptObject(regionString));
	};

	give.GeneObject.prototype.regionFromObject = function(regionObject) {
		var transcript;
		if(regionObject instanceof give.TranscriptObject) {
			// this gene is initialized from a transcript
			transcript = regionObject;
		} else {
			transcript = new give.TranscriptObject(regionObject);
		}
		for(var key in transcript) {
			if(transcript.hasOwnProperty(key)) {
				if(Array.isArray(transcript[key])) {
					this[key] = transcript[key].slice();
				} else {
					this[key] = transcript[key];
				}
			}
		}
		// then change name
		this.name = transcript.geneName;
		// then put the transcript into this.transcripts
		this.transcripts = [];
		this.transcripts.push(transcript);
	};

	give.GeneObject.prototype.merge = function(newRegion) {
		// add new transcript/gene to the gene
		// notice that the amount of columns in Gene will not be increased if different from transcript
		// (adding a BED12 transcript to a BED4 gene will still keep it as a BED4 gene)
		// and it is not possible to add a transcript with less information to the gene
		// (adding a BED4 transcript to a BED12 gene will generate error)

		// TODO: complete potential error handling code

		// first, put all the blocks into one ordered array
		if(this.numOfBlocks) {
			var newStart = Math.min(this.start, newRegion.start);
			var i;
			for(i = 0; i < this.numOfBlocks; i++) {
				this.blockStarts[i] = this.blockStarts[i] + this.start - newStart;
			}
			var loc = 0;
			for(i = 0; i < newRegion.numOfBlocks; i++) {
				loc = give.locationOf(newRegion.blockStarts[i] + newRegion.start - newStart, this.blockStarts, loc, null, function(x1, x2) {
					return x1 < x2? -1: (x1 > x2? 1: 0);
				}) + 1;
				this.blockStarts.splice(loc, 0, newRegion.blockStarts[i] + newRegion.start - newStart);
				this.blockSizes.splice(loc, 0, newRegion.blockSizes[i]);
			}
			// then merge the blocks
			for(i = 0; i < this.blockStarts.length - 1; i++) {
				if(this.blockStarts[i] + this.blockSizes[i] >= this.blockStarts[i + 1]) {
					// merge this block with the next one
					this.blockSizes[i] = Math.max(this.blockStarts[i] + this.blockSizes[i], 
												  this.blockStarts[i + 1] + this.blockSizes[i + 1]) - 
										 this.blockStarts[i];
					this.blockStarts.splice(i + 1, 1);
					this.blockSizes.splice(i + 1, 1);
					i--;
				}
			}

			this.numOfBlocks = this.blockStarts.length;
		}

		// then	extend length and thick length
		this.assimilate(newRegion);
		if(this.thickStart) {
			this.thickStart = Math.min(this.thickStart, newRegion.thickStart);
		}
		if(this.thickEnd) {
			this.thickEnd = Math.max(this.thickEnd, newRegion.thickEnd);
		}

		// add the new transcript to this.transcripts
		if(newRegion.transcripts) {
			this.transcripts = this.transcripts.concat(newRegion.transcripts);
		} else {
			this.transcripts.push(newRegion);
		}
	};

	give.GeneObject.prototype.getGeneName = function(withTransNums) {
		return this.name + ((withTransNums && this.transcripts.length > 1)?
				' (' + this.transcripts.length + ')': '');
	};

	return give;

})(GIVe || {});
