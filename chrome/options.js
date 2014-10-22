// options.js
(function() {

var noop = function() {}

// UI
var lengthEl = document.getElementById("length"),
	usernameEl = document.getElementById("username");

(function read() {
	chrome.storage.sync.get("length", function(o) {
		var length = o.length;
		if(typeof length === 'string') lengthEl.value = length || 70;
	});
	chrome.storage.sync.get("username", function(o) {
		var username = o.username;
		if(typeof username === 'string') usernameEl.value = username;
	});
})();

lengthEl.oninput = function() {
	chrome.storage.sync.set({'length': lengthEl.value}, noop);
}

usernameEl.oninput = function() {
	chrome.storage.sync.set({'username': usernameEl.value}, noop);
}

}).call(this);
