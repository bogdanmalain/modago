// src/constants/categoryVisuals.js
// Ce este: maparea centralizată pentru imaginile/visual-urile categoriilor ModaGo.
// Ce s-a modificat:
// - am păstrat suportul pentru Copii doar la nivel top-level, ca să putem adăuga subcategoriile pe rând
// - am scos temporar require-urile pentru kids-clothing / kids-shoes / kids-accessories până există fișierele reale
// - restul mapării rămâne neschimbat

const CATEGORY_WOMEN_IMAGE = require("../../assets/categories/category-women.png");
const CATEGORY_MEN_IMAGE = require("../../assets/categories/category-men.png");
const CATEGORY_KIDS_IMAGE = require("../../assets/categories/category-kids.png");

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
  kids: CATEGORY_KIDS_IMAGE,

  "women>women-clothing": require("../../assets/categories/category-women-clothing.png"),
  "women>women-shoes": require("../../assets/categories/category-women-shoes.png"),
  "women>women-bags": require("../../assets/categories/category-women-bags.png"),
  "women>women-accessories": require("../../assets/categories/category-women-accessories.png"),

  "men>men-clothing": require("../../assets/categories/category-men-clothing.png"),
  "men>men-shoes": require("../../assets/categories/category-men-shoes.png"),
  "men>men-accessories": require("../../assets/categories/category-men-accessories.png"),

  "kids>kids-girls-clothing": require("../../assets/categories/category-kids-girls-clothing.png"),
  "kids>kids-boys-clothing": require("../../assets/categories/category-kids-boys-clothing.png"),
  "kids>kids-shoes": require("../../assets/categories/category-kids-shoes.png"),
  "kids>kids-accessories": require("../../assets/categories/category-kids-accessories.png"),
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
