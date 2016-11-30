var GIVe = (function(give) {
	'use strict';

	give.ChromRegion = function(mainParams, species, additionalParams) {
		// usage: new ChromRegionObject(mainParam, species, additionalParam)
		//		mainParam:
		//			either use a string like 'chr1:12345-56789'
		//			or an object with chr, start, end, and strand or other essential props
		//		species:
		//			used for clipping the region, null if no-clipping needed
		//		additionalParam:
		//			some other parameters that may slip into the object

		try{
			if(typeof mainParams === 'string') {
				this.regionFromString(mainParams);
			} else if(typeof mainParams === 'object') {
				this.regionFromObject(mainParams);
			}
			this.clipRegion(species);
			var key;
			if(typeof mainParams === 'object') {
				for(key in mainParams) {
					if(!this.hasOwnProperty(key) && mainParams.hasOwnProperty(key)) {
						try {
							this[key] = mainParams[key];
						} catch(e) {
							if(give.verboseLvl >= give.VERBOSE_WARNING) {
								console.log(e.message);
								console.log(e.stack);
							}
						}
					}
				}
			}
			if(typeof additionalParams === 'object') {
				for(key in additionalParams) {
					if(!this.hasOwnProperty(key) && additionalParams.hasOwnProperty(key)) {
						try {
							this[key] = additionalParams[key];
						} catch(e) {
							if(give.verboseLvl >= give.VERBOSE_WARNING) {
								console.log(e.message);
								console.log(e.stack);
							}
						}
					}
				}
			}
		} catch(e) {
			console.log(e.message + '\nThrown when creating chromosomal regions with:');
			console.log(mainParams);
			console.log(e.stack);
			throw(e);
		}
	};

	give.ChromRegion.prototype.clipRegion = function(species) {
		if(this.start < give.ChromRegion.CHROM_BASE) {
			this.start = give.ChromRegion.CHROM_BASE;
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
		return this;
	};		

	give.ChromRegion.prototype.getLength = function() {
		return this.end - this.start;
	};

	give.ChromRegion.prototype.getStart = function() {
		return {chr: this.chr, coor: this.start};
	};

	give.ChromRegion.prototype.getEnd = function() {
		return {chr: this.chr, coor: this.end};
	};

	give.ChromRegion.prototype.regionFromString = function(regionString) {
		var cleanedChrString = regionString.replace(/,/g, '')
			.replace(/\(\s*-\s*\)/g, ' NEGSTR').replace(/\(\s*\+\s*\)/g, ' POSSTR');
		var elements = cleanedChrString.split(/[:\s-]+/);
		this.chr = elements[0];
		this.start = parseInt(elements[1]);
		this.end = parseInt(elements[2]);
		this.setStrand((elements.length < 4)? this.strand: ((elements[3] === 'NEGSTR')? false: true));
	};

	give.ChromRegion.prototype.regionFromObject = function(regionObject) {
		this.chr = regionObject.chr;
		this.start = parseInt(regionObject.start);
		this.end = parseInt(regionObject.end);
		this.setStrand(regionObject.strand);
		this.name = regionObject.regionname || regionObject.name || '';
	};

	give.ChromRegion.prototype.regionToString = function(includeStrand) {
		// default is including strand
		return this.chr + ':' + this.start + '-' + this.end +
			((includeStrand === false || this.strand === null)? '':
			 (' (' + (this.strand? '+': '-') + ')'));
	};

	give.ChromRegion.prototype.regionToBED = function(includeStrand) {
		return this.chr + '\t' + this.start + '\t' + this.end + '\t' + (this.name? this.name: '.') + 
				(includeStrand !== false? '\t0\t' + (!this.strand? '-': '+'): '');
	};

	give.ChromRegion.prototype.toString = function() {
		// default is including strand
		return this.regionToString(true);
	};

	give.ChromRegion.prototype.setStrand = function(newStr) {
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
				this.strand = (newStr === null? null: (newStr? true: false));
		}
		return this.strand;
	};

	give.ChromRegion.prototype.getStrand = function(flankbefore, flankafter) {
		return (typeof(this.strand) === 'boolean')?
			(((typeof(flankbefore) === "string")? flankbefore: '') +
			(this.strand? '+': '-')	+ 
			((typeof(flankafter) === "string")? flankafter: '')): null;
	};

	give.ChromRegion.prototype.getShortName = function() {
		if(this.name && this.name.length > give.ChromRegion.REGION_SHORTNAME_LIMIT) {
			return this.name.substr(0, give.ChromRegion.REGION_SHORTNAME_PREFIX_LENGTH) +
				"..." + 
				this.name.substr(this.name.length - give.ChromRegion.REGION_SHORTNAME_SUFFIX_LENGTH);
		} else {
			return this.name;
		}
	};

	give.ChromRegion.prototype.overlaps = function(region, strandSpecific) {
		// this will return the length of overlaps, if not overlapping, return 0
		// if strandSpecific is specified, then overlap will be 0 if both strands exist and do not match
		if(this.chr !== region.chr || 
		   (strandSpecific && 
			(this.strand !== null && region.strand !== null) &&
			this.strand !== region.strand)) {
			return 0;
		}
		if(this.start > region.end || this.end < region.start) {
			return 0;
		}
		return Math.min(this.end, region.end) - Math.max(this.start, region.start);
	};

	give.ChromRegion.prototype.assimilate = function(region, strandSpecific) {
		if(!this.overlaps(region, strandSpecific)) {
			return null;
		}
		this.start = parseInt(Math.min(this.start, region.start));
		this.end = parseInt(Math.max(this.end, region.end));
		return this;
	};

	give.ChromRegion.prototype.intersect = function(region, strandSpecific) {
		if(!this.overlaps(region, strandSpecific)) {
			return null;
		}
		this.start = parseInt(Math.max(this.start, region.start));
		this.end = parseInt(Math.min(this.end, region.end));
		return this;
	};

	give.ChromRegion.prototype.move = function(distance, isProportion, species) {
		// isProportion means whether move by proportion
		// may clip distance to what we have
		if(isProportion) {
			distance *= this.getLength();
		}
		distance = parseInt(distance + 0.5);
		if(distance + this.start < give.ChromRegion.CHROM_BASE) {
			distance = give.ChromRegion.CHROM_BASE - this.start;
		} else if(species && species.chromInfo && species.chromInfo[this.chr] &&
				 species.chromInfo[this.chr].chrRegion.end < this.end + distance) {
					 distance = species.chromInfo[this.chr].chrRegion.end - this.end;
		}
		this.start = this.start + distance;
		this.end = this.end + distance;
		return this;
	};

	give.ChromRegion.prototype.clone = function() {
		return new this.constructor(this);
	};

	give.ChromRegion.prototype.getShift = function(distance, isProportion, species) {
		return this.clone().move(distance, isProportion, species);
	};

	give.ChromRegion.prototype.extend = function(sizediff, center, isProportion, species) {
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
			this.start = this.start - parseInt(sizediff * (center - this.start) / this.getLength() + 0.5);
			if(this.start < give.ChromRegion.CHROM_BASE) {
				this.start = give.ChromRegion.CHROM_BASE;
			}
			this.end = this.start + newsize;
		} else {
			this.end = this.end + sizediff;
		}
		if(species && species.chromInfo && species.chromInfo[this.chr] &&
			 species.chromInfo[this.chr].chrRegion.end < this.end) {
				 this.end = species.chromInfo[this.chr].chrRegion.end;
				 this.start = this.end - newsize;
		}
		return this;

	};

	give.ChromRegion.prototype.getExtension = function(sizediff, center, isProportion, species) {
		return this.clone().extend(sizediff, center, isProportion, species);
	};

	give.ChromRegion.REGION_SHORTNAME_LIMIT = 11;
	give.ChromRegion.REGION_SHORTNAME_PREFIX_LENGTH = 6;
	give.ChromRegion.REGION_SHORTNAME_SUFFIX_LENGTH = 4;
	give.ChromRegion.CHROM_BASE = 1;			// may be 0 for UCSC

	give.ChromRegion.clipCoordinate = function(coor, species) {
		// this is to clip single coordinate
		if(coor.coor < give.ChromRegion.CHROM_BASE) {
			coor.coor = give.ChromRegion.CHROM_BASE;
		} else if(species && species.chromInfo && species.chromInfo[coor.chr] &&
				 species.chromInfo[coor.chr].chrRegion.end < coor.coor) {
					 coor.coor = species.chromInfo[coor.chr].chrRegion.end;
		}
		return coor;
	};

	give.ChromRegion.compareChrRegion = function(region1, region2) {
		return ((region1.chr === region2.chr)? 
					((region1.start === region2.start)?
						((region1.end === region2.end)? 0: ((region1.end > region2.end)? 1: -1)
					): ((region1.start > region2.start)? 1: -1)
				): ((region1.chr > region2.chr)? 1: -1)); // region1.chr !== region2.chr
	};

	return give;

})(GIVe || {});
