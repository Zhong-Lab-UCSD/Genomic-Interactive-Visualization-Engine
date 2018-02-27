#!/bin/bash
PROGNAME=$0

usage(){
    cat << EOF >&2 
    the script is used to convert .hic file to .bed file that needed in GIVE;
    There are 4 required parameters and 1 optional parameter for the command:
        1) straw file directory
        2) .hic file directory
        3) output file name (with directory if user wish to save the file desired path)
        4) bin size that user wants to extract the data from (please make sure the bin size you entered is contained in the hic file).
        5) Optional, chr name type flag, default value is "chr" which means that the chromosome names are "chr1", "chr2", "chrX" and so on. Only "chr" or "nochr" values are accepted. If you set "nochr", it means that the chromosome names in the .hic data are "1", "2", "X" and so on.
EOF
exit
}

straw_file_dir=$1
hic_file=$2
output_file=$3
binsize=$4
chrflag=$5

[  -z "$binsize" ] && echo "Error: Not enough parameters" && usage && exit 1

if [ -z "$chrflag" ]; then
    chr="chr"
else
    if [ "$chrflag" = "chr" ]; then
        chr="chr"
    else
        if [ "$chrflag" = "nochr" ]; then
            chr=""
        else
            echo "Error: Wrong value of chrflag parameter" && usage && exit 1
        fi
    fi
fi


if [ -f $output_file ]; then
    echo "File $output_file exists. Cannot overwrite it." && exit 1
fi

chr_list='1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 X Y'


for f in $chr_list; do
    f_chr="$chr$f"
    for s in $chr_list; do
        s_chr="$chr$s"
        echo "Extract interaction between:", $f_chr, $s_chr
        $straw_file_dir/straw KR $hic_file $f_chr $s_chr BP $binsize | awk -v var1="$f_chr" -v var2="$s_chr" -v var3="$binsize" 'BEGIN{FS="\t";OFS="\t"}{ end1=$1+var3; end2=$2+var3; print 2*(NR-1)+1,var1,$1,end1,NR,$3,-1;print 2*NR,var2,$2,end2,NR,$3,-1;}' >> $output_file
    done
done
