// processing UI components (such as error)
// separated for future UI upgrade stuff

function UIObject(win) {
	this.core = win;
	if(win.document) {
		this.doc = win.document;
	}
	
	this.left_value = 0;
	this.left_width = 290;
	
	this.navInitialized = false;
}

UIObject.prototype.alert = function (msg) {
	return this.core.alert(msg);
};

UIObject.prototype.confirm = function (msg) {
	return this.core.confirm(msg);
};

UIObject.prototype.initNavSidebar = function() {
	if(this.navInitialized) {
		return;
	}
	this.doc.getElementById('sidebar1').style.left = this.left_value + "px";
	this.doc.getElementById('leftborder').style.left = this.left_value + this.left_width + "px";
	this.doc.getElementById('mainContent').style.left = this.left_value + this.left_width + 5 + "px";
	this.navInitialized = true;
};

UIObject.prototype.switchLeft = function() {
	if(!this.navInitialized) {
		this.initNavSidebar();
	}
	if(this.left_value >= 0) {
		this.left_value = -this.left_width;
		this.doc.getElementById('sidebar1').style.left = this.left_value + "px";
		this.doc.getElementById('leftborder').style.left = this.left_value + this.left_width + "px";
		this.doc.getElementById('mainContent').style.left = this.left_value + this.left_width + 5 + "px";
		this.doc.getElementById('leftbutton').style.backgroundImage = "url(cpbrowser/images/right_arrow.gif)";
	} else {
		this.left_value = 0;
		this.doc.getElementById('sidebar1').style.left = this.left_value + "px";
		this.doc.getElementById('leftborder').style.left = this.left_value + this.left_width + "px";
		this.doc.getElementById('mainContent').style.left = this.left_value + this.left_width + 5 + "px";
		this.doc.getElementById('leftbutton').style.backgroundImage = "url(cpbrowser/images/left_arrow.gif)";
	}
};

function fireCoreSignal(signame, sigdata) {
	// fire iron-signals
	document.body.dispatchEvent(new CustomEvent('iron-signal', {bubbles: true, cancelable: true, detail: {name: signame, data: sigdata}}));
}