var {calsses: Cc, interfaces: Ci, utils: Cu} = Components

function d ( msg, seroius )
{
	seroius = true // For debugging.
	if (!seroius) return;

	dump('adic: '+msg+'\n');
	Cc["@mozilla.org/consoleservice;1"]
		.getService(Ci.nsIConsoleService)
		.logStringMessage('adic: '+msg);
}
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

var s = {}; // Place to store stuff.

var adic = {
	checkExtension: function () {
		var ext = document.getElementById("extenstion").value || "bad";

		AddonManager.getAddonByID(ext, function(addon) {
			var button = document.getElementById("idcheck");

			if (addon) button.style.color = "green";
			else       button.style.color = "red";

			var input  = document.getElementById("extenstion_code");
			var button = document.getElementById("codecheck");

			var good = addon && addon.hasResource("adic.json");

			input.disabled = good;
			button.disabled = good;
		});
	},

	checkExtensionCode: function () {
		var ext = document.getElementById("extenstion_code").value || "bad(#$#";

		var keys = Services.prefs.getDefaultBranch("")
		                         .getChildList("extensions."+ext+".");

		var button = document.getElementById("codecheck");

		if (keys.length) button.style.color = "green";
		else             button.style.color = "red";
	},

	gatherInfo: function () {
		s.ext  = document.getElementById("extenstion").value || "bad";
		s.code = document.getElementById("extenstion_code").value;

		AddonManager.getAddonByID(s.ext, function(a) {
			if (!a.hasResource("adic.json"))
			{
				s.json = {};
			}
			else
			{
				var l = a.getResourceURI("adic.json").spec; //.QueryInterface(Ci.nsIFileURL).file.path;

				Cu.import(l);
				s.json = ADIC_info;
				//Cu.unload(l); // To ensure we only get the freshest.
			}

			/*** Get values from config files or set default ***/
			var prefs = s.json.prefs
			if (!prefs)
			{
				if (s.code) prefs = ["extensions."+s.code+"."];
				else        prefs = [];
			}

			var system = s.json.system || true;
			var extensions = s.json.extensions || true;

			if (!s.json.custom) s.json.custom = {};
			var cfiles = s.json.custom.files || [];
			var cdefs  = s.json.custom.constants || {};

			/*** Process User Overides ***/

			function unChecked(id) {return !document.getElementById(id).checked;}

			if (unChecked("info_prefs"))  prefs = [];
			if (unChecked("info_os"))     system = false;
			if (unChecked("info_ext"))    extensions = [];
			if (unChecked("info_custom"))
			{
				cfiles = [];
				cdefs  = {};
			}

			var out = ["	### ADIC OUTPUT"];

			/*** Prefrences ***/
			if (prefs.length) out.push("	### PREFRENCES");

			var db = Services.prefs.getDefaultBranch("");
			for ( b in prefs )
			{
				var keys = db.getChildList(prefs[b]);

				for ( k in keys )
				{
					var key = keys[k];
					var value;

					switch (Services.prefs.getPrefType(key))
					{
						case 32: // String
							value = "	  c:" + key + " = ";
							value += Services.prefs.getCharPref(key);
							break;
						case 64: // Int
							value = "	  i:" + key + " = ";
							value += Services.prefs.getIntPref(key);
							break;
						case 128: // bool
							value = "	  b:" + key + " = ";
							value += Services.prefs.getBoolPref(key);
							break;
					}

					out.push(value);
				}
			}

			/*** System Information ***/
			if (system)
			{
				out.push("	### SYSTEM INFORMATION");
				for ( k in Services.appinfo )
				{
					var v;
					if ( typeof Services.appinfo[k] == "function" ) v = "[[[function]]]"
					else v = Services.appinfo[k];

					out.push("	  "+k+" = "+v);
				}
			}

			/*** Extensions ***/
			if (extensions)
			{
				out.push("	### EXENSIONS (not implemented)");
			}

			/*** Custom Files ***/
			if (cfiles.length)
			{
				out.push("	### CUSTOM FILES (not implemented)");
			}

			/*** Custom Values ***/
			var printed = false;
			for ( k in cdefs )
			{
				if (!printed)
				{
					out.push("	### CUSTOM VALUES");
					printed = true;
				}

				out.push("	  "+k+" = "+cdefs[k]);
			}

			document.getElementById("out").value = out.join("\n");
		});

	},

	copy: function () {
		var out = document.getElementById("out").value;

		Components.classes["@mozilla.org/widget/clipboardhelper;1"]
		          .getService(Components.interfaces.nsIClipboardHelper)
		          .copyString(out);
	},
}
