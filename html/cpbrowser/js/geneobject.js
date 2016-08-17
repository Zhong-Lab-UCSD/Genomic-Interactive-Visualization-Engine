// Gene class, including exons, cds, and other features
// Need generegion.js for ChrRegion

function Transcript(bed12String, transName, chrom, regionstart, regionend, regionstrand, species, geneName, cdsstart, cdsend, 
					numOfExons, exonLengths, exonStarts, itemRGB) {
	// note that itemRGB is a string per UCSC BED format "r,g,b"
	if(bed12String) {
		var elements = bed12String.split(/\s+/);
		ChrRegion.call(this, null, elements[3], elements[0], elements[1], elements[2], elements[5], species);
		if(elements[6]) {
			this.thickStart = parseInt(elements[6]);
			this.thickEnd = parseInt(elements[7]);
		}
		if(elements[8]) {
			this.setRGB(elements[8]);
		}
		if(elements[9]) {
			this.setBlocks(elements[9], elements[10], elements[11]);
		}
	} else {
		ChrRegion.call(this, null, transName, chrom, regionstart, regionend, regionstrand, species);
		if(cdsstart) {
			this.thickStart = parseInt(cdsstart);
			this.thickEnd = parseInt(cdsend);
		}
		if(itemRGB) {
			this.setRGB(itemRGB);
		}
		if(numOfExons) {
			this.setBlocks(numOfExons, exonLengths, exonStarts);
		}
	}
	// check whether thickStart and thickEnd are valid
	if(this.thickStart && this.thickStart < this.start) {
		this.thickStart = this.start;
	}
	if(this.thickEnd && this.thickEnd > this.end) {
		this.thickEnd = this.end;
	}
	if(this.numOfBlocks) {
		// check blockStarts and blockLengths
		for(var i = 0; i < this.numOfBlocks; i++) {
			if(this.blockStarts[i] < 0) {
				this.blockStarts[i] = 0;
			} else if(this.blockStarts[i] >= this.getLength()) {
				throw({value: this.chr + ':' + this.start + '-' + this.end,
					message: 'Block #' + i + ' is invalid: ' + this.chr + ':' + this.start + '-' + this.end + ', ' + 
						this.blockStarts[i] + ' is greater than length.'});
			} else if(this.blockSizes[i] < 0) {
				throw({value: this.chr + ':' + this.start + '-' + this.end,
					message: 'Block #' + i + ' size is invalid: ' + this.chr + ':' + this.start + '-' + this.end + '!'});
			} else if(this.blockStarts[i] + this.blockSizes[i] > this.getLength()) {
				this.blockSizes[i] = this.getLength() - this.blockStarts[i];
			}
		}
	}
	if(geneName) {
		// this is used when geneName (ID) differs from display Name
		this.geneName = geneName;
	}
}

extend(ChrRegion, Transcript);

Transcript.prototype.setBlocks = function(numOfExons, exonLengths, exonStarts) {
	try {
		this.numOfBlocks = parseInt(numOfExons);
		var startArray = exonStarts.split(',');
		var lengthArray = exonLengths.split(',');
		this.blockSizes = [];
		this.blockStarts = [];
		for(var i = 0; i < this.numOfBlocks; i++) {
			this.blockSizes.push(parseInt(lengthArray[i]));
			this.blockStarts.push(parseInt(startArray[i]));
		}
	} catch(e) {
		if(parseInt(numOfExons) > 0) {
			// there are number of exons, but exon sizes and starts are not correct
			e.message = (e.message || '') + '(Block processing)';
			throw(e);
		}
		this.numOfBlocks = 1;
		this.blockSizes = [this.getLength()];
		this.blockStarts = [this.start];
	}
};

Transcript.prototype.setRGB = function(strRGB) {
	if(strRGB) {
		var rgbArr = strRGB.split(/,\s*/);
		this.itemRGB = 0;
		rgbArr.forEach(function(color) {
			this.itemRGB <<= 8;
			this.itemRGB += parseInt(color);
		});
		return true;
	} else {
		delete this.itemRGB;
	}
	return false;
};

Transcript.prototype.getRGB = function() {
	return this.itemRGB;
};

Transcript.prototype.getGeneName = function(withTransNums) {
	return this.geneName;
};

function Gene(transcript) {
	// first copy everything from transcript
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
}

extend(ChrRegion, Gene);

Gene.prototype.merge = function(newRegion) {
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
			loc = locationOf(newRegion.blockStarts[i] + newRegion.start - newStart, this.blockStarts, loc, null, function(x1, x2) {
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

Gene.prototype.getGeneName = function(withTransNums) {
	return this.geneName + ((withTransNums && this.transcripts.length > 1)?
			' (' + this.transcripts.length + ')': '');
};
