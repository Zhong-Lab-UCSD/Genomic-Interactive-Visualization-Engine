#!/usr/bin/python

import httplib2 as http
import json, sys, os, gzip, StringIO

import MySQLdb as mariadb

sys.path.append(os.path.abspath("../includes/"))

import constants
# Notice that database host, username and passwords should be put under
#   ../includes/constant.py

try:
 from urlparse import urlparse
except ImportError:
 from urllib.parse import urlparse

uri = constants._NCBI_URI
path = constants._NCBI_PATH

annoFiles = [{
    'db': 'hg19',
    'name': 'Homo_sapiens'
}, {
    'db': 'mm9',
    'name': 'Mus_musculus'
}, {
    'db': 'mm10',
    'name': 'Mus_musculus'
}]

# get everything from NCBI

for anno in annoFiles:
    target = urlparse(uri + path + anno['name'] + '.gene_info.gz')
    method = 'GET'

    h = http.Http(disable_ssl_certificate_validation=True)

    (response, content) = h.request(target.geturl(), method)

    if response['status'] == '200':
        # open database first, then lock the corresponding tables
        conn = mariadb.connect(host=constants._CPB_EDIT_HOST,
            user=constants._CPB_EDIT_USER,
            passwd=constants._CPB_EDIT_PASS, db=anno['db'])
        cur = conn.cursor()
        cur.execute('CREATE TABLE IF NOT EXISTS `_NcbiGeneInfo` ' +
            '(`tax_id` MEDIUMINT UNSIGNED NOT NULL, ' +
            '`GeneID` INT UNSIGNED PRIMARY KEY NOT NULL, ' +
            '`Symbol` TINYTEXT NOT NULL, ' +
            '`LocusTag` TINYTEXT NOT NULL, ' +
            '`Synonyms` TEXT NOT NULL, ' +
            '`dbXrefs` TEXT NOT NULL, ' +
            '`chromosome` TINYTEXT NOT NULL, ' +
            '`map_location` TINYTEXT NOT NULL, ' +
            '`description` TEXT NOT NULL, ' +
            '`type_of_gene` TINYTEXT NOT NULL, ' +
            '`Symbol_from_nomenclature_authority` TINYTEXT NOT NULL, ' +
            '`Full_name_from_nomenclature_authority` TEXT NOT NULL, ' +
            '`Nomenclature status` TINYTEXT NOT NULL, ' +
            '`Other designations` TEXT NOT NULL, ' +
            '`Modification date` DATE NOT NULL, ' +
            'INDEX `SymbolIndex` (`Symbol`(20))' +
            ')')
        cur.execute('CREATE TABLE IF NOT EXISTS `_AliasTable` ' +
            '(`alias` TINYTEXT NOT NULL, ' +
            '`Symbol` TINYTEXT NOT NULL, ' +
            '`isSymbol` TINYINT(1) DEFAULT 0, ' +
            'INDEX `aliasIndex` (`alias`(20)) ' +
            ')')
        cur.execute('LOCK TABLES `_NcbiGeneInfo` WRITE, `_AliasTable` WRITE')
        cur.execute('DELETE FROM `_NcbiGeneInfo`')
        cur.execute('DELETE FROM `_AliasTable`')

        # content is gene_info file
        # unzip file first
        with gzip.GzipFile(fileobj=StringIO.StringIO(content)) as gzFile:
            # then put the stuff into local database for querying
            for line in gzFile:
                if not line.startswith('#'):
                    # not comment
                    tokens = line.strip().split('\t')
                    tokens[0] = int(tokens[0])      # tax_id
                    tokens[1] = int(tokens[1])      # GeneID
                    Symbol = tokens[2]
                    Synonyms = tokens[4]
                    synArray = [Symbol] + Synonyms.split('|')
                    # include official symbol into list of aliases

                    # insert into <db>._NcbiGeneInfo table
                    cur.execute("INSERT INTO `_NcbiGeneInfo` VALUES " +
                        "(%s, %s, %s, %s, %s, %s, %s, %s, " +
                        "%s, %s, %s, %s, %s, %s, %s)", tuple(tokens))

                    # then insert all the aliases into <db>._AliasTable
                    for alias in synArray:
                        cur.execute("INSERT INTO `_AliasTable` VALUES " +
                            "(%s, %s, %s)", (alias, Symbol, 1 if alias == Symbol else 0))

        conn.commit()
        conn.close()

    else:
        print 'Error detected in downloading gene_info file: ' + response['status']
