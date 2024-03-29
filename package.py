#! /usr/bin/env python

# Copyright 2011 Kevin Cox

################################################################################
#                                                                              #
#  Permission is hereby granted, free of charge, to any person obtaining a     #
#  copy of this software and associated documentation files (the "Software"),  #
#   to deal in the Software without restriction, including without limitation  #
#  the rights to use, copy, modify, merge, publish, distribute, sublicense,    #
#  and/or sell copies of the Software, and to permit persons to whom the       #
#  Software is furnished to do so, subject to the following conditions:        #
#                                                                              #
#  The above copyright notice and this permission notice shall be included in  #
#  all copies or substantial portions of the Software.                         #
#                                                                              #
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR  #
#  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,    #
#  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL     #
#  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER  #
#  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING     #
#  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER         #
#  DEALINGS IN THE SOFTWARE.                                                   #
#                                                                              #
################################################################################

### Settings ###

# Files to include in the archive are selected by using $include and $ignore.
# $include and $ignore are a list of regular expressions. Files will be packed
# if they match any regular expression in $include and do not match any
# expression in $ignore.  All matching is done using Python re
# (http://docs.python.org/py3k/library/re.html) using the search meathod so you
# must explictly write ^ if begining of line matching is desired.  The full
# relative path is matched (begining with a /).  Directories are not listed
# and are created as needed.  This means you can not have empty directories.
include = [r"\.(jsm?|css|xul|properties|dtd|rdf)$", r"\.png$",
           r"^/chrome.manifest$"]
exclude = [r"/\."]

# The way to name the package.  This will be parsed using Python's Format
# String. (http://docs.python.org/py3k/library/string.html#formatstrings)  The
# package will be created in the current directory, overwriteing any file with
# the same name.
#
# Defined variables are:
# 	• {name} - the long name of the package.  This is taken from the
#		<em:name> element in install.rdf
# 	• {id} - the ID of the package.  This is taken from the
#		<em:id> element in install.rdf
# 	• {code} - the code or short name of the package.  This is the name used
#		in chrome urls.  This is taken from the <em:code> element in
#		install.rdf.  NOTE: this is not a standard element and will need to
#		added to install.rdf to be used.
# 	• {ver} - the version of the package.  This is taken from the <em:name>
#		element in install.rdf
xpiname = '{code}-{ver}' # The name of the .xpi package (".xpi" is appended)

# The root directory of the extention.  This is where the program will look for
# the sources.
import os
extdir = os.getcwd()





########## START INTERNAL WORK ##########

import os, sys
import shutil	#	High level file and directory access
import string, re

import zipfile # For working with zip archives

### Convience Functions ###
def getRelPath ( path, root = extdir ):
	return os.path.abspath(path)[len(root):]

### Go to the source dir ###
origdir=os.getcwd() # We will need this later when we make the package

### The Info To Use ###
needname = re.compile('^(.*[^\{]|)(\{\{)*\{name\}(\}\})*([^\}].*|)$') # If we need a name
getname  = re.compile('<em:name>([^<]*)</em:name>') # Get application name from install.rdf
name     = ""
needid   = re.compile('^(.*[^\{]|)(\{\{)*\{id\}(\}\})*([^\}].*|)$') # If we need an id
getid    = re.compile('<em:id>([^<]*)</em:id>') # Get application id from install.rdf
id       = ""
needcode = re.compile('^(.*[^\{]|)(\{\{)*\{code\}(\}\})*([^\}].*|)$') # If we need a code
getcode  = re.compile('<em:code>([^<]*)</em:code>') # Get short name from install.rdf
code     = ""
needver  = re.compile('^(.*[^\{]|)(\{\{)*\{ver\}(\}\})*([^\}].*|)$')    # If we need a version
getver   = re.compile('<em:version>([^<]*)</em:version>') # Get application version from install.rdf
ver      = ""

try: insrdff = open(extdir+"/install.rdf")
except: sys.exit("No install.rdf")
insrdf = insrdff.read()
if not insrdf:
	sys.exit("Bad install.rdf")
insrdff.close()
del insrdff

if needname.match(xpiname):
	try:    name = getname.search(insrdf).group(1)
	except: sys.exit("Could not get info: name")
if needid.match(xpiname):
	try:    id = getid.search(insrdf).group(1)
	except: sys.exit("Could not get info: id")
if needcode.match(xpiname):
	try:    code = getcode.search(insrdf).group(1)
	except: sys.exit("Could not get info: code")
if needver.match(xpiname):
	try:    ver = getver.search(insrdf).group(1)
	except: sys.exit("Could not get info: version")

xpiname = xpiname.format(name=name, code=code, ver=ver, id=id) + ".xpi" # Handle all the variables

### Compile the regular expressions ###
includere = []
for res in include:
	includere.append(re.compile(res))

excludere = []
for res in exclude:
	excludere.append(re.compile(res))

### Create the Archive ###
xpi = zipfile.ZipFile(xpiname, "w", zipfile.ZIP_STORED, True)

### Add Files ###
for root, dirs, files in os.walk(extdir):
	for file in files:
		file = root+'/'+file
		filename = getRelPath(file)

		if os.path.isdir(file):
			filename = filename + '/'

		for rei in includere:
			if rei.search(filename):
				for ree in excludere:
					if ree.search(filename):
						isinignore = True
						break
				else:
					isinignore = False
					break
		else: isinignore = True

		#print("Isignore: ", isinignore)

		if not isinignore:
			print("Adding", filename)
			xpi.write(file, filename)

		#input("Please enter an integer: ")

xpi.close() # Finalize the archive
