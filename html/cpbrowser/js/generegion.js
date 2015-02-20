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


function ChrRegion(chrString, regionname, chrom, regionstart, regionend, regionstrand) {
	var cleanedChrString, elements; 
	if(chrString) {
		cleanedChrString = chrString.replace(/,/g, '')
			.replace(/\(\s*-\s*\)/g, ' NEGSTR').replace(/\(\s*\+\s*\)/g, ' POSSTR');
		elements = cleanedChrString.split(/[:\s-]+/);
		this.chr = elements[0];
		this.start = parseInt(elements[1]);
		this.end = parseInt(elements[2]);
		this.strand = ((elements.length < 3)? null: ((elements[3] == 'NEGSTR')? false: true));
	} else {
		this.chr = chrom;
		this.start = parseInt(regionstart);
		this.end = parseInt(regionend);
		this.strand = this.setStrand(regionstrand);
	}
	this.name = regionname || '';
}

ChrRegion.prototype.regionFromString = function(regionString) {
	var cleanedChrString = regionString.replace(/,/g, '')
		.replace(/\(\s*-\s*\)/g, ' NEGSTR').replace(/\(\s*\+\s*\)/g, ' POSSTR');
	var elements = cleanedChrString.split(/[:\s-]+/);
	this.chr = elements[0];
	this.start = parseInt(elements[1]);
	this.end = parseInt(elements[2]);
	this.strand = ((elements.length < 4)? this.strand: ((elements[3] == 'NEGSTR')? false: true));
};

ChrRegion.prototype.getLength = function() {
	return this.end - this.start;
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
	return ((typeof(flankbefore) == "string")? flankbefore: '')
		+ (this.strand? '+': '&minus;')
		+ ((typeof(flankafter) == "string")? flankafter: '');
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

function SpcRegionArray(spcregion) {
	this.activeRegion = spcregion;
	this.array = new Array();
	this.map = new Object();
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
	return this.name.replace(/\./g, "\\.");
};
