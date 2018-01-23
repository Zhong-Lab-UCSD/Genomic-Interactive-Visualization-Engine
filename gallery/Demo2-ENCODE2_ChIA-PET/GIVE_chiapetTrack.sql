INSERT INTO `hg19`.`grp` VALUES ( 
  'ENCODE2_ChIA-PET',
  'ChIA-PET (ENCODE PHASE 2)',
  5,
  0,
  0
);

CREATE TABLE `hg19`.`ENCFF001THT` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001THT.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001THT`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001THT',             -- Track table name
  'interaction',                -- Track type: interaction
  14,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"POLR2A ChIA-PET HCT-116",
    "priority":14,
    "longLabel":"ENCSR000BZX:ENCFF001THT",
    "track":"ENCFF001THT",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001THU` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001THU.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001THU`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001THU',             -- Track table name
  'interaction',                -- Track type: interaction
  13,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"POLR2A ChIA-PET HeLa-S3",
    "priority":13,
    "longLabel":"ENCSR000BZW:ENCFF001THU",
    "track":"ENCFF001THU",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001THV` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001THV.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001THV`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001THV',             -- Track table name
  'interaction',                -- Track type: interaction
  3,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"CTCF ChIA-PET K562",
    "priority":3,
    "longLabel":"ENCSR000CAC:ENCFF001THV",
    "track":"ENCFF001THV",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001THW` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001THW.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001THW`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001THW',             -- Track table name
  'interaction',                -- Track type: interaction
  1,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"POLR2A ChIA-PET K562",
    "priority":1,
    "longLabel":"ENCSR000BZY:ENCFF001THW",
    "track":"ENCFF001THW",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"full"
  }'
);

CREATE TABLE `hg19`.`ENCFF001THX` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001THX.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001THX`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001THX',             -- Track table name
  'interaction',                -- Track type: interaction
  8,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"CTCF ChIA-PET MCF-7",
    "priority":8,
    "longLabel":"ENCSR000CAD:ENCFF001THX",
    "track":"ENCFF001THX",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001THY` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001THY.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001THY`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001THY',             -- Track table name
  'interaction',                -- Track type: interaction
  9,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"CTCF ChIA-PET MCF-7",
    "priority":9,
    "longLabel":"ENCSR000CAD:ENCFF001THY",
    "track":"ENCFF001THY",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001THZ` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001THZ.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001THZ`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001THZ',             -- Track table name
  'interaction',                -- Track type: interaction
  10,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"ESR1 ChIA-PET MCF-7",
    "priority":10,
    "longLabel":"ENCSR000BZZ:ENCFF001THZ",
    "track":"ENCFF001THZ",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001TIA` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001TIA.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001TIA`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001TIA',             -- Track table name
  'interaction',                -- Track type: interaction
  11,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"ESR1 ChIA-PET MCF-7",
    "priority":11,
    "longLabel":"ENCSR000BZZ:ENCFF001TIA",
    "track":"ENCFF001TIA",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001TIB` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001TIB.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001TIB`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001TIB',             -- Track table name
  'interaction',                -- Track type: interaction
  12,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"ESR1 ChIA-PET MCF-7",
    "priority":12,
    "longLabel":"ENCSR000BZZ:ENCFF001TIB",
    "track":"ENCFF001TIB",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001TIC` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001TIC.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001TIC`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001TIC',             -- Track table name
  'interaction',                -- Track type: interaction
  2,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"POLR2A ChIA-PET K562",
    "priority":2,
    "longLabel":"ENCSR000BZY:ENCFF001TIC",
    "track":"ENCFF001TIC",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001TID` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001TID.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001TID`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001TID',             -- Track table name
  'interaction',                -- Track type: interaction
  4,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"POLR2A ChIA-PET MCF-7",
    "priority":4,
    "longLabel":"ENCSR000CAA:ENCFF001TID",
    "track":"ENCFF001TID",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001TIE` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001TIE.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001TIE`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001TIE',             -- Track table name
  'interaction',                -- Track type: interaction
  5,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"POLR2A ChIA-PET MCF-7",
    "priority":5,
    "longLabel":"ENCSR000CAA:ENCFF001TIE",
    "track":"ENCFF001TIE",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001TIF` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001TIF.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001TIF`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001TIF',             -- Track table name
  'interaction',                -- Track type: interaction
  6,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"POLR2A ChIA-PET MCF-7",
    "priority":6,
    "longLabel":"ENCSR000CAA:ENCFF001TIF",
    "track":"ENCFF001TIF",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"full"
  }'
);

CREATE TABLE `hg19`.`ENCFF001TIG` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001TIG.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001TIG`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001TIG',             -- Track table name
  'interaction',                -- Track type: interaction
  15,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"POLR2A ChIA-PET NB4",
    "priority":15,
    "longLabel":"ENCSR000CAB:ENCFF001TIG",
    "track":"ENCFF001TIG",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);

CREATE TABLE `hg19`.`ENCFF001TIJ` ( 
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);


LOAD DATA LOCAL INFILE "./give_x_ENCFF001TIJ.bed.gz.bed" INTO TABLE `hg19`.`ENCFF001TIJ`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'ENCFF001TIJ',             -- Track table name
  'interaction',                -- Track type: interaction
  7,
  NULL,
  NULL,
  'ENCODE2_ChIA-PET',               -- Group name, should be the same as grp.name
  '{
    "group":"ENCODE2_ChIA-PET",
    "shortLabel":"POLR2A ChIA-PET MCF-7",
    "priority":7,
    "longLabel":"ENCSR000CAA:ENCFF001TIJ",
    "track":"ENCFF001TIJ",
    "type":"interaction",
    "thresholdPercentile": [
      10, 
      60, 110,
      160, 210, 
      260, 310,
      360, 410,
      460, 510,
      560, 610,
      660, 710,
      760, 810,
      860, 910,
      960, 1010 
    ],
    "visibility":"hide"
  }'
);
