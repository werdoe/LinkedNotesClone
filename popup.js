/*
 *	LinkedNotes Google Chrome Extension
 *	Autor: Pavel Kolmogorov
 */
var bgPage = chrome.extension.getBackgroundPage();
var DEL_MARK = "#del#";
var BLANK_URL = "about:blank";
var logging = true;
function Note(id){
    this.id = id;
    var newArray = id.split(';');
    this.modified = new Date(parseInt(newArray[0]));
    this.url = unescape(newArray[1]);
    this.title = chrome.i18n.getMessage("title_date", this.modified.toLocaleDateString() + " " + this.modified.toLocaleTimeString());
    this.icon = "simple";
    if (this.url.length != 0) {
        this.title += "\n" + chrome.i18n.getMessage("title_url", this.url);
        this.icon = "linked";
    }
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.text = bgPage.getItem(id);
    if (this.text == null) {
        this.text = "";
    };
    this.Html = function(len){
        var escaped = this.text;
        if (escaped != null && escaped != undefined && escaped != "") {
            var newArray = escaped.split('\n');
            for (var i = 0; i < newArray.length; i++) {
                if (newArray[i].length > 0) {
                    if (newArray[i].length > len) {
                        escaped = newArray[i].substr(0, len);
                    }
                    else {
                        escaped = newArray[i];
                    }
                    break;
                }
            }
        }
        var findReplace = [[/&/g, "&amp;"], [/</g, "&lt;"], [/>/g, "&gt;"], [/\"/g, "&quot;"]];
        for (var i = 0; i < findReplace.length; i++) {
            escaped = escaped.replace(findReplace[i][0], findReplace[i][1]);
        }
        return escaped;
    };
    this.ItemContent = function(){
        return '<span class="' + this.icon + '">' + this.Html(50) + '</span>';
    };
    this.Item = function(){
        return '<div title="' + this.title + '" class="note" id="' + this.id + '" ondblclick="notes.SelectNoteAndGo(this.id);" onclick="notes.SelectNote(this.id);">' + this.ItemContent() + '</div>';
    };
}

function List(){
    this.currentNote = {};
    this.currentId = bgPage.getItem("selected");
    this.FillList = function(){
        $("#NotesList").empty();
        var allKeys = bgPage.getAllKeys();
        var found = false;
        var noteExist = false;
        var nLast = 0;
        allKeys.sort();
        for (var i = 0; i < allKeys.length; i++) {
            if (allKeys[i].indexOf(';') != -1) {
                var note = new Note(allKeys[i]);
                if (note.text == DEL_MARK) {
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
	this.ShowMessage = function(text, color)
	{
		$("span#message").css("display", "none");
		if (color)
			$("span#message").css("color", color);
		$("span#message").text(text);
		$("span#message").fadeIn('fast', function(){
			setTimeout(function(){
				$("span#message").fadeOut('slow', function(){
					$("span#message").text('');
				});
			}, 4000);
		});
	};
    this.SelectNote = function(id, force){
        $("div.highlight").removeClass("highlight");
        $("div[id='" + id + "']").addClass("highlight");
        if (this.currentId != id) {
            bgPage.setItem("selection_start", '0');
            bgPage.setItem("selection_end", '0');
			bgPage.setItem("selection_scroll", '0');
        };
        this.currentId = id;
        if (id != this.currentNote.id || force) {
            this.currentNote = new Note(id);
        }
        this.FillEdit(this.currentNote);
    };
    this.FillEdit = function(note){
        $("textarea.note").empty();
		if(note.text != DEL_MARK)
        	$("textarea.note").text(note.text);
        $("textarea.note").attr("id", note.id);
        restoreSelection();
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
        this.currentNote = new Note(this.currentId);
        this.InsertNote(this.currentNote);
        this.SelectNote(this.currentId);
        var el = document.getElementById(this.currentId);
        el.scrollIntoView(true);
    };
    this.RemoveNote = function(){
        var next = $("div.highlight + div.note").attr("id");
        if (this.currentId != "") {
            $("textarea.note").text("");
            $("div.highlight").remove();
            bgPage.setItem(this.currentId, DEL_MARK);
            //bgPage.removeItem(this.currentId);
        }
        if (next) {
            this.currentId = next;
        }
        else {
            this.currentId = $("#NotesList div:last-child").attr("id");
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
		bgPage.setItem(object.id, DEL_MARK);
        //bgPage.removeItem(object.id);
        var newId = bgPage.addNote(url, note);
        this.currentNote = new Note(newId);
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
    };
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
}

function restoreSelection(){
    $("textarea.note").focus();
    $("textarea.note").attr("selectionStart", bgPage.getItem("selection_start"));
    $("textarea.note").attr("selectionEnd", bgPage.getItem("selection_end"));
	 $("textarea.note").scrollTop(bgPage.getItem("selection_scroll"));
}

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

var gbm = null;
function GoogleBookmarks(){
    this.url = "https://www.google.com/bookmarks/";
    this.sig = "";
    this.error = false;
    this.request = null;
    this.bookmarks = [];
    this.needLogin = false;
    this.Clear = function(){
        this.sig = "";
        this.error = false;
        this.bookmarks = [];
    };
    
    this.LoadBookmarks = function(afterLoaded){
        if (logging) 
            console.log("Loading...");
        
        if (this.request) 
            this.request.abort();
        this.request = $.ajax({
            type: "get",
            url: this.url + 'lookup',
            data: {
                q: "label:LinkedNotes",
                output: "rss",
                num: "50000"
            },
            success: function(data, textStatus){
                if (gbm) {
                    gbm.needLogin = false;
                    gbm.ParseBookmarks(data);
                    gbm.error = false;
                }
                if (afterLoaded) 
                    afterLoaded();
            },
            error: function(){
                if (gbm) {
                    gbm.error = true;
                }
                if (logging) 
                    console.log('Bookmarks not loaded');
                if (afterLoaded) 
                    afterLoaded();
            },
            complete: function(XMLHttpRequest, textStatus){
                if (logging) {
                    console.log('Bookmarks loaded:' + textStatus);
                    console.log(XMLHttpRequest);
                }
                if (gbm) {
                    if (XMLHttpRequest.status == 401) {
                        gbm.needLogin = true;
                        gbm.Login();
                    }
                    gbm.request = null;
                }
            }
        });
    };
    
    this.CreateBookmark = function(bm, afterCreate){
        if (logging) 
            console.log("Creation bookmark");
		//max length 318 unicode chars or ?Content-Length:38
        $.ajax({
            type: "post",
            url: this.url + "mark",
            data: {
                bkmk: bm.url,
                title: bm.title,
                labels: "LinkedNotes",
                annotation: bm.note,
                prev: '',
                sig: this.sig
            },
            success: function(data, textStatus){
                if(data)
				{
					
				}
				
				if (gbm) {
                    gbm.error = false;
                }
            },
            error: function(){
                if (gbm) {
                    gbm.error = true;
                }
                
                if (logging) 
                    console.log("Error during creation bookmark");
            },
            complete: function(){
                if (afterCreate) 
                    afterCreate();
            }
        });
    };
    
    this.DeleteBookmark = function(bmid, afterDeleted){
        if (logging) 
            console.log("Deleting bookmark");
        $.post(this.url + "mark", {
            dlq: bmid,
            sig: this.sig
        }, function(data){
            if (afterDeleted) 
                afterDeleted();
        }, "text");
    };
    
    this.ParseBookmarks = function(bookmarksXml){
        if (gbm) {
            gbm.sig = $(bookmarksXml).find("signature:first").text();
        }
        if (logging) {
            console.log(bookmarksXml);
            console.log("Signature:" + gbm.sig + "\nAccount:" + gbm.account);
        }
        this.bookmarks = [];
        
        $(bookmarksXml).find("item").each(function(){
            var bookmark = $(this);
            var bm = {
                id: bookmark.find("bkmk_id:first").text(),
                title: bookmark.find("bkmk_title:first").text(),
                url: bookmark.find("link:first").text(),
                note: bookmark.find("bkmk_annotation:first").text(),
                timestamp: new Date(bookmark.find("pubDate:first").text()),
                TitleDate: function(){
                    return new Date(parseInt(this.title));
                }
            };
            bm.url = bm.url.replace("#" + bm.title, "");
            bm.url = bm.url.replace(BLANK_URL, "");
            gbm.bookmarks.push(bm);
        });
        
        this.bookmarks.sort(this.SortBookmark);
        if (logging) 
            console.log("Bookmarks parsed");
    };
    
    
    this.SortBookmark = function(a, b){
        if (a.title > b.title) {
			return 1;
		}
		else {
			if (a.title == b.title) {
				return 0;
			}
			else {
				return -1;
			}
		}
    };
    
    this.Login = function(){
		notes.ShowMessage(chrome.i18n.getMessage("msg_need_login"));
        chrome.tabs.create({
            "url": this.url,
            "selected": true
        });
    };
}

gbm = new GoogleBookmarks();

function Sync(){
    $("a#sync").addClass("sync_button_progress");
    $("a#sync").removeClass("sync_button");
    if (gbm.request == null) {
        gbm.LoadBookmarks(SyncNotes);
    }
    else {
        if (logging) 
            console.log("Sync in progress");
    }
}

function SyncNotes(){
    if (!gbm.error) {
        if (logging) 
            console.log("Sync started for : " + gbm.bookmarks.length);
        var last_sync = bgPage.getItem("last_sync" + gbm.sig);
        var current_sync_date = new Date();
        if (last_sync == null) {
            last_sync = 0;
        }
        var last_sync_date = new Date(parseInt(last_sync));
        if (logging) 
            console.log("Last sync:" + last_sync_date + "\nCurrent date:" + current_sync_date);
        
        for (var i = 0; i < gbm.bookmarks.length; i++) {
            var key = gbm.bookmarks[i].title + ";" + escape(gbm.bookmarks[i].url);
            var noteText = bgPage.getItem(key);
            if (gbm.bookmarks[i].timestamp >= last_sync_date) {
                if (noteText == null) {
                    //create local note
                    if (logging) 
                        console.log("Create note: " + gbm.bookmarks[i].note);
                    bgPage.setItem(key, gbm.bookmarks[i].note);
                }
                else 
                    if (noteText == DEL_MARK) {
                        //remove note marked as deleted
                        if (logging) 
                            console.log("Remove note marked as deleted: " + key);
                        gbm.DeleteBookmark(gbm.bookmarks[i].id);
                        bgPage.removeItem(key);
                    }
                    else {
                        //update note text
                        if (logging) 
                            console.log("Update note: " + gbm.bookmarks[i].note);
                        bgPage.setItem(key, gbm.bookmarks[i].note);
                    }
            }
            else {
                if (noteText == null) {
                    if (logging) 
                        console.log("Remove note from server: " + key);
                    gbm.DeleteBookmark(gbm.bookmarks[i].id);
                }
            }
        }
        var allKeys = bgPage.getAllKeys();
        allKeys.sort();
        for (var i = allKeys.length - 1; i >= 0; i--) {
            if (allKeys[i].indexOf(';') != -1) {
                var n = new Note(allKeys[i]);
                if (n.modified >= last_sync_date) {
                    if (n.url == '') {
                        n.url = BLANK_URL;
                    }
					if(n.text != DEL_MARK)
					{
	                    var time = n.modified.getTime();
	                    gbm.CreateBookmark({
	                        url: n.url + "#" + time,
	                        title: time,
	                        note: n.text
	                    });						
					}
					else
					{
						//remove new notes that was already deleted
						bgPage.removeItem(n.id);
					}
                }
                else {
                    var found = false;
                    for (var j = 0; j < gbm.bookmarks.length; j++) {
                        var title_date = gbm.bookmarks[j].TitleDate();
                        if (logging) 
                            console.log("Check title:" + title_date.getTime() + " note modif: " + n.modified.getTime());
                        if (title_date.getTime() == n.modified.getTime()) {
                            found = true;
                            if (n.text == DEL_MARK) {
                                //remove note marked as deleted
                                if (logging) 
                                    console.log("Remove note marked to del: " + gbm.bookmarks[j].note);
                                gbm.DeleteBookmark(gbm.bookmarks[j].id);
                                bgPage.removeItem(n.id);
                            }
                            break;
                        }
                    }
                    if (!found) {
                        bgPage.removeItem(n.id);
                        if (logging) 
                            console.log("Remove note not found on server: " + n.id);
                    }
                }
            }
        }
        notes.FillList();
        bgPage.setItem("last_sync" + gbm.sig, current_sync_date.getTime());
		if (gbm.error){
			notes.ShowMessage(chrome.i18n.getMessage("msg_sync_with_errors"), 'red');
		}
		else{
			notes.ShowMessage(chrome.i18n.getMessage("msg_sync_success"));
		}
    }
	else
	{
		notes.ShowMessage(chrome.i18n.getMessage("msg_sync_error"), 'red');
	}
    gbm.Clear();
    $("a#sync").removeClass("sync_button_progress");
    $("a#sync").addClass("sync_button");
}
