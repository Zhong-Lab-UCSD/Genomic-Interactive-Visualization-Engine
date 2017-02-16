var GIVe = (function (give) {
	'use strict';

	give.viewHandler = function viewHandler(dataView, isLittleEndian) {
		this.dataView = dataView;
		this.isLittleEndian = isLittleEndian;
		this.index = 0;
	};

	give.viewHandler.prototype.getInt8 = function () {
		this.index += 1;
		return this.dataView.getUint8(this.index - 1, this.isLittleEndian);
	};

	give.viewHandler.prototype.getInt16 = function () {
		this.index += 2;
		return this.dataView.getUint16(this.index - 2, this.isLittleEndian);
	};

	give.viewHandler.prototype.getInt32 = function () {
		this.index += 4;
		return this.dataView.getUint32(this.index - 4, this.isLittleEndian);
	};

	give.viewHandler.prototype.getInt64 = function () {
		this.index += 8;
		return this.dataView.getUint32(this.index - (this.isLittleEndian ? 8 : 4), this.isLittleEndian);
	};

	give.viewHandler.prototype.getFloat = function () {
		this.index += 4;
		return this.dataView.getFloat32(this.index - 4, this.isLittleEndian);
	};

	give.viewHandler.prototype.getDouble = function () {
		this.index += 8;
		return this.dataView.getFloat64(this.index - 8, this.isLittleEndian);
	};

	give.viewHandler.prototype.getString = function (bytes) {
		var result = '';
		for (var i = 0; i < bytes; i++) {
			var value = this.getInt8(this.index);
			if (value !== 0) {
				var letter = String.fromCharCode(value);
				//if(letter.charCodeAt)
				result += letter;
			}
		}
		return result;
	};

	give.viewHandler.prototype.setIndex = function (offset) {
		this.index = offset;
	};

	give.viewHandler.prototype.moveIndex = function (relative) {
		this.index += relative;
	};

	give.BigWigFile = function(arrayBuffer) {
		this.pointCount = 0;
		this.text = new DataView(arrayBuffer);
		this.masterView = new give.viewHandler(this.text, false);
		console.log(this.text.byteLength);
		this.bigWigHeader = {};
		this.summaryHeader = {};
		this.chromTreeHeader = {};
		this.unzoomedIndexHeader = {};
		this.zoomedSummaryData = [];
		this.isLittleEndian = false;
		//this.index = 0;
		this.dataPoints = [];
		this.zoomLevelHeaders = [];
		this.zoomedIndexHeaders = [];
		this.zoomedIndexHeaders.size = 0;
		//this.zoom
		this.chromTreeNodeChildren = [];
	};

	give.BigWigFile.prototype.readAll = function () {
		var readSection = false;
		this.readBigWigHeader();
		for (var i = 0; i < this.bigWigHeader.zoomLevel; i++) {
			this.readZoomLevelHeader(readSection);

		}
		this.masterView.setIndex(this.bigWigHeader.totalSummaryOffset);
		this.readSummaryHeader();
		this.masterView.setIndex(this.bigWigHeader.chromTreeOffset);
		this.readChromTreeHeader();
		this.readChromTreeNode();
		for (var k = 0; k < this.zoomedIndexHeaders.size; k++) {
			this.masterView.setIndex(this.zoomLevelHeaders[k].indexOffset);
			var reduction = this.zoomLevelHeaders[k].reductionLevel;
			this.readZoomedIndexHeader(reduction);
			//for(var j=0;j<this.zoomedIndexHeaders[reduction].itemCount;j++){
			this.readZoomedIndexNode(readSection, reduction); //}
		}



		this.masterView.setIndex(this.bigWigHeader.unzoomedIndexOffset);
		this.readUnzoomedIndexHeader();
		this.readUnzoomedIndexNode(readSection); //also, remove readSection if everytime is a read section anyways
	};

	give.BigWigFile.prototype.readSection = function (chromNumber, startBase, endBase) {
		var readSection = true;
		this.readBigWigHeader();
		this.chromNumber = chromNumber;
		this.startBase = startBase;
		this.endBase = endBase;
		for (var i = 0; i < this.bigWigHeader.zoomLevel; i++) {
			this.readZoomLevelHeader(readSection);

		}
		this.masterView.setIndex(this.bigWigHeader.totalSummaryOffset);
		this.readSummaryHeader();
		this.masterView.setIndex(this.bigWigHeader.chromTreeOffset);
		this.readChromTreeHeader();
		this.readChromTreeNode();
		for (var k = 0; k < this.zoomedIndexHeaders.size; k++) {
			this.masterView.setIndex(this.zoomLevelHeaders[k].indexOffset);
			var reduction = this.zoomLevelHeaders[k].reductionLevel;
			this.readZoomedIndexHeader(reduction);
			//for(var j=0;j<this.zoomedIndexHeaders[reduction].itemCount;j++){
			this.readZoomedIndexNode(readSection, reduction); //}
		}



		this.masterView.setIndex(this.bigWigHeader.unzoomedIndexOffset);
		this.readUnzoomedIndexHeader();
		this.readUnzoomedIndexNode(readSection); //also, remove readSection if everytime is a read section anyways
	};



	give.BigWigFile.prototype.readBigWigHeader = function () {
		var magicNumber = this.masterView.getInt32();
		this.masterView.isLittleEndian = (magicNumber !== 0x888FFC26) ? true : false;
		this.bigWigHeader.version = this.masterView.getInt16();
		this.bigWigHeader.zoomLevel = this.masterView.getInt16();
		this.bigWigHeader.chromTreeOffset = this.masterView.getInt64();
		this.bigWigHeader.unzoomedDataOffset = this.masterView.getInt64();
		this.bigWigHeader.unzoomedIndexOffset = this.masterView.getInt64();
		this.bigWigHeader.fieldCount = this.masterView.getInt16();

		this.bigWigHeader.definedFieldCount = this.masterView.getInt16();
		this.bigWigHeader.asOffset = this.masterView.getInt64();
		this.bigWigHeader.totalSummaryOffset = this.masterView.getInt64();
		this.bigWigHeader.uncompressBufferSize = this.masterView.getInt32();
		//this.bigWigHeader.reserved = this.masterView.getInt64();
		this.masterView.moveIndex(8);

	};

	give.BigWigFile.prototype.readZoomLevelHeader = function (readSection) {
		var reductionLevel = this.masterView.getInt32();
		var reserved = this.masterView.getInt32();
		var dataOffset = this.masterView.getInt64();
		var indexOffset = this.masterView.getInt64();
		this.zoomLevelHeaders.push(new give.zoomLevelHeader(reductionLevel, reserved, dataOffset, indexOffset));
		this.zoomedIndexHeaders[reductionLevel] = {};
		this.zoomedSummaryData[reductionLevel] = [];
		this.zoomedIndexHeaders.size += 1; //there must be a better wat

	};
	give.BigWigFile.prototype.readSummaryHeader = function () {
		this.summaryHeader.validCount = this.masterView.getInt64();
		this.summaryHeader.minimumValue = this.masterView.getDouble();
		this.summaryHeader.maximumValue = this.masterView.getDouble();
		this.summaryHeader.sumOfData = this.masterView.getDouble();
		this.summaryHeader.sumOfSquareOfData = this.masterView.getDouble();
	};
	give.BigWigFile.prototype.readChromTreeHeader = function () {
		this.chromTreeHeader.magicNumber = this.masterView.getInt32();
		this.chromTreeHeader.blockSize = this.masterView.getInt32();
		this.chromTreeHeader.keySize = this.masterView.getInt32();
		this.chromTreeHeader.valueSize = this.masterView.getInt32();
		this.chromTreeHeader.itemCount = this.masterView.getInt64(); //amounts of nodes after header
		this.chromTreeHeader.reserved = this.masterView.getInt64();
	};
	give.BigWigFile.prototype.readChromTreeNode = function () {
		var isLeaf = this.masterView.getInt8();
		var reserved = this.masterView.getInt8();
		var childCount = this.masterView.getInt16();
		for (var i = 0; i < childCount; i++) {
			if (isLeaf) this.readChromeTreeNodeChild();
			else this.readChromTreeNode();
		}
	};
	give.BigWigFile.prototype.readChromeTreeNodeChild = function () {
		var chromKey = this.masterView.getString(this.chromTreeHeader.keySize);
		var chromID = this.masterView.getInt32();
		var chromSize = this.masterView.getInt32();
		var chromNumber = this.chromKeyToNumber(chromKey);
		this.chromTreeNodeChildren.push(new give.chromTreeNodeChild(chromKey, chromID, chromSize, chromNumber));

		for (var i = 0; i < this.zoomedIndexHeaders.size; i++) {
			this.zoomedSummaryData[this.zoomLevelHeaders[i].reductionLevel][chromNumber] = [];
			this.dataPoints[chromNumber] = [];
			console.log(this.zoomLevelHeaders[i].reductionLevel + ' ' + chromNumber);
		}
	};
	give.BigWigFile.prototype.readUnzoomedIndexHeader = function () {
		this.unzoomedIndexHeader.magicNumber = this.masterView.getInt32();
		this.unzoomedIndexHeader.blockSize = this.masterView.getInt32();
		this.unzoomedIndexHeader.itemCount = this.masterView.getInt64();
		this.unzoomedIndexHeader.startChromID = this.masterView.getInt32();
		this.unzoomedIndexHeader.startBase = this.masterView.getInt32();
		this.unzoomedIndexHeader.endChromID = this.masterView.getInt32();
		this.unzoomedIndexHeader.endBase = this.masterView.getInt32();
		this.unzoomedIndexHeader.fileSize = this.masterView.getInt64();
		this.unzoomedIndexHeader.itemsPerSlot = this.masterView.getInt32();
		this.unzoomedIndexHeader.reserved = this.masterView.getInt32();
	};
	give.BigWigFile.prototype.readZoomedIndexHeader = function (reductionLevel) {
		this.zoomedIndexHeaders[reductionLevel].magicNumber = this.masterView.getInt32();
		this.zoomedIndexHeaders[reductionLevel].blockSize = this.masterView.getInt32();
		this.zoomedIndexHeaders[reductionLevel].itemCount = this.masterView.getInt64();
		this.zoomedIndexHeaders[reductionLevel].startChromID = this.masterView.getInt32();
		this.zoomedIndexHeaders[reductionLevel].startBase = this.masterView.getInt32();
		this.zoomedIndexHeaders[reductionLevel].endChromID = this.masterView.getInt32();
		this.zoomedIndexHeaders[reductionLevel].endBase = this.masterView.getInt32();
		this.zoomedIndexHeaders[reductionLevel].fileSize = this.masterView.getInt64();
		this.zoomedIndexHeaders[reductionLevel].itemsPerSlot = this.masterView.getInt32();
		this.zoomedIndexHeaders[reductionLevel].reserved = this.masterView.getInt32();
	};
	give.BigWigFile.prototype.readUnzoomedIndexNode = function (readSection) {
		var isLeaf = this.masterView.getInt8();
		var reserved = this.masterView.getInt8();
		var childCount = this.masterView.getInt16();
		//var oldIndex = this.index;
		for (var i = 0; i < childCount; i++) {
			this.readUnzoomedIndexNodeChild(isLeaf, readSection);


			//index=oldIndex;
		}

	};
	give.BigWigFile.prototype.readZoomedIndexNode = function (readSection, reductionLevel) {
		var isLeaf = this.masterView.getInt8();
		var reserved = this.masterView.getInt8();
		var childCount = this.masterView.getInt16();
		//var oldIndex = this.index;
		for (var i = 0; i < childCount; i++) {
			this.readZoomedIndexNodeChild(isLeaf, readSection, reductionLevel);


			//index=oldIndex;
		}

	};

	give.BigWigFile.prototype.readUnzoomedIndexNodeChild = function (isLeaf, readSection) {
		var startChromID = this.masterView.getInt32();
		var startBase = this.masterView.getInt32();
		var endChromID = this.masterView.getInt32();
		var endBase = this.masterView.getInt32();

		if (!readSection || (readSection && this.withinSection(startChromID, endChromID, startBase, endBase))) {
			var offset = this.masterView.getInt64();

			var oldIndex = this.masterView.index;
			if (isLeaf) {
				var size = this.masterView.getInt64();
				this.masterView.setIndex(offset);
				this.readDataBlockHeader(size);
				this.masterView.setIndex(oldIndex + 8);
			} else {
				this.masterView.setIndex(offset);
				this.readUnzoomedIndexNode(readSection);
				this.masterView.setIndex(oldIndex);
			}
		} else if (isLeaf) {
			this.masterView.moveIndex(16);
		} else this.masterView.moveIndex(8);
	};

	give.BigWigFile.prototype.readZoomedIndexNodeChild = function (isLeaf, readSection, reductionLevel) {
		var startChromID = this.masterView.getInt32();
		var startBase = this.masterView.getInt32();
		var endChromID = this.masterView.getInt32();
		var endBase = this.masterView.getInt32();

		if (!readSection || (readSection && this.withinSection(startChromID, endChromID, startBase, endBase))) {
			var offset = this.masterView.getInt64();

			var oldIndex = this.masterView.index;
			if (isLeaf) {
				var size = this.masterView.getInt64();
				this.masterView.setIndex(offset);
				this.readZoomedSummaryData(size, reductionLevel, endChromID);
				this.masterView.setIndex(oldIndex + 8);
			} else {
				this.masterView.setIndex(offset);
				this.readZoomedIndexNode(readSection, reductionLevel);
				this.masterView.setIndex(oldIndex);
			}
		} else if (isLeaf) {
			this.masterView.moveIndex(16);
		} else this.masterView.moveIndex(8);
	};

	give.BigWigFile.prototype.readDataBlockHeader = function (length) {
		var charData = [];
		for (var i = 0; i < length; i++) {
			charData.push(this.masterView.getInt8());
		}
		//var subIndex = 0;
		var unPacked = pako.inflate(charData);
		var dataView = new DataView(unPacked.buffer);
		//var arrayView = new DataView(unPacked.buffer);
		var arrayView = new give.viewHandler(dataView, this.masterView.isLittleEndian);


		var chromID = arrayView.getInt32();
		var chromNumber = this.chromIDToNumber(chromID);
		//console.log(chromNumber);
		if (!this.dataPoints.hasOwnProperty(chromNumber))

			this.dataPoints[chromNumber] = [];
		var startBase = arrayView.getInt32();
		var endBase = arrayView.getInt32();
		var itemStep = arrayView.getInt32();
		var itemSpan = arrayView.getInt32();
		var type = arrayView.getInt8();
		//var reserved = arrayView.getInt8();
		arrayView.moveIndex(1);
		var itemCount = arrayView.getInt16();
		for (var i = 0; i < itemCount; i++) {
			var start = 0;
			var end = 0;
			var value = 0;
			switch (type) {
				case 1:
					start = arrayView.getInt32();
					end = arrayView.getInt32();
					value = arrayView.getFloat();
					break;
				case 2:
					start = arrayView.getInt32();
					end = start + itemSpan;
					value = arrayView.getFloat();
					break;
				case 3:
					start = startBase + i * itemStep;
					end = start + itemSpan;
					value = arrayView.getFloat();
					break;
				default:
					console.log('error with data type.');
			}
			this.pointCount += 1;
			//console.log(value);
			this.dataPoints[chromNumber].push([start, end, value]);
		}
	};

	give.BigWigFile.prototype.readZoomedSummaryData = function (length, reductionLevel, endChromID) { //zlib compressed, there are multiplt ones
		var charData = [];
		for (var i = 0; i < length; i++) { //length=?
			charData.push(this.masterView.getInt8());
		}
		//var subIndex = 0;
		var unPacked = pako.inflate(charData);
		var dataView = new DataView(unPacked.buffer);
		//var arrayView = new DataView(unPacked.buffer);
		var arrayView = new give.viewHandler(dataView, this.masterView.isLittleEndian);
		var chromID = arrayView.getInt32();
		var chromNumber = this.chromIDToNumber(chromID); //
		var start = arrayView.getInt32();
		var end = arrayView.getInt32();
		var validCount = arrayView.getInt32();
		var minimumValue = arrayView.getFloat();
		var maximumValue = arrayView.getFloat();
		var sumOfData = arrayView.getFloat();
		var sumOfSquareOfData = arrayView.getFloat();
		this.zoomedSummaryData[reductionLevel][chromNumber].push(new give.zoomedSummaryData(chromID, endChromID, start, end, validCount, minimumValue, maximumValue, sumOfData, sumOfSquareOfData));
	};


	give.zoomLevelHeader = function(reductionLevel, reserved, dataOffset, indexOffset) {
		this.reductionLevel = reductionLevel;
		this.reserved = reserved;
		this.dataOffset = dataOffset;
		this.indexOffset = indexOffset;
	};

	give.chromTreeNodeChild = function(chromKey, chromID, chromSize, chromNumber) {
		this.chromKey = chromKey;
		this.chromID = chromID;
		this.chromSize = chromSize;
		this.chromNumber = chromNumber;
	};

	give.unzoomedIndexNodeChild = function(startChromID, startBase, endChromID, endBase, offset, size) {
		this.startChromID = startChromID;
		this.startBase = startBase;
		this.endChromID = endChromID;
		this.endBase = endBase;
		this.offset = offset;
		this.size = size;
	};

	give.zoomedSummaryData = function(chromID, endChromID, start, end, validCount, minimumValue, maximumValue, sumOfData, sumOfSquareOfData) {
		this.endChromID = endChromID;
		this.chromID = chromID;
		this.start = start;
		this.end = end;
		this.validCount = validCount;
		this.minimumValue = minimumValue;
		this.maximumValue = maximumValue;
		this.sumOfData = sumOfData;
		this.sumOfSquareOfData = sumOfSquareOfData;
	};
	give.BigWigFile.prototype.chromIDToNumber = function (chromID) {
		for (var i = 0; i < this.chromTreeNodeChildren.length; i++) {
			if (this.chromTreeNodeChildren[i].chromID == chromID) {
				return this.chromKeyToNumber(this.chromTreeNodeChildren[i].chromKey);
			}
		}
		// console.log(chromID);
		return null;
	};
	give.BigWigFile.prototype.chromKeyToNumber = function (chromKey) { //build dictionary when reading chrom tree node
		var chrom = chromKey.trim().substring(3);
		if (chrom === 'X') {
			return 24;
		} else if (chrom === 'Y') {
			return 25;
		} else {
			return parseInt(chrom);
		}

	};
	give.BigWigFile.prototype.withinSection = function (chrom1, chrom2, base1, base2) { //no support for datablocks with data for multiple chromosomes yet


		var chr1 = this.chromIDToNumber(chrom1);
		var chr2 = this.chromIDToNumber(chrom2);
		if (chr1 != chr2) console.log('multichrom data');
		if ((chr1 <= this.chromNumber) && (chr2 >= this.chromNumber)) {
			if ((base2 > this.startBase) && (this.endBase > base1)) {
				return true;
			}

		}

		return false;
	};

	return give;

})(GIVe || {});
