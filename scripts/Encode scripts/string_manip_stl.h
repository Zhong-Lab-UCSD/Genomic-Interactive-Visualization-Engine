#ifndef _STRING_MANIPULATION_STL
#define _STRING_MANIPULATION_STL

#include <string>
#include <vector>

std::string toLower(const std::string &main);

std::string toUpper(const std::string &main);

// This function is case sensitive, get the sub std::string before strBefore from main
// bInc indicates whether strBefore itself is included in the result
// bRtnAll indicates whether the return std::string is full std::string or "" if strBefore is not found in main
std::string getBefore(const std::string &main, const std::string &strBefore, const bool bInc = false, const bool bRtnAll = true);

// If case need to be insensitive, then call this function
std::string getBeforeIS(const std::string &main, const std::string &strBefore, const bool bInc = false, const bool bRtnAll = true);

// get the substd::string after strAfter, case sensitive
// bInc indicates whether strAfter itself is included in the result
// bRtnAll indicates whether the return std::string is full std::string or "" if strAfter is not found in main
std::string getAfter(const std::string &main, const std::string &strAfter, const bool bInc = false, const bool bRtnAll = false);

// case insensitive version of getAfter
std::string getAfterIS(const std::string &main, const std::string &strAfter, const bool bInc = false, const bool bRtnAll = false);

// get sub-std::string between strStart and strEnd
// bIncStart means whether strStart is included, similar for bIncEnd
// bNegStart means whether strStart can be neglected (in case of not found), similar for bNegEnd
std::string getBetween(const std::string &main, const std::string &strStart, const std::string &strEnd, bool bIncStart = false,
				   bool bIncEnd = false, bool bNegStart = false, bool bNegEnd = true);

// case insensitive version of getBetween
std::string getBetweenIS(const std::string &main, const std::string &strStart, const std::string &strEnd, bool bIncStart = false,
				   bool bIncEnd = false, bool bNegStart = false, bool bNegEnd = true);

// so far token delimiters has been not characters, so no IS version is built yet, but may be built in case they are needed
std::string getToken(const std::string &main, int i, const std::string &token = "\t");

// get token with de-quotation, notice the sequence of parameters
std::string getToken(const std::string &main, const std::string &token, int i, const std::string &quote = "\"");

// there may be case insensitive version of getToken, but not needed so far
std::string getTokenIS(const std::string &main, int i, const std::string &token = "\t");
std::string getTokenIS(const std::string &main, const std::string &token, int i, const std::string &quote = "\"");

// count the number of tokens
// for similar reason, no IS version is realized so far
long countTokens(const std::string &main, const std::string &token = "\t");

// count the number of tokens, with quotations removed
long countTokens(const std::string &main, const std::string &token, const std::string &quote);

std::string trimString(const std::string &main, const std::string &token = " ");			// trim the string

// split main by tokens
std::vector<std::string> splitTokens(const std::string &main, const std::string &token = "\t", const std::string &quote = "\"", const bool bRemoveEndEmpty = false);

bool containsWholeWord(const std::string &main, const std::string &word);

#endif
