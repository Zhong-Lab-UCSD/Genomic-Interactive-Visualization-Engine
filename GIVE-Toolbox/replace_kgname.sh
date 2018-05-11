#!/bin/bash
#set -e
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

arg_array=("$@")
for((i=0;i<$#;i++));
do
    if [ $((i%2)) -eq 0 ]; then
        if ! [[ ${arg_array[$i]} =~ ^- ]]; then
            echo "Option error! Invalid option '${arg_array[$i]}'. It doesn't start with '-'. Please check your commandline." && echo "Exit with nothing changed." && exit 1
        fi
    else
        if [[ ${arg_array[$i]} =~ ^- ]]; then
            echo "Option value warning! The value of option ${arg_array[$(($i-1))]}' was set as '${arg_array[$i]}'. Please check your command whether some option value was missed, which caused the incorrect parse."
            echo "If you are sure the value is correct and it's quoted by \"\" in your commandline, please press Y/y to continue. Any other key to exit."
            read -p "Continue with this option value? (y/N)   " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "Continue with option value '${arg_array[$(($i-1))]} ${arg_array[$i]}'..."
            else
                echo "Exit with nothing changed." && exit 1
            fi
        fi
    fi
done

while getopts i:r:o:h opt; do
    case $opt in
        i) input_file=$OPTARG;;
        r) replace_column_number=$OPTARG;;
        o) output_file=$OPTARG;;
        h) usage;;
        \?) usage && exit 1;;
        *) usage;;
    esac
done

[ -z "$input_file" ] && echo "Error: -i <input_file> is empty" && usage && exit 1 
[ -z "$output_file" ] && echo "Error: -o <output_file> is empty" && usage && exit 1 

if [ -z "$replace_column_number" ]; then
    replace_column_number=13;
fi

awk -v r=$replace_column_number 'BEGIN{FS="\t";OFS="\t"}NR>1{printf $r; for(i=2;i<=12;i++){printf "\t"$i}; printf "\n";}' $input_file >$output_file
