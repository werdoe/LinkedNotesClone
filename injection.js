/*
 *	LinkedNotes Google Chrome Extension
 *	Autor: Pavel Kolmogorov
 */

function rangeIntersectsNode(range, node){
    var nodeRange;
    if (range.intersectsNode) {
        return range.intersectsNode(node);
    }
    else {
        nodeRange = node.ownerDocument.createRange();
        try {
            nodeRange.selectNode(node);
        } 
        catch (e) {
            nodeRange.selectNodeContents(node);
        }     
        return range.compareBoundaryPoints(Range.END_TO_START, nodeRange) == -1 &&
        range.compareBoundaryPoints(Range.START_TO_END, nodeRange) == 1;
    }
}

function getSelectedElementTags(win) {
    var range, sel, elmlist, treeWalker, containerElement;
	var linksText = '';
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
        range = sel.getRangeAt(0);
    }

    if (range) {
        containerElement = range.commonAncestorContainer;
        if (containerElement.nodeType != 1) {
            containerElement = containerElement.parentNode;
        }

        treeWalker = win.document.createTreeWalker(
            containerElement,
            NodeFilter.SHOW_ELEMENT,
            function(node) { return rangeIntersectsNode(range, node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; },
            false
        );

        elmlist = [treeWalker.currentNode];
        while (treeWalker.nextNode()) {
            elmlist.push(treeWalker.currentNode);
        }

		for (var i = 0; i < elmlist.length; i++) {
			if (elmlist[i].localName == 'a') {
				linksText += elmlist[i].innerText + '[' + elmlist[i].href + ' ]\n';
			}
			else if(elmlist[i].localName == 'img'){
				linksText += elmlist[i].alt + '[' + elmlist[i].src + ' ]\n';
			}
			else if(elmlist[i].localName == 'embed'){
				linksText += elmlist[i].name + '[' + elmlist[i].src + ' ]\n';
			}
			else if(elmlist[i].localName == 'video'){
				linksText += 'VIDEO[' + elmlist[i].src + ' ]\n';
			}
			else if(elmlist[i].localName == 'source' || elmlist[i].localName == 'audio'){
				linksText += 'AUDIO[' + elmlist[i].src + ' ]\n';
			}
		}
    }
	return linksText;
}

var additionalInfo = {
    "id": "note",
    "selectionText": window.getSelection().toString(),
    "linksText": getSelectedElementTags(window)
};

if (additionalInfo.selectionText != ""){
	chrome.extension.connect().postMessage(additionalInfo);	
}
