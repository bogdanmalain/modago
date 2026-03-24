// src/constants/categoryVisuals.js
// Ce este: maparea centralizată pentru imaginile/visual-urile categoriilor ModaGo.
// Ce s-a modificat:
// - am creat un fișier separat pentru imaginile de categorie
// - imaginile sunt rezolvate după path/key, nu după label, ca să fie mai stabil și mai scalabil
// - structura este pregătită pentru subcategorii cu imagini, nu doar pentru Femei și Bărbați
// - momentan sunt active imaginile pentru categoriile principale: women și men

const CATEGORY_WOMEN_IMAGE = require("../../assets/categories/category-women.png");
const CATEGORY_MEN_IMAGE = require("../../assets/categories/category-men.png");

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function makePathKey(path = []) {
  if (!Array.isArray(path) || path.length === 0) return "";
  return path.map(normalizeKey).join(">");
}

const CATEGORY_IMAGE_BY_PATH = {
  women: CATEGORY_WOMEN_IMAGE,
  men: CATEGORY_MEN_IMAGE,

  // EXEMPLE pentru când vei adăuga subcategorii cu imagini:
  "women>women-clothing": require("../../assets/categories/category-women-clothing.png"),
  "women>women-shoes": require("../../assets/categories/category-women-shoes.png"),
  "women>women-bags": require("../../assets/categories/category-women-bags.png"),
  // "women>women-accessories": require("../../assets/categories/category-women-accessories.png"),
  // "men>men-clothing": require("../../assets/categories/category-men-clothing.png"),
  // "men>men-shoes": require("../../assets/categories/category-men-shoes.png"),
  // "men>men-accessories": require("../../assets/categories/category-men-accessories.png"),
};

export function getCategoryImageByPath(path = []) {
  const key = makePathKey(path);
  return CATEGORY_IMAGE_BY_PATH[key] || null;
}

export function hasCategoryImageByPath(path = []) {
  return !!getCategoryImageByPath(path);
}

export function getCategoryVisualTypeByPath(path = []) {
  return hasCategoryImageByPath(path) ? "image" : "emoji";
}
