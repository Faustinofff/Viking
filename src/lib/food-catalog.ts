export interface FoodItem {
  id: string;
  nombre: string;
  aliases: string[];
  kcal: number;
  proteina: number;
  carbohidratos: number;
  grasas: number;
}

export interface Macros {
  kcal: number;
  proteina: number;
  carbohidratos: number;
  grasas: number;
}

// Valores aproximados por 100 g de alimento. Fuente: USDA FoodData Central
// (dominio público) + tablas locales. Redondeados.
export const FOOD_CATALOG: FoodItem[] = [
  // ── Carnes y huevos ──
  { id: "pollo_pechuga", nombre: "Pechuga de pollo", aliases: ["pollo", "pechuga", "pechuga de pollo", "pollo a la plancha", "pollo grillado"], kcal: 165, proteina: 31, carbohidratos: 0, grasas: 3.6 },
  { id: "pollo_muslo", nombre: "Muslo de pollo", aliases: ["muslo", "muslo de pollo", "pata de pollo"], kcal: 209, proteina: 26, carbohidratos: 0, grasas: 11 },
  { id: "carne_vaca", nombre: "Carne de vaca", aliases: ["carne", "bife", "bife de chorizo", "asado", "vacío", "lomo", "carne vacuna", "matambre"], kcal: 250, proteina: 26, carbohidratos: 0, grasas: 16 },
  { id: "carne_picada", nombre: "Carne picada magra", aliases: ["carne picada", "picada", "carne molida"], kcal: 200, proteina: 27, carbohidratos: 0, grasas: 10 },
  { id: "milanesa_carne", nombre: "Milanesa de carne", aliases: ["milanesa", "milanga", "milanesa de carne"], kcal: 280, proteina: 20, carbohidratos: 15, grasas: 16 },
  { id: "huevo", nombre: "Huevo", aliases: ["huevo", "huevos", "huevo entero"], kcal: 155, proteina: 13, carbohidratos: 1.1, grasas: 11 },
  { id: "clara_huevo", nombre: "Clara de huevo", aliases: ["clara", "claras", "clara de huevo"], kcal: 52, proteina: 11, carbohidratos: 0.7, grasas: 0.2 },
  { id: "atun_aceite", nombre: "Atún en aceite", aliases: ["atún", "atun", "atún en aceite", "atun en aceite"], kcal: 198, proteina: 25, carbohidratos: 0, grasas: 11 },
  { id: "atun_agua", nombre: "Atún al agua", aliases: ["atún al agua", "atun al agua", "atún al natural", "atun natural"], kcal: 116, proteina: 26, carbohidratos: 0, grasas: 1 },
  { id: "salmon", nombre: "Salmón", aliases: ["salmón", "salmon"], kcal: 208, proteina: 20, carbohidratos: 0, grasas: 13 },
  { id: "merluza", nombre: "Merluza", aliases: ["merluza", "pescado", "pescado blanco"], kcal: 90, proteina: 18, carbohidratos: 0, grasas: 1.3 },
  { id: "cerdo_lomo", nombre: "Lomo de cerdo", aliases: ["cerdo", "lomo de cerdo", "bondiola", "pechito de cerdo"], kcal: 143, proteina: 26, carbohidratos: 0, grasas: 3.5 },
  { id: "jamon", nombre: "Jamón cocido", aliases: ["jamón", "jamon", "jamón cocido"], kcal: 145, proteina: 18, carbohidratos: 2, grasas: 7 },

  // ── Lácteos ──
  { id: "leche_entera", nombre: "Leche entera", aliases: ["leche", "leche entera"], kcal: 61, proteina: 3.2, carbohidratos: 4.8, grasas: 3.3 },
  { id: "leche_descremada", nombre: "Leche descremada", aliases: ["leche descremada", "leche light", "leche desnatada"], kcal: 35, proteina: 3.4, carbohidratos: 5, grasas: 0.2 },
  { id: "yogur_natural", nombre: "Yogur natural", aliases: ["yogur", "yogurt", "yogur natural"], kcal: 61, proteina: 3.5, carbohidratos: 4.7, grasas: 3.3 },
  { id: "yogur_griego", nombre: "Yogur griego", aliases: ["yogur griego", "yogurt griego"], kcal: 97, proteina: 9, carbohidratos: 3.6, grasas: 5 },
  { id: "queso_cremoso", nombre: "Queso cremoso", aliases: ["queso", "queso cremoso", "queso fresco", "queso de máquina"], kcal: 300, proteina: 20, carbohidratos: 3, grasas: 24 },
  { id: "mozzarella", nombre: "Mozzarella", aliases: ["muzza", "mozzarella", "muzzarella"], kcal: 280, proteina: 22, carbohidratos: 2, grasas: 22 },
  { id: "ricota", nombre: "Ricota", aliases: ["ricota"], kcal: 174, proteina: 11, carbohidratos: 3, grasas: 13 },
  { id: "queso_crema", nombre: "Queso crema", aliases: ["queso crema", "queso untable"], kcal: 342, proteina: 6, carbohidratos: 4, grasas: 34 },
  { id: "manteca", nombre: "Manteca", aliases: ["manteca", "mantequilla"], kcal: 717, proteina: 0.9, carbohidratos: 0.1, grasas: 81 },

  // ── Cereales y almidones ──
  { id: "arroz_blanco", nombre: "Arroz blanco cocido", aliases: ["arroz", "arroz blanco", "arroz cocido"], kcal: 130, proteina: 2.7, carbohidratos: 28, grasas: 0.3 },
  { id: "arroz_integral", nombre: "Arroz integral cocido", aliases: ["arroz integral"], kcal: 123, proteina: 2.6, carbohidratos: 26, grasas: 1 },
  { id: "fideos", nombre: "Fideos cocidos", aliases: ["fideos", "pasta", "pastas", "tallarines", "spaghetti", "fetuccini"], kcal: 158, proteina: 6, carbohidratos: 31, grasas: 1 },
  { id: "pan_blanco", nombre: "Pan blanco", aliases: ["pan", "pan blanco", "pan francés", "baguette", "marraqueta"], kcal: 265, proteina: 9, carbohidratos: 49, grasas: 3.2 },
  { id: "pan_integral", nombre: "Pan integral", aliases: ["pan integral", "pan negro"], kcal: 247, proteina: 13, carbohidratos: 41, grasas: 3.4 },
  { id: "avena", nombre: "Avena", aliases: ["avena", "hojuelas de avena", "copos de avena"], kcal: 389, proteina: 17, carbohidratos: 66, grasas: 7 },
  { id: "papa", nombre: "Papa hervida", aliases: ["papa", "papas", "papa hervida", "patata"], kcal: 87, proteina: 2, carbohidratos: 20, grasas: 0.1 },
  { id: "batata", nombre: "Batata", aliases: ["batata", "camote", "boniato"], kcal: 90, proteina: 2, carbohidratos: 20, grasas: 0.1 },
  { id: "mandioca", nombre: "Mandioca", aliases: ["mandioca", "yuca"], kcal: 160, proteina: 1.4, carbohidratos: 38, grasas: 0.3 },
  { id: "quinoa", nombre: "Quinoa cocida", aliases: ["quinoa"], kcal: 120, proteina: 4.4, carbohidratos: 21, grasas: 1.9 },
  { id: "lentejas", nombre: "Lentejas cocidas", aliases: ["lentejas", "lenteja"], kcal: 116, proteina: 9, carbohidratos: 20, grasas: 0.4 },
  { id: "garbanzos", nombre: "Garbanzos cocidos", aliases: ["garbanzos", "garbanzo"], kcal: 164, proteina: 8.9, carbohidratos: 27, grasas: 2.6 },
  { id: "porotos", nombre: "Porotos cocidos", aliases: ["porotos", "frijoles", "porotos negros", "porotos blancos"], kcal: 127, proteina: 8.7, carbohidratos: 23, grasas: 0.5 },
  { id: "polenta", nombre: "Polenta cocida", aliases: ["polenta"], kcal: 70, proteina: 1.6, carbohidratos: 15, grasas: 0.3 },

  // ── Frutas ──
  { id: "banana", nombre: "Banana", aliases: ["banana", "plátano", "platano"], kcal: 89, proteina: 1.1, carbohidratos: 23, grasas: 0.3 },
  { id: "manzana", nombre: "Manzana", aliases: ["manzana", "manzanas"], kcal: 52, proteina: 0.3, carbohidratos: 14, grasas: 0.2 },
  { id: "naranja", nombre: "Naranja", aliases: ["naranja", "naranjas"], kcal: 47, proteina: 0.9, carbohidratos: 12, grasas: 0.1 },
  { id: "pera", nombre: "Pera", aliases: ["pera", "peras"], kcal: 57, proteina: 0.4, carbohidratos: 15, grasas: 0.1 },
  { id: "frutilla", nombre: "Frutilla", aliases: ["frutilla", "frutillas", "fresa", "fresas"], kcal: 32, proteina: 0.7, carbohidratos: 7.7, grasas: 0.3 },
  { id: "palta", nombre: "Palta", aliases: ["palta", "aguacate"], kcal: 160, proteina: 2, carbohidratos: 9, grasas: 15 },
  { id: "uvas", nombre: "Uvas", aliases: ["uvas", "uva"], kcal: 69, proteina: 0.7, carbohidratos: 18, grasas: 0.2 },
  { id: "sandia", nombre: "Sandía", aliases: ["sandía", "sandia"], kcal: 30, proteina: 0.6, carbohidratos: 8, grasas: 0.2 },
  { id: "mango", nombre: "Mango", aliases: ["mango"], kcal: 60, proteina: 0.8, carbohidratos: 15, grasas: 0.4 },
  { id: "kiwi", nombre: "Kiwi", aliases: ["kiwi"], kcal: 61, proteina: 1.1, carbohidratos: 15, grasas: 0.5 },
  { id: "durazno", nombre: "Durazno", aliases: ["durazno", "duraznos", "melocotón"], kcal: 39, proteina: 0.9, carbohidratos: 10, grasas: 0.3 },

  // ── Verduras ──
  { id: "tomate", nombre: "Tomate", aliases: ["tomate", "tomates"], kcal: 18, proteina: 0.9, carbohidratos: 3.9, grasas: 0.2 },
  { id: "lechuga", nombre: "Lechuga", aliases: ["lechuga", "ensalada"], kcal: 15, proteina: 1.4, carbohidratos: 2.9, grasas: 0.2 },
  { id: "zanahoria", nombre: "Zanahoria", aliases: ["zanahoria", "zanahorias"], kcal: 41, proteina: 0.9, carbohidratos: 10, grasas: 0.2 },
  { id: "brocoli", nombre: "Brócoli", aliases: ["brócoli", "brocoli"], kcal: 34, proteina: 2.8, carbohidratos: 7, grasas: 0.4 },
  { id: "cebolla", nombre: "Cebolla", aliases: ["cebolla", "cebollas"], kcal: 40, proteina: 1.1, carbohidratos: 9, grasas: 0.1 },
  { id: "zapallito", nombre: "Zapallito", aliases: ["zapallito", "zucchini", "calabacín", "calabacin"], kcal: 17, proteina: 1.2, carbohidratos: 3.1, grasas: 0.3 },
  { id: "morron", nombre: "Morrón", aliases: ["morrón", "morron", "pimiento", "ají morrón"], kcal: 26, proteina: 1, carbohidratos: 6, grasas: 0.3 },
  { id: "pepino", nombre: "Pepino", aliases: ["pepino", "pepinos"], kcal: 15, proteina: 0.7, carbohidratos: 3.6, grasas: 0.1 },
  { id: "espinaca", nombre: "Espinaca", aliases: ["espinaca", "espinacas"], kcal: 23, proteina: 2.9, carbohidratos: 3.6, grasas: 0.4 },
  { id: "acelga", nombre: "Acelga", aliases: ["acelga", "acelgas"], kcal: 19, proteina: 1.8, carbohidratos: 3.7, grasas: 0.2 },
  { id: "choclo", nombre: "Choclo", aliases: ["choclo", "choclos", "maíz", "maiz"], kcal: 86, proteina: 3.2, carbohidratos: 19, grasas: 1.2 },
  { id: "arvejas", nombre: "Arvejas", aliases: ["arvejas", "guisantes", "arveja"], kcal: 81, proteina: 5, carbohidratos: 14, grasas: 0.4 },
  { id: "coliflor", nombre: "Coliflor", aliases: ["coliflor"], kcal: 25, proteina: 1.9, carbohidratos: 5, grasas: 0.3 },
  { id: "calabaza", nombre: "Calabaza", aliases: ["calabaza", "zapallo", "zapallo criollo"], kcal: 26, proteina: 1, carbohidratos: 6.5, grasas: 0.1 },
  { id: "limon", nombre: "Limón", aliases: ["limón", "limon"], kcal: 29, proteina: 1.1, carbohidratos: 9, grasas: 0.3 },
  { id: "esparrago", nombre: "Espárrago", aliases: ["espárrago", "esparrago", "espárragos"], kcal: 20, proteina: 2.2, carbohidratos: 3.9, grasas: 0.1 },
  { id: "berenjena", nombre: "Berenjena", aliases: ["berenjena"], kcal: 25, proteina: 1, carbohidratos: 6, grasas: 0.2 },
  { id: "repollo", nombre: "Repollo", aliases: ["repollo", "col"], kcal: 25, proteina: 1.3, carbohidratos: 6, grasas: 0.1 },
  { id: "apio", nombre: "Apio", aliases: ["apio"], kcal: 16, proteina: 0.7, carbohidratos: 3, grasas: 0.2 },
  { id: "remolacha", nombre: "Remolacha", aliases: ["remolacha", "betabel"], kcal: 43, proteina: 1.6, carbohidratos: 10, grasas: 0.2 },
  { id: "rucula", nombre: "Rúcula", aliases: ["rúcula", "rucula"], kcal: 25, proteina: 2.6, carbohidratos: 3.7, grasas: 0.7 },
  { id: "puerro", nombre: "Puerro", aliases: ["puerro"], kcal: 61, proteina: 1.5, carbohidratos: 14, grasas: 0.3 },

  // ── Grasas y frutos secos ──
  { id: "aceite_oliva", nombre: "Aceite de oliva", aliases: ["aceite de oliva", "aceite"], kcal: 884, proteina: 0, carbohidratos: 0, grasas: 100 },
  { id: "aceite_girasol", nombre: "Aceite de girasol", aliases: ["aceite de girasol"], kcal: 884, proteina: 0, carbohidratos: 0, grasas: 100 },
  { id: "mayonesa", nombre: "Mayonesa", aliases: ["mayonesa", "mayo"], kcal: 680, proteina: 1, carbohidratos: 0.6, grasas: 75 },
  { id: "manteca_mani", nombre: "Manteca de maní", aliases: ["manteca de maní", "mantequilla de maní", "pasta de maní"], kcal: 588, proteina: 25, carbohidratos: 20, grasas: 50 },
  { id: "almendras", nombre: "Almendras", aliases: ["almendras", "almendra"], kcal: 579, proteina: 21, carbohidratos: 22, grasas: 50 },
  { id: "nueces", nombre: "Nueces", aliases: ["nueces", "nuez"], kcal: 654, proteina: 15, carbohidratos: 14, grasas: 65 },
  { id: "mani", nombre: "Maní", aliases: ["maní", "mani", "cacahuate"], kcal: 567, proteina: 26, carbohidratos: 16, grasas: 49 },

  // ── Otros ──
  { id: "azucar", nombre: "Azúcar", aliases: ["azúcar", "azucar"], kcal: 387, proteina: 0, carbohidratos: 100, grasas: 0 },
  { id: "dulce_leche", nombre: "Dulce de leche", aliases: ["dulce de leche"], kcal: 315, proteina: 6, carbohidratos: 55, grasas: 7 },
  { id: "miel", nombre: "Miel", aliases: ["miel"], kcal: 304, proteina: 0.3, carbohidratos: 82, grasas: 0 },
  { id: "chocolate", nombre: "Chocolate con leche", aliases: ["chocolate", "chocolate con leche"], kcal: 535, proteina: 7.7, carbohidratos: 59, grasas: 30 },
  { id: "gaseosa", nombre: "Gaseosa", aliases: ["gaseosa", "coca", "coca cola", "refresco", "bebida"], kcal: 42, proteina: 0, carbohidratos: 10.6, grasas: 0 },
  { id: "cerveza", nombre: "Cerveza", aliases: ["cerveza"], kcal: 43, proteina: 0.5, carbohidratos: 3.6, grasas: 0 },
  { id: "pan_rallado", nombre: "Pan rallado", aliases: ["pan rallado"], kcal: 395, proteina: 13, carbohidratos: 72, grasas: 5 },
];

export function normalizar(texto: string): string {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Clave de comparación: normaliza y quita la "s" final (singulariza simple).
function clave(texto: string): string {
  const n = normalizar(texto);
  return n.length > 3 && n.endsWith("s") ? n.slice(0, -1) : n;
}

// Busca el alimento del catálogo que mejor coincide con un nombre detectado por la IA.
// Prioriza coincidencia exacta; si no, el alias más largo contenido en el nombre.
export function buscarAlimento(nombre: string): FoodItem | null {
  const q = normalizar(nombre);
  if (!q) return null;
  const qk = clave(q);
  let mejor: FoodItem | null = null;
  let mejorScore = 0;
  for (const food of FOOD_CATALOG) {
    for (const termino of [food.nombre, ...food.aliases]) {
      const t = normalizar(termino);
      if (!t) continue;
      let score = 0;
      if (clave(t) === qk) {
        score = 1000 + t.length;
      } else if (t.length >= 3 && q.includes(t)) {
        score = t.length;
      }
      if (score > mejorScore) {
        mejor = food;
        mejorScore = score;
      }
    }
  }
  return mejor;
}

export function calcularMacros(food: FoodItem, gramos: number): Macros {
  const f = Math.max(0, gramos) / 100;
  return {
    kcal: Math.round(food.kcal * f),
    proteina: Math.round(food.proteina * f * 10) / 10,
    carbohidratos: Math.round(food.carbohidratos * f * 10) / 10,
    grasas: Math.round(food.grasas * f * 10) / 10,
  };
}

export function sumarMacros(lista: Macros[]): Macros {
  const total = lista.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteina: acc.proteina + m.proteina,
      carbohidratos: acc.carbohidratos + m.carbohidratos,
      grasas: acc.grasas + m.grasas,
    }),
    { kcal: 0, proteina: 0, carbohidratos: 0, grasas: 0 }
  );
  return {
    kcal: Math.round(total.kcal),
    proteina: Math.round(total.proteina * 10) / 10,
    carbohidratos: Math.round(total.carbohidratos * 10) / 10,
    grasas: Math.round(total.grasas * 10) / 10,
  };
}
