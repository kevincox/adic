// Copyright 2011-2012 Kevin Cox

/*******************************************************************************
*                                                                              *
*  Permission is hereby granted, free of charge, to any person obtaining a     *
*  copy of this software and associated documentation files (the "Software"),  *
*  to deal in the Software without restriction, including without limitation   *
*  the rights to use, copy, modify, merge, publish, distribute, sublicense,    *
*  and/or sell copies of the Software, and to permit persons to whom the       *
*  Software is furnished to do so, subject to the following conditions:        *
*                                                                              *
*  The above copyright notice and this permission notice shall be included in  *
*  all copies or substantial portions of the Software.                         *
*                                                                              *
*  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR  *
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,    *
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL     *
*  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER  *
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING     *
*  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER         *
*  DEALINGS IN THE SOFTWARE.                                                   *
*                                                                              *
*******************************************************************************/

var EXPORTED_SYMBOLS = ["ADIC"];

var {classes: Cc, interfaces: Ci, utils: Cu} = Components

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

function d ( msg, important )
{
	important = true; // Uncomment for debuging.

	if (!important) return;

	dump('adic: '+msg+'\n');
	Services.console.logStringMessage('adic: '+msg);
}

function readFile ( path )
{
	var fr = Cc["@mozilla.org/file/local;1"]
	           .createInstance(Ci.nsILocalFile);

	fr.initWithPath(path);

	if (!fr.exists())
		return "[ADIC] 404 - " + path + " does not exist on the filesystem.\n";
	else if (!fr.isReadable())
		return "[ADIC] 403 - " + path + " is not readable.\n";
	else if (fr.isDirectory())
		return "[ADIC] 418 - " + path + " is a directory.\n";

	var out = [];
	var fstream = Cc["@mozilla.org/network/file-input-stream;1"]
	                .createInstance(Ci.nsIFileInputStream);
	var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"]
	                .createInstance(Ci.nsIConverterInputStream);
	fstream.init(fr, -1, 0, 0);
	cstream.init(fstream, "UTF-8", 0, 0);

	let (str = {})
	{
		while ( cstream.readString(0xffffffff, str) != 0 )
		{
			out.push(str.value);
		}
	}
	cstream.close(); // this closes fstream

	return out.join();
}

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

		var warnFiles = [];

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
							value = "	c:" + key + " = ";
							value += Services.prefs.getCharPref(key);
							break;
						case 64: // Int
							value = "	i:" + key + " = ";
							value += Services.prefs.getIntPref(key);
							break;
						case 128: // bool
							value = "	b:" + key + " = ";
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

			/*** Custom Files ***/
			if (files.length)
			{
				out.push("	### CUSTOM FILES");

				var dir = FileUtils.getDir("ProfD", []).path;

				for ( i in files )
				{
					let f = files[i];

					if (f.match("^/|^[A-Z]:\\\\")) // Absolute path.
					{
						warnFiles.push(f);
						out.push("	>>>>>>>>>> "+f);
						out.push('	'+
								 readFile(f).replace(/\n/g, "\n\t") +
								 "<<<<<<<<<< "+f);
					}
					else
					{
						if ( f.indexOf("..") >= 0 )
							warnFiles.push(f);

						out.push("	>>>>>>>>>> "+f+'\t');
						out.push('	' +
								 readFile(dir+'/'+f).replace(/\n/g, "\n\t") +
								 "<<<<<<<<<< "+f);
					}
				}
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

			/*** Extensions ***/
			if (extensions)
			{
				out.push("	### EXENSIONS");

				if ( extensions !== true )
				{
					var map = {}
					for ( e in extensions ) map[extensions[e]] = true;
					extensions = map;
				}
				else extensions = false

				AddonManager.getAllAddons(function(addons)
				{
					var adns = [];

					for ( ai in addons )
					{
						var a = addons[ai];

						d(a.id);

						if ( extensions && (extensions[a.id] == undefined))
							continue;

						var s = "	" + a.type + ": ";
						s += a.id + "(" + a.name + ")";
						s += " " + a.version;

						if (!a.isActive) s += " DISABLED"

						adns.push({n: a.name, s: s});
					}

					///// Sort and print.
					adns.sort(function(s1, s2){(s1.n>s2.n)?1:-1;});
					for ( a in adns )
					{
						out.push(adns[a].s);
					}

					callback(out.join("\n"), warnFiles);
				});
			}
			else callback(out.join("\n"), warnFiles);
		});

	},
}
