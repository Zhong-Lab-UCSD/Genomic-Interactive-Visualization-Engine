#!/bin/bash

source ../includes/constants.py

for ref in "$@"; do
	mkdir -p ${ref}
	cd ${ref}
	wget ftp://hgdownload.cse.ucsc.edu/goldenPath/${ref}/database/knownGene.sql
	wget ftp://hgdownload.cse.ucsc.edu/goldenPath/${ref}/database/knownGene.txt.gz
	wget ftp://hgdownload.cse.ucsc.edu/goldenPath/${ref}/database/kgXref.sql
	wget ftp://hgdownload.cse.ucsc.edu/goldenPath/${ref}/database/kgXref.txt.gz
	mysql ${ref} -u${_CPB_EDIT_USER} -p${_CPB_EDIT_PASS} < knownGene.sql
	zcat knownGene.txt.gz | mysql ${ref} -u${_CPB_EDIT_USER} -p${_CPB_EDIT_PASS} -e 'LOAD DATA LOCAL INFILE "/dev/stdin" INTO TABLE knownGene;'
	mysql ${ref} -u${_CPB_EDIT_USER} -p${_CPB_EDIT_PASS} < kgXref.sql
	zcat kgXref.txt.gz | mysql ${ref} -u${_CPB_EDIT_USER} -p${_CPB_EDIT_PASS} -e 'LOAD DATA LOCAL INFILE "/dev/stdin" INTO TABLE kgXref;'

	cd ..
	rm -r ${ref}
done

