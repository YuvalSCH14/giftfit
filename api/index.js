// src/seed.ts
var SEED_CATALOG = [
  { "id": "book-30073f", "name": "\u05D4\u05E8\u05D2\u05DC\u05D9\u05DD \u05D0\u05D8\u05D5\u05DE\u05D9\u05D9\u05DD", "price": 119, "category": "book", "description": "\u05E1\u05E4\u05E8 \u05E2\u05D9\u05D5\u05DF \u05E8\u05D1-\u05DE\u05DB\u05E8 \u05DE\u05D0\u05EA \u05D2'\u05D9\u05D9\u05DE\u05E1 \u05E7\u05DC\u05D9\u05E8 \u05E2\u05DC \u05D1\u05E0\u05D9\u05D9\u05EA \u05D4\u05E8\u05D2\u05DC\u05D9\u05DD \u05D8\u05D5\u05D1\u05D9\u05DD \u05D1\u05E6\u05E2\u05D3\u05D9\u05DD \u05E7\u05D8\u05E0\u05D9\u05DD.", "occasions": ["birthday"], "relations": ["friendM", "friendF", "colleague", "partner", "sibling", "parent"], "ages": ["young", "adults", "seniors"], "interests": ["reading"], "stores": [{ "name": "\u05E6\u05D5\u05DE\u05EA \u05E1\u05E4\u05E8\u05D9\u05DD", "url": "https://www.booknet.co.il/\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD/%d7%94%d7%a8%d7%92%d7%9c%d7%99%d7%9d-%d7%90%d7%98%d7%95%d7%9e%d7%99%d7%99%d7%9d-9900023492", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "game-440e99", "name": "\u05D8\u05D9\u05E7\u05D8 \u05D8\u05D5 \u05E8\u05D9\u05D9\u05D3 \u05D0\u05E8\u05E6\u05D5\u05EA \u05D4\u05D1\u05E8\u05D9\u05EA", "price": 200, "category": "game", "description": "\u05DE\u05E9\u05D7\u05E7 \u05E7\u05D5\u05E4\u05E1\u05D4 \u05D0\u05E1\u05D8\u05E8\u05D8\u05D2\u05D9 \u05DC\u05DE\u05E9\u05E4\u05D7\u05D4 \u05D5\u05DC\u05D7\u05D1\u05E8\u05D9\u05DD \u05E2\u05DC \u05D1\u05E0\u05D9\u05D9\u05EA \u05DE\u05E1\u05D9\u05DC\u05D5\u05EA \u05E8\u05DB\u05D1\u05EA, \u05DE\u05D2\u05D9\u05DC 8.", "occasions": ["birthday", "barMitzvah", "housewarming"], "relations": ["child", "sibling", "friendM", "friendF", "partner"], "ages": ["kids", "teens", "young", "adults"], "interests": ["games"], "stores": [{ "name": "\u05D8\u05D5\u05D9\u05E1 \u05D0\u05E8 \u05D0\u05E1", "url": "https://toysrus.co.il/products/%D7%98%D7%99%D7%A7%D7%98-%D7%98%D7%95-%D7%A8%D7%99%D7%99%D7%93-%D7%90%D7%A8%D7%A6%D7%95%D7%AA-%D7%94%D7%91%D7%A8%D7%99%D7%AA-ttr-usa", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "baby-5b44c7", "name": "\u05DE\u05D0\u05E8\u05D6 \u05DE\u05EA\u05E0\u05D4 \u05E9\u05DE\u05E0\u05EA", "price": 250, "category": "baby", "description": "\u05DE\u05D0\u05E8\u05D6 \u05DC\u05EA\u05D9\u05E0\u05D5\u05E7\u05EA \u05E2\u05DD \u05E9\u05DE\u05D9\u05DB\u05D4, \u05DE\u05D2\u05D1\u05EA \u05E7\u05E4\u05D5\u05E6'\u05D5\u05DF, \u05E0\u05E2\u05DC\u05D9\u05D9\u05DD \u05E8\u05DB\u05D5\u05EA \u05D5\u05E9\u05DE\u05D9\u05DB\u05D9 \u05D0\u05E8\u05E0\u05D1 \u05D1\u05D2\u05D5\u05D5\u05E0\u05D9 \u05E9\u05DE\u05E0\u05EA.", "occasions": ["birth", "brit"], "relations": ["friendF", "friendM", "sibling", "colleague"], "ages": ["young", "adults"], "interests": ["home", "care"], "stores": [{ "name": "\u05E9\u05D9\u05DC\u05D1", "url": "https://www.shilav.co.il/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9E%D7%AA%D7%A0%D7%94-%D7%A9%D7%9E%D7%A0%D7%AA-%D7%A9%D7%9E%D7%99%D7%9B%D7%94-%D7%9E%D7%92%D7%91%D7%AA-%D7%A0%D7%A2%D7%9C%D7%99%D7%99%D7%9D-%D7%A8%D7%9B%D7%95%D7%AA-%D7%A9%D7%9E%D7%99%D7%9B%D7%99", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "kitchen-8a5434", "name": "KVITTERA \u05DE\u05E2\u05DE\u05D3 \u05D4\u05D2\u05E9\u05D4 3 \u05E7\u05D5\u05DE\u05D5\u05EA", "price": 69, "category": "kitchen", "description": "\u05DE\u05E2\u05DE\u05D3 \u05D4\u05D2\u05E9\u05D4 \u05D1\u05E9\u05DC\u05D5\u05E9 \u05E7\u05D5\u05DE\u05D5\u05EA \u05DE\u05D6\u05DB\u05D5\u05DB\u05D9\u05EA \u05E9\u05E7\u05D5\u05E4\u05D4 \u05D5\u05E4\u05DC\u05D3\u05EA \u05D0\u05DC-\u05D7\u05DC\u05D3 \u05DC\u05E2\u05D5\u05D2\u05D9\u05D5\u05EA, \u05E4\u05D9\u05E8\u05D5\u05EA \u05D5\u05DE\u05D0\u05E4\u05D9\u05DD.", "occasions": ["housewarming"], "relations": ["friendF", "friendM", "sibling", "colleague", "parent"], "ages": ["young", "adults", "seniors"], "interests": ["home", "food", "cooking"], "stores": [{ "name": "\u05D0\u05D9\u05E7\u05D0\u05D4", "url": "https://www.ikea.com/il/he/p/kvittera-serving-stand-three-tiers-clear-glass-stainless-steel-90279842/", "regions": ["haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "care-20d4c7", "name": "\u05DE\u05D0\u05E8\u05D6 \u05DC\u05E4\u05D9\u05E0\u05D5\u05E7 \u05D4\u05DE\u05D5\u05E9\u05DC\u05DD \u05D5\u05D5\u05E8\u05DD \u05D5\u05E0\u05D9\u05DC\u05D4", "price": 414, "category": "care", "description": "\u05DE\u05D0\u05E8\u05D6 \u05D8\u05D9\u05E4\u05D5\u05D7 \u05D1\u05E0\u05D9\u05D7\u05D5\u05D7 \u05D5\u05E0\u05D9\u05DC: \u05E4\u05D9\u05DC\u05D9\u05E0\u05D2 \u05D2\u05D5\u05E3, \u05D2'\u05DC \u05E8\u05D7\u05E6\u05D4, \u05E7\u05E8\u05DD \u05D2\u05D5\u05E3, \u05DE\u05D9 \u05D2\u05D5\u05E3 \u05D5\u05E1\u05E4\u05D5\u05D2 \u05E8\u05D7\u05E6\u05D4 \u05D1\u05E7\u05D5\u05E4\u05E1\u05EA \u05DE\u05EA\u05E0\u05D4.", "occasions": ["birthday", "anniversary", "birth"], "relations": ["friendF", "partner", "parent", "sibling", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["care"], "stores": [{ "name": "\u05DC\u05DC\u05D9\u05DF", "url": "https://www.laline.co.il/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9C%D7%A4%D7%99%D7%A0%D7%95%D7%A7-%D7%94%D7%9E%D7%95%D7%A9%D7%9C%D7%9D-%D7%95%D7%95%D7%A8%D7%9D-%D7%95%D7%A0%D7%99%D7%9C%D7%94", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "candle-8e2f45", "name": "\u05E0\u05E8 \u05E8\u05D9\u05D7\u05E0\u05D9 \u05D5\u05D5\u05E8\u05D1\u05E0\u05D4", "price": 249, "category": "candle", "description": "\u05E0\u05E8 \u05E8\u05D9\u05D7\u05E0\u05D9 180 \u05D2\u05E8\u05DD \u05D1\u05E0\u05D9\u05D7\u05D5\u05D7 \u05E8\u05E2\u05E0\u05DF \u05E9\u05DC \u05D5\u05D5\u05E8\u05D1\u05E0\u05D4 \u05D5\u05D4\u05D3\u05E8\u05D9\u05DD, \u05DC\u05D0\u05D5\u05D5\u05D9\u05E8\u05D4 \u05E0\u05E2\u05D9\u05DE\u05D4 \u05D1\u05D1\u05D9\u05EA.", "occasions": ["birthday", "housewarming", "anniversary"], "relations": ["friendF", "partner", "parent", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["home", "care"], "stores": [{ "name": "\u05DC'\u05D0\u05D5\u05E7\u05E1\u05D9\u05D8\u05DF", "url": "https://il.loccitane.com/products/verbena-candle-180gr-180g", "regions": ["telAviv", "jerusalem", "haifa", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "chocolate-391c5f", "name": "\u05DE\u05D0\u05E8\u05D6 \u05E9\u05D5\u05E7\u05D5\u05DC\u05D3 \u05DC\u05D0\u05D5\u05E0\u05D9\u05D3\u05E1 \u05E7\u05DC\u05D0\u05E1\u05D9 S", "price": 119, "category": "chocolate", "description": "\u05E7\u05D5\u05E4\u05E1\u05EA \u05E9\u05D5\u05E7\u05D5\u05DC\u05D3 \u05D1\u05DC\u05D2\u05D9 \u05E2\u05DD 9 \u05E4\u05E8\u05DC\u05D9\u05E0\u05D9\u05DD \u05D1\u05DE\u05D2\u05D5\u05D5\u05DF \u05D8\u05E2\u05DE\u05D9\u05DD, \u05D1\u05D2\u05D5\u05D3\u05DC S.", "occasions": ["birthday", "housewarming", "birth", "anniversary"], "relations": ["friendF", "friendM", "partner", "parent", "sibling", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["food"], "stores": [{ "name": "\u05DC\u05D0\u05D5\u05E0\u05D9\u05D3\u05E1", "url": "https://leonidas.co.il/products/small-classic-leonidas-chocolate-box", "regions": ["telAviv", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "backpack-a3b84f", "name": "\u05EA\u05D9\u05E7 \u05D2\u05D1 20 \u05DC\u05D9\u05D8\u05E8 \u05DC\u05D8\u05D9\u05D5\u05DC\u05D9 \u05D4\u05E8\u05D9\u05DD MH100", "price": 125, "category": "backpack", "description": "\u05EA\u05D9\u05E7 \u05D2\u05D1 \u05E7\u05DC \u05D1\u05E0\u05E4\u05D7 20 \u05DC\u05D9\u05D8\u05E8 \u05DC\u05D8\u05D9\u05D5\u05DC\u05D9 \u05D9\u05D5\u05DD, \u05DC\u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 \u05D5\u05DC\u05E0\u05E1\u05D9\u05E2\u05D5\u05EA \u05E7\u05E6\u05E8\u05D5\u05EA.", "occasions": ["birthday", "barMitzvah"], "relations": ["friendM", "friendF", "sibling", "child", "partner"], "ages": ["teens", "young", "adults"], "interests": ["travel", "sport"], "stores": [{ "name": "\u05D3\u05E7\u05D8\u05DC\u05D5\u05DF", "url": "https://www.decathlon.co.il/p/331022-77534-\u05EA\u05D9\u05E7-\u05D2\u05D1-20-\u05DC\u05D9\u05D8\u05E8-\u05DC\u05D8\u05D9\u05D5\u05DC\u05D9-\u05D4\u05E8\u05D9\u05DD-\u05D3\u05D2\u05DD-mh100-\u05E9\u05D7\u05D5\u05E8.html", "regions": ["telAviv", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "sport-367a3f", "name": "\u05DE\u05D0\u05E8\u05D6 \u05D0\u05D1\u05D9\u05D6\u05E8\u05D9 \u05DB\u05D5\u05E9\u05E8 Domyos", "price": 150, "category": "sport", "description": "\u05E2\u05E8\u05DB\u05EA \u05D0\u05D9\u05DE\u05D5\u05DF \u05D1\u05D9\u05EA\u05D9\u05EA \u05E2\u05DD \u05D7\u05D1\u05DC \u05E7\u05E4\u05D9\u05E6\u05D4, \u05D2\u05DC\u05D2\u05DC \u05D1\u05D8\u05DF \u05D5\u05E9\u05EA\u05D9 \u05D2\u05D5\u05DE\u05D9\u05D5\u05EA \u05D4\u05EA\u05E0\u05D2\u05D3\u05D5\u05EA.", "occasions": ["birthday"], "relations": ["friendM", "friendF", "partner", "sibling", "colleague"], "ages": ["teens", "young", "adults"], "interests": ["sport"], "stores": [{ "name": "\u05D3\u05E7\u05D8\u05DC\u05D5\u05DF", "url": "https://www.decathlon.co.il/p/376466-231127-\u05DE\u05D0\u05E8\u05D6-\u05D0\u05D1\u05D9\u05D6\u05E8\u05D9-\u05DB\u05D5\u05E9\u05E8.html", "regions": ["telAviv", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "jewelry-9e6463", "name": "\u05E6\u05DE\u05D9\u05D3 \u05D8\u05E0\u05D9\u05E1 \u05DB\u05E1\u05E3 925 \u05DE\u05E9\u05D5\u05D1\u05E5 \u05D6\u05D9\u05E8\u05E7\u05D5\u05E0\u05D9\u05D4", "price": 369, "category": "jewelry", "description": '\u05E6\u05DE\u05D9\u05D3 \u05D8\u05E0\u05D9\u05E1 \u05E2\u05D3\u05D9\u05DF \u05DE\u05DB\u05E1\u05E3 925 \u05DE\u05E9\u05D5\u05D1\u05E5 \u05D0\u05D1\u05E0\u05D9 \u05D6\u05D9\u05E8\u05E7\u05D5\u05E0\u05D9\u05D4 \u05E9\u05E7\u05D5\u05E4\u05D5\u05EA, \u05D1\u05D0\u05D5\u05E8\u05DA 17 \u05E1"\u05DE.', "occasions": ["anniversary", "birthday"], "relations": ["partner", "parent", "friendF", "sibling"], "ages": ["young", "adults", "seniors"], "interests": ["fashion"], "stores": [{ "name": "\u05DE\u05D2\u05E0\u05D5\u05DC\u05D9\u05D4", "url": "https://www.magnolia.co.il/products/c05881sz", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "wallet-d33b86", "name": "\u05D0\u05E8\u05E0\u05E7 Echo Paperwallet Flat RFID", "price": 149, "category": "wallet", "description": "\u05D0\u05E8\u05E0\u05E7 \u05D3\u05E7 \u05D5\u05E7\u05DC \u05DE\u05D7\u05D5\u05DE\u05E8 \u05D8\u05D9\u05D9\u05D1\u05E7 \u05E2\u05DE\u05D9\u05D3 \u05DC\u05DE\u05D9\u05DD \u05D5\u05DC\u05E7\u05E8\u05D9\u05E2\u05D4, \u05E2\u05DD \u05D4\u05D2\u05E0\u05EA RFID \u05D5\u05D4\u05D3\u05E4\u05E1 \u05D0\u05DE\u05E0\u05D5\u05EA\u05D9.", "occasions": ["birthday"], "relations": ["friendM", "friendF", "sibling", "colleague", "partner"], "ages": ["teens", "young", "adults"], "interests": ["fashion", "travel"], "stores": [{ "name": "\u05D0\u05E1\u05D5\u05E4\u05D4", "url": "https://asufadesign.co.il/products/echo-paperwallet-flat-wallet", "regions": ["telAviv"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "perfume-775f89", "name": '\u05D1\u05D5\u05E9\u05DD \u05D0.\u05D3.\u05D8 \u05E9\u05D9\u05D0\u05D4 \u05D5\u05E7\u05D5\u05E7\u05D5\u05D9 100 \u05DE"\u05DC', "price": 240, "category": "perfume", "description": '\u05D1\u05D5\u05E9\u05DD \u05D0\u05D5 \u05D3\u05D4 \u05D8\u05D5\u05D0\u05DC\u05D8 \u05DC\u05D0\u05D9\u05E9\u05D4, 100 \u05DE"\u05DC, \u05D1\u05E0\u05D9\u05D7\u05D5\u05D7 \u05E4\u05E8\u05D7\u05D5\u05E0\u05D9 \u05E9\u05DC \u05D7\u05DE\u05D0\u05EA \u05E9\u05D9\u05D0\u05D4, \u05D9\u05E1\u05DE\u05D9\u05DF \u05D5\u05D5\u05E8\u05D3\u05D9\u05DD.', "occasions": ["birthday", "anniversary"], "relations": ["friendF", "partner", "sibling", "parent"], "ages": ["young", "adults"], "interests": ["care", "fashion"], "stores": [{ "name": "\u05DC\u05DC\u05D9\u05DF", "url": "https://www.laline.co.il/products/m790180528", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "blanket-2cbb00", "name": "\u05DB\u05E8\u05D1\u05D5\u05DC\u05D9\u05EA \u05D1\u05DE\u05E8\u05E7\u05DD \u05E4\u05E8\u05D5\u05D5\u05EA\u05D9 \u05D1\u05D2\u05D5\u05D5\u05DF \u05E9\u05DE\u05E0\u05EA Wales", "price": 200, "category": "blanket", "description": "\u05E9\u05DE\u05D9\u05DB\u05EA \u05DB\u05E8\u05D1\u05D5\u05DC\u05D9\u05EA \u05E8\u05DB\u05D4 \u05D1\u05DE\u05E8\u05E7\u05DD \u05E4\u05E8\u05D5\u05D5\u05EA\u05D9 \u05D1\u05D2\u05D5\u05D5\u05DF \u05E9\u05DE\u05E0\u05EA, \u05DC\u05E1\u05E4\u05D4 \u05D0\u05D5 \u05DC\u05DE\u05D9\u05D8\u05D4 \u05D1\u05D9\u05DE\u05D9\u05DD \u05E7\u05E8\u05D9\u05DD.", "occasions": ["housewarming", "birthday"], "relations": ["friendF", "friendM", "partner", "parent", "sibling"], "ages": ["teens", "young", "adults", "seniors"], "interests": ["home"], "stores": [{ "name": "\u05E4\u05D5\u05E7\u05E1 \u05D4\u05D5\u05DD", "url": "https://www.foxhome.co.il/products/0335049401", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "flowers-a2106e", "name": "\u05D6\u05E8 \u05D7\u05D9\u05D5\u05DB\u05D9\u05DD", "price": 167, "category": "flowers", "description": "\u05D6\u05E8 \u05E4\u05E8\u05D7\u05D9\u05DD \u05E2\u05DC\u05D9\u05D6 \u05E2\u05DD \u05D7\u05DE\u05E0\u05D9\u05D5\u05EA, \u05D7\u05E8\u05E6\u05D9\u05D5\u05EA \u05D5\u05E4\u05DC\u05D5\u05E7\u05E1, \u05D1\u05DE\u05E9\u05DC\u05D5\u05D7 \u05E2\u05D3 \u05D4\u05D1\u05D9\u05EA (\u05DC\u05DC\u05D0 \u05D0\u05D2\u05E8\u05D8\u05DC).", "occasions": ["birthday", "anniversary", "birth", "housewarming"], "relations": ["friendF", "partner", "parent", "sibling", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["home"], "stores": [{ "name": "ZER4U", "url": "https://zer4u.co.il/products/8020070135", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "plant-4f25f6", "name": "\u05E1\u05D7\u05DC\u05D1 \u05D1\u05D5\u05D3\u05D3 \u05D1\u05DB\u05DC\u05D9", "price": 189, "category": "plant", "description": '\u05E2\u05E6\u05D9\u05E5 \u05E1\u05D7\u05DC\u05D1 \u05E2\u05DD \u05E2\u05E0\u05E3 \u05D0\u05D7\u05D3 \u05D1\u05D2\u05D5\u05D1\u05D4 \u05E2\u05D3 \u05DB-70 \u05E1"\u05DE, \u05DE\u05D2\u05D9\u05E2 \u05D1\u05EA\u05D5\u05DA \u05DB\u05DC\u05D9.', "occasions": ["housewarming", "birthday", "birth", "anniversary"], "relations": ["friendF", "parent", "colleague", "partner"], "ages": ["young", "adults", "seniors"], "interests": ["home"], "stores": [{ "name": "ZER4U", "url": "https://zer4u.co.il/products/8024490022", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "cookbook-1da524", "name": "\u05E1\u05E4\u05E8 \u05D4\u05D0\u05E4\u05D9\u05D9\u05D4 \u05E9\u05DC \u05D0\u05E8\u05D6 \u05E7\u05D5\u05DE\u05E8\u05D5\u05D1\u05E1\u05E7\u05D9", "price": 124, "category": "cookbook", "description": "\u05E1\u05E4\u05E8 \u05D0\u05E4\u05D9\u05D9\u05D4 \u05E9\u05DC \u05D4\u05E9\u05E3 \u05D0\u05E8\u05D6 \u05E7\u05D5\u05DE\u05E8\u05D5\u05D1\u05E1\u05E7\u05D9, \u05DE\u05EA\u05E0\u05D4 \u05DC\u05D7\u05D5\u05D1\u05D1\u05D9 \u05D0\u05E4\u05D9\u05D9\u05D4 \u05D1\u05D9\u05EA\u05D9\u05EA.", "occasions": ["birthday", "housewarming"], "relations": ["friendF", "friendM", "partner", "parent", "sibling", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["cooking", "food", "reading"], "stores": [{ "name": "\u05E1\u05D8\u05D9\u05DE\u05E6\u05E7\u05D9", "url": "https://www.steimatzky.co.il/010073139", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "wine-209157", "name": "\u05DE\u05D0\u05E8\u05D6 \u05DE\u05D4\u05D2\u05D5\u05DC\u05DF \u05D0\u05DC \u05D4\u05E9\u05D5\u05DC\u05D7\u05DF", "price": 175, "category": "wine", "description": '\u05DE\u05D0\u05E8\u05D6 \u05E9\u05D9 \u05E2\u05DD \u05E9\u05E0\u05D9 \u05D1\u05E7\u05D1\u05D5\u05E7\u05D9 \u05D9\u05D9\u05DF \u05D2\u05DE\u05DC\u05D0 (\u05D0\u05D3\u05D5\u05DD \u05D5\u05DC\u05D1\u05DF), \u05E9\u05DE\u05DF \u05D6\u05D9\u05EA 500 \u05DE"\u05DC \u05D5\u05E4\u05D5\u05EA\u05D7\u05DF.', "occasions": ["housewarming", "birthday", "anniversary"], "relations": ["friendF", "friendM", "partner", "parent", "sibling", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["food", "cooking"], "stores": [{ "name": "\u05D9\u05E7\u05D1 \u05E8\u05DE\u05EA \u05D4\u05D2\u05D5\u05DC\u05DF", "url": "https://www.golanwines.co.il/product/golan-to-table/", "regions": [], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "coffee-4ddd5f", "name": "\u05DE\u05D0\u05E8\u05D6 \u05D7\u05DE\u05D9\u05E9\u05D4 \u05E1\u05D5\u05D2\u05D9 \u05E7\u05E4\u05D4 \u05D1\u05D4\u05E4\u05EA\u05E2\u05D4", "price": 75, "category": "coffee", "description": "\u05DE\u05D0\u05E8\u05D6 \u05D8\u05E2\u05D9\u05DE\u05D5\u05EA \u05E2\u05DD \u05D7\u05DE\u05D9\u05E9\u05D4 \u05E1\u05D5\u05D2\u05D9 \u05E7\u05E4\u05D4 \u05E7\u05DC\u05D5\u05D9 \u05D1\u05D4\u05E4\u05EA\u05E2\u05D4, \u05DC\u05D7\u05D5\u05D1\u05D1\u05D9 \u05E7\u05E4\u05D4 \u05D0\u05D9\u05DB\u05D5\u05EA\u05D9.", "occasions": ["birthday", "housewarming"], "relations": ["friendF", "friendM", "partner", "parent", "sibling", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["food"], "stores": [{ "name": "\u05E7\u05E4\u05D4 \u05E0\u05D7\u05EA", "url": "https://www.nahatcoffee.com/product/nahat-variety-coffee-bundle-2/", "regions": ["telAviv"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "headphones-8365b5", "name": "\u05D0\u05D5\u05D6\u05E0\u05D9\u05D5\u05EA \u05D0\u05DC\u05D7\u05D5\u05D8\u05D9\u05D5\u05EA JBL Wave Beam 2", "price": 183, "category": "headphones", "description": "\u05D0\u05D5\u05D6\u05E0\u05D9\u05D5\u05EA \u05D1\u05DC\u05D5\u05D8\u05D5\u05EA' \u05D0\u05DC\u05D7\u05D5\u05D8\u05D9\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA \u05DC\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D9\u05D5\u05DE\u05D9\u05D5\u05DE\u05D9, \u05DC\u05DE\u05D5\u05D6\u05D9\u05E7\u05D4 \u05D5\u05DC\u05E9\u05D9\u05D7\u05D5\u05EA.", "occasions": ["birthday", "barMitzvah"], "relations": ["friendM", "friendF", "sibling", "child", "colleague"], "ages": ["teens", "young", "adults"], "interests": ["music", "tech"], "stores": [{ "name": "\u05D1\u05D0\u05D2", "url": "https://www.bug.co.il/brand/jbl/wave/beam2", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "speaker-c60686", "name": "\u05E8\u05DE\u05E7\u05D5\u05DC \u05E0\u05D9\u05D9\u05D3 JBL Charge Essential 3 SE", "price": 499, "category": "speaker", "description": "\u05E8\u05DE\u05E7\u05D5\u05DC \u05D1\u05DC\u05D5\u05D8\u05D5\u05EA' \u05E0\u05D9\u05D9\u05D3 \u05D5\u05D7\u05D6\u05E7 \u05DC\u05DE\u05D5\u05D6\u05D9\u05E7\u05D4 \u05D1\u05D1\u05D9\u05EA, \u05D1\u05D8\u05D9\u05D5\u05DC \u05D5\u05D1\u05DE\u05E4\u05D2\u05E9\u05D9\u05DD \u05E2\u05DD \u05D7\u05D1\u05E8\u05D9\u05DD.", "occasions": ["birthday", "barMitzvah", "housewarming"], "relations": ["friendM", "friendF", "partner", "sibling", "child"], "ages": ["teens", "young", "adults"], "interests": ["music", "tech"], "stores": [{ "name": "\u05D1\u05D0\u05D2", "url": "https://www.bug.co.il/brand/jbl/charge/essential/3/se", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "gadget-c3daec", "name": "\u05DE\u05E6\u05DC\u05DE\u05EA \u05E4\u05D9\u05EA\u05D5\u05D7 \u05DE\u05D9\u05D9\u05D3\u05D9 Instax Mini 13 \u05DC\u05D1\u05DF", "price": 429, "category": "gadget", "description": "\u05DE\u05E6\u05DC\u05DE\u05D4 \u05E9\u05DE\u05D3\u05E4\u05D9\u05E1\u05D4 \u05D0\u05EA \u05D4\u05EA\u05DE\u05D5\u05E0\u05D4 \u05DE\u05D9\u05D3 \u05D0\u05D7\u05E8\u05D9 \u05D4\u05E6\u05D9\u05DC\u05D5\u05DD, \u05DE\u05D6\u05DB\u05E8\u05EA \u05DE\u05D5\u05D7\u05E9\u05D9\u05EA \u05DE\u05DB\u05DC \u05D0\u05D9\u05E8\u05D5\u05E2.", "occasions": ["birthday", "barMitzvah"], "relations": ["friendF", "friendM", "sibling", "child", "partner"], "ages": ["teens", "young"], "interests": ["tech", "travel", "fashion"], "stores": [{ "name": "\u05D1\u05D0\u05D2", "url": "https://www.bug.co.il/brand/fujifilminstax/mini/13/clay/white", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "bottle-855eaa", "name": "\u05D1\u05E7\u05D1\u05D5\u05E7 \u05DE\u05D1\u05D5\u05D3\u05D3 \u05DE\u05E0\u05D9\u05E8\u05D5\u05E1\u05D8\u05D4 0.8 \u05DC\u05D9\u05D8\u05E8 \u05D3\u05D2\u05DD 900", "price": 85, "category": "bottle", "description": "\u05D1\u05E7\u05D1\u05D5\u05E7 \u05E0\u05D9\u05E8\u05D5\u05E1\u05D8\u05D4 \u05DE\u05D1\u05D5\u05D3\u05D3 \u05E9\u05E9\u05D5\u05DE\u05E8 \u05E2\u05DC \u05E9\u05EA\u05D9\u05D9\u05D4 \u05E7\u05E8\u05D4 \u05D0\u05D5 \u05D7\u05DE\u05D4 \u05D1\u05D8\u05D9\u05D5\u05DC\u05D9\u05DD \u05D5\u05D1\u05D0\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD.", "occasions": ["birthday"], "relations": ["friendM", "friendF", "colleague", "sibling", "parent"], "ages": ["teens", "young", "adults", "seniors"], "interests": ["sport", "travel"], "stores": [{ "name": "\u05D3\u05E7\u05D8\u05DC\u05D5\u05DF", "url": "https://www.decathlon.co.il/p/301275-229779-\u05D1\u05E7\u05D1\u05D5\u05E7-\u05DE\u05D1\u05D5\u05D3\u05D3-\u05DE\u05E0\u05D9\u05E8\u05D5\u05E1\u05D8\u05D4-\u05E2\u05DD-\u05E4\u05E7\u05E7-\u05E4\u05EA\u05D9\u05D7\u05D4-\u05DE\u05D4\u05D9\u05E8\u05D4-08-\u05DC\u05D9\u05D8\u05E8-\u05DC\u05D8\u05D9\u05D5\u05DC\u05D9\u05DD-\u05D3\u05D2\u05DD-900.html", "regions": ["telAviv", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "puzzle-1a5f00", "name": "\u05E4\u05D0\u05D6\u05DC 1000 \u05D7\u05DC\u05E7\u05D9\u05DD \u05DE\u05D2\u05D3\u05DC\u05D5\u05E8 \u05E2\u05DC \u05D4\u05D7\u05D5\u05E3", "price": 140, "category": "puzzle", "description": "\u05E4\u05D0\u05D6\u05DC 1000 \u05D7\u05DC\u05E7\u05D9\u05DD \u05E9\u05DC Ravensburger \u05E2\u05DD \u05E0\u05D5\u05E3 \u05DE\u05D2\u05D3\u05DC\u05D5\u05E8, \u05DC\u05E9\u05E2\u05D5\u05EA \u05E9\u05DC \u05D4\u05E8\u05DB\u05D1\u05D4 \u05E8\u05D2\u05D5\u05E2\u05D4.", "occasions": ["birthday", "housewarming"], "relations": ["parent", "partner", "friendF", "friendM", "sibling"], "ages": ["teens", "young", "adults", "seniors"], "interests": ["games", "home"], "stores": [{ "name": "\u05D8\u05D5\u05D9\u05E1 \u05D0\u05E8 \u05D0\u05E1", "url": "https://toysrus.co.il/products/%D7%A4%D7%90%D7%96%D7%9C-1000-%D7%9E%D7%92%D7%93%D7%9C%D7%95%D7%A8-%D7%A2%D7%9C-%D7%94%D7%97%D7%95%D7%A3", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "toy-020c9a", "name": "\u05E8\u05D5\u05D1\u05D9\u05E7\u05E1 \u05E7\u05D5\u05D1\u05D9\u05D4 4 \u05E2\u05DC 4 \u05DC\u05DE\u05EA\u05E7\u05D3\u05DE\u05D9\u05DD", "price": 110, "category": "toy", "description": "\u05E7\u05D5\u05D1\u05D9\u05D4 \u05D4\u05D5\u05E0\u05D2\u05E8\u05D9\u05EA 4 \u05E2\u05DC 4 \u05DE\u05E7\u05D5\u05E8\u05D9\u05EA, \u05D0\u05EA\u05D2\u05E8 \u05D7\u05E9\u05D9\u05D1\u05D4 \u05DC\u05DE\u05D9 \u05E9\u05DB\u05D1\u05E8 \u05E4\u05EA\u05E8 \u05D0\u05EA \u05D4\u05E7\u05D5\u05D1\u05D9\u05D4 \u05D4\u05E8\u05D2\u05D9\u05DC\u05D4.", "occasions": ["birthday", "barMitzvah"], "relations": ["child", "sibling", "friendM", "friendF"], "ages": ["kids", "teens"], "interests": ["games"], "stores": [{ "name": "\u05D8\u05D5\u05D9\u05E1 \u05D0\u05E8 \u05D0\u05E1", "url": "https://toysrus.co.il/products/%D7%A8%D7%95%D7%91%D7%99%D7%A7%D7%A1-%D7%A7%D7%95%D7%91%D7%99%D7%94-4-%D7%A2%D7%9C-4-%D7%9C%D7%9E%D7%AA%D7%A7%D7%93%D7%9E%D7%99%D7%9D", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "watch-b17e12", "name": "\u05E9\u05E2\u05D5\u05DF ADI \u05DC\u05D0\u05D9\u05E9\u05D4 \u05E8\u05E6\u05D5\u05E2\u05EA \u05E2\u05D5\u05E8", "price": 320, "category": "watch", "description": "\u05E9\u05E2\u05D5\u05DF \u05D9\u05D3 \u05E7\u05DC\u05D0\u05E1\u05D9 \u05DC\u05D0\u05D9\u05E9\u05D4 \u05DE\u05D1\u05D9\u05EA ADI \u05D1\u05D2\u05D5\u05D5\u05DF \u05DE\u05D5\u05D6\u05D4\u05D1 \u05E2\u05DD \u05DC\u05D5\u05D7 \u05E1\u05E4\u05E8\u05D5\u05EA \u05D5\u05E8\u05E6\u05D5\u05E2\u05EA \u05E2\u05D5\u05E8 \u05D7\u05D5\u05DE\u05D4.", "occasions": ["birthday", "anniversary"], "relations": ["partner", "parent", "friendF"], "ages": ["young", "adults", "seniors"], "interests": ["fashion"], "stores": [{ "name": "\u05E9\u05E2\u05D5\u05E0\u05D9 \u05E2\u05D3\u05D9", "url": "https://adiwatches.co.il/product/watch-adi-womens-strap-leather/", "regions": [], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "book-e1e3dd", "name": "\u05D4\u05E1\u05D5\u05D3 \u05D4\u05D0\u05D7\u05E8\u05D5\u05DF", "price": 126, "category": "book", "description": "\u05DE\u05D5\u05EA\u05D7\u05DF \u05DE\u05D0\u05EA \u05D3\u05DF \u05D1\u05E8\u05D0\u05D5\u05DF, \u05DC\u05D7\u05D5\u05D1\u05D1\u05D9 \u05EA\u05E2\u05DC\u05D5\u05DE\u05D5\u05EA \u05D5\u05E7\u05E8\u05D9\u05D0\u05D4 \u05E1\u05D5\u05D7\u05E4\u05EA.", "occasions": ["birthday", "anniversary"], "relations": ["parent", "partner", "friendM", "friendF", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["reading"], "stores": [{ "name": "\u05E6\u05D5\u05DE\u05EA \u05E1\u05E4\u05E8\u05D9\u05DD", "url": "https://www.booknet.co.il/\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD/%d7%94%d7%a1%d7%95%d7%93-%d7%94%d7%90%d7%97%d7%a8%d7%95%d7%9f-62512020655", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "game-0cc36b", "name": "\u05D8\u05D0\u05E7\u05D9 \u05E4\u05D7 \u05D1\u05D9\u05E0\u05DC\u05D0\u05D5\u05DE\u05D9", "price": 70, "category": "game", "description": "\u05DE\u05E9\u05D7\u05E7 \u05D4\u05E7\u05DC\u05E4\u05D9\u05DD \u05D4\u05D9\u05E9\u05E8\u05D0\u05DC\u05D9 \u05D4\u05DE\u05D5\u05DB\u05E8 \u05D1\u05E7\u05D5\u05E4\u05E1\u05EA \u05E4\u05D7, \u05DE\u05EA\u05D0\u05D9\u05DD \u05DC\u05DB\u05DC \u05D4\u05DE\u05E9\u05E4\u05D7\u05D4 \u05DE\u05D2\u05D9\u05DC 6.", "occasions": ["birthday"], "relations": ["child", "sibling", "friendM", "friendF"], "ages": ["kids", "teens", "young"], "interests": ["games"], "stores": [{ "name": "\u05D8\u05D5\u05D9\u05E1 \u05D0\u05E8 \u05D0\u05E1", "url": "https://toysrus.co.il/products/%D7%98%D7%90%D7%A7%D7%99-%D7%A4%D7%97-%D7%91%D7%99%D7%A0%D7%9C%D7%90%D7%95%D7%9E%D7%99", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "baby-f10fda", "name": "\u05E9\u05DE\u05D9\u05DB\u05EA \u05E6\u05DE\u05D5\u05EA \u05D5\u05E4\u05E8\u05D5\u05D5\u05D4 \u05D3\u05D5-\u05E6\u05D3\u05D3\u05D9\u05EA \u05DC\u05E2\u05D2\u05DC\u05D4 \u05E9\u05DE\u05E0\u05EA", "price": 130, "category": "baby", "description": '\u05E9\u05DE\u05D9\u05DB\u05EA \u05E4\u05E8\u05D5\u05D5\u05D4 \u05E8\u05DB\u05D4 \u05D3\u05D5-\u05E6\u05D3\u05D3\u05D9\u05EA \u05DC\u05E2\u05D2\u05DC\u05EA \u05D4\u05EA\u05D9\u05E0\u05D5\u05E7 \u05D1\u05D3\u05D5\u05D2\u05DE\u05EA \u05E6\u05DE\u05D5\u05EA, \u05D1\u05D2\u05D5\u05D3\u05DC 76x100 \u05E1"\u05DE.', "occasions": ["birth", "brit"], "relations": ["friendF", "friendM", "sibling", "colleague"], "ages": ["young", "adults"], "interests": ["home"], "stores": [{ "name": "\u05E9\u05D9\u05DC\u05D1", "url": "https://www.shilav.co.il/products/%D7%A9%D7%9E%D7%99%D7%9B%D7%AA-%D7%A6%D7%9E%D7%95%D7%AA-%D7%95%D7%A4%D7%A8%D7%95%D7%95%D7%94-%D7%93%D7%95-%D7%A6%D7%93%D7%93%D7%99%D7%AA-%D7%9C%D7%A2%D7%92%D7%9C%D7%94-%D7%A9%D7%9E%D7%A0%D7%AA-3", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "kitchen-bebae5", "name": "\u05E1\u05D8 \u05DE\u05DC\u05D7 \u05E4\u05DC\u05E4\u05DC \u05D7\u05DC\u05D5\u05E7\u05D9 \u05E0\u05D7\u05DC \u05E9\u05D7\u05D5\u05E8 \u05D5\u05DC\u05D1\u05DF", "price": 270, "category": "kitchen", "description": "\u05E1\u05D8 \u05DE\u05DC\u05D7\u05D9\u05D9\u05D4 \u05D5\u05E4\u05DC\u05E4\u05DC\u05D9\u05D9\u05D4 \u05DE\u05E4\u05D5\u05E8\u05E6\u05DC\u05DF \u05D1\u05E2\u05D1\u05D5\u05D3\u05EA \u05D9\u05D3 \u05D1\u05E6\u05D5\u05E8\u05EA \u05D7\u05DC\u05D5\u05E7\u05D9 \u05E0\u05D7\u05DC, \u05D1\u05E9\u05D7\u05D5\u05E8 \u05D5\u05DC\u05D1\u05DF.", "occasions": ["housewarming", "anniversary"], "relations": ["friendF", "friendM", "sibling", "parent", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["home", "cooking", "food"], "stores": [{ "name": "\u05D0\u05E1\u05D5\u05E4\u05D4", "url": "https://asufadesign.co.il/products/%D7%A1%D7%98-%D7%9E%D7%9C%D7%97-%D7%A4%D7%9C%D7%A4%D7%9C-%D7%97%D7%9C%D7%95%D7%A7%D7%99-%D7%A0%D7%97%D7%9C-%D7%A9%D7%97%D7%95%D7%A8-%D7%95%D7%9C%D7%91%D7%9F-%D7%A1%D7%A4%D7%99%D7%A8%D7%9C%D7%94-%D7%9E%D7%A2%D7%99%D7%9F-%D7%91%D7%9F-%D7%99%D7%95%D7%A0%D7%94", "regions": ["telAviv"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "care-249a2d", "name": "\u05E1\u05D8 \u05E7\u05E8\u05DE\u05D9 \u05D9\u05D3\u05D9\u05D9\u05DD \u05E7\u05DC\u05D0\u05E1\u05D9\u05E7", "price": 135, "category": "care", "description": "\u05E9\u05DC\u05D9\u05E9\u05D9\u05D9\u05EA \u05E7\u05E8\u05DE\u05D9 \u05D9\u05D3\u05D9\u05D9\u05DD \u05E7\u05D8\u05E0\u05D9\u05DD \u05D1\u05E0\u05D9\u05D7\u05D5\u05D7\u05D5\u05EA \u05E9\u05D5\u05E0\u05D9\u05DD, \u05D0\u05E8\u05D5\u05D6\u05D4 \u05D1\u05E9\u05E7\u05D9\u05EA \u05DE\u05EA\u05E0\u05D4.", "occasions": ["birthday"], "relations": ["friendF", "parent", "sibling", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["care", "travel"], "stores": [{ "name": "\u05DC'\u05D0\u05D5\u05E7\u05E1\u05D9\u05D8\u05DF", "url": "https://il.loccitane.com/products/classic-hand-cream-trio", "regions": ["telAviv", "jerusalem", "haifa", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "candle-9477df", "name": "\u05E0\u05E8 \u05E8\u05D9\u05D7\u05E0\u05D9 \u05D1\u05DB\u05DC\u05D9 \u05E7\u05E8\u05DE\u05D9\u05E7\u05D4 500 \u05D2\u05E8' Hiba", "price": 150, "category": "candle", "description": "\u05E0\u05E8 \u05E8\u05D9\u05D7\u05E0\u05D9 \u05D2\u05D3\u05D5\u05DC \u05D1\u05DB\u05DC\u05D9 \u05E7\u05E8\u05DE\u05D9\u05E7\u05D4 \u05D1\u05D2\u05D5\u05D5\u05DF \u05E9\u05DE\u05E0\u05EA, \u05E9\u05DE\u05E9\u05DE\u05E9 \u05D2\u05DD \u05DB\u05E4\u05E8\u05D9\u05D8 \u05E2\u05D9\u05E6\u05D5\u05D1 \u05DC\u05D1\u05D9\u05EA.", "occasions": ["housewarming", "birthday"], "relations": ["friendF", "friendM", "parent", "sibling", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["home"], "stores": [{ "name": "\u05E4\u05D5\u05E7\u05E1 \u05D4\u05D5\u05DD", "url": "https://www.foxhome.co.il/products/0332899401", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "chocolate-5a950e", "name": "\u05DE\u05D0\u05E8\u05D6 \u05E9\u05D5\u05E7\u05D5\u05DC\u05D3 \u05DC\u05D0\u05D5\u05E0\u05D9\u05D3\u05E1 \u05DE\u05D5\u05D6\u05D4\u05D1 - 30 \u05E4\u05E8\u05DC\u05D9\u05E0\u05D9\u05DD", "price": 330, "category": "chocolate", "description": "\u05E7\u05D5\u05E4\u05E1\u05EA \u05DE\u05EA\u05DB\u05EA \u05DE\u05D5\u05D6\u05D4\u05D1\u05EA \u05E2\u05DD 30 \u05E4\u05E8\u05DC\u05D9\u05E0\u05D9 \u05E9\u05D5\u05E7\u05D5\u05DC\u05D3 \u05D1\u05DC\u05D2\u05D9, \u05DE\u05EA\u05E0\u05D4 \u05D7\u05D2\u05D9\u05D2\u05D9\u05EA \u05D5\u05DE\u05E8\u05E9\u05D9\u05DE\u05D4.", "occasions": ["birthday", "anniversary", "housewarming", "birth"], "relations": ["partner", "parent", "friendF", "friendM", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["food"], "stores": [{ "name": "\u05DC\u05D0\u05D5\u05E0\u05D9\u05D3\u05E1", "url": "https://leonidas.co.il/products/golden-leonidas-case-30", "regions": ["telAviv", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "backpack-02e51d", "name": "\u05EA\u05D9\u05E7 \u05D2\u05D1 Timberpack", "price": 250, "category": "backpack", "description": "\u05EA\u05D9\u05E7 \u05D2\u05D1 \u05E7\u05DC \u05D5\u05E2\u05DE\u05D9\u05D3 \u05DC\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D9\u05D5\u05DE\u05D9\u05D5\u05DE\u05D9 \u05E2\u05DD \u05EA\u05D0 \u05D9\u05D9\u05E2\u05D5\u05D3\u05D9 \u05DC\u05DE\u05D7\u05E9\u05D1 \u05E0\u05D9\u05D9\u05D3 \u05D5\u05DB\u05D9\u05E1\u05D9\u05DD \u05DC\u05D0\u05E8\u05D2\u05D5\u05DF.", "occasions": ["birthday", "barMitzvah"], "relations": ["friendM", "friendF", "sibling", "partner", "child"], "ages": ["teens", "young", "adults"], "interests": ["travel", "fashion"], "stores": [{ "name": "\u05D8\u05D9\u05DE\u05D1\u05E8\u05DC\u05E0\u05D3", "url": "https://www.timberland.co.il/accessories/bags-and-wallets/0yheq-001", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "sport-d27598", "name": "\u05DE\u05E9\u05E7\u05E4\u05EA \u05D8\u05D9\u05D5\u05DC\u05D9\u05DD 6x25 HIKE 100", "price": 140, "category": "sport", "description": "\u05DE\u05E9\u05E7\u05E4\u05EA \u05E7\u05D5\u05DE\u05E4\u05E7\u05D8\u05D9\u05EA \u05DC\u05DC\u05D0 \u05E6\u05D5\u05E8\u05DA \u05D1\u05DB\u05D5\u05D5\u05E0\u05D5\u05DF, \u05DC\u05EA\u05E6\u05E4\u05D9\u05EA \u05E2\u05DC \u05E0\u05D5\u05E3 \u05D5\u05E6\u05D9\u05E4\u05D5\u05E8\u05D9\u05DD \u05D1\u05D8\u05D9\u05D5\u05DC\u05D9\u05DD.", "occasions": ["birthday", "barMitzvah"], "relations": ["child", "sibling", "parent", "friendM", "friendF"], "ages": ["kids", "teens", "adults", "seniors"], "interests": ["travel", "sport"], "stores": [{ "name": "\u05D3\u05E7\u05D8\u05DC\u05D5\u05DF", "url": "https://www.decathlon.co.il/p/187432-230179-\u05DE\u05E9\u05E7\u05E4\u05EA-\u05D8\u05D9\u05D5\u05DC\u05D9\u05DD-6x25-\u05DC\u05DC\u05D0-\u05DB\u05D5\u05D5\u05E0\u05D5\u05DF-hike-100-\u05DB\u05EA\u05D5\u05DD.html", "regions": ["telAviv", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "jewelry-984ab1", "name": '\u05E2\u05D2\u05D9\u05DC\u05D9 \u05D7\u05D9\u05E9\u05D5\u05E7 \u05E7\u05D8\u05E0\u05D9\u05DD \u05E6\u05D9\u05E4\u05D5\u05D9 \u05D6\u05D4\u05D1 1.3 \u05E1"\u05DE', "price": 159, "category": "jewelry", "description": '\u05E2\u05D2\u05D9\u05DC\u05D9 \u05D7\u05D9\u05E9\u05D5\u05E7 \u05E7\u05D8\u05E0\u05D9\u05DD \u05D1\u05E6\u05D9\u05E4\u05D5\u05D9 \u05D6\u05D4\u05D1 \u05D1\u05E7\u05D5\u05D8\u05E8 1.3 \u05E1"\u05DE, \u05DE\u05EA\u05D0\u05D9\u05DE\u05D9\u05DD \u05DC\u05E2\u05E0\u05D9\u05D3\u05D4 \u05D9\u05D5\u05DE\u05D9\u05D5\u05DE\u05D9\u05EA.', "occasions": ["birthday", "anniversary"], "relations": ["friendF", "partner", "sibling", "child"], "ages": ["teens", "young", "adults"], "interests": ["fashion"], "stores": [{ "name": "\u05DE\u05D2\u05E0\u05D5\u05DC\u05D9\u05D4", "url": "https://www.magnolia.co.il/products/h02982g", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "wallet-376156", "name": "\u05D0\u05E8\u05E0\u05E7 \u05E2\u05D5\u05E8 \u05DC\u05E0\u05E9\u05D9\u05DD JUST", "price": 270, "category": "wallet", "description": "\u05D0\u05E8\u05E0\u05E7 \u05E2\u05D5\u05E8 \u05DC\u05E0\u05E9\u05D9\u05DD \u05D1\u05E2\u05D9\u05E6\u05D5\u05D1 \u05E7\u05DC\u05D0\u05E1\u05D9 \u05E2\u05DD \u05EA\u05D0 \u05E8\u05D0\u05E9\u05D9 \u05D1\u05E8\u05D5\u05DB\u05E1\u05DF \u05D5\u05EA\u05D0 \u05D7\u05D9\u05E6\u05D5\u05E0\u05D9 \u05E7\u05D8\u05DF.", "occasions": ["birthday", "anniversary"], "relations": ["friendF", "partner", "parent", "sibling", "colleague"], "ages": ["young", "adults", "seniors"], "interests": ["fashion"], "stores": [{ "name": "\u05D4\u05DE\u05E9\u05D1\u05D9\u05E8 365", "url": "https://365mashbir.co.il/products/%D7%A0%D7%A8%D7%AA%D7%99%D7%A7-%D7%A2%D7%95%D7%A8-%D7%9C%D7%A0%D7%A9%D7%99%D7%9D", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "book-01ef17", "name": "\u05E4\u05E8\u05E1\u05D9 \u05D2'\u05E7\u05E1\u05D5\u05DF 1: \u05D2\u05E0\u05D1 \u05D4\u05D1\u05E8\u05E7", "price": 88, "category": "book", "description": "\u05E1\u05E4\u05E8 \u05E4\u05E0\u05D8\u05D6\u05D9\u05D4 \u05D5\u05D4\u05E8\u05E4\u05EA\u05E7\u05D0\u05D5\u05EA \u05DC\u05E0\u05D5\u05E2\u05E8 \u05DE\u05D0\u05EA \u05E8\u05D9\u05E7 \u05E8\u05D9\u05D9\u05E8\u05D3\u05DF, \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF \u05D1\u05E1\u05D3\u05E8\u05EA \u05E4\u05E8\u05E1\u05D9 \u05D2'\u05E7\u05E1\u05D5\u05DF.", "occasions": ["birthday", "barMitzvah"], "relations": ["child", "sibling"], "ages": ["kids", "teens"], "interests": ["reading"], "stores": [{ "name": "\u05E1\u05D8\u05D9\u05DE\u05E6\u05E7\u05D9", "url": "https://www.steimatzky.co.il/010033127", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "game-ded3a1", "name": "TheraPlay \u05E2\u05E8\u05DB\u05D4 \u05DC\u05D7\u05D9\u05D6\u05D5\u05E7 \u05D4\u05D6\u05D5\u05D2\u05D9\u05D5\u05EA", "price": 179, "category": "game", "description": "\u05E2\u05E8\u05DB\u05EA \u05E7\u05DC\u05E4\u05D9 \u05E9\u05D0\u05DC\u05D5\u05EA \u05DC\u05D6\u05D5\u05D2\u05D5\u05EA \u05E9\u05DE\u05E2\u05D5\u05D3\u05D3\u05EA \u05E9\u05D9\u05D7\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D4, \u05D4\u05E7\u05E9\u05D1\u05D4 \u05D5\u05E7\u05E8\u05D1\u05D4 \u05DE\u05D7\u05D5\u05D3\u05E9\u05EA.", "occasions": ["anniversary"], "relations": ["partner", "friendF", "friendM", "sibling"], "ages": ["young", "adults"], "interests": ["games", "home"], "stores": [{ "name": "\u05D0\u05E1\u05D5\u05E4\u05D4", "url": "https://asufadesign.co.il/products/%D7%A2%D7%A8%D7%9B%D7%94-%D7%9C%D7%97%D7%99%D7%96%D7%95%D7%A7-%D7%94%D7%96%D7%95%D7%92%D7%99%D7%95%D7%AA-theraplay-%D7%A0%D7%95%D7%A2%D7%94-%D7%94%D7%93%D7%A8%D7%99-ask-q", "regions": ["telAviv"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "baby-6e1bfb", "name": "\u05D3\u05D5\u05D1\u05D9 \u05DC\u05D9\u05DC\u05D4 \u05D8\u05D5\u05D1 \u05DC\u05D1\u05DF", "price": 90, "category": "baby", "description": "\u05D3\u05D5\u05D1\u05D9 \u05E4\u05E8\u05D5\u05D5\u05EA\u05D9 \u05E8\u05DA \u05E9\u05DE\u05E0\u05D2\u05DF \u05DE\u05E0\u05D2\u05D9\u05E0\u05D5\u05EA \u05DE\u05E8\u05D2\u05D9\u05E2\u05D5\u05EA \u05DC\u05E9\u05D9\u05E0\u05D4 \u05D5\u05E0\u05EA\u05DC\u05D4 \u05E2\u05DC \u05D4\u05E2\u05D2\u05DC\u05D4 \u05D0\u05D5 \u05D4\u05DE\u05D9\u05D8\u05D4.", "occasions": ["birth", "brit"], "relations": ["friendF", "friendM", "sibling", "colleague"], "ages": ["young", "adults"], "interests": ["home", "music"], "stores": [{ "name": "\u05E9\u05D9\u05DC\u05D1", "url": "https://www.shilav.co.il/products/%D7%93%D7%95%D7%91%D7%99-%D7%9E%D7%A0%D7%92%D7%9F-%D7%9C%D7%99%D7%9C%D7%94-%D7%98%D7%95%D7%91-%D7%9C%D7%91%D7%9F", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" },
  { "id": "kitchen-c0c88c", "name": "\u05DE\u05E2\u05DE\u05D3 \u05DC\u05E2\u05D5\u05D2\u05D4 \u05E2\u05DC \u05E8\u05D2\u05DC \u05DE\u05E4\u05D5\u05E8\u05E6\u05DC\u05DF", "price": 140, "category": "kitchen", "description": "\u05DE\u05E2\u05DE\u05D3 \u05E4\u05D5\u05E8\u05E6\u05DC\u05DF \u05DC\u05D1\u05DF \u05E2\u05DC \u05E8\u05D2\u05DC \u05DC\u05D4\u05D2\u05E9\u05EA \u05E2\u05D5\u05D2\u05D4 \u05E2\u05D2\u05D5\u05DC\u05D4, \u05E2\u05DD \u05E2\u05D9\u05D8\u05D5\u05E8 \u05E2\u05D9\u05D2\u05D5\u05DC\u05D9\u05DD \u05D1\u05E9\u05D5\u05DC\u05D9\u05D9\u05DD.", "occasions": ["housewarming"], "relations": ["friendF", "friendM", "sibling", "colleague", "parent"], "ages": ["young", "adults", "seniors"], "interests": ["home", "food", "cooking"], "stores": [{ "name": "\u05E4\u05D5\u05E7\u05E1 \u05D4\u05D5\u05DD", "url": "https://www.foxhome.co.il/products/0303410100", "regions": ["telAviv", "jerusalem", "haifa", "beerSheva", "sharon"], "delivery": true }], "priceCheckedAt": "2026-11-20" }
];

// server/app.ts
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";

// src/catalog.ts
var OCCASIONS = {
  birthday: "\u05D9\u05D5\u05DD \u05D4\u05D5\u05DC\u05D3\u05EA",
  anniversary: "\u05D9\u05D5\u05DD \u05E0\u05D9\u05E9\u05D5\u05D0\u05D9\u05DF",
  barMitzvah: "\u05D1\u05E8/\u05D1\u05EA \u05DE\u05E6\u05D5\u05D5\u05D4",
  brit: "\u05D1\u05E8\u05D9\u05EA/\u05D1\u05E8\u05D9\u05EA\u05D4",
  birth: "\u05D4\u05D5\u05DC\u05D3\u05EA \u05D1\u05DF/\u05D1\u05EA",
  housewarming: "\u05D7\u05E0\u05D5\u05DB\u05EA \u05D1\u05D9\u05EA"
};
var RELATIONS = {
  friendF: "\u05D7\u05D1\u05E8\u05D4",
  friendM: "\u05D7\u05D1\u05E8",
  partner: "\u05D1\u05DF/\u05D1\u05EA \u05D6\u05D5\u05D2",
  parent: "\u05D4\u05D5\u05E8\u05D4",
  sibling: "\u05D0\u05D7/\u05D0\u05D7\u05D5\u05EA",
  colleague: "\u05E2\u05DE\u05D9\u05EA/\u05D4 \u05DC\u05E2\u05D1\u05D5\u05D3\u05D4",
  child: "\u05D9\u05DC\u05D3/\u05D4"
};
var ltr = (range) => `\u2066${range}\u2069`;
var AGE_GROUPS = {
  kids: "\u05E2\u05D3 12",
  teens: ltr("13\u201317"),
  young: ltr("18\u201330"),
  adults: ltr("31\u201350"),
  seniors: "51 \u05D5\u05DE\u05E2\u05DC\u05D4"
};
var INTERESTS = {
  care: "\u05D8\u05D9\u05E4\u05D5\u05D7",
  cooking: "\u05D1\u05D9\u05E9\u05D5\u05DC",
  food: "\u05D0\u05D5\u05DB\u05DC \u05D5\u05D9\u05D9\u05DF",
  sport: "\u05E1\u05E4\u05D5\u05E8\u05D8",
  reading: "\u05E7\u05E8\u05D9\u05D0\u05D4",
  tech: "\u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4",
  music: "\u05DE\u05D5\u05D6\u05D9\u05E7\u05D4",
  home: "\u05D1\u05D9\u05EA \u05D5\u05E2\u05D9\u05E6\u05D5\u05D1",
  travel: "\u05D8\u05D9\u05D5\u05DC\u05D9\u05DD",
  games: "\u05DE\u05E9\u05D7\u05E7\u05D9\u05DD",
  fashion: "\u05D0\u05D5\u05E4\u05E0\u05D4 \u05D5\u05EA\u05DB\u05E9\u05D9\u05D8\u05D9\u05DD"
};
var REGIONS = {
  telAviv: "\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1",
  jerusalem: "\u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD",
  haifa: "\u05D7\u05D9\u05E4\u05D4",
  beerSheva: "\u05D1\u05D0\u05E8 \u05E9\u05D1\u05E2",
  sharon: "\u05D4\u05E9\u05E8\u05D5\u05DF"
};
var CATEGORIES = {
  care: "\u05D8\u05D9\u05E4\u05D5\u05D7",
  perfume: "\u05D1\u05D5\u05E9\u05DD",
  candle: "\u05E0\u05E8\u05D5\u05EA \u05D5\u05E8\u05D9\u05D7 \u05DC\u05D1\u05D9\u05EA",
  plant: "\u05E6\u05DE\u05D7\u05D9\u05DD",
  flowers: "\u05E4\u05E8\u05D7\u05D9\u05DD",
  kitchen: "\u05DB\u05DC\u05D9 \u05DE\u05D8\u05D1\u05D7",
  cookbook: "\u05E1\u05E4\u05E8 \u05D1\u05D9\u05E9\u05D5\u05DC",
  wine: "\u05D9\u05D9\u05DF \u05D5\u05DB\u05D5\u05E1\u05D5\u05EA",
  chocolate: "\u05E9\u05D5\u05E7\u05D5\u05DC\u05D3 \u05D5\u05DE\u05EA\u05D5\u05E7\u05D9\u05DD",
  coffee: "\u05E7\u05E4\u05D4 \u05D5\u05EA\u05D4",
  book: "\u05E1\u05E4\u05E8",
  game: "\u05DE\u05E9\u05D7\u05E7 \u05E7\u05D5\u05E4\u05E1\u05D4",
  toy: "\u05E6\u05E2\u05E6\u05D5\u05E2",
  puzzle: "\u05E4\u05D0\u05D6\u05DC",
  headphones: "\u05D0\u05D5\u05D6\u05E0\u05D9\u05D5\u05EA",
  speaker: "\u05E8\u05DE\u05E7\u05D5\u05DC",
  gadget: "\u05D2\u05D0\u05D3\u05D2\u05F3\u05D8",
  watch: "\u05E9\u05E2\u05D5\u05DF",
  jewelry: "\u05EA\u05DB\u05E9\u05D9\u05D8",
  wallet: "\u05D0\u05E8\u05E0\u05E7 \u05D5\u05EA\u05D9\u05E7\u05D9\u05DD",
  bottle: "\u05D1\u05E7\u05D1\u05D5\u05E7",
  backpack: "\u05EA\u05D9\u05E7 \u05D2\u05D1",
  sport: "\u05E6\u05D9\u05D5\u05D3 \u05E1\u05E4\u05D5\u05E8\u05D8",
  baby: "\u05D1\u05D2\u05D3\u05D9 \u05EA\u05D9\u05E0\u05D5\u05E7\u05D5\u05EA",
  blanket: "\u05E9\u05DE\u05D9\u05DB\u05D4 \u05D5\u05D8\u05E7\u05E1\u05D8\u05D9\u05DC",
  voucher: "\u05E9\u05D5\u05D1\u05E8 \u05DE\u05EA\u05E0\u05D4"
};
var isOneOf = (labels, value) => typeof value === "string" && Object.prototype.hasOwnProperty.call(labels, value);
var listOf = (labels, value) => Array.isArray(value) ? [...new Set(value.filter((item) => isOneOf(labels, item)))] : [];
var text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
var httpsUrl = (value) => {
  const raw = text(value, 500);
  if (!raw) return void 0;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : void 0;
  } catch {
    return void 0;
  }
};
function parseGift(input) {
  if (typeof input !== "object" || input === null) return { error: "\u05E4\u05E8\u05D8\u05D9 \u05D4\u05DE\u05D5\u05E6\u05E8 \u05D7\u05E1\u05E8\u05D9\u05DD." };
  const raw = input;
  const id = text(raw.id, 60).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(id)) return { error: "\u05DE\u05D6\u05D4\u05D4 \u05D4\u05DE\u05D5\u05E6\u05E8 \u05D9\u05DB\u05D5\u05DC \u05DC\u05DB\u05DC\u05D5\u05DC \u05E8\u05E7 \u05D0\u05D5\u05EA\u05D9\u05D5\u05EA \u05D1\u05D0\u05E0\u05D2\u05DC\u05D9\u05EA, \u05E1\u05E4\u05E8\u05D5\u05EA \u05D5\u05DE\u05E7\u05E4\u05D9\u05DD." };
  const name = text(raw.name, 60);
  if (name.length < 2) return { error: "\u05D7\u05E1\u05E8 \u05E9\u05DD \u05DC\u05DE\u05D5\u05E6\u05E8." };
  const price = Number(raw.price);
  if (!Number.isFinite(price) || price <= 0 || price > 1e5) return { error: "\u05D4\u05DE\u05D7\u05D9\u05E8 \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05E1\u05E4\u05E8 \u05D7\u05D9\u05D5\u05D1\u05D9." };
  if (!isOneOf(CATEGORIES, raw.category)) return { error: "\u05E6\u05E8\u05D9\u05DA \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4." };
  const occasions = listOf(OCCASIONS, raw.occasions);
  if (occasions.length === 0) return { error: "\u05E6\u05E8\u05D9\u05DA \u05DC\u05D1\u05D7\u05D5\u05E8 \u05DC\u05E4\u05D7\u05D5\u05EA \u05D0\u05D9\u05E8\u05D5\u05E2 \u05D0\u05D7\u05D3." };
  const interests = listOf(INTERESTS, raw.interests);
  if (interests.length === 0) return { error: "\u05E6\u05E8\u05D9\u05DA \u05DC\u05D1\u05D7\u05D5\u05E8 \u05DC\u05E4\u05D7\u05D5\u05EA \u05EA\u05D7\u05D5\u05DD \u05E2\u05E0\u05D9\u05D9\u05DF \u05D0\u05D7\u05D3." };
  const stores = [];
  for (const entry of Array.isArray(raw.stores) ? raw.stores.slice(0, 8) : []) {
    if (typeof entry !== "object" || entry === null) continue;
    const store = entry;
    const storeName = text(store.name, 60);
    if (!storeName) continue;
    if (text(store.url, 500) && !httpsUrl(store.url)) return { error: `\u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05E9\u05DC ${storeName} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1\u05BEhttps://` };
    const regions = listOf(REGIONS, store.regions);
    const delivery = store.delivery === true;
    if (!delivery && regions.length === 0) return { error: `\u05DC\u05D7\u05E0\u05D5\u05EA ${storeName} \u05E6\u05E8\u05D9\u05DA \u05DC\u05E1\u05DE\u05DF \u05DE\u05E9\u05DC\u05D5\u05D7 \u05D0\u05D5 \u05D0\u05D6\u05D5\u05E8 \u05D0\u05D7\u05D3 \u05DC\u05E4\u05D7\u05D5\u05EA.` };
    stores.push({ name: storeName, url: httpsUrl(store.url), regions, delivery });
  }
  if (stores.length === 0) return { error: "\u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D5\u05E1\u05D9\u05E3 \u05DC\u05E4\u05D7\u05D5\u05EA \u05D7\u05E0\u05D5\u05EA \u05D0\u05D7\u05EA." };
  if (text(raw.imageUrl, 500) && !httpsUrl(raw.imageUrl)) return { error: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05EA\u05DE\u05D5\u05E0\u05D4 \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1\u05BEhttps://" };
  const checked = text(raw.priceCheckedAt, 10);
  return {
    gift: {
      id,
      name,
      price: Math.round(price),
      category: raw.category,
      imageUrl: httpsUrl(raw.imageUrl),
      description: text(raw.description, 200),
      occasions,
      relations: listOf(RELATIONS, raw.relations),
      ages: listOf(AGE_GROUPS, raw.ages),
      interests,
      stores,
      priceCheckedAt: /^\d{4}-\d{2}-\d{2}$/.test(checked) ? checked : void 0
    }
  };
}

// server/app.ts
var SESSION_COOKIE = "gf_session";
var SESSION_SECONDS = 60 * 60 * 24 * 30;
var MAX_CATALOG = 500;
var MAX_FAVORITES = 200;
var MAX_REMINDERS = 50;
var ApiError = class extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
};
var fail = (status, code, message) => {
  throw new ApiError(status, code, message);
};
var sha256 = (value) => createHash("sha256").update(value).digest("hex");
var str = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
var field = (body, key) => typeof body === "object" && body !== null ? body[key] : void 0;
var derive = (password, salt) => new Promise(
  (resolve, reject) => scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key))
);
var sameText = (a, b) => {
  const left = Buffer.from(sha256(a));
  const right = Buffer.from(sha256(b));
  return timingSafeEqual(left, right);
};
var parseJson = (raw, fallback) => {
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
var pairs = (flat) => {
  const list = Array.isArray(flat) ? flat : [];
  const out = [];
  for (let i = 0; i + 1 < list.length; i += 2) out.push([list[i], list[i + 1]]);
  return out;
};
async function handle(req, store, config) {
  try {
    return await route(req, store, config);
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: error.status, body: { error: { code: error.code, message: error.message } } };
    }
    console.error("GiftFit API error", error);
    return { status: 500, body: { error: { code: "server_error", message: "\u05DE\u05E9\u05D4\u05D5 \u05D4\u05E9\u05EA\u05D1\u05E9 \u05D0\u05E6\u05DC\u05E0\u05D5. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 \u05E8\u05D2\u05E2." } } };
  }
}
async function route(req, maybeStore, config) {
  const key = `${req.method} ${req.path.replace(/\/+$/, "") || "/"}`;
  if (!maybeStore) {
    if (key === "GET /bootstrap") {
      const body = { storage: false, me: null, catalog: config.seed, favorites: [], reminders: [], ratings: {}, popular: [] };
      return { status: 200, body };
    }
    return fail(503, "storage_unavailable", "\u05D4\u05D7\u05E9\u05D1\u05D5\u05E0\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05D6\u05DE\u05D9\u05E0\u05D9\u05DD. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05DE\u05D0\u05D5\u05D7\u05E8 \u05D9\u05D5\u05EA\u05E8.");
  }
  const store = maybeStore;
  if (req.method !== "GET") {
    if (!req.contentType?.includes("application/json")) fail(415, "bad_content_type", "\u05D1\u05E7\u05E9\u05D4 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4.");
    if (req.origin && req.host && new URL(req.origin).host !== req.host) fail(403, "bad_origin", "\u05D1\u05E7\u05E9\u05D4 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4.");
  }
  const isAdminEmail = (email) => config.adminEmails.includes(email);
  const toMe = (user) => ({ name: user.name, email: user.email, isAdmin: isAdminEmail(user.email) });
  const currentUser = async () => {
    const token = req.cookies[SESSION_COOKIE];
    if (!token) return null;
    const userId = await store.cmd("GET", `session:${sha256(token)}`);
    if (!userId) return null;
    return parseJson(await store.cmd("GET", `user:${userId}`), null);
  };
  const requireUser = async () => await currentUser() ?? fail(401, "signed_out", "\u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.");
  const requireAdmin = async () => {
    const user = await requireUser();
    if (!isAdminEmail(user.email)) fail(403, "not_admin", "\u05D4\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05E8\u05E7 \u05DC\u05DE\u05E0\u05D4\u05DC\u05D9 \u05D4\u05E7\u05D8\u05DC\u05D5\u05D2.");
    return user;
  };
  const limit = async (bucket, max, seconds) => {
    const name = `rl:${bucket}`;
    const count = await store.cmd("INCR", name);
    if (count === 1) await store.cmd("EXPIRE", name, seconds);
    if (count > max) fail(429, "too_many", "\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05E0\u05D9\u05E1\u05D9\u05D5\u05E0\u05D5\u05EA. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 \u05DB\u05DE\u05D4 \u05D3\u05E7\u05D5\u05EA.");
  };
  const loadCatalog = async () => {
    const saved = parseJson(await store.cmd("GET", "catalog"), null);
    return Array.isArray(saved) ? { catalog: saved, custom: true } : { catalog: config.seed, custom: false };
  };
  const sessionCookie = (token, maxAge) => `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${req.secure ? "; Secure" : ""}`;
  const startSession = async (user) => {
    const token = randomBytes(32).toString("base64url");
    const hashed = sha256(token);
    await store.pipeline([
      ["SET", `session:${hashed}`, user.id, "EX", SESSION_SECONDS],
      ["SADD", `sessions:${user.id}`, hashed]
    ]);
    return { status: 200, body: { me: toMe(user) }, cookies: [sessionCookie(token, SESSION_SECONDS)] };
  };
  const ratings = async () => {
    const out = {};
    for (const [giftId2, raw] of pairs(await store.cmd("HGETALL", "ratings"))) {
      const rating = parseJson(raw, null);
      if (rating && rating.count > 0) out[giftId2] = rating;
    }
    return out;
  };
  const refreshRating = async (giftId2) => {
    const all = pairs(await store.cmd("HGETALL", `reviews:${giftId2}`)).map(([, raw]) => parseJson(raw, null));
    const scores = all.filter((r) => r !== null).map((r) => r.rating);
    if (scores.length === 0) {
      await store.cmd("HDEL", "ratings", giftId2);
      return;
    }
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
    await store.cmd("HSET", "ratings", giftId2, JSON.stringify({ average, count: scores.length }));
  };
  const bumpSaves = async (giftId2, by) => {
    const score = Number(await store.cmd("ZINCRBY", "saves", by, giftId2));
    if (score <= 0) await store.cmd("ZREM", "saves", giftId2);
  };
  const favoritesOf = (userId) => store.cmd("SMEMBERS", `favs:${userId}`);
  const remindersOf = async (userId) => parseJson(await store.cmd("GET", `reminders:${userId}`), []);
  const giftId = (value) => {
    const id = str(value, 60);
    return /^[a-z0-9][a-z0-9-]{1,59}$/.test(id) ? id : fail(400, "bad_gift", "\u05D4\u05DE\u05EA\u05E0\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4.");
  };
  switch (key) {
    case "GET /bootstrap": {
      const [user, { catalog }, allRatings, popular] = await Promise.all([
        currentUser(),
        loadCatalog(),
        ratings(),
        store.cmd("ZRANGE", "saves", 0, 9, "REV")
      ]);
      const body = {
        storage: true,
        me: user ? toMe(user) : null,
        catalog,
        favorites: user ? await favoritesOf(user.id) : [],
        reminders: user ? await remindersOf(user.id) : [],
        ratings: allRatings,
        popular
      };
      return { status: 200, body };
    }
    case "POST /auth/register": {
      await limit(`register:${req.ip}`, 8, 3600);
      const name = str(field(req.body, "name"), 40);
      const email = str(field(req.body, "email"), 120).toLowerCase();
      const password = typeof field(req.body, "password") === "string" ? field(req.body, "password") : "";
      if (name.length < 2) fail(400, "bad_name", "\u05D0\u05D9\u05DA \u05DC\u05E7\u05E8\u05D5\u05D0 \u05DC\u05DA? \u05E6\u05E8\u05D9\u05DA \u05E9\u05DD \u05E9\u05DC \u05E9\u05EA\u05D9 \u05D0\u05D5\u05EA\u05D9\u05D5\u05EA \u05DC\u05E4\u05D7\u05D5\u05EA.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail(400, "bad_email", "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05DC\u05D0 \u05E0\u05E8\u05D0\u05D9\u05EA \u05EA\u05E7\u05D9\u05E0\u05D4.");
      if (password.length < 8 || password.length > 200) fail(400, "bad_password", "\u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05D9\u05D5\u05EA \u05D1\u05D0\u05D5\u05E8\u05DA 8 \u05EA\u05D5\u05D5\u05D9\u05DD \u05DC\u05E4\u05D7\u05D5\u05EA.");
      if (isAdminEmail(email)) {
        const code = str(field(req.body, "adminCode"), 100);
        if (!config.adminSetupCode || !code || !sameText(code, config.adminSetupCode)) {
          fail(403, "admin_code", "\u05D6\u05D5 \u05DB\u05EA\u05D5\u05D1\u05EA \u05E9\u05DC \u05DE\u05E0\u05D4\u05DC \u05E7\u05D8\u05DC\u05D5\u05D2. \u05DB\u05D3\u05D9 \u05DC\u05E4\u05EA\u05D5\u05D7 \u05D0\u05D5\u05EA\u05D4 \u05E6\u05E8\u05D9\u05DA \u05D0\u05EA \u05E7\u05D5\u05D3 \u05D4\u05D4\u05E7\u05DE\u05D4.");
        }
      }
      const user = { id: randomUUID(), name, email, salt: randomBytes(16).toString("hex"), hash: "", createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      user.hash = (await derive(password, user.salt)).toString("hex");
      const claimed = await store.cmd("SET", `email:${email}`, user.id, "NX");
      if (!claimed) fail(409, "email_taken", "\u05DB\u05D1\u05E8 \u05D9\u05E9 \u05D7\u05E9\u05D1\u05D5\u05DF \u05E2\u05DD \u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D4\u05D6\u05D4. \u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8.");
      await store.cmd("SET", `user:${user.id}`, JSON.stringify(user));
      return startSession(user);
    }
    case "POST /auth/login": {
      const email = str(field(req.body, "email"), 120).toLowerCase();
      const password = typeof field(req.body, "password") === "string" ? field(req.body, "password") : "";
      await limit(`login:${req.ip}`, 20, 600);
      await limit(`login:${sha256(email)}`, 10, 600);
      const userId = await store.cmd("GET", `email:${email}`);
      const user = userId ? parseJson(await store.cmd("GET", `user:${userId}`), null) : null;
      const derived = await derive(password, user?.salt ?? "no-such-user");
      const matches = user !== null && timingSafeEqual(derived, Buffer.from(user.hash, "hex"));
      if (!user || !matches) return fail(401, "bad_login", "\u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D0\u05D5 \u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05E9\u05D2\u05D5\u05D9\u05D9\u05DD.");
      return startSession(user);
    }
    case "POST /auth/logout": {
      const token = req.cookies[SESSION_COOKIE];
      const user = await currentUser();
      if (token) await store.cmd("DEL", `session:${sha256(token)}`);
      if (token && user) await store.cmd("SREM", `sessions:${user.id}`, sha256(token));
      return { status: 200, body: { ok: true }, cookies: [sessionCookie("", 0)] };
    }
    case "POST /account/delete": {
      const user = await requireUser();
      const password = typeof field(req.body, "password") === "string" ? field(req.body, "password") : "";
      const derived = await derive(password, user.salt);
      if (!timingSafeEqual(derived, Buffer.from(user.hash, "hex"))) fail(401, "bad_password", "\u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05E9\u05D2\u05D5\u05D9\u05D4.");
      const [favorites, sessions, reviewed] = await Promise.all([
        favoritesOf(user.id),
        store.cmd("SMEMBERS", `sessions:${user.id}`),
        store.cmd("SMEMBERS", `userreviews:${user.id}`)
      ]);
      for (const id of favorites) await bumpSaves(id, -1);
      for (const id of reviewed) {
        await store.cmd("HDEL", `reviews:${id}`, user.id);
        await refreshRating(id);
      }
      await store.pipeline([
        ...sessions.map((hashed) => ["DEL", `session:${hashed}`]),
        ["DEL", `sessions:${user.id}`, `favs:${user.id}`, `reminders:${user.id}`, `userreviews:${user.id}`, `user:${user.id}`, `email:${user.email}`]
      ]);
      return { status: 200, body: { ok: true }, cookies: [sessionCookie("", 0)] };
    }
    case "PUT /favorites": {
      const user = await requireUser();
      const incoming = field(req.body, "ids");
      const ids = Array.isArray(incoming) ? [...new Set(incoming.map((id) => str(id, 60)).filter((id) => /^[a-z0-9][a-z0-9-]{1,59}$/.test(id)))] : [];
      const current = await favoritesOf(user.id);
      const fresh = ids.filter((id) => !current.includes(id)).slice(0, Math.max(0, MAX_FAVORITES - current.length));
      for (const id of fresh) {
        await store.cmd("SADD", `favs:${user.id}`, id);
        await bumpSaves(id, 1);
      }
      return { status: 200, body: { favorites: [...current, ...fresh] } };
    }
    case "POST /favorites/toggle": {
      const user = await requireUser();
      const id = giftId(field(req.body, "id"));
      const saved = field(req.body, "saved") === true;
      if (saved) {
        const current = await favoritesOf(user.id);
        if (current.length >= MAX_FAVORITES && !current.includes(id)) fail(400, "too_many_favorites", "\u05D4\u05D2\u05E2\u05EA \u05DC\u05DE\u05E1\u05E4\u05E8 \u05D4\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD \u05D4\u05DE\u05E8\u05D1\u05D9.");
        if (await store.cmd("SADD", `favs:${user.id}`, id) === 1) await bumpSaves(id, 1);
      } else if (await store.cmd("SREM", `favs:${user.id}`, id) === 1) {
        await bumpSaves(id, -1);
      }
      return { status: 200, body: { favorites: await favoritesOf(user.id) } };
    }
    case "GET /reviews": {
      const id = giftId(req.query.get("gift"));
      const user = await currentUser();
      const admin = user !== null && isAdminEmail(user.email);
      const reviews = pairs(await store.cmd("HGETALL", `reviews:${id}`)).map(([userId, raw]) => {
        const saved = parseJson(raw, null);
        if (!saved) return null;
        const review = { ...saved, mine: userId === user?.id };
        if (admin) review.author = userId;
        return review;
      }).filter((review) => review !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { status: 200, body: { reviews } };
    }
    case "POST /reviews": {
      const user = await requireUser();
      await limit(`review:${user.id}`, 20, 3600);
      const id = giftId(field(req.body, "giftId"));
      const { catalog } = await loadCatalog();
      if (!catalog.some((gift) => gift.id === id)) fail(404, "bad_gift", "\u05D4\u05DE\u05EA\u05E0\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4.");
      const rating = Number(field(req.body, "rating"));
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail(400, "bad_rating", "\u05D1\u05D7\u05E8\u05D5 \u05D3\u05D9\u05E8\u05D5\u05D2 \u05D1\u05D9\u05DF \u05DB\u05D5\u05DB\u05D1 \u05D0\u05D7\u05D3 \u05DC\u05D7\u05DE\u05D9\u05E9\u05D4.");
      const text2 = str(field(req.body, "text"), 500);
      const review = { name: user.name, rating, text: text2, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await store.pipeline([
        ["HSET", `reviews:${id}`, user.id, JSON.stringify(review)],
        ["SADD", `userreviews:${user.id}`, id]
      ]);
      await refreshRating(id);
      return { status: 200, body: { ratings: await ratings() } };
    }
    case "POST /reviews/delete": {
      const user = await requireUser();
      const id = giftId(field(req.body, "giftId"));
      const author = str(field(req.body, "author"), 60) || user.id;
      if (author !== user.id && !isAdminEmail(user.email)) fail(403, "not_admin", "\u05D0\u05E4\u05E9\u05E8 \u05DC\u05DE\u05D7\u05D5\u05E7 \u05E8\u05E7 \u05D1\u05D9\u05E7\u05D5\u05E8\u05EA \u05E9\u05DB\u05EA\u05D1\u05EA.");
      await store.pipeline([
        ["HDEL", `reviews:${id}`, author],
        ["SREM", `userreviews:${author}`, id]
      ]);
      await refreshRating(id);
      return { status: 200, body: { ratings: await ratings() } };
    }
    case "POST /reminders": {
      const user = await requireUser();
      const name = str(field(req.body, "name"), 40);
      if (!name) fail(400, "bad_name", "\u05DC\u05DE\u05D9 \u05D4\u05EA\u05D6\u05DB\u05D5\u05E8\u05EA? \u05D7\u05E1\u05E8 \u05E9\u05DD.");
      const occasion = field(req.body, "occasion");
      if (typeof occasion !== "string" || !(occasion in OCCASIONS)) fail(400, "bad_occasion", "\u05E6\u05E8\u05D9\u05DA \u05DC\u05D1\u05D7\u05D5\u05E8 \u05E1\u05D5\u05D2 \u05D0\u05D9\u05E8\u05D5\u05E2.");
      const relationRaw = field(req.body, "relation");
      const relation = typeof relationRaw === "string" && relationRaw in RELATIONS ? relationRaw : null;
      const date = str(field(req.body, "date"), 10);
      const parsed = /* @__PURE__ */ new Date(`${date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        fail(400, "bad_date", "\u05D4\u05EA\u05D0\u05E8\u05D9\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF.");
      }
      const reminders = await remindersOf(user.id);
      if (reminders.length >= MAX_REMINDERS) fail(400, "too_many_reminders", "\u05D4\u05D2\u05E2\u05EA \u05DC\u05DE\u05E1\u05E4\u05E8 \u05D4\u05EA\u05D6\u05DB\u05D5\u05E8\u05D5\u05EA \u05D4\u05DE\u05E8\u05D1\u05D9.");
      const reminder = { id: randomUUID(), name, occasion, relation, date, yearly: field(req.body, "yearly") !== false };
      const next = [...reminders, reminder];
      await store.cmd("SET", `reminders:${user.id}`, JSON.stringify(next));
      return { status: 200, body: { reminders: next } };
    }
    case "POST /reminders/delete": {
      const user = await requireUser();
      const id = str(field(req.body, "id"), 60);
      const next = (await remindersOf(user.id)).filter((reminder) => reminder.id !== id);
      await store.cmd("SET", `reminders:${user.id}`, JSON.stringify(next));
      return { status: 200, body: { reminders: next } };
    }
    case "PUT /admin/gift": {
      await requireAdmin();
      const parsed = parseGift(field(req.body, "gift"));
      if ("error" in parsed) return fail(400, "bad_gift", parsed.error);
      const { catalog } = await loadCatalog();
      const exists = catalog.some((gift) => gift.id === parsed.gift.id);
      if (!exists && field(req.body, "isNew") !== true) fail(404, "bad_gift", "\u05D4\u05DE\u05D5\u05E6\u05E8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D1\u05E7\u05D8\u05DC\u05D5\u05D2.");
      if (exists && field(req.body, "isNew") === true) fail(409, "id_taken", "\u05DB\u05D1\u05E8 \u05D9\u05E9 \u05DE\u05D5\u05E6\u05E8 \u05E2\u05DD \u05D4\u05DE\u05D6\u05D4\u05D4 \u05D4\u05D6\u05D4.");
      if (!exists && catalog.length >= MAX_CATALOG) fail(400, "catalog_full", "\u05D4\u05E7\u05D8\u05DC\u05D5\u05D2 \u05DE\u05DC\u05D0.");
      const next = exists ? catalog.map((gift) => gift.id === parsed.gift.id ? parsed.gift : gift) : [parsed.gift, ...catalog];
      await store.cmd("SET", "catalog", JSON.stringify(next));
      return { status: 200, body: { catalog: next } };
    }
    case "POST /admin/gift/delete": {
      await requireAdmin();
      const id = giftId(field(req.body, "id"));
      const { catalog } = await loadCatalog();
      const next = catalog.filter((gift) => gift.id !== id);
      await store.pipeline([
        ["SET", "catalog", JSON.stringify(next)],
        ["ZREM", "saves", id],
        ["HDEL", "ratings", id],
        ["DEL", `reviews:${id}`]
      ]);
      return { status: 200, body: { catalog: next } };
    }
    case "POST /admin/reset": {
      await requireAdmin();
      await store.cmd("DEL", "catalog");
      return { status: 200, body: { catalog: config.seed } };
    }
    default:
      return fail(404, "not_found", "\u05D4\u05DB\u05EA\u05D5\u05D1\u05EA \u05DC\u05D0 \u05E7\u05D9\u05D9\u05DE\u05EA.");
  }
}

// server/store.ts
var UpstashStore = class {
  constructor(url, token) {
    this.url = url;
    this.token = token;
  }
  async post(path, body) {
    const response = await fetch(this.url.replace(/\/$/, "") + path, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`storage request failed with ${response.status}`);
    return response.json();
  }
  async cmd(...args) {
    const reply = await this.post("", args);
    if (reply.error) throw new Error(reply.error);
    return reply.result;
  }
  async pipeline(commands) {
    if (commands.length === 0) return [];
    const replies = await this.post("/pipeline", commands);
    return replies.map((reply) => {
      if (reply.error) throw new Error(reply.error);
      return reply.result;
    });
  }
};
var MemoryStore = class {
  constructor() {
    this.data = /* @__PURE__ */ new Map();
  }
  entry(key) {
    const found = this.data.get(key);
    if (found?.expires && found.expires <= Date.now()) {
      this.data.delete(key);
      return void 0;
    }
    return found;
  }
  make(key, create, zset = false) {
    const found = this.entry(key);
    if (found) return found.value;
    const value = create();
    this.data.set(key, { value, zset });
    return value;
  }
  async cmd(...args) {
    const [name, key, ...rest] = args.map(String);
    const reply = (value) => value;
    switch (name.toUpperCase()) {
      case "GET": {
        const found = this.entry(key);
        return reply(typeof found?.value === "string" ? found.value : null);
      }
      case "SET": {
        const exIndex = rest.findIndex((arg) => arg.toUpperCase() === "EX");
        if (rest.some((arg) => arg.toUpperCase() === "NX") && this.entry(key)) return reply(null);
        const expires = exIndex >= 0 ? Date.now() + Number(rest[exIndex + 1]) * 1e3 : void 0;
        this.data.set(key, { value: rest[0], expires });
        return reply("OK");
      }
      case "DEL": {
        let removed = 0;
        for (const k of [key, ...rest]) if (this.entry(k) && this.data.delete(k)) removed++;
        return reply(removed);
      }
      case "EXISTS":
        return reply(this.entry(key) ? 1 : 0);
      case "INCR": {
        const found = this.entry(key);
        const next = Number(typeof found?.value === "string" ? found.value : 0) + 1;
        this.data.set(key, { value: String(next), expires: found?.expires });
        return reply(next);
      }
      case "EXPIRE": {
        const found = this.entry(key);
        if (!found) return reply(0);
        found.expires = Date.now() + Number(rest[0]) * 1e3;
        return reply(1);
      }
      case "SADD": {
        const set = this.make(key, () => /* @__PURE__ */ new Set());
        let added = 0;
        for (const member of rest) if (!set.has(member) && set.add(member)) added++;
        return reply(added);
      }
      case "SREM": {
        const set = this.entry(key)?.value;
        let removed = 0;
        for (const member of rest) if (set?.delete(member)) removed++;
        return reply(removed);
      }
      case "SMEMBERS":
        return reply([...this.entry(key)?.value ?? []]);
      case "HSET": {
        const hash = this.make(key, () => /* @__PURE__ */ new Map());
        for (let i = 0; i < rest.length; i += 2) hash.set(rest[i], rest[i + 1]);
        return reply(rest.length / 2);
      }
      case "HGET":
        return reply(this.entry(key)?.value?.get(rest[0]) ?? null);
      case "HDEL":
        return reply(this.entry(key)?.value?.delete(rest[0]) ? 1 : 0);
      case "HGETALL": {
        const hash = this.entry(key)?.value;
        return reply(hash ? [...hash.entries()].flat() : []);
      }
      case "ZINCRBY": {
        const zset = this.make(key, () => /* @__PURE__ */ new Map(), true);
        const next = (zset.get(rest[1]) ?? 0) + Number(rest[0]);
        zset.set(rest[1], next);
        return reply(String(next));
      }
      case "ZRANGE": {
        const zset = this.entry(key)?.value ?? /* @__PURE__ */ new Map();
        const sorted = [...zset.entries()].sort((a, b) => a[1] - b[1]);
        if (rest.some((arg) => arg.toUpperCase() === "REV")) sorted.reverse();
        const stop = Number(rest[1]);
        return reply(sorted.slice(Number(rest[0]), stop < 0 ? void 0 : stop + 1).map(([member]) => member));
      }
      case "ZREM":
        return reply(this.entry(key)?.value?.delete(rest[0]) ? 1 : 0);
      default:
        throw new Error(`MemoryStore: unsupported command ${name}`);
    }
  }
  async pipeline(commands) {
    const replies = [];
    for (const command of commands) replies.push(await this.cmd(...command));
    return replies;
  }
};
var globals = globalThis;
function storeFromEnv(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new UpstashStore(url, token);
  if (env.VERCEL) return null;
  return globals.__giftfitMemoryStore ??= new MemoryStore();
}

// server/index.ts
var MAX_BODY = 64 * 1024;
async function readBody(req) {
  if (req.body !== void 0) return typeof req.body === "string" ? safeJson(req.body) : req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) return void 0;
    chunks.push(chunk);
  }
  return chunks.length ? safeJson(Buffer.concat(chunks).toString("utf8")) : void 0;
}
function safeJson(text2) {
  try {
    return JSON.parse(text2);
  } catch {
    return void 0;
  }
}
function parseCookies(header) {
  const cookies = {};
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}
var first = (value) => Array.isArray(value) ? value[0] : value;
async function handler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const forwarded = first(req.headers["x-forwarded-for"])?.split(",")[0].trim();
  const request = {
    method: (req.method ?? "GET").toUpperCase(),
    path: url.pathname.replace(/^\/api/, "") || "/",
    query: url.searchParams,
    body: req.method === "GET" ? void 0 : await readBody(req),
    cookies: parseCookies(req.headers.cookie),
    ip: forwarded || req.socket.remoteAddress || "unknown",
    origin: first(req.headers.origin),
    host: first(req.headers["x-forwarded-host"]) ?? req.headers.host,
    contentType: req.headers["content-type"],
    secure: first(req.headers["x-forwarded-proto"]) === "https"
  };
  const response = await handle(request, storeFromEnv(), {
    seed: SEED_CATALOG,
    adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
    adminSetupCode: process.env.ADMIN_SETUP_CODE || void 0
  });
  res.statusCode = response.status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  if (response.cookies?.length) res.setHeader("set-cookie", response.cookies);
  res.end(JSON.stringify(response.body));
}
export {
  handler as default
};
