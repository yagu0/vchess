#!/bin/bash
# Count code lines ( using answer https://stackoverflow.com/a/965072 )

function countFoldExt()
{
	count=0
	for fullfile in `find $1`; do
		filename=$(basename -- "$fullfile")
		extension="${filename##*.}"
		if [ "$extension" == "$2" ]; then
			count=$((count+`wc -l $fullfile | grep -o ^[0-9]*`))
		fi
	done
	echo $count
}

count=0
count=$((count + $(countFoldExt "app.js" "js")))
count=$((count + $(countFoldExt "gulpfile.js" "js")))
count=$((count + $(countFoldExt "sockets.js" "js")))
count=$((count + $(countFoldExt "bin" "www")))
count=$((count + $(countFoldExt "config" "js")))
count=$((count + $(countFoldExt "db" "sql")))
count=$((count + $(countFoldExt "models" "js")))
count=$((count + $(countFoldExt "public" "js")))
count=$((count + $(countFoldExt "public" "sass")))
count=$((count + $(countFoldExt "routes" "js")))
count=$((count + $(countFoldExt "utils" "js")))
count=$((count + $(countFoldExt "views" "pug")))
echo $count
