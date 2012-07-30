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

Cu.import("chrome://adic/content/adic.jsm");

var strings = Services.strings.createBundle("chrome://adic/locale/adic.properties");


var asel = {
	addons: [],

	init: function () {
		var waiting = 0;

		AddonManager.getAllAddons(function(addons)
		{
			for ( ai in addons )
			{
				let a = addons[ai]; // var causes the callback to use the last one.

				waiting++;
				ADIC.checkID(a.id, function(status) {
					if ( status == ADIC.ADIC_ENABLED )
						asel.addons.push(a);

					if ( --waiting == 0 ) asel.update();
				});
			}
		});

		document.getElementById("id").addEventListener("input", function () {
			asel.update();
		}, false);

		document.addEventListener("keypress", function (e) {
			if ( e.keyCode == 13 ) asel.submit();
		}, false);

		document.getElementById("id").focus();
	},

	update: function () {
		var list = document.getElementById("addons");
		while (list.itemCount)    // Clear the list.
			list.removeItemAt(0); //

		var q = document.getElementById("id").value.toLowerCase();

		for ( ai in asel.addons )
		{
			let a = asel.addons[ai];

			if ( a.id  .toLowerCase().search(q) < 0 &&
			     a.name.toLowerCase().search(q) < 0 )
				continue;

			var item = list.appendItem(a.name, a.id);
			if ( "iconURL" in a )
			{
				var icon = document.createElement("image");
				icon.setAttribute("src", a.iconURL);
				icon.width  = 25;
				icon.height = 25;
				item.insertBefore(icon, item.firstChild);

				item.ondblclick = function ( ) {
					asel.submit();
				};
			}
		}

		list.selectedIndex = 0;
	},

	submit: function () {
		window.arguments[0](document.getElementById("addons").selectedItem.value);
		window.close();
	},
}

window.addEventListener("load", function(){asel.init();}, false);
