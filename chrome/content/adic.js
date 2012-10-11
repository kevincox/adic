var {classes: Cc, interfaces: Ci, utils: Cu} = Components

function d ( msg, seroius )
{
	//seroius = true // For debugging.
	if (!seroius) return;

	dump('adic: '+msg+'\n');
	Cc["@mozilla.org/consoleservice;1"]
		.getService(Ci.nsIConsoleService)
		.logStringMessage('adic: '+msg);
}

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

Cu.import("chrome://adic/content/adic.jsm");

var strings = Services.strings.createBundle("chrome://adic/locale/adic.properties");

var adic = {
	checkExtension: function () {
		var ext = document.getElementById("extenstion").value || "bad";

		ADIC.checkID(ext, function(status) {
			var button = document.getElementById("idcheck");

			if (status) button.style.color = "green";
			else        button.style.color = "red";

			var input  = document.getElementById("extenstion_code");
			var button = document.getElementById("codecheck");

			var good = ( status == ADIC.ADIC_ENABLED );

			input.disabled = good;
			button.disabled = good;
		});
	},

	setID: function (id) {
		document.getElementById("extenstion").value = id;
		adic.checkExtension();
	},

	selectID: function () {
		window.openDialog("chrome://adic/content/addonselect.xul",
		                  "Select an Addon",
		                  "chrome,centerscreen,width=400,height=500",
		                  adic.setID);
	},

	checkExtensionCode: function () {
		var ext = document.getElementById("extenstion_code").value || "bad(#$#";

		var button = document.getElementById("codecheck");

		if (ADIC.checkCode(ext)) button.style.color = "green";
		else                     button.style.color = "red";
	},

	gatherInfo: function () {
		var ext  = document.getElementById("extenstion").value || "bad";
		var code = document.getElementById("extenstion_code").value;

		var overide = {};

		ADIC.checkID(ext, function(result) {
			if ( result != ADIC.ADIC_ENABLED )
				overide.prefs = ["extensions."+code+"."];

			/*** Process User Overides ***/

			function unChecked(id) {return !document.getElementById(id).checked;}

			if (unChecked("info_prefs"))  overide.prefs = [];
			if (unChecked("info_os"))     overide.system = false;
			if (unChecked("info_ext"))    overide.extensions = [];
			if (unChecked("info_custom"))
			{
				overides.files = [];
				overides.constants = {};
			}

			ADIC.gatherInfo(ext, function (info, data) {
				var {warnFiles: warnFiles} = data;

				var f = "";
				for ( fi in warnFiles ) f += " " + warnFiles[fi];

				if (warnFiles.length > 0 ) alert(strings.GetStringFromName("warn")+f);
				document.getElementById("out").value = info;
			}, {overide:overide});
		});
	},

	copy: function () {
		var out = document.getElementById("out").value;

		Components.classes["@mozilla.org/widget/clipboardhelper;1"]
		          .getService(Components.interfaces.nsIClipboardHelper)
		          .copyString(out);
	},
	copyIndented: function () {
		var out = document.getElementById("out").value;

		out = "\t" + out.replace(/\n/g, "\n\t"); // Indent.

		Components.classes["@mozilla.org/widget/clipboardhelper;1"]
		          .getService(Components.interfaces.nsIClipboardHelper)
		          .copyString(out);
	},
}
