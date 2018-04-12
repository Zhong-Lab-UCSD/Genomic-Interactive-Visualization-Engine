#!/bin/bash
set -e
while getopts p: opt; do
    case $opt in
        p) mysqlp=$OPTARG;;
    esac
done


[ -z "$mysqlp" ] &&  echo "Please input the password of GIVE MySQL database" && read -s -p "Password:" mysqlp
echo
echo $mysqlp"END"
while [ -z "$mysqlp" ]; do
    echo "Password format error! The input password is blank. Please input again:" && read -s -p "Password:" mysqlp
    echo
done

