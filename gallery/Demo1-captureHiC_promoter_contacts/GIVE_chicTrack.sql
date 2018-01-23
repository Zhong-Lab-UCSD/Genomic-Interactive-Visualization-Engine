INSERT INTO `hg19`.`grp` VALUES (
  'CHi-C_promoter',
  'Long Range Promoter Contacts',
  5,
  0,
  0
);

CREATE TABLE `hg19`.`TS5_CD34_promoter-other` (
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


LOAD DATA LOCAL INFILE "./give_x_TS5_CD34_promoter-other_significant_interactions.txt.bed" INTO TABLE `hg19`.`TS5_CD34_promoter-other`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'TS5_CD34_promoter-other',             -- Track table name
  'interaction',                -- Track type: interaction
  4,
  NULL,
  NULL,
  'CHi-C_promoter',               -- Group name, should be the same as grp.name
  '{
    "group":"CHi-C_promoter",
    "longLabel":"TS5_CD34_promoter-other",
    "priority":4,
    "shortLabel":"TS5_CD34_promoter-other",
    "track":"TS5_CD34_promoter-other",
    "type":"interaction",
    "thresholdPercentile": [
        4, 
        4.7, 5.4,
        6,1, 6.8,
        7.5, 8.2,
        8.9, 9.6,
        10.3, 11,
        11.7, 12.4,
        13.1, 13.8,
        14.5, 15.2,
        15.9, 16.6,
        17.3, 18    
    ],
    "visibility":"full"
  }'
);

CREATE TABLE `hg19`.`TS5_CD34_promoter-promoter` (
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


LOAD DATA LOCAL INFILE "./TS5_CD34_promoter-promoter_significant_interactions.txt.bed" INTO TABLE `hg19`.`TS5_CD34_promoter-promoter`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'TS5_CD34_promoter-promoter',             -- Track table name
  'interaction',                -- Track type: interaction
  3,
  NULL,
  NULL,
  'CHi-C_promoter',               -- Group name, should be the same as grp.name
  '{
    "group":"CHi-C_promoter",
    "longLabel":"TS5_CD34_promoter-promoter",
    "priority":3,
    "shortLabel":"TS5_CD34_promoter-promoter",
    "track":"TS5_CD34_promoter-promoter",
    "type":"interaction",
    "thresholdPercentile": [
        4, 
        4.7, 5.4,
        6,1, 6.8,
        7.5, 8.2,
        8.9, 9.6,
        10.3, 11,
        11.7, 12.4,
        13.1, 13.8,
        14.5, 15.2,
        15.9, 16.6,
        17.3, 18    
    ],
    "visibility":"full"
  }'
);

CREATE TABLE `hg19`.`TS5_GM12878_promoter-other` (
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


LOAD DATA LOCAL INFILE "./TS5_GM12878_promoter-other_significant_interactions.txt.bed" INTO TABLE `hg19`.`TS5_GM12878_promoter-other`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'TS5_GM12878_promoter-other',             -- Track table name
  'interaction',                -- Track type: interaction
  2,
  NULL,
  NULL,
  'CHi-C_promoter',               -- Group name, should be the same as grp.name
  '{
    "group":"CHi-C_promoter",
    "longLabel":"TS5_GM12878_promoter-other",
    "priority":2,
    "shortLabel":"TS5_GM12878_promoter-other",
    "track":"TS5_GM12878_promoter-other",
    "type":"interaction",
    "thresholdPercentile": [
        4, 
        4.7, 5.4,
        6,1, 6.8,
        7.5, 8.2,
        8.9, 9.6,
        10.3, 11,
        11.7, 12.4,
        13.1, 13.8,
        14.5, 15.2,
        15.9, 16.6,
        17.3, 18    
    
    ],
    "visibility":"full"
  }'
);

CREATE TABLE `hg19`.`TS5_GM12878_promoter-promoter` (
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


LOAD DATA LOCAL INFILE "./TS5_GM12878_promoter-promoter_significant_interactions.txt.bed" INTO TABLE `hg19`.`TS5_GM12878_promoter-promoter`;


INSERT INTO `hg19`.`trackDb` VALUES (
  'TS5_GM12878_promoter-promoter',             -- Track table name
  'interaction',                -- Track type: interaction
  1,
  NULL,
  NULL,
  'CHi-C_promoter',               -- Group name, should be the same as grp.name
  '{
    "group":"CHi-C_promoter",
    "longLabel":"TS5_GM12878_promoter-promoter",
    "priority":1,
    "shortLabel":"TS5_GM12878_promoter-promoter",
    "track":"TS5_GM12878_promoter-promoter",
    "type":"interaction",
     "thresholdPercentile": [
        4, 
        4.7, 5.4,
        6,1, 6.8,
        7.5, 8.2,
        8.9, 9.6,
        10.3, 11,
        11.7, 12.4,
        13.1, 13.8,
        14.5, 15.2,
        15.9, 16.6,
        17.3, 18    
 
    ],
    "visibility":"full"
  }'
);
