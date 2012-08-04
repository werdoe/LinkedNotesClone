/*
 *	LinkedNotes Google Chrome Extension
 *	Autor: Pavel Kolmogorov
 */
var bgPage = chrome.extension.getBackgroundPage();
document.addEventListener('DOMContentLoaded', function(){
                $("#listFont").fontSelector({"onChange": function(){$("#listSample").css("font-family", this.value)}});
				$("#noteFont").fontSelector({"onChange": function(){$("#noteSample").css("font-family", this.value)}});
				$("#listFontSize").fontSizeSelector({"onChange": function(){$("#listSample").css("font-size", this.value)}});
				$("#noteFontSize").fontSizeSelector({"onChange": function(){$("#noteSample").css("font-size", this.value)}});
				$("#autosync").click(AutoSyncCheckboxToggle);
				$('#options_header').text(chrome.i18n.getMessage("options_header"));
				$('title').text(chrome.i18n.getMessage("options_header"));
				$('#autosync_label').text(chrome.i18n.getMessage("autosync_label"));
				$('#homepage').text(chrome.i18n.getMessage("homepage"));
				$('#author').text(chrome.i18n.getMessage("author"));
				$("#injection").click(InjectionCheckboxToggle);
				$('#injection_label').text(chrome.i18n.getMessage("injection_label"));
				$('#linksmenu').click(LinksMenuToggle);
				$('#linksmenu_label').text(chrome.i18n.getMessage("linksmenu_label"));
				$('#resetsyncdate').attr('value', chrome.i18n.getMessage("resetsyncdate_button"));
				$('#resetsyncdate_label').text(chrome.i18n.getMessage("resetsyncdate_label"));
				displayVersionNumber();
				setCurrentChecks();
            });

function setCurrentChecks(){
    try {
        var bgPage = chrome.extension.getBackgroundPage();
        if (bgPage.getItem("linksmenu") == "yes"){$("#linksmenu").attr('checked', 'checked');}
        if (bgPage.getItem("autosync") == "yes"){$("#autosync").attr('checked', 'checked');}
        if (bgPage.getItem("injection") == "yes"){$("#injection").attr('checked', 'checked');}
        $('#resetsyncdate').click(bgPage.resetSyncDates);
    } 
    catch (ex) {
    }
}

function displayVersionNumber(){
    try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", chrome.extension.getURL('manifest.json'), false);
        xhr.onreadystatechange = function(){
            if (this.readyState == 4) {
                var theManifest = JSON.parse(this.responseText);
                $("#version_number").text(theManifest.version);
            }
        };
        xhr.send();
    } 
    catch (ex) {
    }
}

jQuery.fn.fontSelector = function(settings){
    var fonts = new Array('Arial,Arial,Helvetica,sans-serif', 'Arial Black,Arial Black,Gadget,sans-serif', 'Calibri', 'Cambria', 'Candara' ,'Comic Sans MS,Comic Sans MS,cursive', 'Courier New,Courier New,Courier,monospace', 'Garamond', 'Georgia,Georgia,serif', 'Impact,Charcoal,sans-serif', 'Lucida Console,Monaco,monospace', 'Lucida Sans Unicode,Lucida Grande,sans-serif', 'Palatino Linotype,Book Antiqua,Palatino,serif', 'Tahoma,Geneva,sans-serif', 'Times New Roman,Times,serif', 'Trebuchet MS,Helvetica,sans-serif', 'Verdana,Geneva,sans-serif');
    
    return this.each(function(){
        var sel = this;
        jQuery.each(fonts, function(i, item){
          	jQuery(sel).append('<option value="' + item + '" >' + item.split(',')[0] + '</option>');
            if (settings && settings.value && item == settings.value) 
                jQuery(sel).children('option:last').attr('selected', 'selected');
        })
        if (settings && settings.onChange) 
            jQuery(sel).bind('change', settings.onChange);
    });
}

jQuery.fn.fontSizeSelector = function(settings){
    var fonts = new Array('8pt','9pt','10pt','11pt','12pt','13pt','14pt','15pt','16pt','17pt','18pt','19pt','20pt');
    
    return this.each(function(){
        var sel = this;
        jQuery.each(fonts, function(i, item){
          	jQuery(sel).append('<option value="' + item + '" >' + item.split(',')[0] + '</option>');
            if (settings && settings.value && item == settings.value) 
                jQuery(sel).children('option:last').attr('selected', 'selected');
        })
        if (settings && settings.onChange) 
            jQuery(sel).bind('change', settings.onChange);
    });
}

function AutoSyncCheckboxToggle(){
	var value = $("#autosync").attr('checked')?1:0;
	if (value == 1){
		bgPage.setItem("autosync","yes");
	}
	else{
		bgPage.removeItem("autosync");
	}
}

function InjectionCheckboxToggle(){
	var value = $("#injection").attr('checked')?1:0;
	if (value == 1){
		bgPage.setItem("injection","yes");
	}
	else{
		bgPage.removeItem("injection");
	}
}

function LinksMenuToggle(){
	var value = $("#linksmenu").attr('checked')?1:0;
	if (value == 1){
		bgPage.setItem("linksmenu","yes");
	}
	else{
		bgPage.removeItem("linksmenu");
	}
	bgPage.lm.Init();
}