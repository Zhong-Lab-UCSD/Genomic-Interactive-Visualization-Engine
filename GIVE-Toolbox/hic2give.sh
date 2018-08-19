#!/bin/bash
PROGNAME=$0

usage(){
        cat << EOF >&2
        The script $PROGNAME  is used to convert .hic file to .bed file that needed in GIVE;
        There are 4 required parameters and 1 optional parameter for the command:
           1) Path to excutable binaries of straw. It can be download from https://github.com/theaidenlab/straw
           2) .hic file directory.
           3) output file name (including directory)
           4) bin size in base pairs that user wants to use, such as 40000. Please make sure the bin size you entered is contained in the .hic file).
           5) The kind of normalization you want to apply. Must be one of NONE/VC/VC_SQRT/KR. VC is vanilla coverage, VC_SQRT is square root of vanilla coverage, and KR is Knight-Ruiz or Balanced normalization. By default, it's NONE.
EOF
exit
}

straw_file=$1
hic_file=$2
output_file=$3
binsize=$4
norm=$5


[ ! -f "$straw_file" ] && echo "Straw does not exist: "$straw_file && usage  && exit 1
[ ! -f "$hic_file" ] &&  echo "$hic_file does not exist: " $hic_file && usage && exit 1
[ -f "$output_file" ] &&  echo "File $output_file exists. Cannot overwrite it." && exit 1
[  -z "$binsize" ] && echo "Error: Not enough parameters" && usage && exit 1
[  -z "$norm" ] && echo "Use default setting NONE normalization." && norm="NONE"

hicfile=$2
readbyte=$(hexdump -n 3 -e '3/1 "%c" "\n"' $hicfile)

if [ $readbyte = "HIC" ]; then
    echo ".hic file header is correct"
else
    echo "Program terminated!!! .hic file is not in correct format."
    exit 1
fi

genome=""
posbyte=16
while [ ! -z "$readbyte"  ]; do
    readbyte=$(hexdump -n 1 -s $posbyte -e '1/1 "%c" "\n"' $hicfile)
    genome=$genome$readbyte
    posbyte=$(($posbyte+1))
    #echo $posbyte
done
echo "=========================="
echo "The genome version is: "$genome

readbyte=$(hexdump -n 4 -s $posbyte -e '4/4 "%d" "\n"' $hicfile)
posbyte=$(($posbyte+4))
nattr=$(($readbyte*2))
attri=1;
while [ "$attri" -le "$nattr" ]; do
    while [ ! -z "$readbyte"  ]; do
        readbyte=$(hexdump -n 1 -s $posbyte -e '1/1 "%c" "\n"' $hicfile)
        posbyte=$(($posbyte+1))
    done
    attri=$(($attri+1))
done

readbyte=$(hexdump -n 4 -s $posbyte -e '4/4 "%d" "\n"' $hicfile)
posbyte=$(($posbyte+4))
nchr=$readbyte
echo "=========================="
echo "Number of Chromosome: "$nchr
chrlist=()
chri=1
while [ "$chri" -le "$nchr" ]; do
    chrname=""
    while [ ! -z "$readbyte"  ]; do
        readbyte=$(hexdump -n 1 -s $posbyte -e '1/1 "%c" "\n"' $hicfile)
        posbyte=$(($posbyte+1))
        chrname=$chrname$readbyte
    done
    readbyte=$(hexdump -n 4 -s $posbyte -e '4/4 "%d" "\n"' $hicfile)
    posbyte=$(($posbyte+4))
    chrsize=$readbyte
    chri=$(($chri+1))
    echo $chrname" : "$chrsize
    chrlist+=("$chrname")
done
#echo ${chrlist[@]} 

readbyte=$(hexdump -n 4 -s $posbyte -e '4/4 "%d" "\n"' $hicfile)
posbyte=$(($posbyte+4))
nbpres=$readbyte
bpresi=1
echo "=========================="
echo $nbpres" avaliable base pair resolutions:"
while [ "$bpresi" -le "$nbpres" ]; do
    readbyte=$(hexdump -n 4 -s $posbyte -e '4/4 "%d" "\n"' $hicfile)
    posbyte=$(($posbyte+4))
    echo $readbyte
    bpresi=$(($bpresi+1))
done

echo "=========================="
echo "Start extract data from .hic file ..."
linkcount=0
for ((i=0; i<${#chrlist[*]}; i++)); do
    fchr=${chrlist[i]}
    for((j=i; j<${#chrlist[*]}; j++)); do
        schr=${chrlist[j]}
        echo "Extract interaction between: $fchr, $schr"
        newlink=$($straw_file $norm $hic_file $fchr $schr BP $binsize |\
            awk -v var1="$fchr" -v var2="$schr" -v var3="$binsize" -v var4="$linkcount" \
            -v outfile="$output_file" \
            'BEGIN{FS="\t";OFS="\t"}\
            {end1=$1+var3; end2=$2+var3; \
                print 2*(var4+NR-1)+1,var1,$1,end1,var4+NR,$3,-1 >> outfile;\
                print 2*(NR+var4),var2,$2,end2,var4+NR,$3,-1 >>outfile;}\
            END{print NR}')
        linkcount=$(($linkcount+$newlink))
        echo $linkcount
     done
done
echo "Finished!"
