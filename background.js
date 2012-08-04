/*
 *	LinkedNotes Google Chrome Extension
 *	Autor: Pavel Kolmogorov
 */
var logging = false;
var parentId = -1;
var mapMenu = [];
var DEL_MARK = "#del#";
var BLANK_URL = "about:blank";
var gbm = null;
var noteTextFromSelection = '';

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
    this.text = getItem(id);
    if (this.text == null) {
        this.text = "";
    };
    this.Title = function(len){
        var escaped = this.text;
        if (escaped != null && escaped != undefined && escaped != "") {
            var newArray = escaped.split('\n');
            for (var i = 0; i < newArray.length; i++) {
                var testString = '';
                for (var n = 0; n < newArray[i].length; n++) {
                    if (newArray[i].charAt(n) > ' ') {
                        testString = newArray[i].substr(n);
                        break;
                    }
                }
                
                if (testString.length > 0) {
                    if (testString.length > len) {
                        escaped = testString.substr(0, len);
                    }
                    else {
                        escaped = testString;
                    }
                    break;
                }
            }
        }
        var endTitle = escaped.indexOf('|');
        if (endTitle != -1) {
            escaped = escaped.substr(0, endTitle);
        }
        return escaped;
    };
    this.Html = function(len){
        var escaped = this.Title(len);
        var findReplace = [[/&/g, "&amp;"], [/</g, "&lt;"], [/>/g, "&gt;"], [/\"/g, "&quot;"], [/ /g, "&nbsp;"], [/\n/g, "&nbsp;"]];
        for (var i = 0; i < findReplace.length; i++) {
            escaped = escaped.replace(findReplace[i][0], findReplace[i][1]);
        }
        if (escaped.length < len) {
            escaped += '&nbsp;';
        }
        
        return escaped;
    };
    this.Find = function(vals){
        var txt = this.text.toLowerCase();
        var url = this.url.toLowerCase();
        for (var i = 0; i < vals.length; i++) {
            if (vals[i] != '' && (txt.indexOf(vals[i]) != -1 || url.indexOf(vals[i]) != -1)) {
                return true;
            }
        }
        return false;
    };
}

function GoogleBookmarks(){
    this.url = "https://www.google.com/bookmarks/";
    this.sig = "";
    this.error = false;
    this.request = null;
    this.bookmarks = [];
    this.needLogin = false;
    this.notesList = null;
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
            bm.url = bm.url.replace(bm.title, "");
            if (bm.url.substring(bm.url.length - 1) == "3") {
                bm.url = bm.url.substring(0, bm.url.length - 3);
            }
            else {
                bm.url = bm.url.substring(0, bm.url.length - 1);
            }
            bm.url = bm.url.replace(BLANK_URL, "");
            bm.note = bm.note.replace(/\\\\/gm, "\r");
            bm.note = bm.note.replace(/\\n/gm, "\n");
            bm.note = bm.note.replace(/\\t/gm, "\t");
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
        chrome.browserAction.setIcon({
            'path': 'images/notepad24w.png'
        });
        updateTitle(null, chrome.i18n.getMessage("msg_need_login"));
        if (this.notesList != null) {
            try {
                this.notesList.ShowMessage(chrome.i18n.getMessage("msg_need_login"));
            } 
            catch (err) {
                log("Error during show message");
            }
        }
        chrome.tabs.create({
            "url": this.url,
            "selected": true
        });
    };
}

gbm = new GoogleBookmarks();

function AutoSync(){
    var autosync = getItem("autosync");
    log("Autosync: " + autosync);
    if (autosync == "yes") {
        Sync();
    }
}

function Sync(notes){
    if (notes != undefined) {
        gbm.notesList = notes;
        if (gbm.notesList != null) {
            try {
                gbm.notesList.ShowSyncProgress(true);
            } 
            catch (err) {
                log("Error during show sync progress");
            }
        }
    }
    else {
        gbm.notesList = null;
    }
    chrome.browserAction.setIcon({
        'path': 'images/notepad24s.png'
    });
    
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
    if (!gbm.error && gbm.sig != "") {
        if (logging) 
            console.log("Sync started for : " + gbm.bookmarks.length);
        var last_sync = getItem("last_sync" + gbm.sig);
        var current_sync_date = new Date();
        if (last_sync == null) {
            last_sync = 0;
        }
        var last_sync_date = new Date(parseInt(last_sync));
        if (logging) 
            console.log("Last sync:" + last_sync_date + "\nCurrent date:" + current_sync_date);
        
        for (var i = 0; i < gbm.bookmarks.length; i++) {
            var key = gbm.bookmarks[i].title + ";" + escape(gbm.bookmarks[i].url);
            var noteText = getItem(key);
            if (gbm.bookmarks[i].timestamp >= last_sync_date) {
                if (noteText == null) {
                    //create local note
                    if (logging) 
                        console.log("Create note: " + gbm.bookmarks[i].note);
                    setItem(key, gbm.bookmarks[i].note);
                }
                else 
                    if (noteText == DEL_MARK) {
                        //remove note marked as deleted
                        if (logging) 
                            console.log("Remove note marked as deleted: " + key);
                        gbm.DeleteBookmark(gbm.bookmarks[i].id);
                        removeItem(key);
                    }
                    else {
                        //update note text
                        if (logging) 
                            console.log("Update note: " + gbm.bookmarks[i].note);
                        setItem(key, gbm.bookmarks[i].note);
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
        var allKeys = getAllKeys();
        allKeys.sort();
        for (var i = allKeys.length - 1; i >= 0; i--) {
            if (allKeys[i].indexOf(';') != -1) {
                var n = new Note(allKeys[i]);
                if (n.modified >= last_sync_date) {
                    if (n.url == '') {
                        n.url = BLANK_URL;
                    }
                    if (n.text != DEL_MARK) {
                        var time = n.modified.getTime();
                        var enote = n.text.replace(/\\/gm, "\\\\");
                        enote = enote.replace(/\n/gm, "\\n");
                        enote = enote.replace(/\t/gm, "\\t");
                        
                        gbm.CreateBookmark({
                            url: n.url + "#" + time,
                            title: time,
                            note: enote
                        });
                    }
                    else {
                        //remove new notes that was already deleted
                        removeItem(n.id);
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
                                removeItem(n.id);
                            }
                            break;
                        }
                    }
                    if (gbm.bookmarks.length > 0) { //this is emergency check. It is dangerous operation - remove all notes from local storage
                        if (!found) {
                            removeItem(n.id);
                            if (logging) 
                                console.log("Remove note not found on server: " + n.id);
                        }
                    }
                    else {
                        if (gbm.notesList != null) {
                            try {
                                gbm.notesList.ShowMessage(chrome.i18n.getMessage("msg_sync_error"), 'red');
                            } 
                            catch (err) {
                                log("Error during show message");
                            }
                        }
                    }
                }
            }
        }
        if (gbm.notesList != null) {
            try {
                gbm.notesList.FillList();
            } 
            catch (err) {
                log("Error during update list");
            }
        }
        
        setItem("last_sync" + gbm.sig, current_sync_date.getTime());
        updateTitle(current_sync_date);
        updateMenu();
        try {
            if (gbm.error) {
                chrome.browserAction.setIcon({
                    'path': 'images/notepad24w.png'
                });
                if (gbm.notesList != null) {
                    gbm.notesList.ShowMessage(chrome.i18n.getMessage("msg_sync_with_errors"), 'red');
                }
            }
            else {
                chrome.browserAction.setIcon({
                    'path': 'images/notepad24.png'
                });
                if (gbm.notesList != null) {
                    gbm.notesList.ShowMessage(chrome.i18n.getMessage("msg_sync_success"));
                }
            }
        } 
        catch (err) {
            log("Error during show message");
        }
        
    }
    else {
        chrome.browserAction.setIcon({
            'path': 'images/notepad24w.png'
        });
        if (gbm.notesList != null) {
            try {
                gbm.notesList.ShowMessage(chrome.i18n.getMessage("msg_sync_error"), 'red');
            } 
            catch (err) {
                log("Error during show message");
            }
        }
        if (gbm.sig == "") {
            gbm.Login();
        }
    }
    gbm.Clear();
    if (gbm.notesList != null) {
        try {
            gbm.notesList.ShowSyncProgress(false);
        } 
        catch (err) {
            log("Error during stop show progress");
        }
    }
}

function LinksMenu(){
    this.id = -1;
    this.Init = function(){
        var enable = getItem("linksmenu");
        if (enable == "yes") {
            this.InstallMenu();
        }
        else {
            this.RemoveMenu();
        }
    }
    this.InstallMenu = function(){
        var createPropertiesL = {
            "title": chrome.i18n.getMessage("copy_link_to_note"),
            "type": "normal",
            "contexts": ["link", "page"],
            "onclick": onCopyLinkToNote
        };
        if (this.id == -1) {
            this.id = chrome.contextMenus.create(createPropertiesL);
        }
    }
    this.RemoveMenu = function(){
        if (this.id != -1) {
            chrome.contextMenus.remove(this.id);
            this.id = -1;
        }
    }
}

var lm = new LinksMenu();

function removeItem(key){
    try {
        log("Inside removeItem:" + key);
        window.localStorage.removeItem(key);
        removeSubMenu(key);
        chrome.tabs.getSelected(null, function(tab){
            updateCount(tab);
        });
    } 
    catch (e) {
        log("Error inside removeItem");
        log(e);
    }
    log("Return from removeItem" + key);
}

function setItem(key, value){
    try {
        log("Inside setItem:" + key + ":" + value);
        window.localStorage.removeItem(key);
        window.localStorage.setItem(key, value);
        if (key.indexOf(';') != -1) {
            if (value == DEL_MARK) {
                removeSubMenu(key);
            }
            else {
                createSubMenu(key);
            }
            chrome.tabs.getSelected(null, function(tab){
                updateCount(tab);
            });
        }
    } 
    catch (e) {
        log("Error inside setItem");
        log(e);
    }
    log("Return from setItem" + key + ":" + value);
}

function getItem(key){
    var value;
    log('Get Item:' + key);
    try {
        value = window.localStorage.getItem(key);
    } 
    catch (e) {
        log("Error inside getItem() for key:" + key);
        log(e);
        value = "null";
    }
    log("Returning value: " + value);
    return value;
}

function clearStrg(){
    log('about to clear local storage');
    window.localStorage.clear();
    log('cleared');
}

function getAllKeys(){
    var list = [];
    try {
        for (var i = 0; i < window.localStorage.length; i++) {
            list[i] = window.localStorage.key(i);
        }
    } 
    catch (e) {
        log("Error inside getAllKeys()");
        log(e);
        value = "null";
    }
    log("Returning value: " + list);
    return list;
}

function resetSyncDates(){
    log("resetSyncDates()");
    var allKeys = getAllKeys();
    for (var i = 0; i < allKeys.length; i++) {
        if (allKeys[i].substring(0, 9) == 'last_sync') {
            window.localStorage.removeItem(allKeys[i]);
        }
        else {
            var noteText = getItem(allKeys[i]);
            if (noteText == DEL_MARK && allKeys[i].indexOf(';') != -1) {
                window.localStorage.removeItem(allKeys[i]);
            }
        }
    }
}

function addNote(url, text, date){
    var key = null;
    if (date) {
        key = date.getTime() + ";" + escape(url);
    }
    else {
        key = createKey(url);
    }
    setItem(key, text);
    return key;
}

function createKey(url){
    var currentDate = new Date();
    var key = currentDate.getTime() + ";" + escape(url);
    return key;
}

function onCopyToNote(info, tab){
    if ((!info.selectionText || info.selectionText.length == 0) && info.id != 'key') {
        return;
    }
    else {
        chrome.browserAction.setIcon({
            'path': 'images/notepad24hl.png'
        });
        var inject = getItem("injection");
        if (inject == "yes") {
            noteTextFromSelection = info.selectionText;
            chrome.tabs.executeScript(null, {
                file: "injection.js",
                allFrames: true
            });
            if (tab.url.indexOf("chrome.google.com") != -1) {
                addNote(tab.url, info.selectionText);
            }
        }
        else {
            addNote(tab.url, info.selectionText);
        }
        
        setTimeout(function(){
            chrome.browserAction.setIcon({
                'path': 'images/notepad24.png'
            });
            AutoSync();
        }, 1000);
    }
}

function onCopyLinkToNote(info, tab){
    var url = '';
    if (info.linkUrl != undefined && info.linkUrl.length > 0) {
        url = info.linkUrl;
    }
    else 
        if (info.pageUrl != undefined && info.pageUrl.length > 0) {
            url = info.pageUrl;
        }
    if (url.length > 0) {
        chrome.browserAction.setIcon({
            'path': 'images/notepad24hl.png'
        });
        
        addNote(tab.url, url);
        
        setTimeout(function(){
            chrome.browserAction.setIcon({
                'path': 'images/notepad24.png'
            });
            AutoSync();
        }, 1000);
    }
}

function installMenu(){
    var createProperties = {
        "title": chrome.i18n.getMessage("copy_to_note"),
        "type": "normal",
        "contexts": ["selection"],
        "onclick": onCopyToNote
    };
    chrome.contextMenus.create(createProperties);
    lm.Init();
    updateMenu();
}

function updateMenu(){
    for (var i = 0; i < mapMenu.length; i++) {
        if (mapMenu[i][1] != -1) {
            chrome.contextMenus.remove(mapMenu[i][1]);
        }
    }
    mapMenu = [];
    if (parentId != -1) {
        chrome.contextMenus.remove(parentId);
        parentId = -1
    }
    var createProperties2 = {
        "title": chrome.i18n.getMessage("insert_from_note"),
        "contexts": ["editable"]
    };
    parentId = chrome.contextMenus.create(createProperties2);
    log("ParentId:" + parentId);
    var allKeys = getAllKeys();
    allKeys.sort();
    for (var i = 0; i < allKeys.length; i++) {
        if (allKeys[i].indexOf(';') != -1) {
            createSubMenu(allKeys[i]);
        }
    }
};

function createSubMenu(noteId){
    var note = new Note(noteId);
    if (note.text == DEL_MARK) {
        return;
    }
    var title = note.Title(50);
    if (title == "") {
        title = " ";
    }
    var mid = chrome.contextMenus.create({
        "title": title,
        "parentId": parentId,
        "contexts": ["editable"],
        "onclick": clickNote
    });
    mapMenu.push([note.id, mid]);
    log(chrome.extension.lastError);
};

function removeSubMenu(noteId){
    for (var i = 0; i < mapMenu.length; i++) {
        if (mapMenu[i][0] == noteId && mapMenu[i][1] != -1) {
            chrome.contextMenus.remove(mapMenu[i][1]);
            mapMenu[i][0] = "";
            mapMenu[i][1] = -1;
            break;
        }
    }
};

function clickNote(x, tab){
    log(tab);
    for (var i = 0; i < mapMenu.length; i++) {
        if (mapMenu[i][1] == x.menuItemId) {
            var note = new Note(mapMenu[i][0]);
            var txt = note.text;
            var endTitle = txt.indexOf('|');
            if (endTitle != -1 && endTitle < 50) {
                var del = (txt.charAt(endTitle + 1) == '\n') ? 2 : 1;
                txt = txt.substr(endTitle + del);
            }
            var lengthNote = txt.length;
            txt = txt.replace(/\\/gm, "\\\\");
            txt = txt.replace(/'/gm, "\\'");
            txt = txt.replace(/\n/gm, "\\n");
            var code = "var focused_el = document.activeElement;" +
            "if(focused_el != null && (focused_el.tagName.toLowerCase() == 'input' || focused_el.tagName.toLowerCase() == 'textarea')){	var text = focused_el.value; var start = focused_el.selectionStart;var end = focused_el.selectionEnd;" +
            "focused_el.value = text.substr(0, start) +'" +
            txt +
            "' + text.slice(end);	focused_el.selectionStart = start +" +
            lengthNote +
            "; focused_el.selectionEnd = focused_el.selectionStart;}";
            log(code);
            chrome.tabs.executeScript(tab.id, {
                "allFrames": true,
                "code": code
            });
            break;
        }
    }
}

function updateCount(tab, count){
    if (count != undefined) {
        cnotes = count;
    }
    else 
        if (tab.url != '') {
            cnotes = 0;
            var allKeys = getAllKeys();
            allKeys.sort();
            for (var i = 0; i < allKeys.length; i++) {
                if (allKeys[i].indexOf(';') != -1) {
                    var note = new Note(allKeys[i]);
                    if (note.text == DEL_MARK) {
                        continue;
                    }
                    if (note.url.indexOf(tab.url) != -1) {
                        cnotes++;
                    }
                }
            }
        }
    txt = "";
    if (cnotes > 0) {
        txt += cnotes;
    }
    chrome.browserAction.setBadgeBackgroundColor({
        color: [0, 0, 255, 100],
        tabId: tab.id
    });
    chrome.browserAction.setBadgeText({
        text: txt,
        tabId: tab.id
    });
}

function updateTitle(date, text){
    var str = "LinkedNotes";
    if (date != null) {
        str += "\n" + chrome.i18n.getMessage("last_sync") + " " + date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }
    if (text != undefined) {
        str += "\n" + text;
    }
    chrome.browserAction.setTitle({
        title: str
    });
}


function log(txt){
    if (logging) {
        console.log(txt);
    }
}

installMenu();

chrome.tabs.onCreated.addListener(function(tab){
    updateCount(tab);
    var inject = getItem("injection");
    if (inject == "yes") {
        chrome.tabs.executeScript(tab.id, {
            file: "keyhook.js",
            allFrames: true
        });
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    updateCount(tab);
});

chrome.extension.onConnect.addListener(function(port){
    var tab = port.sender.tab;
    port.onMessage.addListener(function(info){
        if (info.id == 'note') {
            if (info.selectionText.length == 0) {
                info.selectionText = noteTextFromSelection;
            }
            var text = (info.linksText.length > 0) ? info.selectionText + '\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n' + info.linksText : info.selectionText;
            if (text.length > 0) {
                addNote(tab.url, text);
            }
        }
    });
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
    if (request.id == 'key') {
        console.log('key shortcut');
        onCopyToNote(request, sender.tab);
    }
});

setInterval(AutoSync, 600000);
