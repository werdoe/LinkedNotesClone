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
        this.createdid = [];
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
            success: function(data, textStatus, XMLHttpRequest){
                console.log(XMLHttpRequest);
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
    
    this.CreateBookmark = function(bm){
        if (logging) 
            console.log("Creation bookmark");
        var collection = this.SplitBookmark(bm);
        for (var i = 0; i < collection.length; i++) {
            $.ajax({
                type: "post",
                url: this.url + "mark",
                data: {
                    bkmk: collection[i].url,
                    title: collection[i].title,
                    labels: "LinkedNotes",
                    annotation: collection[i].note,
                    prev: '',
                    sig: this.sig
                },
                success: function(data, textStatus){
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
                }
            });
        }
    };
    
    this.SplitBookmark = function(bm){
        var result = new Array();
        if (bm) {
            var encoded = encodeURIComponent(bm.note);
            var len = encoded.length;
            if (len > 1900) {
                for (var pos = 0; encoded.length > 1900; pos++) {
                    var linebr = encoded.substr(1897, 3);
                    var k = linebr.indexOf("%");
                    if (k == -1) 
                        k = 2;
                    linebr = encoded.substr(0, 1897 + k);
                    var part_note = "";
                    try {
                        part_note = decodeURIComponent(linebr);
                    } 
                    catch (err) {
                        //ups we divide unicode char
                        try {
                            part_note = decodeURIComponent(linebr.substr(0, linebr.length - 3));
                            k = k - 3;
                        } 
                        catch (err) {
                            if (logging) 
                                console.log("Error decode string");
                            
                        };
                                            };
                    var nbm = {
                        url: bm.url + '-' + pos,
                        title: bm.title + '-' + pos,
                        note: part_note
                    };
                    result.push(nbm);
                    encoded = encoded.slice(1897 + k);
                }
                if (encoded.length > 0) {
                    var nbm = {
                        url: bm.url + '-' + result.length,
                        title: bm.title + '-' + result.length,
                        note: decodeURIComponent(encoded)
                    };
                    result.push(nbm);
                }
            }
            else {
                result.push(bm);
            }
        }
        return result;
    };
    
    this.MergeBookmarks = function(){
        var allmerged = [];
        var mergedbm = null;
        for (var i = 0; i < this.bookmarks.length; i++) {
            //all bookmarks sorted by title so parts following straight
            var cur_bm = this.bookmarks[i];
            var k = cur_bm.title.indexOf("-");
            if (k != -1) {
                var title = cur_bm.title.substr(0, k);
                
                if (mergedbm && mergedbm.title == title) {
                    mergedbm.note = mergedbm.note + cur_bm.note;
                    mergedbm.id.push(cur_bm.id[0]);
                }
                else {
                    if (mergedbm) {
                        allmerged.push(mergedbm);
                    }
                    
                    mergedbm = {
                        id: new Array(),
                        title: title,
                        url: cur_bm.url,
                        note: cur_bm.note,
                        timestamp: cur_bm.timestamp,
                        TitleDate: function(){
                            return new Date(parseInt(this.title));
                        }
                    }
                    mergedbm.id.push(cur_bm.id[0]);
                }
            }
            else {
                allmerged.push(cur_bm);
            }
        }
        if (mergedbm) {
            allmerged.push(mergedbm);
        }
        this.bookmarks = allmerged;
    };
    
    this.DeleteBookmark = function(bmid){
        if (logging) 
            console.log("Deleting bookmark");
        for (var i = 0; i < bmid.length; i++) {
            var bm_id = bmid[i];
            $.post(this.url + "mark", {
                dlq: bm_id,
                sig: this.sig
            }, function(data){
            }, "text");
        }
    };
    
    this.ParseBookmarks = function(bookmarksXml){
        if (gbm) {
            gbm.sig = $(bookmarksXml).find("signature:first").text();
        }
        if (logging) {
            console.log(bookmarksXml);
            console.log("Signature:" + gbm.sig);
        }
        this.bookmarks = [];
        
        $(bookmarksXml).find("item").each(function(){
            var bookmark = $(this);
            var bm = {
                id: new Array(),
                title: bookmark.find("bkmk_title:first").text(),
                url: bookmark.find("link:first").text(),
                note: bookmark.find("bkmk_annotation:first").text(),
                timestamp: new Date(bookmark.find("pubDate:first").text()),
                TitleDate: function(){
                    return new Date(parseInt(this.title));
                }
            };
            bm.id.push(bookmark.find("bkmk_id:first").text());
            bm.url = bm.url.replace("#" + bm.title, "");
            bm.url = bm.url.replace(bgPage.BLANK_URL, "");
            bm.note = bm.note.replace(/\\\\/gm, "\r");
            bm.note = bm.note.replace(/\\n/gm, "\n");
            bm.note = bm.note.replace(/\r/gm, "\\");
            gbm.bookmarks.push(bm);
        });
        
        this.bookmarks.sort(this.SortBookmark);
        this.MergeBookmarks();
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
    $("a#sync span").addClass("sync_button_progress");
    $("a#sync span").removeClass("sync_button");
    $.get(gbm.url + 'lookup', {
        q: "label:LinkedNotes",
        output: "xml"
    }, function(data, status, XMLHttpRequest){
        if (XMLHttpRequest.responseXML == null) {
            gbm.Login();
        }
        else {
            if (gbm.request == null) {
                gbm.LoadBookmarks(SyncNotes);
            }
            else {
                if (logging) 
                    console.log("Sync in progress");
            }
        }
    });
}

function SyncNotes(){
    if (!gbm.error || gbm.sig == "") {
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
                    if (noteText == bgPage.DEL_MARK) {
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
                var n = new bgPage.Note(allKeys[i]);
                if (n.modified >= last_sync_date) {
                    if (n.url == '') {
                        n.url = bgPage.BLANK_URL;
                    }
                    if (n.text != bgPage.DEL_MARK) {
                        var time = n.modified.getTime();
                        var enote = n.text.replace(/\\/gm, "\\\\");
                        enote = enote.replace(/\n/gm, "\\n");
                        
                        gbm.CreateBookmark({
                            url: n.url + "#" + time,
                            title: time,
                            note: enote
                        });
                    }
                    else {
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
                            if (n.text == bgPage.DEL_MARK) {
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
		bgPage.updateMenu();
        if (gbm.error) {
            notes.ShowMessage(chrome.i18n.getMessage("msg_sync_with_errors"), 'red');
        }
        else {
            notes.ShowMessage(chrome.i18n.getMessage("msg_sync_success"));
        }
    }
    else {
        notes.ShowMessage(chrome.i18n.getMessage("msg_sync_error"), 'red');
        if (gbm.sig == "") {
            gbm.Login();
        }
    }
    gbm.Clear();
    $("a#sync span").removeClass("sync_button_progress");
    $("a#sync span").addClass("sync_button");
}
