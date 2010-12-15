/*
 *	LinkedNotes Google Chrome Extension
 *	Autor: Pavel Kolmogorov
 */
var bgPage = chrome.extension.getBackgroundPage();
var logging = true;

function List(){
    var l = this;
    this.currentNote = {};
    this.searchString = "";
    this.timeoutForSearch = null;
    this.inputSearcher = "";
    this.currentId = bgPage.getItem("selected");
    this.fontSize = bgPage.getItem("fontsize");
    this.normalFontSize;
    
    this.FillList = function(){
        $("#NotesList").empty();
        
        if (this.fontSize && this.fontSize == "big") {
            this.SwitchFontsize(this.fontSize);
        }
		var allKeys = bgPage.getAllKeys();
        var found = false;
        var noteExist = false;
        var nLast = 0;
        allKeys.sort();
        for (var i = 0; i < allKeys.length; i++) {
            if (allKeys[i].indexOf(';') != -1) {
                var note = new bgPage.Note(allKeys[i]);
                if (note.text == bgPage.DEL_MARK) {
                    continue;
                }
                noteExist = true;
                this.InsertNote(note);
                nLast = i;
                if (allKeys[i] == this.currentId) {
                    found = true;
                }
            }
        }
        if (!noteExist) {
            this.AddEmptyNote();
            return;
        }
        
        if (!found) {
            this.currentId = allKeys[nLast];
        }
        this.SelectNote(this.currentId, true);
        var el = document.getElementById(this.currentId);
        el.scrollIntoView(true);
    };
    this.InsertNote = function(note){
        $("#NotesList").append(note.Item());
    };
    this.ShowMessage = function(text, color){
        $("div.message").css("display", "none");
        $("div.message").css("top", "2px")
        if (color) 
            $("div.message").css("color", color);
        $("div.message").text(text);
        $("div.message").fadeIn('fast', function(){
            setTimeout(function(){
                $("div.message").fadeOut('slow', function(){
                    $("div.message").text('');
                });
            }, 4000);
        });
    };
    this.SelectNote = function(id, force){
        if ($("div[id='" + id + "']").length) {
            $("div.highlight").removeClass("highlight");
            $("div[id='" + id + "']").addClass("highlight");
            if (this.currentId != id) {
                bgPage.setItem("selection_start", '0');
                bgPage.setItem("selection_end", '0');
                bgPage.setItem("selection_scroll", '0');
            };
            this.currentId = id;
            if (id != this.currentNote.id || force) {
                this.currentNote = new bgPage.Note(id);
            }
            this.FillEdit(this.currentNote);
        }
    };
    this.FillEdit = function(note){
        $("textarea.note").empty();
        if (note.text != bgPage.DEL_MARK) 
            $("textarea.note").text(note.text);
        $("textarea.note").attr("id", note.id);
        restoreSelection();
    };
	this.Filter = function(){
		if($("input#quick_search").attr("value").length > 0){
			$("input#quick_search").attr("value", "");
			$("span.filter_button_hi").attr("class", "filter_button");
			$("a#filter").attr("title", chrome.i18n.getMessage("filter"));
			l.searchString = ""; l.StartSearch();
		}
		else {
			chrome.tabs.getSelected(null, function(tab) { $("input#quick_search").attr("value", tab.url); l.searchString = tab.url; l.StartSearch();});	
		}
    };
    this.SelectNoteAndGo = function(id){
        this.SelectNote(id);
        if (this.currentNote.url.length != 0) {
            chrome.tabs.create({
                "url": this.currentNote.url,
                "selected": true
            });
        }
    };
    this.AddEmptyNote = function(){
        this.currentId = bgPage.createKey("");
        this.currentNote = new bgPage.Note(this.currentId);
        this.InsertNote(this.currentNote);
        this.SelectNote(this.currentId);
        var el = document.getElementById(this.currentId);
        el.scrollIntoView(true);
    };
    this.RemoveNote = function(id){
        if (id && id != $("div.highlight").attr("id")) {
            var el = document.getElementById(id);
            if (el != null && el.tagName.toLowerCase() == "div") {
                $(el).remove();
            }
            bgPage.setItem(id, bgPage.DEL_MARK);
            return;
        }
   
        var next = $("div.highlight + div.note").attr("id");
        if (this.currentId != "") {
            $("textarea.note").text("");
            $("div.highlight").remove();
            bgPage.setItem(this.currentId, bgPage.DEL_MARK);
            //bgPage.removeItem(this.currentId);
        }
        if (next) {
            this.currentId = next;
        }
        else {
            this.currentId = $("div#NotesList div.note:last").attr("id");
        }
        if (this.currentId == undefined) {
            this.currentId = "";
            $("textarea.note").attr("id", "");
            $("textarea.note").text("");
            this.AddEmptyNote();
        }
        else {
            this.SelectNote(this.currentId);
        }
    };
    this.UpdateNote = function(object){
        bgPage.setItem("selection_start", $("textarea.note").attr("selectionStart"));
        bgPage.setItem("selection_end", $("textarea.note").attr("selectionEnd"));
        bgPage.setItem("selection_scroll", $("textarea.note").scrollTop());
        if (object.value == object.defaultValue) {
            return;
        }
        var newArray = object.id.split(';');
        var time = new Date(newArray[0]);
        var url = unescape(newArray[1]);
        var note = object.value;
        bgPage.setItem(object.id, bgPage.DEL_MARK);
        var newId = bgPage.addNote(url, note);
        this.currentNote = new bgPage.Note(newId);
        $("textarea.note").attr("id", newId);
        $("div.highlight").attr("id", newId);
        $("div.highlight").empty();
        $("div.highlight").append(this.currentNote.ItemContent());
        $("div.highlight").attr("title", this.currentNote.title);
        this.currentId = newId;
        this.SaveState();
    };
    this.SaveState = function(){
        bgPage.setItem("selected", this.currentId);
        bgPage.setItem("fontsize", this.fontSize);
    };
    this.BindSearcher = function(input_sel){
        var objInput = $(input_sel);
        if (objInput) {
            this.inputSearcher = input_sel;
            objInput.bind("keyup", this.CheckResults);
        }
    };
    this.StartSearch = function(){
		if (this.searchString.length > 0){
			$("span.filter_button").attr("class", "filter_button_hi");
			$("a#filter").attr("title", chrome.i18n.getMessage("clear_filter"));
		}
        var vals = this.searchString.toLowerCase().split(' ');
        var allKeys = bgPage.getAllKeys();
        for (var i = 0; i < allKeys.length; i++) {
            if (allKeys[i].indexOf(';') != -1) {
                var note = new bgPage.Note(allKeys[i]);
                if (note.text == bgPage.DEL_MARK) {
                    continue;
                }
                var el = document.getElementById(note.id);
                if (el != null && el.tagName.toLowerCase() == "div") {
                    if (this.searchString == "" || note.Find(vals)) {
                        el.style.display = '';
                    }
                    else {
                        el.style.display = 'none';
                    }
                    
                }
            }
        }
        var foundId = $("#NotesList div:visible").first().attr("id");
        this.SelectNote(foundId);
        $(this.inputSearcher).focus();
    };
    
    this.CheckResults = function(){
        l.searchString = $(this).val();
        window.clearTimeout(l.timeoutForSearch);
        l.timeoutForSearch = window.setTimeout(function(){
            l.StartSearch();
        }, 110);
    };
    
    this.SwitchFontsize = function(size){
        var s = "small";
        if (l.normalFontSize == undefined){
        	l.normalFontSize = $("textarea.note").css("font-size");
        }
        if (size == undefined) {
            if (l.fontSize == "big") {
                l.fontSize = "small";
            }
            else {
                l.fontSize = "big";
            }
            s = l.fontSize;
        }
        else {
            s = size;
        }
        if (s == "big") {
            $("textarea.note").css("font-size", parseInt(l.normalFontSize) + 3 + "px");
            $("#myMenu1 li#font span").html("A&rarr;<font style='font-variant: small-caps;'>a</font>");
        }
        else {
            $("textarea.note").css("font-size", l.normalFontSize);
            $("#myMenu1 li#font span").html("<font style='font-variant: small-caps;'>a</font>&rarr;A");
        }
    }
    this.ShowSyncProgress = function(show){
        if (show) {
            $("a#sync span").addClass("sync_button_progress");
            $("a#sync span").removeClass("sync_button");
        }
        else {
            $("a#sync span").removeClass("sync_button_progress");
            $("a#sync span").addClass("sync_button");
        }
    }
};

var notes = new List();

function openOptions(){
    chrome.tabs.create({
        url: 'options.html'
    });
}

function positionSave(){
    bgPage.setItem("selection_start", $("textarea.note").attr("selectionStart"));
    bgPage.setItem("selection_end", $("textarea.note").attr("selectionEnd"));
    bgPage.setItem("selection_scroll", $("textarea.note").scrollTop());
	searchCurrentLink();
}

function restoreSelection(){
    $("textarea.note").focus();
    $("textarea.note").attr("selectionStart", bgPage.getItem("selection_start"));
    $("textarea.note").attr("selectionEnd", bgPage.getItem("selection_end"));
    $("textarea.note").scrollTop(bgPage.getItem("selection_scroll"));
}
function ContextLink(){
	this.link = "";
	this.SearchLink = function(){
		this.link = "";
		var start = $("textarea.note").attr("selectionStart");
		var end = $("textarea.note").attr("selectionEnd");
		var url = /(((https?)|(ftp)|(magnet)):\/\/([\-\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\/+@&#;`~=%!]*)(\.\w{2,})?)*\/?)/gi;
		var url2 = /((magnet:\?xt=urn:)[\w\+%&=:#`~!;\.]*)/gi;
		while ((m = url.exec(notes.currentNote.text)) !== null) {
			if(m.index <= start && (m[0].length + m.index) >= end){
				this.link = m[0];
				break;
			}
		}
		if (!this.IsFound())
		{
			while ((m = url2.exec(notes.currentNote.text)) !== null) {
				if(m.index <= start && (m[0].length + m.index) >= end){
					this.link = m[0];
					break;
				}
			}
		}
	};
	
	this.IsFound = function(){
		return this.link.length > 0;
	}
	
	this.Go = function(){
        if (this.IsFound()) {
            chrome.tabs.create({
                "url": this.link,
                "selected": false
            });
        }
    };
}

var currentlink = new ContextLink();

function cut(){
    restoreSelection();
    document.execCommand("cut");
}

function copy(){
    restoreSelection();
    if ($("textarea.note").attr("selectionStart") == $("textarea.note").attr("selectionEnd")) {
        $("textarea.note").attr("selectionStart", 0);
        $("textarea.note").attr("selectionEnd", $("textarea.note").text().length);
    }
    document.execCommand("copy");
}

function paste(){
    restoreSelection();
    document.execCommand('paste');
}

