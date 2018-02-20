#!/bin/bash
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-u <mysqlu>] [-p <mysqlp>] [-a <true>] [-r <ref>] [-g <group_name>] [-t <track_name>]
    
    If -a is set as "true", it will ignore other arguments and output all the reference genomes and associated track groups and tracks. If -a is not set as "true", the 3 arguments -r, -g, -t will determine the output structure level. If only set -r, it will output all the track group names and associated track names in the -r specified reference genome database. If set both -r and -g, then it wll list all the track names of -r -g specified track group. If set all the -r -g -t arguments, it will output the detail info of -r -g -t specified track. 

    -u <mysqlu>: (Required) MySQL account name
    -p <mysqlp>: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
    -a <true>: (Optional) If set as "true", it will list all the tracks in all the reference genomes with database tree structure.
    -r <ref>: (Optional) ref genome database name. 
    -g <group_name>: (Optional) track group name.
    -t <track_name>: (Optional) track name. 
    -h : show usage help
EOF
    exit 1
}


while getopts u:p:a:r:g:t:h opt; do
    case $opt in
        u) mysqlu=$OPTARG;;
        p) mysqlp=$OPTARG;;
        a) a=$OPTARG;;
        r) ref=$OPTARG;;
        g) group_name=$OPTARG;;
        t) track_name=$OPTARG;;
        h) usage;;
        *) usage;;
    esac
done
[  -z "$mysqlu" ] && echo "Error: -u <mysqlu> is empty" && usage && exit 1 

has_element () {
    local e
    for e in "${@:2}"; do [[ "$e" == "$1" ]] && return 0; done
    return 1
}

if [ "$mysqlu" = "root" ]; then
    while read line
    do
        grants_array+=("$line")
    done < <(mysql -u $mysqlu -p$mysqlp -Bs -e "show databases")
else
    while read line
    do 
        grants_array+=("$line")
    done < <(mysql -u $mysqlu  -p$mysqlp -Bs -e "show grants for $mysqlu" | grep "TABLES ON" |sed -e "s/.\+TABLES ON \`\([^\`]\+\)\`.\+/\1/g")
fi

if !(has_element "compbrowser" "${grants_array[@]}") ; then
    echo "User '$mysqlu' cannot access compbrowser database!! It contains 'ref' table of all registered GIVE reference genome databases on the MySQL server. Cannot get info, program exit."
    exit 1
fi

while read line
do 
    ref_array+=("$line")
done < <(mysql -u$mysqlu -p$mysqlp  -Bs -e "select dbname from compbrowser.ref")


if [ "$a" = "true" ]; then
    for i in "${ref_array[@]}"
    do
        if !(has_element "$i" "${grants_array[@]}"); then
            ref_nogrant+=("$i")
            continue
        fi
        ref_grant+=("$i")
        echo "|"
        echo "|___ $i"

        while read line
        do 
            grp_array+=("$line")
        done < <(mysql -u$mysqlu -p$mysqlp -Bs -e "select name from \`$i\`.\`grp\`")
        
        count_grp=0
        for j in "${grp_array[@]}"
        do
            count_grp=$((count_grp+1))
            echo "|      |"
            echo "|      |___ $j"
            
            while read line
            do 
                track_array+=("$line")
            done < <(mysql -u$mysqlu -p$mysqlp -Bs -e "select tableName from \`$i\`.\`trackDb\` where grp=\"$j\"")
            
            for k in "${track_array[@]}"
            do
                if [ $count_grp -eq ${#grp_array[@]} ];then
                    echo "|             |--- $k" 
                else
                    echo "|      |      |--- $k"
                fi
            done

            unset track_array
        done
        unset grp_array
    done
    echo ""
    echo "Summary:"
    echo "    There are ${#ref_array[@]} reference genomes:"
    (IFS=","; echo "        ${ref_array[*]}")
    echo ""
    echo "    ${#ref_grant[@]} of them are privilege to user $mysqlu:"
    (IFS=","; echo "        ${ref_grant[*]}")
    echo ""
    echo "    ${#ref_nogrant[@]} of them are NOT privilege to user $mysqlu:"
    (IFS=","; echo "        ${ref_nogrant[*]}")
    exit 1 
fi

if [ -z "$ref"  ]; then
    echo "Reference genome is not set! Exit."
    exit 1
else
    if !(has_element "$ref" "${ref_array[@]}"); then
            echo "\"$ref\" is not a valid GIVE ref genome database. Exit!"
            exit 1
    fi

    if !(has_element "$ref" "${grants_array[@]}"); then
            echo "You cannot access the ref genome \"$ref\". Exit!"
            exit 1
    fi

    if [ -z "$group_name" ]; then
        echo "|"
        echo "|___ $ref"

        while read line
        do 
            grp_array+=("$line")
        done < <(mysql -u$mysqlu -p$mysqlp -Bs -e "select name from \`$ref\`.\`grp\`")
        
        count_grp=0
        for j in "${grp_array[@]}"
        do
            count_grp=$((count_grp+1))
            echo "       |"
            echo "       |___ $j"
            
            while read line
            do 
                track_array+=("$line")
            done < <(mysql -u$mysqlu -p$mysqlp -Bs -e "select tableName from \`$ref\`.\`trackDb\` where grp=\"$j\"")
            
            for k in "${track_array[@]}"
            do
                if [ $count_grp -eq ${#grp_array[@]} ];then
                    echo "              |--- $k" 
                else
                    echo "       |      |--- $k"
                fi
            done

            unset track_array
        done
        echo ""
        echo "Summary:"
        echo "    There are ${#grp_array[@]} track groups in reference genomes \"$ref\":"
        (IFS=","; echo "        ${grp_array[*]}")
        echo ""
        unset grp_array
    else
        if [ -z "$track_name" ]; then
            while read line
            do 
                grp_array+=("$line")
            done < <(mysql -u$mysqlu -p$mysqlp -Bs -e "select name from \`$ref\`.\`grp\`")
    
            if !(has_element "$group_name" "${grp_array[@]}"); then
                echo "\"$group_name\" is not a valid track group of GIVE ref genome \"$ref\". Exit!"
                exit 1
            fi
    
            echo "|"
            echo "|___ $ref"
            echo "       |"
            echo "       |___ $group_name"
     
            while read line
            do 
                track_array+=("$line")
            done < <(mysql -u$mysqlu -p$mysqlp -Bs -e "select tableName from \`$ref\`.\`trackDb\` where grp=\"$group_name\"")
            
            for k in "${track_array[@]}"
            do
                echo "              |--- $k" 
            done
            echo ""
            echo "Summary:"
            echo "    There are ${#track_array[@]} tracks in track group \"$group_name\" of reference genomes \"$ref\":"
            (IFS=","; echo "        ${track_array[*]}")
     
            unset track_array
        else
            while read line
            do 
                track_array+=("$line")
            done < <(mysql -u$mysqlu -p$mysqlp -Bs -e "select tableName from \`$ref\`.\`trackDb\` where grp=\"$group_name\"")

            if !(has_element "$track_name" "${track_array[@]}"); then
                echo "\"$track_name\" is not a valid track in track group \"$group_name\" of GIVE ref genome \"$ref\". Exit!"
                exit 1
            fi
 
            echo "Summary: there are ${#track_array[@]} tracks in track group \"$group_name\" of GIVE ref genome \"$ref\". Following is the data information and settings of track $track_name:"
            mysql -u $mysqlu -p$mysqlp -B -e "select * from \`$ref\`.\`trackDb\` where tableName=\"$track_name\"" | awk 'BEGIN{FS="\t"}NR==1{for(i=1;i<=7;i++){head[i]=$i}}NR==2{for(i=1;i<=7;i++){line[i]=$i}}END{for(i=1;i<=7;i++){print head[i]":\t"line[i]}}'
            
        fi
    fi
fi 
