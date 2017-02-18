// Orthologous region class and gene class

var REGION_SHORTNAME_LIMIT = 11;
var REGION_SHORTNAME_PREFIX_LENGTH = 6;
var REGION_SHORTNAME_SUFFIX_LENGTH = 4;

function surrogateCtor() {}
 
function extend(base, sub) {
	surrogateCtor.prototype = base.prototype;
	sub.prototype = new surrogateCtor();
	sub.prototype.constructor = sub;
}


function ChrRegion(chrString, regionname, chrom, regionstart, regionend, regionstrand, species) {
	var cleanedChrString, elements; 
	if(chrString) {
		cleanedChrString = chrString.replace(/,/g, '')
			.replace(/\(\s*-\s*\)/g, ' NEGSTR').replace(/\(\s*\+\s*\)/g, ' POSSTR');
		elements = cleanedChrString.split(/[:\s-]+/);
		this.chr = elements[0];
		this.start = parseInt(elements[1]);
		this.end = parseInt(elements[2]);
		this.strand = ((elements.length < 3)? null: ((elements[3] === 'NEGSTR')? false: true));
	} else {
		this.chr = chrom;
		this.start = parseInt(regionstart);
		this.end = parseInt(regionend);
		this.strand = this.setStrand(regionstrand);
	}
	if(this.start < ChrRegion.CHROM_BASE) {
		this.start = ChrRegion.CHROM_BASE;
	}
	if(species && species.chromInfo) {
		if(species.chromInfo[this.chr] && 
			species.chromInfo[this.chr].chrRegion.end < this.end) {
				this.end = species.chromInfo[this.chr].chrRegion.end;
		} else if(!species.chromInfo[this.chr]) {
			// this is not a valid chromosome
			throw({value: this.chr, message: this.chr + ' is not a valid chromosome for ' + species.db + '!'});
		}
	}
	if(this.start > this.end) {
		throw({value: this.chr + ':' + this.start + '-' + this.end,
			message: 'Coordinates out of bounds: ' + this.chr + ':' + this.start + '-' + this.end + '!'});
	}
	this.name = regionname || '';
}

ChrRegion.CHROM_BASE = 1;			// may be 0 for UCSC

ChrRegion.clipCoordinate = function(coor, species) {
	// this is to clip single coordinate
	if(coor.coor < ChrRegion.CHROM_BASE) {
		coor.coor = ChrRegion.CHROM_BASE;
	} else if(species && species.chromInfo && species.chromInfo[coor.chr] &&
			 species.chromInfo[coor.chr].chrRegion.end < coor.coor) {
				 coor.coor = species.chromInfo[coor.chr].chrRegion.end;
	}
	return coor;
};

ChrRegion.prototype.clipRegion = function(species) {
	if(this.start < ChrRegion.CHROM_BASE) {
		this.start = ChrRegion.CHROM_BASE;
	}
	if(species && species.chromInfo && species.chromInfo[this.chr] &&
		species.chromInfo[this.chr].chrRegion.end < this.end) {
			this.end = species.chromInfo[this.chr].chrRegion.end;
	}
	return this;
};		
		

ChrRegion.prototype.getLength = function() {
	return this.end - this.start;
};

ChrRegion.prototype.getStart = function() {
	return {chr: this.chr, coor: this.start};
};

ChrRegion.prototype.getEnd = function() {
	return {chr: this.chr, coor: this.end};
};

ChrRegion.prototype.regionFromString = function(regionString) {
	var cleanedChrString = regionString.replace(/,/g, '')
		.replace(/\(\s*-\s*\)/g, ' NEGSTR').replace(/\(\s*\+\s*\)/g, ' POSSTR');
	var elements = cleanedChrString.split(/[:\s-]+/);
	this.chr = elements[0];
	this.start = parseInt(elements[1]);
	this.end = parseInt(elements[2]);
	this.strand = ((elements.length < 4)? this.strand: ((elements[3] === 'NEGSTR')? false: true));
};

ChrRegion.prototype.regionToString = function(includeStrand) {
	// default is including strand
	if (includeStrand == null) {
		includeStrand = true;
	}
	return this.chr + ':' + this.start + '-' + this.end
		+ ((!includeStrand || this.strand === null)? '': (' ('
		+ (this.strand? '+': '-') + ')'));
};

ChrRegion.prototype.regionToBed = function(includeStrand) {
	return this.chr + '\t' + this.start + '\t' + this.end + '\t' + (this.name? this.name: '.') + 
			(includeStrand? '\t0\t' + (!this.strand? '-': '+'): '');
};

ChrRegion.prototype.toString = function() {
	// default is including strand
	return this.regionToString(true);
};

ChrRegion.prototype.setStrand = function(newStr) {
	switch(typeof(newStr)) {
		case "string":
			this.strand = !(newStr.indexOf('-') >= 0 || newStr.indexOf('0') >= 0);
			break;
		case "number":
			this.strand = (newStr > 0);
			break;
		case "boolean":
			this.strand = newStr;
			break;
		case "undefined":
			this.strand = null;
			break;
		default:
			this.strand = ((newStr == null)? null: (newStr? true: false));
	}
	return this.strand;
};

ChrRegion.prototype.getStrand = function(flankbefore, flankafter) {
	return (typeof(this.strand) === 'boolean')?
		(((typeof(flankbefore) === "string")? flankbefore: '') +
		(this.strand? '+': '-')	+ 
		((typeof(flankafter) === "string")? flankafter: '')): null;
};

ChrRegion.prototype.getShortName = function() {
	if(this.name && this.name.length > REGION_SHORTNAME_LIMIT) {
		return this.name.substr(0, REGION_SHORTNAME_PREFIX_LENGTH) + "..." + this.name.substr(this.name.length - REGION_SHORTNAME_SUFFIX_LENGTH);
	} else {
		return this.name;
	}
};

ChrRegion.prototype.overlaps = function(region) {
	// this will return the length of overlaps, if not overlapping, return 0
	if(this.chr != region.chr) {
		return 0;
	}
	if(this.start > region.end || this.end < region.start) {
		return 0;
	}
	return Math.min(this.end, region.end) - Math.max(this.start, region.start);
};

ChrRegion.prototype.assimilate = function(region) {
	if(!this.overlaps(region)) {
		return null;
	}
	this.start = parseInt(Math.min(this.start, region.start));
	this.end = parseInt(Math.max(this.end, region.end));
	return this;
};

ChrRegion.prototype.intersect = function(region) {
	if(!this.overlaps(region)) {
		return null;
	}
	this.start = parseInt(Math.max(this.start, region.start));
	this.end = parseInt(Math.min(this.end, region.end));
	return this;
};

ChrRegion.prototype.move = function(distance, isProportion, species) {
	// isProportion means whether move by proportion
	// may clip distance to what we have
	if(isProportion) {
		distance *= this.getLength();
	}
	distance = parseInt(distance + 0.5);
	if(distance + this.start < ChrRegion.CHROM_BASE) {
		distance = ChrRegion.CHROM_BASE - this.start;
	} else if(species && species.chromInfo && species.chromInfo[this.chr] &&
			 species.chromInfo[this.chr].chrRegion.end < this.end + distance) {
				 distance = species.chromInfo[this.chr].chrRegion.end - this.end;
	}
	this.start += distance;
	this.end += distance;
	return this;
};

ChrRegion.prototype.clone = function() {
	return new ChrRegion(null, this.name, this.chr, this.start, this.end, this.strand);
};

ChrRegion.prototype.getShift = function(distance, isProportion, species) {
	return this.clone().move(distance, isProportion, species);
};

ChrRegion.prototype.extend = function(sizediff, center, isProportion, species) {
	// isProportion means whether extend by proportion
	if(!sizediff) {
		return this;
	}
	if(isProportion) {
		sizediff *= this.getLength();
	}
	sizediff = parseInt(sizediff + 0.5);
	var newsize = this.getLength() + sizediff;
	center = center || (this.start + this.end) / 2;
	if(center < this.start) {
		center = this.start;
	} else if(center > this.end) {
		center = this.end;
	}
	if(newsize <= 0) {
		newsize = 1;
	} else if(species && species.chromInfo && species.chromInfo[this.chr] &&
			 species.chromInfo[this.chr].chrRegion.getLength() < newsize) {
				 newsize = species.chromInfo[this.chr].chrRegion.getLength();
	}
	if(center > this.start) {
		// extend left
		this.start -= parseInt(sizediff * (center - this.start) / this.getLength() + 0.5);
		if(this.start < ChrRegion.CHROM_BASE) {
			this.start = ChrRegion.CHROM_BASE;
		}
		this.end = this.start + newsize;
	} else {
		this.end += sizediff;
	}
	if(species && species.chromInfo && species.chromInfo[this.chr] &&
		 species.chromInfo[this.chr].chrRegion.end < this.end) {
			 this.end = species.chromInfo[this.chr].chrRegion.end;
			 this.start = this.end - newsize;
	}
	return this;
		
};

ChrRegion.prototype.getExtension = function(sizediff, center, isProportion, species) {
	return this.clone().extend(sizediff, center, isProportion, species);
};

function compareChrRegion(region1, region2) {
	return ((region1.chr === region2.chr)? 
				((region1.start === region2.start)?
					((region1.end === region2.end)? 0: ((region1.end > region2.end)? 1: -1)
				): ((region1.start > region2.start)? 1: -1)
			): ((region1.chr > region2.chr)? 1: -1)); // region1.chr !== region2.chr
}

function SpcRegionArray(spcregion) {
	this.activeRegion = spcregion;
	this.array = [];
	this.map = {};
	if (spcregion) {
		this.array.push(spcregion);
		if (spcregion.name) {
			this.map[spcregion.name] = spcregion;
		}
	}
}

SpcRegionArray.prototype.getName = function () {
	return this.activeRegion.name;
};

SpcRegionArray.prototype.getRegion = function (index) {
	if (typeof index == 'number') {
		return this.array[index];
	}
	return this.map[index];
};

SpcRegionArray.prototype.getActiveRegion = function () {
	return this.activeRegion;
};

SpcRegionArray.prototype.setActiveRegion = function (index) {
	if (typeof index == 'number') {
		this.activeRegion = this.array[index];
	} else {
		this.activeRegion = this.map[index];
	}
};

SpcRegionArray.prototype.addGene = function (spcregion) {
	this.array.push(spcregion);
	if (spcregion.name) {
		this.map[spcregion.name] = spcregion;
	}
	if (!this.activeRegion) {
		this.setActiveRegion(0);
	}
};

SpcRegionArray.prototype.getLength = function () {
	return this.array.length;
};


function Region(commonname) {
	this.name = commonname;
	this.spcRegions = new Object();
	// this should be an object, 'db' => spcRegionArray 
}

Region.prototype.getSpcRegionLength = function(db) {
	return this.spcRegions[db].getLength();
};

Region.prototype.getSpcRegion = function(db, index) {
	return this.spcRegions[db].getRegion(index);
};

Region.prototype.getSpcActiveRegion = function(db) {
	return this.spcRegions[db].getActiveRegion();
};

Region.prototype.setSpcActiveRegion = function(db, index) {
	return this.spcRegions[db].setActiveRegion(index);
};

Region.prototype.pushSpcRegion = function(db, spcregion) {
	if(!this.spcRegions[db]) {
		this.spcRegions[db] = new SpcRegionArray(spcregion);
	} else {
		this.spcRegions[db].addGene(spcregion);
	}
};

Region.prototype.getCleanName = function() {
	// clean the gene name of weird characters such as '.'
	return this.name.replace(/\./g, "\\.").replace(/ /g, "_");
};
