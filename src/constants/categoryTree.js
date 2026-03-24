// src/constants/categoryTree.js
// Ce este: sursa unică pentru categoriile de publicare ModaGo.
// Ce s-a modificat: am refăcut varianta completă și curată a arborelui de categorii,
// păstrând helper-ele necesare pentru AddItem, inclusiv exportul corect pentru
// getNodesByPath, getNodeByPath, getPathLabels, getPathLabel, isLeafNode și findPathByQuery.

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
          { key: "women-jeans", label: "Blugi" },
          { key: "women-pants", label: "Pantaloni" },
          { key: "women-jackets", label: "Jachete și paltoane" },
          { key: "women-sportswear", label: "Îmbrăcăminte sport" },
        ],
      },
      {
        key: "women-shoes",
        label: "Încălțăminte",
        children: [
          { key: "women-sneakers", label: "Sneakers" },
          { key: "women-heels", label: "Pantofi" },
          { key: "women-boots", label: "Cizme și botine" },
          { key: "women-sandals", label: "Sandale" },
        ],
      },
      {
        key: "women-bags",
        label: "Genți",
        children: [
          { key: "women-handbags", label: "Genți de mână" },
          { key: "women-backpacks", label: "Rucsacuri" },
          { key: "women-wallets", label: "Portofele" },
        ],
      },
      {
        key: "women-accessories",
        label: "Accesorii",
        children: [
          { key: "women-jewelry", label: "Bijuterii" },
          { key: "women-watches", label: "Ceasuri" },
          { key: "women-belts", label: "Curele" },
          { key: "women-sunglasses", label: "Ochelari de soare" },
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
          { key: "men-jeans", label: "Blugi" },
          { key: "men-pants", label: "Pantaloni" },
          { key: "men-jackets", label: "Jachete și paltoane" },
          { key: "men-sportswear", label: "Îmbrăcăminte sport" },
        ],
      },
      {
        key: "men-shoes",
        label: "Încălțăminte",
        children: [
          { key: "men-sneakers", label: "Sneakers" },
          { key: "men-shoes-leaf", label: "Pantofi" },
          { key: "men-boots", label: "Ghete și bocanci" },
          { key: "men-sandals", label: "Sandale" },
        ],
      },
      {
        key: "men-accessories",
        label: "Accesorii",
        children: [
          { key: "men-watches", label: "Ceasuri" },
          { key: "men-wallets", label: "Portofele" },
          { key: "men-belts", label: "Curele" },
          { key: "men-bags", label: "Genți și borsete" },
        ],
      },
    ],
  },
  {
    key: "kids",
    label: "Copii",
    children: [
      {
        key: "kids-clothing",
        label: "Îmbrăcăminte",
        children: [
          { key: "kids-babies", label: "Bebeluși" },
          { key: "kids-girls", label: "Fete" },
          { key: "kids-boys", label: "Băieți" },
        ],
      },
      {
        key: "kids-shoes",
        label: "Încălțăminte",
        children: [
          { key: "kids-sneakers", label: "Sneakers" },
          { key: "kids-boots", label: "Ghete" },
          { key: "kids-sandals", label: "Sandale" },
        ],
      },
      {
        key: "kids-accessories",
        label: "Accesorii și jucării",
        children: [
          { key: "kids-toys", label: "Jucării" },
          { key: "kids-school", label: "Școală și grădiniță" },
          { key: "kids-bags", label: "Genți și rucsacuri" },
        ],
      },
    ],
  },
  {
    key: "home",
    label: "Casă",
    children: [
      { key: "home-decor", label: "Decorațiuni" },
      { key: "home-textiles", label: "Textile pentru casă" },
      { key: "home-kitchen", label: "Bucătărie și servire" },
      { key: "home-furniture", label: "Mobilier mic" },
      { key: "home-lighting", label: "Iluminat" },
    ],
  },
  {
    key: "electronics",
    label: "Electronice",
    children: [
      { key: "electronics-games", label: "Jocuri video și console" },
      { key: "electronics-computers", label: "Calculatoare și accesorii" },
      {
        key: "electronics-mobile",
        label: "Telefoane mobile și comunicare",
        children: [
          { key: "electronics-mobile-phones", label: "Telefoane mobile" },
          {
            key: "electronics-mobile-parts",
            label: "Piese și accesorii pentru telefoane mobile",
          },
          { key: "electronics-landline", label: "Telefoane fixe" },
          { key: "electronics-fax", label: "Faxuri" },
          { key: "electronics-radio", label: "Comunicații radio" },
          { key: "electronics-mobile-demo", label: "Telefoane mobile demo" },
        ],
      },
      { key: "electronics-audio", label: "Audio, căști și hi-fi" },
      { key: "electronics-camera", label: "Camere foto și accesorii" },
      { key: "electronics-tablets", label: "Tablete, e-readere și accesorii" },
      { key: "electronics-tv", label: "TV și home cinema" },
      {
        key: "electronics-beauty",
        label: "Electronice pentru frumusețe și îngrijire personală",
      },
      { key: "electronics-wearables", label: "Portabile" },
      {
        key: "electronics-other",
        label: "Alte dispozitive și accesorii",
      },
    ],
  },
  {
    key: "entertainment",
    label: "Divertisment",
    children: [
      { key: "ent-books", label: "Cărți" },
      { key: "ent-music", label: "Muzică" },
      { key: "ent-movies", label: "Filme și seriale" },
      { key: "ent-boardgames", label: "Board games" },
    ],
  },
  {
    key: "hobby",
    label: "Hobbyuri și colecții",
    children: [
      { key: "hobby-collectibles", label: "Colecții" },
      { key: "hobby-diy", label: "DIY și craft" },
      { key: "hobby-art", label: "Artă" },
      { key: "hobby-models", label: "Modele și figurine" },
    ],
  },
  {
    key: "sports",
    label: "Sporturi",
    children: [
      { key: "sports-fitness", label: "Fitness" },
      { key: "sports-running", label: "Alergare" },
      { key: "sports-cycling", label: "Ciclism" },
      { key: "sports-football", label: "Fotbal" },
      { key: "sports-outdoor", label: "Outdoor" },
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
