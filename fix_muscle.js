const fs = require("fs");
// Reconstruct from CSV with correct mapping
const groupMap = {
  "Pecho": "Pecho",
  "Espalda": "Espalda",
  "Bíceps": "Biceps",
  "Tríceps": "Triceps",
  "Cuádriceps": "Cuadriceps",
  "Isquios": "Isquiotibiales",
  "Gemelos": "Gemelos",
  "Abdomen": "Abdomen",
  "Glúteos": "Gluteos",
  "Cardio": "Cardio",
  "Hombros y trapecios": "Hombros",
  "Antebrazos": "Antebrazos",
};
const csv = fs.readFileSync("C:/Users/faust/Downloads/viking_biblioteca_ejercicios.csv");
const text = csv.toString("utf8");
const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
let rows=[];
for (let i=1;i<lines.length;i++) {
  const line=lines[i]; if(!line.trim()) continue;
  let cols=[]; let cur=""; let inQ=false;
  for (let j=0;j<line.length;j++) {
    const c=line[j];
    if(c==='"'){ inQ=!inQ; continue; }
    if(c===','&&!inQ){ cols.push(cur); cur=""; continue; }
    cur+=c;
  }
  cols.push(cur);
  if(cols.length>=3) {
    const g=cols[0].trim(); const n=cols[2].trim();
    const m=groupMap[g]; if(m&&n) rows.push({nombre:n,grupoMuscular:m});
  }
}
function norm(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").replace(/[^\w\s-]/g,"").trim();}
const seen=new Set(); const uniq=[];
for(const r of rows){ const nn=norm(r.nombre); if(!seen.has(nn)){seen.add(nn); uniq.push(r);} }
console.log(uniq.length);
fs.writeFileSync("tmp_new_fixed.json", JSON.stringify(uniq));
