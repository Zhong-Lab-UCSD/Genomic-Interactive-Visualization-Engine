// Gene class, including exons, cds, and other features
// Need generegion.js for ChrRegion

function Transcript(bed12String, transName, chrom, regionstart, regionend, regionstrand, species, geneName, cdsstart, cdsend, numOfExons, exonLengths, exonStarts) {
	if(bed12String) {
		var elements = bed12String.split(/\s+/);
		ChrRegion.call(this, null, elements[3], elements[0], elements[1], elements[2], elements[5], species);
		if(elements[6]) {
			this.thickStart = parseInt(elements[6]);
			this.thickEnd = parseInt(elements[7]);
		}
		this.setBlocks(elements[9], elements[10], elements[11]);
	} else {
		ChrRegion.call(this, null, transName, chrom, regionstart, regionend, regionstrand, species);
		if(cdsstart) {
			this.thickStart = parseInt(cdsstart);
			this.thickEnd = parseInt(cdsend);
		}
		this.setBlocks(numOfExons, exonLengths, exonStarts);
	}
	// check whether thickStart and thickEnd are valid
	if(this.thickStart < this.start) {
		this.thickStart = this.start;
	}
	if(this.thickEnd > this.end) {
		this.thickEnd = this.end;
	}
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

function Gene(transcript) {
	// first copy everything from transcript
	for(var key in transcript) {
		if(transcript.hasOwnProperty(key)) {
			this[key] = transcript[key];
		}
	}
	// then change name
	this.name = transcript.geneName;
	delete this.geneName;
	// then put the transcript into this.transcripts
	this.transcripts = [];
	this.transcripts.push(transcript);
}

extend(ChrRegion, Gene);

Gene.prototype.addTranscript = function(newTrans) {
	// add new transcript to the gene
	// first, put all the blocks into one ordered array
	var newStart = Math.min(this.start, newTrans.start);
	var i;
	for(i = 0; i < this.numOfBlocks; i++) {
		this.blockStarts[i] = this.blockStarts[i] + this.start - newStart;
	}
	var loc = 0;
	for(i = 0; i < newTrans.numOfBlocks; i++) {
		loc = locationOf(newTrans.blockStarts[i] + newTrans.start - newStart, this.blockStarts, loc, null, function(x1, x2) {
			return x1 < x2? -1: (x1 > x2? 1: 0);
		}) + 1;
		this.blockStarts.splice(loc, 0, newTrans.blockStarts[i] + newTrans.start - newStart);
		this.blockSizes.splice(loc, 0, newTrans.blockSizes[i]);
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
	
	// then	extend length and thick length
	this.assimilate(newTrans);
	this.thickStart = Math.min(this.thickStart, newTrans.thickStart);
	this.thickEnd = Math.max(this.thickEnd, newTrans.thickEnd);
	
	// add the new transcript to this.transcripts
	this.transcripts.push(newTrans);
};