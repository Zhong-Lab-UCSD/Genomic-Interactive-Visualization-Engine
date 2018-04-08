#!/bin/bash
PROGNAME=$0

usage() {
    cat << EOF >&2
    Replace the known gene name in the 1st column of the known gene table format gene annotation file downloaded from UCSC table browser.
    Usage: $PROGNAME [-i <input_file>] [-r <replace_column_number>] [-o <output_file>] 
    -i <input_file>: (Required) Gene annotation file in UCSC known gene table format.
    -r <replace_column_number>: (Optional) The column number in file for replcing the 1st column, UCSC kgID. 
        The default value is 13, so the 1st column, kgID will be replaced with the 13th column, such as gene symbol.
        The output file will include the replaced 1st column and the 2nd - 12th columns.
    -o <output_file>: (Required) Output file name.
    -h : show usage help
EOF
    exit 1
}

while getopts i:r:o:h opt; do
    case $opt in
        i) input_file=$OPTARG;;
        r) replace_column_number=$OPTARG;;
        o) output_file=$OPTARG;;
        h) usage;;
        *) usage;;
    esac
done

[ -z "$input_file" ] && echo "Error: -i <input_file> is empty" && usage && exit 1 
[ -z "$output_file" ] && echo "Error: -o <output_file> is empty" && usage && exit 1 

if [ -z "$replace_column_number" ]; then
    replace_column_number=13;
fi

awk -v r=$replace_column_number 'BEGIN{FS="\t";OFS="\t"}NR>1{printf $r; for(i=2;i<=12;i++){printf "\t"$i}; printf "\n";}' $input_file >$output_file
