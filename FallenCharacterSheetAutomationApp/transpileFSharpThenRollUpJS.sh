dotnet fable --lang js
npx rollup FallenLib.fs.js --file GoogleAppscript/FallenLibBundled.js --format cjs
sed -i '/^export./d' GoogleAppscript/FallenLibBundled.js