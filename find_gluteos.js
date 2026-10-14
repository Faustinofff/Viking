const fs=require("fs");
const csv=fs.readFileSync("C:/Users/faust/Downloads/viking_biblioteca_ejercicios.csv");
const text=csv.toString("utf8");
if(text.includes("Glúteos")) console.log("yes"); else console.log("no");
