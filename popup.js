/*
*	LinkedNotes Google Chrome Extension
*	Autor: Pavel Kolmogorov
*/
var bgPage = chrome.extension.getBackgroundPage();

function Note(id){
	this.id = id;
	var newArray = id.split(';');
	this.modified = new Date(parseInt(newArray[0]));
	this.url = unescape(newArray[1]);
	this.title = chrome.i18n.getMessage("title_date", this.modified.toLocaleDateString()+" "+this.modified.toLocaleTimeString());
	this.icon = "simple";
	if (this.url.length != 0)
	{
		this.title += "\n" + chrome.i18n.getMessage("title_url", this.url);
		this.icon = "linked";
    }
	this.selectionStart = 0;
	this.selectionEnd = 0;
	this.text = bgPage.getItem(id);
	if (this.text == null)
	{
		this.text = "";
	};
	this.Html = function(len){
		var escaped = this.text;
		if (escaped != null && escaped != undefined && escaped != "")
		{
			var newArray = escaped.split('\n');
			for (var i=0;i<newArray.length;i++)
			{
				if (newArray[i].length > 0)
				{
					if (newArray[i].length > len)
					{
						escaped = newArray[i].substr(0, len);
					}
					else
					{
						escaped = newArray[i];
					}
					break;
				}
			}
		}
		var findReplace = [[/&/g, "&amp;"], [/</g, "&lt;"], [/>/g, "&gt;"], [/\"/g, "&quot;"]];
		for(var i=0; i < findReplace.length;i++)
		{
	    	escaped = escaped.replace(findReplace[i][0], findReplace[i][1]);
	    }
	    return escaped;
	};
	this.ItemContent = function(){
		return '<span class="'+this.icon+'">'+this.Html(50)+'</span>';
	};
	this.Item = function(){
		return '<div title="'+this.title+'" class="note" id="'+this.id+'" ondblclick="notes.SelectNoteAndGo(this.id);" onclick="notes.SelectNote(this.id);">'+this.ItemContent()+'</div>';
	};
}

function List(){
	this.currentNote = {};
	this.currentId = bgPage.getItem("selected");
	this.FillList = function(){
		var allKeys = bgPage.getAllKeys();
		var found = false;
		var noteExist = false;
		var nLast = 0;
		allKeys.sort();
		for (var i = 0; i < allKeys.length; i++)
		{
			if(allKeys[i].indexOf(';') != -1)
			{
				noteExist = true;
				var note = new Note(allKeys[i]);
				this.InsertNote(note);
				nLast = i;
				if (allKeys[i] == this.currentId)
				{
					found = true;
				}
			}
		}
		if (!noteExist)
		{
			this.AddEmptyNote();
			return;
		}
	
		if (!found)
		{
			this.currentId = allKeys[nLast];
		}
		this.SelectNote(this.currentId);
		var el = document.getElementById(this.currentId);
		el.scrollIntoView(true);
	};
	this.InsertNote = function(note){
		$("#NotesList").append(note.Item());
	};
	this.SelectNote = function(id){
		$("div.highlight").removeClass("highlight");
		$("div[id='"+id+"']").addClass("highlight");
		if (this.currentId != id)
		{
			bgPage.setItem("selection_start", '0');
			bgPage.setItem("selection_end", '0');
		};
		this.currentId = id;
		if (id != this.currentNote.id)
		{
			this.currentNote = new Note(id);
		}
		this.FillEdit(this.currentNote);
	};
	this.FillEdit = function(note){
		$("textarea.note").empty();
		$("textarea.note").text(note.text);
		$("textarea.note").attr("id", note.id);
		restoreSelection();
	};
	this.SelectNoteAndGo = function(id){
		this.SelectNote(id);
		if (this.currentNote.url.length != 0)
		{
			chrome.tabs.create({"url": this.currentNote.url,
								"selected": true});
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
		if (this.currentId != "")
		{
			$("textarea.note").text("");
			$("div.highlight").remove();;
			bgPage.removeItem(this.currentId);
		}
		this.currentId = $("#NotesList div:last-child").attr("id");
		if (this.currentId == undefined)
		{ 
			this.currentId = "";
			$("textarea.note").attr("id", "");
			$("textarea.note").text("");
			this.AddEmptyNote();
		}
		else
		{
			this.SelectNote(this.currentId);
		}
	};
	this.UpdateNote = function(object){
		bgPage.setItem("selection_start", $("textarea.note").attr("selectionStart"));
		bgPage.setItem("selection_end", $("textarea.note").attr("selectionEnd"));
		$('div.vs-context-menu1').hide('fast');
		if (object.value == object.defaultValue)
		{
			return;
		}
		var newArray = object.id.split(';');
		var time = new Date(newArray[0]);
		var url = unescape(newArray[1]);
		var note = object.value;
		bgPage.removeItem(object.id);
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

function openOptions()
{
	chrome.tabs.create({url:'options.html'});
}

function positionSave()
{
	bgPage.setItem("selection_start", $("textarea.note").attr("selectionStart"));
	bgPage.setItem("selection_end", $("textarea.note").attr("selectionEnd"));
}

function restoreSelection()
{
   $("textarea.note").focus();
   $("textarea.note").attr("selectionStart", bgPage.getItem("selection_start"));
   $("textarea.note").attr("selectionEnd", bgPage.getItem("selection_end"));
}

function cut()
{
   	restoreSelection();
   	document.execCommand("cut");   
}

function copy()
{
	restoreSelection();
	if ($("textarea.note").attr("selectionStart") == $("textarea.note").attr("selectionEnd"))
	{
		$("textarea.note").attr("selectionStart", 0);
		$("textarea.note").attr("selectionEnd", $("textarea.note").text().length);
	}
    document.execCommand("copy");
}

function paste()
{
    restoreSelection();
	document.execCommand('paste');
}

