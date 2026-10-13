const fs = require("fs");
let s = fs.readFileSync("src/lib/store.ts").toString();
const block = fs.readFileSync("tmp_add_block.txt").toString();
const idx = s.indexOf("const EJERCICIOS_GLOBALES");
if (idx === -1) { console.log("no"); process.exit(1); }
const end = s.indexOf("];", idx);
if (end === -1) { console.log("no2"); process.exit(1); }
const before = s.slice(0, end);
const after = s.slice(end);
const newS = before + "\n" + block + after;
fs.writeFileSync("src/lib/store.ts", newS);
console.log("ok");
