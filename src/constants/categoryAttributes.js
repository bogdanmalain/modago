// src/constants/categoryAttributes.js
// Ce este: configurarea atributelor dinamice pentru categoriile finale din AddItem.
// Ce s-a modificat:
// - am păstrat Femei și Bărbați neschimbate
// - am refăcut Copii pe structura finală:
//   • Îmbrăcăminte fete
//   • Îmbrăcăminte băieți
//   • Încălțăminte > Fete / Băieți
//   • Accesorii
// - am păstrat Copii fără câmpul "Potrivit pentru"
// - am păstrat atribute simple și coerente pentru MVP: Brand, Mărime, Stare, Culoare

const BRAND_OPTIONS_FASHION = [
  { value: "zara", label: "Zara" },
  { value: "hm", label: "H&M" },
  { value: "bershka", label: "Bershka" },
  { value: "pull_bear", label: "Pull&Bear" },
  { value: "stradivarius", label: "Stradivarius" },
  { value: "mango", label: "Mango" },
  { value: "reserved", label: "Reserved" },
  { value: "lc_waikiki", label: "LC Waikiki" },
  { value: "nike", label: "Nike" },
  { value: "adidas", label: "Adidas" },
  { value: "puma", label: "Puma" },
  { value: "new_yorker", label: "New Yorker" },
  { value: "tommy_hilfiger", label: "Tommy Hilfiger" },
  { value: "calvin_klein", label: "Calvin Klein" },
  { value: "guess", label: "Guess" },
  { value: "levi_s", label: "Levi's" },
  { value: "massimo_dutti", label: "Massimo Dutti" },
  { value: "mayoral", label: "Mayoral" },
  { value: "coccodrillo", label: "Coccodrillo" },
  { value: "george", label: "George" },
  { value: "next", label: "Next" },
  { value: "other", label: "Alt brand" },
];

const CONDITION_OPTIONS_FASHION = [
  { value: "new_with_tags", label: "Nou cu etichetă" },
  { value: "new_without_tags", label: "Nou fără etichetă" },
  { value: "very_good", label: "Foarte bună" },
  { value: "good", label: "Bună" },
  { value: "satisfactory", label: "Satisfăcătoare" },
];

const COLOR_OPTIONS_FASHION = [
  { value: "black", label: "Negru" },
  { value: "white", label: "Alb" },
  { value: "gray", label: "Gri" },
  { value: "beige", label: "Bej" },
  { value: "brown", label: "Maro" },
  { value: "blue", label: "Albastru" },
  { value: "navy", label: "Bleumarin" },
  { value: "red", label: "Roșu" },
  { value: "pink", label: "Roz" },
  { value: "purple", label: "Mov" },
  { value: "green", label: "Verde" },
  { value: "yellow", label: "Galben" },
  { value: "orange", label: "Portocaliu" },
  { value: "multicolor", label: "Multicolor" },
  { value: "other", label: "Altă culoare" },
];

const SIZE_OPTIONS_CLOTHES = [
  { value: "xxs", label: "XXS" },
  { value: "xs", label: "XS" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
  { value: "xxl", label: "XXL" },
  { value: "3xl_plus", label: "3XL+" },
  { value: "one_size", label: "Mărime unică" },
];

const SIZE_OPTIONS_SHOES = [
  { value: "35", label: "35" },
  { value: "36", label: "36" },
  { value: "37", label: "37" },
  { value: "38", label: "38" },
  { value: "39", label: "39" },
  { value: "40", label: "40" },
  { value: "41", label: "41" },
  { value: "42", label: "42" },
  { value: "43", label: "43" },
  { value: "44", label: "44" },
  { value: "45", label: "45" },
  { value: "46", label: "46" },
  { value: "47", label: "47" },
  { value: "48", label: "48" },
];

const SIZE_OPTIONS_KIDS_CLOTHES = [
  { value: "50_56", label: "50-56 (0-2 luni)" },
  { value: "62_68", label: "62-68 (3-6 luni)" },
  { value: "74_80", label: "74-80 (6-12 luni)" },
  { value: "86_92", label: "86-92 (1-2 ani)" },
  { value: "98_104", label: "98-104 (3-4 ani)" },
  { value: "110_116", label: "110-116 (5-6 ani)" },
  { value: "122_128", label: "122-128 (7-8 ani)" },
  { value: "134_140", label: "134-140 (9-10 ani)" },
  { value: "146_152", label: "146-152 (11-12 ani)" },
  { value: "158_164", label: "158-164 (13-14 ani)" },
  { value: "one_size", label: "Mărime unică" },
];

const SIZE_OPTIONS_KIDS_SHOES = [
  { value: "18", label: "18" },
  { value: "19", label: "19" },
  { value: "20", label: "20" },
  { value: "21", label: "21" },
  { value: "22", label: "22" },
  { value: "23", label: "23" },
  { value: "24", label: "24" },
  { value: "25", label: "25" },
  { value: "26", label: "26" },
  { value: "27", label: "27" },
  { value: "28", label: "28" },
  { value: "29", label: "29" },
  { value: "30", label: "30" },
  { value: "31", label: "31" },
  { value: "32", label: "32" },
  { value: "33", label: "33" },
  { value: "34", label: "34" },
  { value: "35", label: "35" },
];

function fashionBrandField() {
  return {
    key: "brand",
    label: "Brand",
    type: "select",
    placeholder: "Alege brandul",
    options: BRAND_OPTIONS_FASHION,
  };
}

function fashionConditionField() {
  return {
    key: "condition",
    label: "Stare",
    type: "select",
    placeholder: "Alege starea",
    options: CONDITION_OPTIONS_FASHION,
  };
}

function fashionColorField() {
  return {
    key: "color",
    label: "Culoare",
    type: "select",
    placeholder: "Alege culoarea",
    options: COLOR_OPTIONS_FASHION,
  };
}

function clothesSizeField() {
  return {
    key: "size",
    label: "Mărime",
    type: "select",
    placeholder: "Alege mărimea",
    options: SIZE_OPTIONS_CLOTHES,
  };
}

function shoesSizeField() {
  return {
    key: "size",
    label: "Mărime",
    type: "select",
    placeholder: "Alege mărimea",
    options: SIZE_OPTIONS_SHOES,
  };
}

function kidsClothesSizeField() {
  return {
    key: "size",
    label: "Mărime",
    type: "select",
    placeholder: "Alege mărimea",
    options: SIZE_OPTIONS_KIDS_CLOTHES,
  };
}

function kidsShoesSizeField() {
  return {
    key: "size",
    label: "Mărime",
    type: "select",
    placeholder: "Alege mărimea",
    options: SIZE_OPTIONS_KIDS_SHOES,
  };
}

function buildFashionClothesAttributes() {
  return [
    fashionBrandField(),
    clothesSizeField(),
    fashionConditionField(),
    fashionColorField(),
  ];
}

function buildFashionShoesAttributes() {
  return [
    fashionBrandField(),
    shoesSizeField(),
    fashionConditionField(),
    fashionColorField(),
  ];
}

function buildFashionSimpleAttributes() {
  return [fashionBrandField(), fashionConditionField(), fashionColorField()];
}

function buildKidsClothesAttributes() {
  return [
    fashionBrandField(),
    kidsClothesSizeField(),
    fashionConditionField(),
    fashionColorField(),
  ];
}

function buildKidsShoesAttributes() {
  return [
    fashionBrandField(),
    kidsShoesSizeField(),
    fashionConditionField(),
    fashionColorField(),
  ];
}

function buildKidsSimpleAttributes() {
  return [fashionBrandField(), fashionConditionField(), fashionColorField()];
}

export const CATEGORY_ATTRIBUTES = {
  "women-dresses": buildFashionClothesAttributes(),
  "women-tops": buildFashionClothesAttributes(),
  "women-shirts": buildFashionClothesAttributes(),
  "women-knitwear": buildFashionClothesAttributes(),
  "women-jackets": buildFashionClothesAttributes(),
  "women-jeans": buildFashionClothesAttributes(),
  "women-pants": buildFashionClothesAttributes(),
  "women-skirts": buildFashionClothesAttributes(),
  "women-jumpsuits": buildFashionClothesAttributes(),
  "women-sets": buildFashionClothesAttributes(),
  "women-lingerie": buildFashionClothesAttributes(),
  "women-swimwear": buildFashionClothesAttributes(),
  "women-sportswear": buildFashionClothesAttributes(),

  "women-sneakers": buildFashionShoesAttributes(),
  "women-heels": buildFashionShoesAttributes(),
  "women-sandals": buildFashionShoesAttributes(),
  "women-boots": buildFashionShoesAttributes(),
  "women-slippers": buildFashionShoesAttributes(),
  "women-sport-shoes": buildFashionShoesAttributes(),

  "women-shoulder-bags": buildFashionSimpleAttributes(),
  "women-hand-bags": buildFashionSimpleAttributes(),
  "women-clutch-bags": buildFashionSimpleAttributes(),
  "women-backpacks": buildFashionSimpleAttributes(),
  "women-wallets": buildFashionSimpleAttributes(),

  "women-belts": buildFashionSimpleAttributes(),
  "women-scarves": buildFashionSimpleAttributes(),
  "women-hats": buildFashionSimpleAttributes(),
  "women-glasses": buildFashionSimpleAttributes(),
  "women-jewelry": buildFashionSimpleAttributes(),
  "women-watches": buildFashionSimpleAttributes(),

  "men-tshirts": buildFashionClothesAttributes(),
  "men-shirts": buildFashionClothesAttributes(),
  "men-knitwear": buildFashionClothesAttributes(),
  "men-jackets": buildFashionClothesAttributes(),
  "men-jeans": buildFashionClothesAttributes(),
  "men-pants": buildFashionClothesAttributes(),
  "men-shorts": buildFashionClothesAttributes(),
  "men-suits": buildFashionClothesAttributes(),
  "men-sportswear": buildFashionClothesAttributes(),
  "men-lingerie": buildFashionClothesAttributes(),

  "men-sneakers": buildFashionShoesAttributes(),
  "men-shoes-classic": buildFashionShoesAttributes(),
  "men-boots": buildFashionShoesAttributes(),
  "men-slippers": buildFashionShoesAttributes(),
  "men-sport-shoes": buildFashionShoesAttributes(),

  "men-belts": buildFashionSimpleAttributes(),
  "men-wallets": buildFashionSimpleAttributes(),
  "men-backpacks": buildFashionSimpleAttributes(),
  "men-hats": buildFashionSimpleAttributes(),
  "men-glasses": buildFashionSimpleAttributes(),
  "men-watches": buildFashionSimpleAttributes(),
  "men-ties": buildFashionSimpleAttributes(),

  "kids-girls-dresses": buildKidsClothesAttributes(),
  "kids-girls-tops": buildKidsClothesAttributes(),
  "kids-girls-knitwear": buildKidsClothesAttributes(),
  "kids-girls-jackets": buildKidsClothesAttributes(),
  "kids-girls-pants": buildKidsClothesAttributes(),
  "kids-girls-jeans": buildKidsClothesAttributes(),
  "kids-girls-skirts": buildKidsClothesAttributes(),
  "kids-girls-sets": buildKidsClothesAttributes(),
  "kids-girls-pajamas": buildKidsClothesAttributes(),
  "kids-girls-sportswear": buildKidsClothesAttributes(),

  "kids-boys-tshirts": buildKidsClothesAttributes(),
  "kids-boys-shirts": buildKidsClothesAttributes(),
  "kids-boys-knitwear": buildKidsClothesAttributes(),
  "kids-boys-jackets": buildKidsClothesAttributes(),
  "kids-boys-pants": buildKidsClothesAttributes(),
  "kids-boys-jeans": buildKidsClothesAttributes(),
  "kids-boys-shorts": buildKidsClothesAttributes(),
  "kids-boys-sets": buildKidsClothesAttributes(),
  "kids-boys-pajamas": buildKidsClothesAttributes(),
  "kids-boys-sportswear": buildKidsClothesAttributes(),

  "kids-shoes-girls": buildKidsShoesAttributes(),
  "kids-shoes-boys": buildKidsShoesAttributes(),

  "kids-hats": buildKidsSimpleAttributes(),
  "kids-scarves": buildKidsSimpleAttributes(),
  "kids-gloves": buildKidsSimpleAttributes(),
  "kids-backpacks": buildKidsSimpleAttributes(),
  "kids-belts": buildKidsSimpleAttributes(),
  "kids-glasses": buildKidsSimpleAttributes(),
};

export function getCategoryAttributes(categoryLeafKey) {
  return CATEGORY_ATTRIBUTES[categoryLeafKey] || [];
}

export function getOptionLabel(options = [], value = "") {
  const found = options.find((item) => item.value === value);
  return found?.label || "";
}
