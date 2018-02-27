#!/bin/bash
if [ $# != 2  ]; then
    echo -e "Need 2 arguments:\n (1) a chiapet interaction file\n (2) output dir"
    exit 1
fi
name=`basename $1`;
echo "$2/give_x_$name.bed"
zcat $1 |
    awk 'BEGIN{OFS="\t";n=0}{
        split($4,a,",");
        if(a[1] in b){}
        else{
            split(a[1],c,/[:\-\\\.]/);
            n+=1;
        print c[1],c[2],c[4],c[5],c[6],c[8],$5;
            b[a[1]]
        }}' |
    awk 'BEGIN{FS="\t";OFS="\t"}{
        print 2*(NR-1)+1,$1,$2,$3,NR,$7,-1;
        print 2*(NR-1)+2,$4,$5,$6,NR,$7,-1;
    }'  >"$2/give_x_$name.bed"
