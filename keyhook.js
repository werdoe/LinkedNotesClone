/*
 *	LinkedNotes Google Chrome Extension
 *	Autor: Pavel Kolmogorov
 */

var currentKeys = {"Ctrl" : false, "Shift": false, "Alt": false, "Key": '' };

function keyUpLN(e){
    var code = null;
    if (document.all) {
        var evnt = window.event;
        code = evnt.keyCode;
    }
    else {
        code = e.keyCode;
    }
    decodeKeysLN(code, false);
}

function keyDownLN(e){
    var code = null;
    if (document.all) {
        var event = window.event;
        code = event.keyCode;
    }
    else {
        code = e.keyCode;
    }
    decodeKeysLN(code, true);
}

function decodeKeysLN(Code, IsKeyDown){
	currentKeys.Key = '';
	switch(Code)
	{
		case 16: currentKeys.Shift = IsKeyDown; break;
		case 17: currentKeys.Ctrl = IsKeyDown; break;
		case 18: currentKeys.Alt = IsKeyDown; break;
		default:
			if (Code != null && IsKeyDown) {
				var chark = String.fromCharCode(Code);
				currentKeys.Key = chark.toLowerCase();
			}
			break;
	}
	if ((!currentKeys.Shift) && currentKeys.Ctrl && currentKeys.Alt && currentKeys.Key == 'n'){
		var additionalInfo = {
	    "id": "key"
		};
		chrome.extension.connect().postMessage(additionalInfo);	
	}
}

function installHookLN(){
    document.addEventListener('keydown', keyDownLN);
    document.addEventListener('keyup', keyUpLN);
    var iframes = document.getElementsByTagName("iframe");
    var i = 0;
    for (i = 0; i < iframes.length; i++) {
        if (iframes[i].contentDocument != null) {
            iframes[i].contentDocument.addEventListener('keydown', keyDownLN);
            iframes[i].contentDocument.addEventListener('keyup', keyUpLN);
        }
    }
}

installHookLN();