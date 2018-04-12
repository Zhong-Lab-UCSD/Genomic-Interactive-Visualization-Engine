#!/bin/bash
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-g <group_name>] [-t <track_name>] [-a <CONFIRM>]
    -u <mysqlu>: (Required) MySQL account name
    -p <mysqlp>: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
    -r <ref>: (Required) ref genome database name. The ref genome database must has been initialized. If not, please use initial_ref.sh to do it. 
    -t <track_name>: (Required for removing a track) The first priority of removing data. If -t argument was supplied, only the track will be removed. -g and -a arguments will be ignored.
    -g <group_name>: (Required for removing a track group) The second priority of removing data. If -t was not used and -g was supplied, then the track group will be removed. -a arguments will be ignored.
    -a <CONFIRM>: (Required for removing the whole ref genome database) The third priority of removing data. If -t and -g were not used, and "-a CONFIRM" was set, then the whole ref genome database (the name is provided with -r argument) will be removed, including all the tracks belong to it. It's dangerous, be careful.
    -h : show usage help
EOF
    exit 1
}


while getopts u:p:r:t:g:a:h opt; do
    case $opt in
        u) mysqlu=$OPTARG;;
        p) mysqlp=$OPTARG;;
        r) ref=$OPTARG;;
        g) group_name=$OPTARG;;
        t) track_name=$OPTARG;;
        a) a=$OPTARG;;
        h) usage;;
        *) usage;;
    esac
done

[ -z "$mysqlu" ] && echo "Error: -u <mysqlu> is empty" && usage && exit 1 
[ -z "$ref" ] && echo "Error: -r <ref> is empty" && usage && exit 1 
#[  -z "$group_name" ] && echo "Error: -g <group_name> is empty" && usage && exit 1 
#[  -z "$long_label" ] && echo "Error: -l <long_label> is empty" && usage && exit 1 
[ -z "$mysqlp" ] &&  echo "Please input the password of GIVE MySQL database" && read -s -p "Password: " mysqlp
echo
if [ -n "$track_name" ]; then
    echo "Try to remove track '$track_name' in ref genome database '$ref' ..."
    if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
        "select count(*) from \`$ref\`.\`trackDb\` where tableName = '$track_name';") -eq 0 ]; then
        echo "Warning! Track '$track_name' record does NOT exist in 'trackDb' in ref genome database '$ref'."
        if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
            "select count(*) from information_schema.tables where \
                    table_schema='$ref' and table_name='$track_name';") -eq 0 ]; then
            echo "And there is NOT '$track_name' track data table existing in the ref genome database '$ref'."
            echo "Exit with nothing changed."
        else
            echo "But there is a table named as '$track_name' in ref genome database '$ref'."
            echo "Remove track data table '$track_name' in ref genome database '$ref' ..."
            mysql -u$mysqlu -p$mysqlp -e "DROP TABLE \`$ref\`.\`$track_name\`"
            echo "Finished. No 'trackDb' record was changed. 1 track data table was removed."
        fi
    else
        echo "There is a track record '$track_name' in 'trackDb' in ref genome database '$ref'."
        if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
            "select count(*) from information_schema.tables where \
                    table_schema='$ref' and table_name='$track_name';") -eq 0 ]; then
            echo "But there is NOT any track data table named as '$track_name' in ref genome database '$ref'."
            
            echo "Remove 'trackDb' record of '$track_name' in ref genome database '$ref' ..."
            mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`$ref\`.\`trackDb\` WHERE tableName = '$track_name'"

            echo "Finished. 1 'trackDb' record was removed. No track data table was changed."
        else
            echo "There is a track data table named as '$track_name' in ref genome database '$ref'.'"
            echo "Remove track record in 'trackDb' in ref genome database '$ref' ..."
            mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`$ref\`.\`trackDb\` WHERE tableName = '$track_name'"
        
            echo "Remove track data table '$track_name' in ref genome database '$ref' ..."
            mysql -u$mysqlu -p$mysqlp -e "DROP TABLE \`$ref\`.\`$track_name\`"

            echo "Finished. 1 'trackDb' record was changed. 1 track data table was removed."
        fi
    fi
    exit 1
fi

if [ -n "$group_name" ]; then 
    echo "Try to remove track group '$group_name' in ref genome database '$ref' ..."
    
    while read line
    do 
        track_array+=("$line")
    done < <(mysql -u$mysqlu -p$mysqlp -Bs -e "select tableName from \`$ref\`.\`trackDb\` where grp=\"$group_name\"") 

    if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
        "select count(*) from \`$ref\`.\`grp\` where name='$group_name';") -eq 0 ]; then
        echo "Warning! There is NOT '$group_name' record in 'grp' in ref genome database '$ref'." 
        if [ ${#track_array[@]} -eq 0 ]; then 
            echo "And there is NOT any track record belonging to '$group_name' group in ref genome database '$ref'."
            echo "Exit with nothing changed."
        else
            echo "But there are ${#track_array[@]} track records belonging to '$group_name' in ref genome database '$ref'."
            read -p "Do you want to remove those track records and track data tables? (Input y or Y to remove them.)    " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "Remove track records and tables belonging to group '$group_name' in ref genome database '$ref' ..."
            
                mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`$ref\`.\`trackDb\` WHERE grp = '$group_name'"
                for track_name in "${track_array[@]}"
                do
                    mysql -u$mysqlu -p$mysqlp -e "DROP TABLE IF EXISTS \`$ref\`.\`$track_name\`"
                done
        
                echo "Finished. No track group record was changed. ${#track_array[@]} 'trackDb' records and related track data tables were removed."
            else
                echo "Exit with nothing changed. Please use add_trackGroup.sh to fix the missing group record for the ${#track_array[@]} track records."
            fi
        fi
    else
        echo "There is a '$group_name' record in 'grp' in ref genome database '$ref'."
        echo "There are ${#track_array[@]} track records belonging to '$group_name' group in ref genome database '$ref'."
          
        echo "Remove group record of '$group_name' in ref genome database '$ref' ..."
        mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`$ref\`.\`grp\` WHERE name = '$group_name'"
        
        echo "Remove track records and tables belonging to group '$group_name' in ref genome database '$ref' ..."
        mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`$ref\`.\`trackDb\` WHERE grp = '$group_name'"
        for track_name in "${track_array[@]}"
        do
            mysql -u$mysqlu -p$mysqlp -e "DROP TABLE IF EXISTS \`$ref\`.\`$track_name\`"
        done

        echo "Finished. 1 track group record was removed. ${#track_array[@]} 'trackDb' records and related track data tables were removed."
    fi
    exit 1
fi


if [ "$a" = "CONFIRM" ]; then
    echo "Try to remove the whole ref genome database $ref"
    
    if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
        "select count(*) from \`compbrowser\`.\`ref\` where dbname='$ref';") -eq 0 ]; then
        echo "Warning! There is NOT any ref genome record of '$ref'."
        if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
            "select count(*) from INFORMATION_SCHEMA.SCHEMATA where SCHEMA_NAME ='$ref';") -eq 0 ]; then
            echo "And there is NOT any database named as '$ref'."
            echo "Exit with nothing changed."
        else
            echo "But there is a database named as '$ref'."
            read -p "Do you want to remove the database '$ref'? (Input y or Y to remove them.)    " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "Remove databae '$ref' ..."
                mysql -u$mysqlu -p$mysqlp -e "DROP DATABASE $ref"
                
                echo "Finished. No ref genome record was changed. 1 database was removed."
            else
                echo "Exit with nothing changed." 
            fi
        fi
    else
        echo "There is a ref genome record of '$ref'"
        if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
            "select count(*) from INFORMATION_SCHEMA.SCHEMATA where SCHEMA_NAME ='$ref';") -eq 0 ]; then
            echo "But there is NOT any database named as '$ref'."
            echo "Remove ref genome record '$ref' ..."

            mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`compbrowser\`.\`ref\` WHERE dbname = '$ref'"

            echo "Finished. 1 ref genome record was removed. No database was changed."
        else
            echo "Remove ref genome record '$ref' ..."
            echo "Remove databae '$ref' ..."
            mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`compbrowser\`.\`ref\` WHERE dbname = '$ref'"
            mysql -u$mysqlu -p$mysqlp -e "DROP DATABASE $ref"

            echo "Finished. 1 ref genome record was removed. 1 database was removed."
        fi
    fi
    exit 1
fi
