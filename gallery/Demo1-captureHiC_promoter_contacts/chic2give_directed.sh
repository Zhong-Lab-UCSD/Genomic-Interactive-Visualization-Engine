#!/bin/bash
if [ $# != 2  ]; then
    echo -e "Need 2 arguments:\n (1) an interaction file\n (2) output dir"
    exit 1
fi
name=`basename $1`;
echo "$2/give_x_$name.bed"
cat $1 |
awk 'BEGIN{FS="\t";OFS="\t"}
    NR>1{
        print 2*(NR-2)+1,$1,$2,$3,NR-1,$NF,0;
        print 2*(NR-2)+2,$7,$8,$9,NR-1,$NF,1;
        }' >"$2/give_x_$name.bed"
