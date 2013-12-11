#include "string_manip_stl.h"

#include <cctype>

std::string toLower(const std::string &main) {
	std::string result = main;
	for(unsigned int i=0; i<result.length(); i++) {
		result[i] = tolower(result[i]);
	}
	return result;
}

std::string toUpper(const std::string &main) {
	std::string result = main;
	for(unsigned int i=0; i<result.length(); i++) {
		result[i] = toupper(result[i]);
	}
	return result;
}

// This function is case sensitive, get the sub std::string before strBefore from main
// bInc indicates whether strBefore itself is included in the result
// bRtnAll indicates whether the return std::string is full std::string or "" if strBefore is not found in main
std::string getBefore(const std::string &main, const std::string &strBefore, const bool bInc, const bool bRtnAll) {
	long i = bInc? (long) strBefore.length(): 0;
	if(main.find(strBefore) == std::string::npos) {
		return bRtnAll? main: "";
	}
	return main.substr(0, main.find(strBefore) + i);
}

// If case need to be insensitive, then call this function
std::string getBeforeIS(const std::string &main, const std::string &strBefore, const bool bInc, const bool bRtnAll) {
	std::string strToCmp = toLower(main), strbfr = toLower(strBefore), result = main;
	long i = bInc? (long) strbfr.length(): 0;
	if(strToCmp.find(strbfr) == std::string::npos) {
		return bRtnAll? result: "";
	}
	result = main.substr(0, strToCmp.find(strbfr) + i);
	return result;
}

// get the substd::string after strAfter, case sensitive
// bInc indicates whether strAfter itself is included in the result
// bRtnAll indicates whether the return std::string is full std::string or "" if strAfter is not found in main
std::string getAfter(const std::string &main, const std::string &strAfter, const bool bInc, const bool bRtnAll) {
	long i = bInc? 0: (long) strAfter.length();
	if(main.find(strAfter) == std::string::npos) {
		return bRtnAll? main: "";
	}
	return main.substr(main.find(strAfter) + i);
}

// case insensitive version of getAfter
std::string getAfterIS(const std::string &main, const std::string &strAfter, const bool bInc, const bool bRtnAll) {
	std::string strToCmp = toLower(main), straft = toLower(strAfter), result = main;
	long i = bInc? 0: (long) straft.length();
	if(strToCmp.find(straft) == std::string::npos) {
		return bRtnAll? result: "";
	}
	result = main.substr(strToCmp.find(straft) + i);
	return result;
}

// get sub-std::string between strStart and strEnd
// bIncStart means whether strStart is included, similar for bIncEnd
// bNegStart means whether strStart can be neglected (in case of not found), similar for bNegEnd
std::string getBetween(const std::string &main, const std::string &strStart, const std::string &strEnd, bool bIncStart,
				   bool bIncEnd, bool bNegStart, bool bNegEnd) {
	std::string result = main;
	result = getAfter(result, strStart, bIncStart, bNegStart);
	if(result.empty())
		return result;
	return getBefore(result, strEnd, bIncEnd, bNegEnd);
}

// case insensitive version of getBetween
std::string getBetweenIS(const std::string &main, const std::string &strStart, const std::string &strEnd, bool bIncStart,
				   bool bIncEnd, bool bNegStart, bool bNegEnd) {
	std::string result = main;
	result = getAfterIS(result, strStart, bIncStart, bNegStart);
	if(result.empty())
		return result;
	return getBeforeIS(result, strEnd, bIncEnd, bNegEnd);
}

// so far token delimiters has been not characters, so no IS version is built yet, but may be built in case they are needed
std::string getToken(const std::string &main, int i, const std::string &token) {
	// i is zero-based
	std::string result = main;
	while(i > 0 && !result.empty()) {
		result = getAfter(result, token);
		i--;
	}
	return getBefore(result, token);
}

// get token with de-quotation, notice the sequence of parameters
std::string getToken(const std::string &main, const std::string &token, int i, const std::string &quote) {
	// i is zero-based
	// de-quotation
	std::string result = main;
	if(quote.empty())
		return getToken(main, i, token);
	while(i > 0 && !result.empty()) {
		if(result.find(quote) == std::string::npos || result.find(token) < result.find(quote)) {
			result = getAfter(result, token);
		} else {
			// remove quotation first
			result = getAfter(result, quote);
			result = getAfter(result, quote);
			result = getAfter(result, token);
		}
		i--;
	}
	if(result.find(quote) == std::string::npos || result.find(token) < result.find(quote)) {
		return getBefore(result, token);
	} else {
		return getBetween(getBefore(result, token), quote, quote);
	}
}

// there may be case insensitive version of getToken, but not needed so far
//std::string getTokenIS(const std::string &main, int i, const std::string &token = "\t");
//std::string getTokenIS(const std::string &main, const std::string &token, int i, const std::string &quote = "\"");

// count the number of tokens
// for similar reason, no IS version is realized so far
long countTokens(const std::string &main, const std::string &token) {
	// do not include quotations
	std::string result = main;
	long count = 0;
	while(!result.empty()) {
		count++;
		result = getAfter(result, token);
	}
	return count;
}

// count the number of tokens, with quotations removed
long countTokens(const std::string &main, const std::string &token, const std::string &quote) {
	std::string result = main;
	long count = 0;
	if(quote.empty())
		return countTokens(main, token);
	while(!result.empty()) {
		count++;
		if(result.find(quote) == std::string::npos || result.find(token) < result.find(quote)) {
			result = getAfter(result, token);
		} else {
			// remove quotation first
			result = getAfter(result, quote);
			result = getAfter(result, quote);
			result = getAfter(result, token);
		}
	}
	return count;
}

std::string trimString(const std::string &main, const std::string &token) {
	std::string result = main;
	if(main.empty()) return result;
	while (result.find_first_of(token) == 0) {		// token at beginning
		if(result.length() > 1) {
			result = result.substr(1);
		} else {
			return "";
		}
	}
	if(result.empty()) return result;
	while (result.length() > 0 && result.find_last_of(token) == result.length() - 1) {
		if(result.length() > 1) {
			result = result.substr(0, result.length() - 1);
		} else {
			return "";
		}
	}
	return result;
}

// split main by tokens
std::vector<std::string> splitTokens(const std::string &main, const std::string &token, const std::string &quote, const bool bRemoveEndEmpty) {
	
	std::string result = main;
	std::vector<std::string> results;
	while(!result.empty()) {
		if(!quote.empty()) {
			if(result.find(quote) == std::string::npos || result.find(token) < result.find(quote)) {
				results.push_back(getBefore(result, token));
				result = getAfter(result, token);
			} else {
				// remove quotation first
				results.push_back(getBetween(result, quote, quote));
				result = getAfter(result, quote);
				result = getAfter(result, quote);
				result = getAfter(result, token);
			}
		} else {
			results.push_back(getBefore(result, token));
			result = getAfter(result, token);
		}
	}
	if(bRemoveEndEmpty) {
		while(!results.empty() && results.back().empty()) {
			results.pop_back();
		}
	}
	return results;
}

bool containsWholeWord(const std::string &main, const std::string &word) {
	std::string mainlow = toLower(main), wordlow = toLower(word);
	unsigned int iStart = 0;
	if(wordlow.empty()) return true;
	while(iStart < mainlow.length()) {
		if(mainlow.find(wordlow, iStart) == std::string::npos) return false;
		long i = (long) mainlow.find(wordlow, iStart);
		if(i != 0) {
			if((mainlow[i - 1] >= 'a' && mainlow[i - 1] <= 'z') || (mainlow[i - 1] >= '0' && mainlow[i - 1] <= '9')) {
				iStart += i + 1;
				continue;
			}
		}
		if(mainlow.length() <= i + wordlow.length())
			return true;
		if((mainlow[i + wordlow.length()] >= 'a' && mainlow[i + wordlow.length()] <= 'z') ||
		   (mainlow[i + wordlow.length()] >= '0' && mainlow[i + wordlow.length()] <= '9')) {
			iStart += i + 1;
			continue;
		}
		return true;
	}
	return false;
}
