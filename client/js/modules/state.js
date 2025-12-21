// state.js - Centralized state management

export const state = {
  headliners: {},
  localDJs: {},
  cdjs: {},
  showRunners: {},
  otherCats: {},
  vendors: {},
  chartExpenses: null,
  chartSales: null
};

export const CSV_META = {
  key: "XODIA_BUDGET_VERSION",
  version: 3
};

export const FIELDS = {
  basic: {
    showTitle: { id: "showTitle", label: "Show Title", csv: "Show Title" },
    showDate: { id: "showDate", label: "Show Date", csv: "Show Date" }
  },
  production: {
    vjFee: { id: "vjFee", label: "VJ Fee", csv: "VJ Fee" },
    venue: { id: "venue", label: "Venue", csv: "Venue" },
    ledWall: { id: "ledWall", label: "LED Wall", csv: "LED Wall" },
    lights: { id: "lights", label: "Lights", csv: "Lights" },
    lasers: { id: "lasers", label: "Lasers", csv: "Lasers" }
  },
  gear: {
    sound: { id: "sound", label: "Sound", csv: "Sound" },
    mixer: { id: "mixer", label: "Mixer", csv: "Mixer" },
    table: { id: "table", label: "Table", csv: "Table" }
  },
  marketing: {
    facebookAdsXodia: { id: "facebookAdsXodia", label: "Facebook Ads (XODIA)", csv: "Facebook Ads XODIA" },
    facebookAdsSpaceCampHQ: { id: "facebookAdsSpaceCampHQ", label: "Facebook Ads (SPACE CAMP HQ)", csv: "Facebook Ads SPACE CAMP HQ" },
    instagramAdsXodia: { id: "instagramAdsXodia", label: "Instagram Ads (XODIA)", csv: "Instagram Ads XODIA" },
    instagramAdsSpaceCampHQ: { id: "instagramAdsSpaceCampHQ", label: "Instagram Ads (SPACE CAMP HQ)", csv: "Instagram Ads SPACE CAMP HQ" },
    physicalFlyers: { id: "physicalFlyers", label: "Physical Flyers", csv: "Physical Flyers" },
    eventbriteAds: { id: "eventbriteAds", label: "Eventbrite Ads", csv: "Eventbrite Ads" }
  },
  staff: {
    doorStaff: { id: "doorStaff", label: "Door Staff", csv: "Door Staff" },
    merchTable: { id: "merchTable", label: "Merch Table", csv: "Merch Table" },
    transportation: { id: "transportation", label: "Transportation", csv: "Transportation" }
  },
  sales: {
    eventbriteSales: { id: "eventbriteSales", label: "Eventbrite Sales", csv: "Eventbrite Sales" },
    djPresales: { id: "djPresales", label: "DJ Presales", csv: "DJ Presales" },
    promoTeam: { id: "promoTeam", label: "Promo Team", csv: "Promo Team" },
    doorSales: { id: "doorSales", label: "Door Sales", csv: "Door Sales" },
    merchSold: { id: "merchSold", label: "Merch Sold", csv: "Merch Sold" }
  }
};

export const CSV_ALIASES = {
  "Flyer Cost": "Physical Flyers",
  "Physical Flyer Cost": "Physical Flyers",
  "Flyers": "Physical Flyers"
};

export function collectCsvFields(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node)) {
    node.forEach(v => collectCsvFields(v, out));
    return out;
  }
  if (typeof node === "object") {
    if (node.id && node.csv) {
      out.push(node);
      return out;
    }
    Object.values(node).forEach(v => collectCsvFields(v, out));
  }
  return out;
}

export const CSV_FIELD_BY_LABEL = (() => {
  const fields = collectCsvFields(FIELDS);
  const map = {};
  fields.forEach(f => { map[f.csv] = f; });
  return map;
})();