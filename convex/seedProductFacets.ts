/**
 * What the hundred things are, past their names.
 *
 * Five things per product: what it costs relative to its own shelf, the year
 * it arrived, the form it takes, whose name is on it, and the ecosystem it
 * locks you into when it does. Everything else on a product's facets — its
 * region, its era, how far the argument about it reaches — is derived in
 * `backfill.markFacets` from these and from the votes themselves.
 *
 * `p` is a band and not a price. A Rolex and a Vision Pro are both luxuries
 * and a Corolla and a pair of Crocs are both budget, and a board that groups
 * on "is this dear for what it is" says something a board of currency cannot.
 *
 * Keyed on the question, for the same reason as `seedPeopleFacets.ts`: the
 * question is what the batch writes and what the importer slugs.
 */

export type ProductFacet = {
  /** Dear or cheap *for its own shelf*, not in money. */
  p: "free" | "budget" | "mid" | "premium" | "luxury";
  /** The year the thing arrived, where it is one thing with one date. */
  y?: number;
  /** What shape it takes: phone, car, console, shoe. */
  f: string;
  /** Whose name is on it, where one name is on it. */
  b?: string;
  /** The ecosystem it belongs to, where belonging is the point. */
  e?: string;
};

export const PRODUCT_FACETS: Record<string, ProductFacet> = {
  "The iPhone?": { p: "premium", y: 2007, f: "phone", b: "Apple", e: "ios" },
  "Samsung Galaxy S series?": { p: "premium", y: 2010, f: "phone", b: "Samsung", e: "android" },
  "Google Pixel?": { p: "premium", y: 2016, f: "phone", b: "Google", e: "android" },
  "Huawei phones?": { p: "mid", y: 2003, f: "phone", b: "Huawei", e: "android" },
  "Xiaomi phones?": { p: "budget", y: 2011, f: "phone", b: "Xiaomi", e: "android" },
  "Nothing Phone?": { p: "mid", y: 2022, f: "phone", b: "Nothing", e: "android" },
  "Folding phones?": { p: "luxury", y: 2019, f: "phone" },
  "BlackBerry?": { p: "premium", y: 1999, f: "phone", b: "BlackBerry" },
  "Nokia 3310?": { p: "budget", y: 2000, f: "phone", b: "Nokia" },
  "Phone cases?": { p: "budget", f: "accessory" },
  "MacBook?": { p: "premium", y: 2006, f: "laptop", b: "Apple", e: "macos" },
  "ThinkPad?": { p: "premium", y: 1992, f: "laptop", b: "Lenovo", e: "windows" },
  "Chromebooks?": { p: "budget", y: 2011, f: "laptop", b: "Google", e: "chromeos" },
  "Gaming PCs?": { p: "luxury", f: "desktop", e: "windows" },
  "Steam Deck?": { p: "mid", y: 2022, f: "console", b: "Valve", e: "steamos" },
  "Raspberry Pi?": { p: "budget", y: 2012, f: "computer", b: "Raspberry Pi", e: "linux" },
  "Mechanical keyboards?": { p: "mid", f: "accessory" },
  "Apple Silicon?": { p: "premium", y: 2020, f: "chip", b: "Apple", e: "macos" },
  "NVIDIA graphics cards?": { p: "luxury", y: 1999, f: "chip", b: "Nvidia" },
  "Windows 11?": { p: "free", y: 2021, f: "software", b: "Microsoft", e: "windows" },
  "Linux on the desktop?": { p: "free", y: 1991, f: "software", e: "linux" },
  "Tesla Model 3?": { p: "premium", y: 2017, f: "car", b: "Tesla" },
  "Cybertruck?": { p: "luxury", y: 2023, f: "car", b: "Tesla" },
  "BYD cars?": { p: "mid", y: 2003, f: "car", b: "BYD" },
  "Toyota Corolla?": { p: "budget", y: 1966, f: "car", b: "Toyota" },
  "Toyota Hilux?": { p: "mid", y: 1968, f: "car", b: "Toyota" },
  "Porsche 911?": { p: "luxury", y: 1964, f: "car", b: "Porsche" },
  "Jeep Wrangler?": { p: "premium", y: 1986, f: "car", b: "Jeep" },
  "Land Rover Defender?": { p: "luxury", y: 1983, f: "car", b: "Land Rover" },
  "Volkswagen Golf GTI?": { p: "mid", y: 1976, f: "car", b: "Volkswagen" },
  "Giant SUVs?": { p: "premium", f: "car" },
  "Pickup trucks?": { p: "premium", f: "car" },
  "Electric vehicles?": { p: "premium", f: "car" },
  "Self-driving cars?": { p: "luxury", f: "car" },
  "AirPods?": { p: "premium", y: 2016, f: "headphones", b: "Apple", e: "ios" },
  "Noise-cancelling headphones?": { p: "premium", f: "headphones" },
  "Vinyl records?": { p: "mid", y: 1948, f: "media" },
  "Bluetooth speakers?": { p: "budget", f: "speaker" },
  "Turntables?": { p: "mid", f: "audio" },
  "PlayStation 5?": { p: "premium", y: 2020, f: "console", b: "Sony", e: "playstation" },
  "Xbox Series X?": { p: "premium", y: 2020, f: "console", b: "Microsoft", e: "xbox" },
  "Nintendo Switch?": { p: "mid", y: 2017, f: "console", b: "Nintendo", e: "nintendo" },
  "Game Boy?": { p: "budget", y: 1989, f: "console", b: "Nintendo", e: "nintendo" },
  "Nintendo 64?": { p: "mid", y: 1996, f: "console", b: "Nintendo", e: "nintendo" },
  "Virtual reality headsets?": { p: "premium", f: "headset" },
  "Apple Vision Pro?": { p: "luxury", y: 2024, f: "headset", b: "Apple", e: "visionos" },
  "Meta Quest?": { p: "mid", y: 2019, f: "headset", b: "Meta", e: "quest" },
  "Loot boxes?": { p: "free", f: "software" },
  "DJI drones?": { p: "premium", y: 2013, f: "drone", b: "DJI" },
  "Fujifilm X100?": { p: "luxury", y: 2011, f: "camera", b: "Fujifilm" },
  "Polaroid cameras?": { p: "mid", y: 1948, f: "camera", b: "Polaroid" },
  "Canon DSLRs?": { p: "premium", y: 2000, f: "camera", b: "Canon" },
  "Apple Watch?": { p: "premium", y: 2015, f: "watch", b: "Apple", e: "ios" },
  "Oura Ring?": { p: "premium", y: 2015, f: "wearable", b: "Oura" },
  "Garmin watches?": { p: "premium", y: 2003, f: "watch", b: "Garmin" },
  "Smart glasses?": { p: "premium", y: 2013, f: "wearable" },
  "Fitness trackers?": { p: "mid", f: "wearable" },
  "Dyson vacuums?": { p: "luxury", y: 1993, f: "appliance", b: "Dyson" },
  "Robot vacuums?": { p: "premium", y: 2002, f: "appliance" },
  "Air fryers?": { p: "budget", y: 2010, f: "appliance" },
  "Nespresso pods?": { p: "mid", y: 1986, f: "appliance", b: "Nespresso" },
  "Instant Pot?": { p: "mid", y: 2010, f: "appliance", b: "Instant Pot" },
  "Smart fridges?": { p: "luxury", y: 2016, f: "appliance" },
  "Cast iron pans?": { p: "budget", f: "cookware" },
  "Non-stick pans?": { p: "budget", y: 1954, f: "cookware" },
  "ChatGPT?": { p: "free", y: 2022, f: "software", b: "OpenAI" },
  "Amazon Alexa?": { p: "budget", y: 2014, f: "speaker", b: "Amazon", e: "alexa" },
  "Ring doorbells?": { p: "mid", y: 2013, f: "camera", b: "Ring", e: "alexa" },
  "Smart thermostats?": { p: "premium", y: 2011, f: "appliance" },
  "The Kindle?": { p: "mid", y: 2007, f: "reader", b: "Amazon", e: "kindle" },
  "E-ink tablets?": { p: "luxury", f: "reader" },
  "Printers?": { p: "budget", f: "appliance" },
  "Fax machines?": { p: "budget", y: 1964, f: "appliance" },
  "Standing desks?": { p: "premium", f: "furniture" },
  "Herman Miller Aeron chair?": { p: "luxury", y: 1994, f: "furniture", b: "Herman Miller" },
  "Open-plan offices?": { p: "free", f: "workplace" },
  "IKEA furniture?": { p: "budget", y: 1943, f: "furniture", b: "IKEA" },
  "Wearing Crocs?": { p: "budget", y: 2002, f: "shoe", b: "Crocs" },
  "Air Jordans?": { p: "premium", y: 1985, f: "shoe", b: "Nike" },
  "Birkenstocks?": { p: "mid", y: 1774, f: "shoe", b: "Birkenstock" },
  "Fast fashion?": { p: "budget", f: "clothing" },
  "Rolex watches?": { p: "luxury", y: 1905, f: "watch", b: "Rolex" },
  "Lego bricks?": { p: "mid", y: 1958, f: "toy", b: "Lego" },
  "Barbie dolls?": { p: "budget", y: 1959, f: "toy", b: "Mattel" },
  "Bicycles?": { p: "mid", y: 1817, f: "vehicle" },
  "Electric scooters?": { p: "mid", f: "vehicle" },
  "Electric bikes?": { p: "premium", f: "vehicle" },
  "Motorcycles?": { p: "premium", y: 1885, f: "vehicle" },
  "Harley-Davidson?": { p: "luxury", y: 1903, f: "vehicle", b: "Harley-Davidson" },
  "Airbus A380?": { p: "luxury", y: 2005, f: "aircraft", b: "Airbus" },
  "Boeing 737 MAX?": { p: "luxury", y: 2017, f: "aircraft", b: "Boeing" },
  "Concorde?": { p: "luxury", y: 1969, f: "aircraft" },
  "Cruise ships?": { p: "luxury", f: "vessel" },
  "Bottled water?": { p: "budget", f: "drink" },
  "Energy drinks?": { p: "budget", y: 1987, f: "drink" },
  "Coca-Cola?": { p: "budget", y: 1886, f: "drink", b: "Coca-Cola" },
  "Vape pens?": { p: "budget", y: 2003, f: "drug" },
  "Smart TVs?": { p: "mid", y: 2008, f: "television" },
  "OLED televisions?": { p: "luxury", y: 2013, f: "television" },
  "Projectors?": { p: "premium", f: "television" },
};
