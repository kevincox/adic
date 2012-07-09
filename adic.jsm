var EXPORTED_SYMBOLS = ["ADIC_info"]; // Don't change this or ADIC won't be able
                                      // to read this file.

var ADIC_info = {
	/// Include prefrences from here down.
	prefs: ["extensions.adic."],

	/// true for system info.
	system: true,

	/// Should we include a list of installed extensions?
	/** If this is true they will all be included.  If it
	 *  is a list only those specified will be included.
	 */
	extensions: true,

	///A list of file names to include.
	/* Relitive paths will be relitive from the profile directory.
	 */
	files: [],

	/* A list of things to include in the output */
	constants: {
		key: "value",
	},
};
