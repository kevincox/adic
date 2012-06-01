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

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

function d ( msg, important )
{
	if (pref && pref.debug)
		important = true;

	if (!important) return;

	dump('adic: '+msg+'\n');
	Services.console.logStringMessage('adic: '+msg);
}

d("bootstrap.js loaded.");

var constants = {
	prefBranch: "extensions.adic.",
}

function launchApp ( )
{
	d("cur: "+menuitems.length);
	Services.ww.openWindow(null, "chrome://adic/content/adic.xul",
	                       "Addon Debug Info Collector",
	                       "chrome,centerscreen,height=500,width=800", null);
}

var pref = {
	debug: false,
	menuitem: true,
}

var prefs = Services.prefs.getBranch(constants.prefBranch);
prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);

var prefObserver = {
	observe: function (aSubject, aTopic, aData)
	{
		if( aTopic != "nsPref:changed" ) return;

		switch (typeof pref[aData])
		{
			case "boolean":
				pref[aData] = prefs.getBoolPref(aData);
				break;
			case "number":
				pref[aData] = prefs.getIntPref(aData);
				break;
			case "string":
				pref[aData] = prefs.getCharPref(aData);
				break;
		}
	}
};

function initPrefs ( )
{
	/*** Set Default Prefrences and Get Prefrences ***/
	var dprefs = Services.prefs.getDefaultBranch(constants.prefBranch);
	for (let [key, val] in Iterator(pref))
	{
		switch (typeof val)
		{
			case "boolean":
				dprefs.setBoolPref(key, val);
				pref[key] = prefs.getBoolPref(key);
				break;
			case "number":
				dprefs.setIntPref(key, val);
				pref[key] = prefs.getIntPref(key);
				break;
			case "string":
				dprefs.setCharPref(key, val);
				pref[key] = prefs.getCharPref(key);
				break;
		}
	}

	/*** Add Prefrence Listener ***/
	prefs.addObserver("", prefObserver, false);
}

var strings = Services.strings.createBundle("chrome://adic/locale/adic.properties");
var menuitems = [];

function runOnLoad(window) {
	// Listen for one load event before checking the window type
	if (window.document.readyState == "complete")
	{
		if (window.document.documentElement.getAttribute("windowtype") == "navigator:browser")
		{
			if (pref.menuitem)
			{
				var document = window.document;

				var menuitem = document.createElement("menuitem");
				menuitem.setAttribute("label", strings.GetStringFromName("menuitem"));
				menuitem.addEventListener("command", launchApp, false);

				document.getElementById("menu_ToolsPopup").appendChild(menuitem);

				menuitems.push(menuitem);
				d("pushed menuitem: "+menuitems.length);
			}
		}
	}
	else
	{
		window.addEventListener("load", function() {
			window.removeEventListener("load", arguments.callee, false);

			runOnLoad(window);
		}, false);
	}
}

/*** Add to new windows when they are opened ***/
function windowWatcher(subject, topic)
{
	if ( topic == "domwindowopened" )
	{
		runOnLoad(subject);
	}
	else if ( topic == "domwindowclosed" )
	{
		for ( i in menuitems )
		{
			var mi = menuitems[i];

			if ( mi.ownerDocument == subject.window.document )
			{
				menuitems.splice(i, 1);
				break;
			}
		}
	}
}

/*** Bootstrap Functions ***/
function startup(data, reason)
{
	Components.manager.addBootstrappedManifestLocation(data.installPath);

	initPrefs();

	Services.ww.registerNotification(windowWatcher);

	/*** Add to currently open windows ***/
	let browserWindows = Services.wm.getEnumerator("navigator:browser");
	while (browserWindows.hasMoreElements()) {
		let browserWindow = browserWindows.getNext();

		windowWatcher(browserWindow, "domwindowopened");
	}
}

function shutdown(data, reason)
{
	if ( reason == APP_SHUTDOWN ) return;

	Services.ww.unregisterNotification(windowWatcher);

	prefs.removeObserver("", prefObserver, false);

	/***** Remove the Menu Items *****/
	while (menuitems.length)
	{
		var mi = menuitems.pop()
		mi.parentNode.removeChild(mi);
	}

	Components.manager.removeBootstrappedManifestLocation(data.installPath);
}

function install ( data, reason )
{
}

function uninstall ( data, reason )
{
}
