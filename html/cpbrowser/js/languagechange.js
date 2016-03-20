var json = (function () {
    var json = null;
    $.ajax({
        'async': false,
        'global': false,
        'url': "cpbrowser/js/langTable.json",
        'dataType': "json",
        'success': function (data) {
            json = data;
        }
    });
    return json;
})(); 

function setTexts(language){

var x=document.getElementsByClassName("text")


//var keys = Object.keys(json);
var keys2 = Object.keys(x);

for (i=0;i<x.length;i++){
	x[i].innerHTML=json[keys2[i]][language];
	/*for (j=0;j<keys.length;j++){
		if (x[i]==keys[j]())
			x[i].innerHTML=y[j][language];

	}*/
}

}