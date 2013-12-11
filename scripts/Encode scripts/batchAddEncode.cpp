#include "string_manip_stl.h"
#include <string>
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <map>
#include "mysql_connection.h"
#include <cppconn/driver.h>
#include <cppconn/exception.h>
#include <cppconn/resultset.h>
#include <cppconn/statement.h>
#include <cppconn/prepared_statement.h>

using namespace std;

const string TRACKTYPE = "bigWig 0.00 1.00";
const float PRIORITY_BASE = 1;

bool hasCompGroupJudge(const map<string, map<string, string> > &trackMap, const map<string, vector<string> > &groupMap) {
	map<string, string> keyValuePairToUse(trackMap.begin()->second);
	// switch group contents to group name
	for(map<string, vector<string> >::const_iterator itor = groupMap.begin(); itor != groupMap.end(); itor++) {
		if(keyValuePairToUse.find(itor->second[0]) != keyValuePairToUse.end()) {
			vector<string>::const_iterator itorGroup = itor->second.begin();
			for(itorGroup++; itorGroup != itor->second.end(); itorGroup++) {
				if(keyValuePairToUse[itor->second[0]] == *itorGroup) {
					return true;
				}
			}
		}
	}
	return false;
}

string getCompSeriesID(const map<string, map<string, string> > &trackMap, const map<string, vector<string> > &groupMap) {
	// this will NOT be shown as compseries name and will be only used as ID with "series" tagged
	string result;
	map<string, string> keyValuePairToUse(trackMap.begin()->second);
	// switch group contents to group name
	for(map<string, vector<string> >::const_iterator itor = groupMap.begin(); itor != groupMap.end(); itor++) {
		if(keyValuePairToUse.find(itor->second[0]) != keyValuePairToUse.end()) {
			vector<string>::const_iterator itorGroup = itor->second.begin();
			for(itorGroup++; itorGroup != itor->second.end(); itorGroup++) {
				if(keyValuePairToUse[itor->second[0]] == *itorGroup) {
					keyValuePairToUse[itor->second[0]] = itor->first;
				}
			}
		}
	}
	string datatype = toLower(keyValuePairToUse["datatype"]);
	
	if(datatype == "rnaseq") {
		result = keyValuePairToUse["datatype"] + "_" + keyValuePairToUse["rnaextract"] + "_"
			+ keyValuePairToUse["cell"];
	} else if(datatype == "chipseq") {
		result = keyValuePairToUse["datatype"] + "_" 
			+ getBefore(getBefore(keyValuePairToUse.find("antibody")->second, "_"), "(") + "_" 
			+ keyValuePairToUse["cell"];
	} else {
		result = keyValuePairToUse["datatype"];
		if(keyValuePairToUse.find("cell") != keyValuePairToUse.end()) {
			result += "_" + keyValuePairToUse["cell"];
		}
	}

	return result;
}

string getCompSeriesInfo(const map<string, map<string, string> > &trackMap, const map<string, vector<string> > &groupMap) {
	
	string result;
	map<string, string> keyValuePairToUse(trackMap.begin()->second);
	// switch group contents to group name
	for(map<string, vector<string> >::const_iterator itor = groupMap.begin(); itor != groupMap.end(); itor++) {
		if(keyValuePairToUse.find(itor->second[0]) != keyValuePairToUse.end()) {
			vector<string>::const_iterator itorGroup = itor->second.begin();
			for(itorGroup++; itorGroup != itor->second.end(); itorGroup++) {
				if(keyValuePairToUse[itor->second[0]] == *itorGroup) {
					keyValuePairToUse[itor->second[0]] = itor->first;
				}
			}
		}
	}
	string datatype = toLower(keyValuePairToUse["datatype"]);
	
	if(datatype == "rnaseq") {
		result = "groupDataType RNA-Seq\ngroupFeature " + keyValuePairToUse["rnaextract"] 
			+ "\ngroupSampleType " + keyValuePairToUse["cell"] + "\n";
	} else if(datatype == "chipseq") {
		result = "groupDataType ChIP-Seq\ngroupFeature " 
			+ getBefore(getBefore(keyValuePairToUse.find("antibody")->second, "_"), "(") 
			+ "\ngroupSampleType " + keyValuePairToUse["cell"] + "\n";
	} else {
		result = "groupDataType " + keyValuePairToUse["datatype"];
		if(keyValuePairToUse.find("cell") != keyValuePairToUse.end()) {
			result += "\ngroupSampleType " + keyValuePairToUse["cell"];
		}
		result += "\n";
	}

	return result;
}

map<string, string> getShortAndLongLabel(const map<string, string> &KeyValuePair, const string &groupInfo = "") {
	map<string, string> result;
	string datatype = toLower(KeyValuePair.find("datatype")->second);
	if(datatype == "rnaseq") {
		result["shortlabel"] = KeyValuePair.find("rnaextract")->second
			+ " (" + KeyValuePair.find("cell")->second + ")";
		result["feature"] = KeyValuePair.find("rnaextract")->second;
		result["longlabel"] = "RNA Sequencing data of " + KeyValuePair.find("rnaextract")->second + " for "
			+ KeyValuePair.find("cell")->second + " (cell type)";
		result["html"] = "<h2>Description</h2>\n<p>Data source: "
			+ KeyValuePair.find("dataversion")->second + "</p>\n"
			+ groupInfo + (groupInfo.empty()? "": "\n")
			+ "<p>Cell line: " + KeyValuePair.find("cell")->second + "</p>\n"
			+ "<p>RNA extraction method: " + KeyValuePair.find("rnaextract")->second + "</p>\n";
			+ "<p>Lab: " + KeyValuePair.find("lab")->second + "</p>\n"
			+ "<p>Singal type: " + KeyValuePair.find("view")->second + "</p>\n";
		if(KeyValuePair.find("geosampleaccession") != KeyValuePair.end()) {
			result["html"] += "<p>GEO accession: " + KeyValuePair.find("geosampleaccession")->second + "</p>\n";
		}
	} else if(datatype == "chipseq") {
		string antibody = getBefore(getBefore(KeyValuePair.find("antibody")->second, "_"), "(");
		result["shortlabel"] = (toLower(antibody) == "input"? "ChIP-Seq ": "") 
			+ antibody 
			+ " (" + KeyValuePair.find("cell")->second + ")";
		result["feature"] = KeyValuePair.find("antibody")->second;
		result["longlabel"] = "ChIP Sequencing data with " + KeyValuePair.find("antibody")->second + " for "
			+ KeyValuePair.find("cell")->second + " (cell type)";
		result["html"] = "<h2>Description</h2>\n<p>Data source: "
			+ KeyValuePair.find("dataversion")->second + "</p>\n"
			+ groupInfo + (groupInfo.empty()? "": "\n")
			+ "<p>Cell line: " + KeyValuePair.find("cell")->second + "</p>\n"
			+ (toLower(antibody) == "input"? "<p>Signal: ": "<p>Antibody: ") + KeyValuePair.find("antibody")->second + "</p>\n"
			+ "<p>Lab: " + KeyValuePair.find("lab")->second + "</p>\n";
		if(KeyValuePair.find("control") != KeyValuePair.end()) {
			result["html"] += "<p>Control: " + KeyValuePair.find("control")->second + "</p>\n";
		}
		if(KeyValuePair.find("geosampleaccession") != KeyValuePair.end()) {
			result["html"] += "<p>GEO accession: " + KeyValuePair.find("geosampleaccession")->second + "</p>\n";
		}
	} else {
		result["shortlabel"] = KeyValuePair.find("datatype")->second 
			+ (KeyValuePair.find("cell") == KeyValuePair.end()? "": " (" + KeyValuePair.find("cell")->second + ")");
		result["longlabel"] = KeyValuePair.find("datatype")->second + " data" 
			+ (KeyValuePair.find("cell") == KeyValuePair.end()? "": " for " + KeyValuePair.find("cell")->second + " (cell type)");
		result["html"] = "<h2>Description</h2>\n<p>Data source: "
			+ KeyValuePair.find("dataversion")->second + "</p>\n"
			+ groupInfo + (groupInfo.empty()? "": "\n");
		if(KeyValuePair.find("cell") != KeyValuePair.end()) {
			result["html"] += "<p>Cell line: " + KeyValuePair.find("cell")->second + "</p>\n";
		}
		result["html"] += "<p>Lab: " + KeyValuePair.find("lab")->second + "</p>\n";
	}
	return result;
}

string getSettings(const map<string, string> &KeyValuePair, const map<string, string> &dbEntry, 
		const string &ID, double priority, const string &groupInfo = "", const string &groupID = "",
		const string &super = "") {
	// do the settings;
	// groupInfo is the information used to display the group stuff, currently it's only tissue type
	ostringstream settingsostr;
	settingsostr << "altColor 128,128,128\nautoScale OFF\ncolor 0,0,0\ngraphTypeDefault Var\ngridTypeDefault Off\n"
		<< "group encode\n" << "dataType " << KeyValuePair.find("datatype")->second << "\n"
		<< (KeyValuePair.find("cell") == KeyValuePair.end()? "": "cellType " + KeyValuePair.find("cell")->second + "\n")
		<< (dbEntry.find("feature") == dbEntry.end()? "": "trackFeature " + dbEntry.find("feature")->second + "\n")
		<< "labName " << KeyValuePair.find("lab")->second << "\n" << groupInfo 
		<< (groupInfo.empty()? "": "\n") << "longLabel " << dbEntry.find("longlabel")->second << "\nmaxHeightPixels 128:36:16\npriority " << priority
		<< "\nshortLabel " << dbEntry.find("shortlabel")->second << "\nspanList 300\ntrack " << ID 
		<< "\ntype " << TRACKTYPE << "\nviewLimits 0.00:3\nvisibility "
		<< ((super.empty() && !groupID.empty())? "dense": "hide") << "\nwindowingFunction mean+whiskers\n"
		<< "transformFunc LOG";
	if(!super.empty()) {
		// super is not empty
		// add super track
		settingsostr << "\nparent " << super;
	}
	if(!groupID.empty()) {
		settingsostr << "\ncompSeries " << groupID << "series";
	}
	settingsostr << ends;
	return settingsostr.str();
}

map<string, string> getShortAndLongLabel(const map<string, map<string, string> > &trackMap, const string &groupInfo = "") {
	// Input here is a superTrack
	const map<string, string> &KeyValuePair = trackMap.begin()->second;	// according to the first track
	map<string, string> result;
	string datatype = toLower(KeyValuePair.find("datatype")->second);

	if(datatype == "rnaseq") {
		result["shortlabel"] = KeyValuePair.find("rnaextract")->second
			+ " (" + KeyValuePair.find("cell")->second + ")";
		result["feature"] = KeyValuePair.find("rnaextract")->second;
		result["longlabel"] = "RNA Sequencing data of " + KeyValuePair.find("rnaextract")->second + " for "
			+ KeyValuePair.find("cell")->second + " (cell type)";
		result["html"] = "<h2>Description</h2>\n<p>Data source: "
			+ KeyValuePair.find("dataversion")->second + "</p>\n"
			+ "<p>Cell line: " + KeyValuePair.find("cell")->second + "</p>\n"
			+ groupInfo + (groupInfo.empty()? "": "\n")
			+ "<p>RNA extraction method: " + KeyValuePair.find("rnaextract")->second + "</p>\n";
		if(KeyValuePair.find("geosampleaccession") != KeyValuePair.end()) {
			result["html"] += "<p>GEO accession: " + KeyValuePair.find("geosampleaccession")->second + "</p>\n";
		}
	} else if(datatype == "chipseq") {
		string antibody = getBefore(getBefore(KeyValuePair.find("antibody")->second, "_"), "(");
		result["shortlabel"] = (toLower(antibody) == "input"? "ChIP-Seq ": "") 
			+ antibody 
			+ " (" + KeyValuePair.find("cell")->second + ")";
		result["feature"] = KeyValuePair.find("antibody")->second;
		result["longlabel"] = "ChIP Sequencing data with " + KeyValuePair.find("antibody")->second + " for "
			+ KeyValuePair.find("cell")->second + " (cell type)";
		result["html"] = "<h2>Description</h2>\n<p>Data source: "
			+ KeyValuePair.find("dataversion")->second + "</p>\n"
			+ "<p>Cell line: " + KeyValuePair.find("cell")->second + "</p>\n"
			+ groupInfo + (groupInfo.empty()? "": "\n")
			+ (antibody == "Input"? "<p>Signal: ": "<p>Antibody: ") + KeyValuePair.find("antibody")->second + "</p>\n";
		if(KeyValuePair.find("geosampleaccession") != KeyValuePair.end()) {
			result["html"] += "<p>GEO accession: " + KeyValuePair.find("geosampleaccession")->second + "</p>\n";
		}
	} else {
		result["shortlabel"] = KeyValuePair.find("datatype")->second 
			+ (KeyValuePair.find("cell") == KeyValuePair.end()? "": " (" + KeyValuePair.find("cell")->second + ")");
		result["longlabel"] = KeyValuePair.find("datatype")->second + " data" 
			+ (KeyValuePair.find("cell") == KeyValuePair.end()? "": " for " + KeyValuePair.find("cell")->second + " (cell type)");
		result["html"] = "<h2>Description</h2>\n<p>Data source: "
			+ KeyValuePair.find("dataversion")->second + "</p>\n"
			+ groupInfo + (groupInfo.empty()? "": "\n");
		if(KeyValuePair.find("cell") != KeyValuePair.end()) {
			result["html"] += "<p>Cell line: " + KeyValuePair.find("cell")->second + "</p>\n";
		}
	}
	return result;
}

string getSettings(const map<string, map<string, string> > &trackMap, const map<string, string> &dbEntry, 
		const string &ID, double priority, const string &groupInfo = "", const string &groupID = "") {
	// do the settings;
	// groupInfo is the information used to display the group stuff, currently it's only tissue type
	const map<string, string> &KeyValuePair = trackMap.begin()->second;	// according to the first track
	ostringstream settingsostr;
	settingsostr << "altColor 128,128,128\nautoScale OFF\ncolor 0,0,0\ngraphTypeDefault Var\ngridTypeDefault Off\n"
		<< "group encode\n" << "dataType " << KeyValuePair.find("datatype")->second << "\n"
		<< (KeyValuePair.find("cell") == KeyValuePair.end()? "": "cellType " + KeyValuePair.find("cell")->second + "\n")
		<< (dbEntry.find("feature") == dbEntry.end()? "": "trackFeature " + dbEntry.find("feature")->second + "\n")
		<< "labName " << KeyValuePair.find("lab")->second << "\n" << groupInfo 
		<< (groupInfo.empty()? "": "\n") << "longLabel " << dbEntry.find("longlabel")->second << "\nmaxHeightPixels 128:36:16\npriority " << priority
		<< "\nshortLabel " << dbEntry.find("shortlabel")->second << "\nspanList 300\ntrack " << ID 
		<< "\ntype " << TRACKTYPE << "\nviewLimits 0.00:3\nvisibility "
		<< (!groupID.empty()? "dense": "hide") << "\nwindowingFunction mean+whiskers\n"
		<< "transformFunc LOG\ncompositeTrack on";
	if(!groupID.empty()) {
		settingsostr << "\ncompSeries " << groupID << "series";
	}
	settingsostr << ends;
	return settingsostr.str();
}

int main(int argc, char *argv[]) {
	// TODO: Read encode data files, and generate the output as trackDb format needed in UCSC Browser
	// UCSC Browser format:
	// tableName	varchar(255)
	// shortLabel	varchar(255)
	// type		varchar(255)
	// longLabel	varchar(255)
	// visibility	tinyint(3) unsigned
	// priority	float
	// colorR	tinyint(3) unsigned
	// colorG	tinyint(3) unsigned
	// colorB	tinyint(3) unsigned
	// altColorR	tinyint(3) unsigned
	// altColorG	tinyint(3) unsigned
	// altColorB	tinyint(3) unsigned
	// useScore	tinyint(3) unsigned
	// private	tinyint(3) unsigned
	// restrictCount	int(11)
	// restrictList	longblob
	// url		longblob
	// html		longblob
	// grp		varchar(255)
	// canPack	tinyint(3) unsigned
	// settings	longblob
	//
	// The major thing to do is to write html (metadata) and settings (see below)
	// settings format:
	// autoScale OFF
	// color 0,0,0
	// graphTypeDefault Bar
	// gridDefault OFF
	// group lab
	// longLabel <long label>
	// maxHeightPixels 128:36:16
	// priority <priority>
	// shortLabel <short label>
	// spanList 300
	// track <table name>
	// type <type>
	// viewLimits 0.00:4 <may need to change>
	// visibility dense
	// windowingFunction Mean
	// compositeTrack on (for parents)
	// transformFunc LOG
	// parent <super track> (for children)
	// centerLabels OFF (for children)
	// compSeries <series name> (for those with series among species)
	
	// User also need to supply linked stuff

	// Usage: ./batchAddEncode <ucsc mysql username> <ucsc mysql pass> <cpbrowser mysql username> <cpbrowser mysql pass>
	//						<key file> <species 1 db name> <species 1 track file> [species 2 db name] [species 2 track file] ...
	
	long count = 0;
	
	string ucscmysqluser(argv[1]), ucscmysqlpass(argv[2]), cpbmysqluser(argv[3]), cpbmysqlpass(argv[4]);


	ifstream finGroup(argv[5]);	// this is the file used to specify which data needs to be grouped together
	// read group data first;
	// group data format:
	// (First line)<key1>	<key2>	<key3> <[naming but ungrouping key]>
	// <group name>	<key col>	<value1>	<value2>	<value3>	...
	// If datatype & antibody is the same BETWEEN SPECIES, jave a compSeries
	// If datatype & antibody is the same WITHIN THE SAME SPECIES, merge into a supertrack
	
	cout << "Reading groupmap..." << flush;
	map<string, vector<string> > groupMap;	
	// Outer key: group name, Inner vector: [0] = key and the rest is values according to species
	vector<string> namingKeys;
	vector<string> groupingKeys;
	string line;
	getline(finGroup, line);
	{
		vector<string> tokens = splitTokens(line);
		for(vector<string>::const_iterator itor = tokens.begin(); itor != tokens.end(); itor++) {
			if(getBetween(*itor, "[", "]", false, false, true, true) == *itor) {
				groupingKeys.push_back(toLower(*itor));
			} else {
				namingKeys.push_back(getBetween(toLower(*itor), "[", "]"));
			}
		}
	}
	while(getline(finGroup, line)) {
		vector<string> tokens = splitTokens(line);
		string groupname = tokens[0];
		tokens.erase(tokens.begin());
		groupMap.insert(pair<string, vector<string> >(groupname, tokens));
	}

	finGroup.close();
	cout << "done." << endl;
	cout << "Grouping keys: " << groupingKeys.size() << "; Naming keys: " << namingKeys.size() << endl;
	cout << "GroupMap size(): " << groupMap.size() << endl;

	cout << "Reading tracks..." << endl;
	// generate species track data

	map<string, map<string, map<string, map<string, string> > > > spcTrackTable;

	for(int i = 6; i < argc; i += 2) {
		string spcName(argv[i]);
		int speciesIndex = i / 2 - 3;
		cout << spcName << endl;
		map<string, map<string, map<string, string> > > trackGroupTable;
		ifstream finTrack(argv[i + 1]);
		while(getline(finTrack, line)) {	// read line of entry
			count++;
			map<string, string> keyValuePair;	// key and value, used to generate labels in settings or other names
			vector<string> tokens = splitTokens(line);
			vector<string>::const_iterator itor = tokens.begin();
			keyValuePair["url"] = *itor;
			//cout << keyValuePair["url"] << endl;
			itor++;
			for(; itor != tokens.end(); itor++) {
				// Read key and value
				string key = toLower(getBefore(*itor, "=")), value = getBetween(*itor, "=", ";");
				if(keyValuePair.find(key) != keyValuePair.end()) {
					cerr << "Duplicated value found at line " << count << ". Key = " << key << ", Value = " << value << endl;
				} else {
					keyValuePair[key] = value;
				}
			}
			
			//cout << keyValuePair["url"] << endl;

			// first generate group
			string groupname = "";
			for(vector<string>::const_iterator itor = groupingKeys.begin(); itor != groupingKeys.end(); itor++) {
				if(keyValuePair.find(*itor) != keyValuePair.end()) {
					if(!groupname.empty()) {
						groupname += "_";
					}
					string groupnamefrag = getBefore(getBefore(keyValuePair.find(*itor)->second, "_"), "(");
					//if(*itor == "antibody") {
					//	cout << "antibody=" << groupnamefrag << endl;
					//}
					// translate groupnamefrag according to species
					for(map<string, vector<string> >::const_iterator itor_groupmap = groupMap.begin(); itor_groupmap != groupMap.end(); itor_groupmap++) {
						// check if groupnamefrag corresponds to the correct value in groupMap
						if(*itor == itor_groupmap->second[0] && toLower(groupnamefrag) == toLower(itor_groupmap->second[speciesIndex + 1])) {
							groupnamefrag = itor_groupmap->first;
							break;
						}
					}
					
					groupname += groupnamefrag;
				}
			}
			// After this the groupname for tracks should be the same even across species
			//cout << groupname << endl;

			// then generate name
			string name = "";
			for(vector<string>::const_iterator itor = namingKeys.begin(); itor != namingKeys.end(); itor++) {
				if(keyValuePair.find(*itor) != keyValuePair.end()) {
					if(!name.empty()) {
						name += "_";
					}
					name += getBefore(keyValuePair.find(*itor)->second, "_");
				}
			}
			if(!name.empty()) {
				if(trackGroupTable.find(groupname) == trackGroupTable.end()) {
					trackGroupTable.insert(pair<string, map<string, map<string, string> > >(groupname, map<string, map<string, string> >()));
				}
				map<string, map<string, string> > &trackTable = trackGroupTable[groupname];
				// write to map
				trackTable.insert(pair<string, map<string, string> >(name, keyValuePair));
			}

		}
		spcTrackTable.insert(pair<string, map<string, map<string, map<string, string> > > >(spcName, trackGroupTable));
	}

	cout << "Reading tracks done." << endl;

	cout << "Total number of species: " << spcTrackTable.size() << endl;
	for(map<string, map<string, map<string, map<string, string> > > >::const_iterator itor = spcTrackTable.begin();
		itor != spcTrackTable.end(); itor++) {
			cout << itor->first << " has " << itor->second.size() << " groups." << endl;
	}

	// All files read, now proceed to write mysql tables
	//
	map<string, string> compSeriesMap;	// this is for the compSeries between different species
	// This is used to decide if compSeries is there (is this needed?)

	try {
		sql::Driver *driver;
		sql::Connection *con, *concpb;
		sql::Statement *stmt;
		sql::PreparedStatement *stmtTrackDb, *stmtcpb;

		driver = get_driver_instance();
		con = driver->connect("tcp://localhost:3306", ucscmysqluser, ucscmysqlpass);
		con->setAutoCommit(false);				// in case something weird happen to the program
		concpb = driver->connect("tcp://localhost:3306", cpbmysqluser, cpbmysqlpass);
		con->setAutoCommit(false);				// in case something weird happen to the program

		cout << "Database connected." << endl;

		concpb->setSchema("compbrowser");
		stmtcpb = concpb->prepareStatement("REPLACE INTO TrackInfo VALUES(?, ?, ?, ?, ?, ?, ?, ?)");

		// enumerate species
		for(map<string, map<string, map<string, map<string, string> > > >::const_iterator spcItor = spcTrackTable.begin();
				spcItor != spcTrackTable.end(); spcItor++) {
			string spcName = spcItor->first;
			con->setSchema(spcName);

			stmtTrackDb = con->prepareStatement("REPLACE INTO trackDb VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
			stmt = con->createStatement();

			int superPriority = 0;

			const map<string, map<string, map<string, string> > > &trackGroupTable = spcItor->second;
			for(map<string, map<string, map<string, string> > >::const_iterator grpItor = trackGroupTable.begin();
					grpItor != trackGroupTable.end(); grpItor++) {
			    // first try to see if this group has a compSeries outside
			    bool hasCompSeries = false, hasSuperTrack = false;
				int subPriority = 0;
				string compGroupID = "", compGroupSettings = "";
			    for(map<string, map<string, map<string, map<string, string> > > >::const_iterator otherSpcItor = spcTrackTable.begin();
					    otherSpcItor != spcTrackTable.end(); otherSpcItor++) {
				    if(otherSpcItor->first != spcName) {
					    if(otherSpcItor->second.find(grpItor->first) != otherSpcItor->second.end()) {
							// add judgements to check if this is really compGroup 
							// (need to match at least one entry in groupMap)
							if(hasCompGroupJudge(grpItor->second, groupMap)) {
								hasCompSeries = true;
								compGroupID = getCompSeriesID(grpItor->second, groupMap);
								compGroupSettings = getCompSeriesInfo(grpItor->second, groupMap);
							}
						    break;		// it has a match, but is not compSeries
					    }
				    }
			    }
				
//				cout << grpItor->first << " - " << flush;
				string superName;
			    // next see if this group has more than one track (supertrack is needed)
			    if(grpItor->second.size() > 1) {
				    hasSuperTrack = true;
				    superName = grpItor->first + "_super";
				    // this is the values that goes into the database
			    }

				cout << grpItor->first << " - " << flush;
				// write every subtrack into the database first
				for(map<string, map<string, string> >::const_iterator trackItor = grpItor->second.begin();
					trackItor != grpItor->second.end(); trackItor++) {
						subPriority++;
						map<string, string> allValues = getShortAndLongLabel(trackItor->second);
						cout << (hasSuperTrack? "": "(Single) ") << trackItor->first << " ..." << flush;
						allValues["settings"] = getSettings(trackItor->second, allValues, trackItor->first,
							PRIORITY_BASE + ((float) superPriority) + ((float) subPriority) / (float) 100,
							compGroupSettings, compGroupID, superName);
						istringstream istrhtml(allValues["html"]), istrSettings(allValues["settings"]);
						// now everything is there, write into database
						stmtTrackDb->setString(1, trackItor->first);			// tableName	varchar(255)
						stmtTrackDb->setString(2, allValues["shortlabel"]);		// shortLabel	varchar(255)
						stmtTrackDb->setString(3, TRACKTYPE);					// type		varchar(255)
						stmtTrackDb->setString(4, allValues["longlabel"]);		// longLabel	varchar(255)
						if(!hasSuperTrack && hasCompSeries) {
							// not child and is compSeries enabled
							stmtTrackDb->setInt(5, 1);							// visibility	tinyint(3) unsigned
						} else {
							stmtTrackDb->setInt(5, 0);							// visibility	tinyint(3) unsigned
						}
						stmtTrackDb->setDouble(6, (double) PRIORITY_BASE 
							+ ((double) superPriority) 
							+ ((double) subPriority) / (double) 100);			// priority	float
						stmtTrackDb->setInt(7, 0);								// colorR	tinyint(3) unsigned
						stmtTrackDb->setInt(8, 0);								// colorG	tinyint(3) unsigned
						stmtTrackDb->setInt(9, 0);								// colorB	tinyint(3) unsigned
						stmtTrackDb->setInt(10, 0);								// altColorR	tinyint(3) unsigned
						stmtTrackDb->setInt(11, 0);								// altColorG	tinyint(3) unsigned
						stmtTrackDb->setInt(12, 0);								// altColorB	tinyint(3) unsigned
						stmtTrackDb->setInt(13, 0);								// useScore	tinyint(3) unsigned
						stmtTrackDb->setInt(14, 0);								// private	tinyint(3) unsigned
						stmtTrackDb->setInt(15, 0);								// restrictCount	int(11)
						stmtTrackDb->setString(16, "");							// restrictList	longblob
						stmtTrackDb->setString(17, "");							// url		longblob
						stmtTrackDb->setBlob(18, &istrhtml);					// html		longblob
						stmtTrackDb->setString(19, "encode");					// grp		varchar(255)
						stmtTrackDb->setInt(20, 0);								// canPack	tinyint(3) unsigned
						stmtTrackDb->setBlob(21, &istrSettings);				// settings	longblob
						stmtTrackDb->executeUpdate();

						// insert corresponding stuff in compbrowser

						stmtcpb->setString(1, trackItor->first);
						stmtcpb->setString(2, spcName);
						stmtcpb->setString(3, allValues["shortlabel"]);
						stmtcpb->setString(4, allValues["longlabel"]);
						stmtcpb->setString(5, TRACKTYPE);
						if(hasSuperTrack) {
							stmtcpb->setString(6, superName);
						} else {
							stmtcpb->setString(6, trackItor->first);
						}
						stmtcpb->setString(7, trackItor->second.find("url")->second);
						stmtcpb->setInt(8, 1);
						stmtcpb->executeUpdate();

						// and insert a new table for the track
						stmt->execute("CREATE TABLE IF NOT EXISTS `" + trackItor->first + "` (`fileName` varchar(255) NOT NULL) ENGINE=InnoDB");
						stmt->execute("DELETE FROM `" + trackItor->first + "`");
						stmt->execute("REPLACE INTO `" + trackItor->first + "` VALUES('" + trackItor->second.find("url")->second + "')");
						cout << "done. " << flush;

				}

				// After that, insert the super track in trackDb
				if(hasSuperTrack) {
					//cout << superName << flush;
					map<string, string> allValues = getShortAndLongLabel(grpItor->second);
					allValues["settings"] = getSettings(grpItor->second, allValues, superName,
						PRIORITY_BASE + ((float) superPriority),
						compGroupSettings, compGroupID);
					istringstream istrhtml(allValues["html"]), istrSettings(allValues["settings"]);
					// now everything is there, write into database
					stmtTrackDb->setString(1, superName);			// tableName	varchar(255)
					stmtTrackDb->setString(2, allValues["shortlabel"]);		// shortLabel	varchar(255)
					stmtTrackDb->setString(3, TRACKTYPE);					// type		varchar(255)
					stmtTrackDb->setString(4, allValues["longlabel"]);		// longLabel	varchar(255)
					if(hasCompSeries) {
						stmtTrackDb->setInt(5, 1);								// visibility	tinyint(3) unsigned
					} else {
						stmtTrackDb->setInt(5, 0);								// visibility	tinyint(3) unsigned
					}
					stmtTrackDb->setDouble(6, (double) PRIORITY_BASE 
						+ ((double) superPriority));						// priority	float
					stmtTrackDb->setInt(7, 0);								// colorR	tinyint(3) unsigned
					stmtTrackDb->setInt(8, 0);								// colorG	tinyint(3) unsigned
					stmtTrackDb->setInt(9, 0);								// colorB	tinyint(3) unsigned
					stmtTrackDb->setInt(10, 0);								// altColorR	tinyint(3) unsigned
					stmtTrackDb->setInt(11, 0);								// altColorG	tinyint(3) unsigned
					stmtTrackDb->setInt(12, 0);								// altColorB	tinyint(3) unsigned
					stmtTrackDb->setInt(13, 0);								// useScore	tinyint(3) unsigned
					stmtTrackDb->setInt(14, 0);								// private	tinyint(3) unsigned
					stmtTrackDb->setInt(15, 0);								// restrictCount	int(11)
					stmtTrackDb->setString(16, "");							// restrictList	longblob
					stmtTrackDb->setString(17, "");							// url		longblob
					stmtTrackDb->setBlob(18, &istrhtml);					// html		longblob
					stmtTrackDb->setString(19, "encode");					// grp		varchar(255)
					stmtTrackDb->setInt(20, 0);								// canPack	tinyint(3) unsigned
					stmtTrackDb->setBlob(21, &istrSettings);				// settings	longblob
					stmtTrackDb->executeUpdate();
				}

				cout << endl;
				superPriority++;

			}
			delete stmtTrackDb;
			delete stmt;

			cout << "Species " << spcName << " done." << endl;
		}

		con->commit();
		con->close();

		delete stmtcpb;
		concpb->commit();
		concpb->close();

		delete con;	
		delete concpb;

	} catch(sql::SQLException &e) {
		cerr << "# ERR: SQLException in " << __FILE__;
		cerr << "(" << __func__ << ") on line " 
			<< __LINE__ << endl;
		cerr << "# ERR: " << e.what();
		cerr << " (MySQL error code: " << e.getErrorCode();
		cerr << ", SQLState: " << e.getSQLState() << 
			" )" << endl;

	}


}
