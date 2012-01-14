var EXPORTED_SYMBOLS = ["ADIC"];

var {classes: Cc, interfaces: Ci, utils: Cu} = Components

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

var ADIC = {
	checkID: function (id, callback) {
		AddonManager.getAddonByID(id, function(addon) {

			if (!addon)
			{
				callback(0);
				return;
			}

			if (addon.hasResource("adic.json")) callback(2);
			else                                callback(1);
		});
	},

	checkCode: function ( code ) {
		var keys = Services.prefs.getDefaultBranch("")
		                         .getChildList("extensions."+code+".");

		return keys.length > 0;
	},

	gatherInfo: function ( id, code, callback, extra ) {
		extra = extra || {};
		var overide = extra.overide;
		var merge = extra.merge;

		AddonManager.getAddonByID(id, function(a) {
			var json;
			if (!a.hasResource("adic.json"))
			{
				json = {};
			}
			else
			{
				var l = a.getResourceURI("adic.json").spec;

				Cu.import(l);
				json = ADIC_info;
				//Cu.unload(l); // To ensure we only get the freshest.
			}

			/*** Get values from config files or set default ***/
			var prefs = json.prefs
			if (!prefs)
			{
				if (code) prefs = ["extensions."+code+"."];
				else      prefs = [];
			}

			var system = json.system || true;
			var extensions = json.extensions || true;

			var files = json.files || [];
			var constants  = json.constants || {};

			/*** Process Merges ***/
			merge = merge || {};

			if (merge.prefs)
			{
				if ( typeof prefs != "object" ) prefs = merge.prefs;
				else prefs = prefs.concat(merge.prefs);
			}
			if (merge.extensions)
			{
				if ( typeof extensions != "object" ) extensions = merge.extensions;
				else extensions = extensions.concat(merge.extensions);
			}
			if (merge.files)
			{
				if ( typeof files != "object" ) files = merge.files;
				else files = files.concat(merge.files);
			}
			if (merge.constants)
			{
				if ( typeof constants != "object" ) constants = merge.constants;
				else
				{
					for ( k in merge.constants )
						constants[k] = merge.constants[k];
				}

			}

			/*** Process User Overides ***/
			overides = overide || {};

			if ( overide.prefs != undefined )      prefs = overide.prefs;
			if ( overide.system != undefined )     system = overide.system;
			if ( overide.extensions != undefined ) extensions = overide.extensions;
			if ( overide.files != undefined )      files = overide.files;
			if ( overide.constants != undefined )  constants = overide.constants;

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
			if (files.length)
			{
				out.push("	### CUSTOM FILES (not implemented)");
			}

			/*** Custom Values ***/
			var printed = false;
			for ( k in constants )
			{
				if (!printed)
				{
					out.push("	### CUSTOM VALUES");
					printed = true;
				}

				out.push("	  "+k+" = "+constants[k]);
			}

			callback(out.join("\n"));
		});

	},
}