// src/constants/categoryTree.js
// Ce este: sursa unică pentru categoriile de publicare ModaGo.
// Ce s-a modificat: am păstrat API-ul vechi care funcționa deja în aplicație
// (getNodesByPath, getNodeByPath, getPathLabels, getPathLabel, isLeafNode, findPathByQuery),
// dar am curățat arborele pentru lansarea fashion-only: Femei și Bărbați, fără electronice
// și fără alte categorii în afara zonei fashion.

export const CATEGORY_TREE = [
  {
    key: "women",
    label: "Femei",
    children: [
      {
        key: "women-clothing",
        label: "Îmbrăcăminte",
        children: [
          { key: "women-dresses", label: "Rochii" },
          { key: "women-tops", label: "Topuri și tricouri" },
          { key: "women-shirts", label: "Cămăși și bluze" },
          { key: "women-knitwear", label: "Pulovere și hanorace" },
          { key: "women-jackets", label: "Geci și paltoane" },
          { key: "women-jeans", label: "Blugi" },
          { key: "women-pants", label: "Pantaloni" },
          { key: "women-skirts", label: "Fuste" },
          { key: "women-jumpsuits", label: "Salopete" },
          { key: "women-sets", label: "Costume și seturi" },
          { key: "women-lingerie", label: "Lenjerie și pijamale" },
          { key: "women-swimwear", label: "Costume de baie" },
          { key: "women-sportswear", label: "Haine sport" },
        ],
      },
      {
        key: "women-shoes",
        label: "Încălțăminte",
        children: [
          { key: "women-sneakers", label: "Sneakers" },
          { key: "women-heels", label: "Pantofi" },
          { key: "women-sandals", label: "Sandale" },
          { key: "women-boots", label: "Cizme și botine" },
          { key: "women-slippers", label: "Papuci" },
          { key: "women-sport-shoes", label: "Încălțăminte sport" },
        ],
      },
      {
        key: "women-bags",
        label: "Genți",
        children: [
          { key: "women-shoulder-bags", label: "Genți de umăr" },
          { key: "women-hand-bags", label: "Genți de mână" },
          { key: "women-clutch-bags", label: "Clutch" },
          { key: "women-backpacks", label: "Rucsacuri" },
          { key: "women-wallets", label: "Portofele" },
        ],
      },
      {
        key: "women-accessories",
        label: "Accesorii",
        children: [
          { key: "women-belts", label: "Curele" },
          { key: "women-scarves", label: "Eșarfe și fulare" },
          { key: "women-hats", label: "Pălării și șepci" },
          { key: "women-glasses", label: "Ochelari" },
          { key: "women-jewelry", label: "Bijuterii" },
          { key: "women-watches", label: "Ceasuri fashion" },
        ],
      },
    ],
  },
  {
    key: "men",
    label: "Bărbați",
    children: [
      {
        key: "men-clothing",
        label: "Îmbrăcăminte",
        children: [
          { key: "men-tshirts", label: "Tricouri" },
          { key: "men-shirts", label: "Cămăși" },
          { key: "men-knitwear", label: "Pulovere și hanorace" },
          { key: "men-jackets", label: "Geci și paltoane" },
          { key: "men-jeans", label: "Blugi" },
          { key: "men-pants", label: "Pantaloni" },
          { key: "men-shorts", label: "Pantaloni scurți" },
          { key: "men-suits", label: "Costume" },
          { key: "men-sportswear", label: "Haine sport" },
          { key: "men-lingerie", label: "Lenjerie și pijamale" },
        ],
      },
      {
        key: "men-shoes",
        label: "Încălțăminte",
        children: [
          { key: "men-sneakers", label: "Sneakers" },
          { key: "men-shoes-classic", label: "Pantofi" },
          { key: "men-boots", label: "Cizme" },
          { key: "men-slippers", label: "Papuci" },
          { key: "men-sport-shoes", label: "Încălțăminte sport" },
        ],
      },
      {
        key: "men-accessories",
        label: "Accesorii",
        children: [
          { key: "men-belts", label: "Curele" },
          { key: "men-wallets", label: "Portofele" },
          { key: "men-backpacks", label: "Rucsacuri" },
          { key: "men-hats", label: "Șepci și pălării" },
          { key: "men-glasses", label: "Ochelari" },
          { key: "men-watches", label: "Ceasuri fashion" },
          { key: "men-ties", label: "Cravate" },
        ],
      },
    ],
  },
];

function walk(nodes, visitor, parents = []) {
  for (const node of nodes || []) {
    const nextParents = [...parents, node];
    visitor(node, nextParents);

    if (Array.isArray(node.children) && node.children.length > 0) {
      walk(node.children, visitor, nextParents);
    }
  }
}

export function getNodesByPath(tree, pathKeys = []) {
  let nodes = tree;

  for (const key of pathKeys) {
    const node = (nodes || []).find((item) => item.key === key);
    if (!node) return [];
    nodes = node.children || [];
  }

  return nodes || [];
}

export function getNodeByPath(tree, pathKeys = []) {
  if (!Array.isArray(pathKeys) || pathKeys.length === 0) return null;

  let nodes = tree;
  let found = null;

  for (const key of pathKeys) {
    found = (nodes || []).find((item) => item.key === key) || null;
    if (!found) return null;
    nodes = found.children || [];
  }

  return found;
}

export function getPathLabels(tree, pathKeys = []) {
  const labels = [];
  let nodes = tree;

  for (const key of pathKeys) {
    const found = (nodes || []).find((item) => item.key === key);
    if (!found) break;
    labels.push(found.label);
    nodes = found.children || [];
  }

  return labels;
}

export function getPathLabel(tree, pathKeys = [], separator = " > ") {
  return getPathLabels(tree, pathKeys).join(separator);
}

export function isLeafNode(tree, pathKeys = []) {
  const node = getNodeByPath(tree, pathKeys);
  return (
    !!node && (!Array.isArray(node.children) || node.children.length === 0)
  );
}

export function findPathByQuery(tree, query = "") {
  const q = String(query || "")
    .trim()
    .toLowerCase();

  if (!q) return [];

  const matches = [];

  walk(tree, (node, parents) => {
    if (
      String(node.label || "")
        .toLowerCase()
        .includes(q)
    ) {
      matches.push({
        node,
        pathKeys: parents.map((item) => item.key),
        pathLabel: parents.map((item) => item.label).join(" > "),
      });
    }
  });

  return matches;
}

/**
 * Helpers suplimentari, fără să stricăm API-ul vechi.
 * Sunt utili pentru UI unde vrem doar categoria principală.
 */

export function getPrimaryCategoryLabel(tree, pathKeys = []) {
  return getPathLabels(tree, pathKeys)[0] || "";
}

export function getLastCategoryLabel(tree, pathKeys = []) {
  const labels = getPathLabels(tree, pathKeys);
  return labels[labels.length - 1] || "";
}

export function flattenCategoryTree(tree = CATEGORY_TREE) {
  const flat = [];

  walk(tree, (node, parents) => {
    flat.push({
      key: node.key,
      label: node.label,
      pathKeys: parents.map((item) => item.key),
      pathLabel: parents.map((item) => item.label).join(" > "),
      isLeaf: !Array.isArray(node.children) || node.children.length === 0,
    });
  });

  return flat;
}

export function getLeafCategories(tree = CATEGORY_TREE) {
  return flattenCategoryTree(tree).filter((item) => item.isLeaf);
}
