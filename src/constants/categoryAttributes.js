// src/constants/categoryAttributes.js
// Ce este: configurarea atributelor dinamice pentru categoriile finale din AddItem.
// Ce s-a modificat: am aliniat atributele exact pe cheile reale din categoryTree și
// am adăugat helper mai robust pentru rezolvarea atributelor după leaf key.
// Pentru MVP păstrăm atribute dinamice doar pentru Femei, Bărbați și
// Electronice > Telefoane mobile.

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

export const CATEGORY_ATTRIBUTES = {
  "electronics-mobile-phones": [
    {
      key: "brand",
      label: "Brand",
      type: "select",
      placeholder: "Alege brandul",
      options: [
        { value: "apple", label: "Apple" },
        { value: "samsung", label: "Samsung" },
        { value: "xiaomi", label: "Xiaomi" },
        { value: "huawei", label: "Huawei" },
        { value: "oppo", label: "OPPO" },
        { value: "oneplus", label: "OnePlus" },
        { value: "google", label: "Google" },
        { value: "motorola", label: "Motorola" },
        { value: "nokia", label: "Nokia" },
        { value: "realme", label: "realme" },
        { value: "sony", label: "Sony" },
        { value: "honor", label: "HONOR" },
        { value: "other", label: "Alt brand" },
      ],
    },
    {
      key: "internalMemory",
      label: "Memorie internă",
      type: "select",
      placeholder: "Alege memoria internă",
      options: [
        { value: "16gb", label: "16 GB" },
        { value: "32gb", label: "32 GB" },
        { value: "64gb", label: "64 GB" },
        { value: "128gb", label: "128 GB" },
        { value: "256gb", label: "256 GB" },
        { value: "512gb", label: "512 GB" },
        { value: "1tb", label: "1 TB" },
      ],
    },
    {
      key: "condition",
      label: "Stare",
      type: "select",
      placeholder: "Alege starea",
      options: [
        { value: "new_with_tags", label: "Nou cu etichetă" },
        { value: "new_without_tags", label: "Nou fără etichetă" },
        { value: "very_good", label: "Foarte bună" },
        { value: "good", label: "Bună" },
        { value: "satisfactory", label: "Satisfăcătoare" },
        {
          value: "not_fully_functional",
          label: "Nu este complet funcțional",
        },
      ],
    },
    {
      key: "simLock",
      label: "Blocare SIM",
      type: "select",
      placeholder: "Alege statusul SIM",
      options: [
        { value: "locked", label: "Blocat" },
        { value: "unlocked", label: "Deblocat" },
      ],
    },
    {
      key: "batteryHealth",
      label: "Sănătatea bateriei",
      type: "select",
      placeholder: "Alege sănătatea bateriei",
      options: [
        { value: "95_100", label: "95 - 100%" },
        { value: "90_94", label: "90 - 94%" },
        { value: "85_89", label: "85 - 89%" },
        { value: "80_84", label: "80 - 84%" },
        { value: "under_80", label: "<80%" },
        { value: "unknown", label: "Necunoscut" },
      ],
    },
    {
      key: "color",
      label: "Culoare",
      type: "select",
      placeholder: "Alege culoarea",
      options: [
        { value: "black", label: "Negru" },
        { value: "white", label: "Alb" },
        { value: "silver", label: "Argintiu" },
        { value: "gold", label: "Auriu" },
        { value: "blue", label: "Albastru" },
        { value: "red", label: "Roșu" },
        { value: "green", label: "Verde" },
        { value: "purple", label: "Mov" },
        { value: "pink", label: "Roz" },
        { value: "gray", label: "Gri" },
        { value: "other", label: "Altă culoare" },
      ],
    },
    {
      key: "parcelSize",
      label: "Mărime colet",
      type: "select",
      placeholder: "Alege mărimea coletului",
      options: [
        { value: "small", label: "Mic" },
        { value: "medium", label: "Mediu" },
        { value: "large", label: "Mare" },
      ],
    },
  ],

  "women-dresses": buildFashionClothesAttributes(),
  "women-tops": buildFashionClothesAttributes(),
  "women-jeans": buildFashionClothesAttributes(),
  "women-pants": buildFashionClothesAttributes(),
  "women-jackets": buildFashionClothesAttributes(),
  "women-sportswear": buildFashionClothesAttributes(),

  "women-sneakers": buildFashionShoesAttributes(),
  "women-heels": buildFashionShoesAttributes(),
  "women-boots": buildFashionShoesAttributes(),
  "women-sandals": buildFashionShoesAttributes(),

  "women-handbags": buildFashionSimpleAttributes(),
  "women-backpacks": buildFashionSimpleAttributes(),
  "women-wallets": buildFashionSimpleAttributes(),

  "women-jewelry": buildFashionSimpleAttributes(),
  "women-watches": buildFashionSimpleAttributes(),
  "women-belts": buildFashionSimpleAttributes(),
  "women-sunglasses": buildFashionSimpleAttributes(),

  "men-tshirts": buildFashionClothesAttributes(),
  "men-shirts": buildFashionClothesAttributes(),
  "men-jeans": buildFashionClothesAttributes(),
  "men-pants": buildFashionClothesAttributes(),
  "men-jackets": buildFashionClothesAttributes(),
  "men-sportswear": buildFashionClothesAttributes(),

  "men-sneakers": buildFashionShoesAttributes(),
  "men-shoes-leaf": buildFashionShoesAttributes(),
  "men-boots": buildFashionShoesAttributes(),
  "men-sandals": buildFashionShoesAttributes(),

  "men-watches": buildFashionSimpleAttributes(),
  "men-wallets": buildFashionSimpleAttributes(),
  "men-belts": buildFashionSimpleAttributes(),
  "men-bags": buildFashionSimpleAttributes(),
};

export function getCategoryAttributes(categoryLeafKey) {
  return CATEGORY_ATTRIBUTES[categoryLeafKey] || [];
}

export function getOptionLabel(options = [], value = "") {
  const found = options.find((item) => item.value === value);
  return found?.label || "";
}
