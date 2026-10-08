// World currency list with fixed fallback rates (per 1 USD).
// Live rates come from Binance P2P (USDT sell price in local fiat) when available;
// otherwise the fixed fallback rate below is used.

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  fallbackRate: number; // local units per 1 USD
}

// [code, name, symbol, fallbackRate per USD]
const CURRENCY_ROWS: [string, string, string, number][] = [
  ["USD", "US Dollar", "$", 1],
  ["BDT", "Bangladeshi Taka", "৳", 127],
  ["INR", "Indian Rupee", "₹", 88],
  ["PKR", "Pakistani Rupee", "₨", 285],
  ["BRL", "Brazilian Real", "R$", 5.7],
  ["EUR", "Euro", "€", 0.92],
  ["GBP", "British Pound", "£", 0.79],
  ["AED", "UAE Dirham", "د.إ", 3.67],
  ["SAR", "Saudi Riyal", "﷼", 3.75],
  ["TRY", "Turkish Lira", "₺", 41],
  ["NGN", "Nigerian Naira", "₦", 1550],
  ["IDR", "Indonesian Rupiah", "Rp", 16500],
  ["PHP", "Philippine Peso", "₱", 58],
  ["VND", "Vietnamese Dong", "₫", 25500],
  ["THB", "Thai Baht", "฿", 36],
  ["MYR", "Malaysian Ringgit", "RM", 4.7],
  ["EGP", "Egyptian Pound", "E£", 50],
  ["KES", "Kenyan Shilling", "KSh", 129],
  ["ZAR", "South African Rand", "R", 18],
  ["ARS", "Argentine Peso", "$", 1200],
  ["MXN", "Mexican Peso", "$", 20],
  ["COP", "Colombian Peso", "$", 4300],
  ["CLP", "Chilean Peso", "$", 950],
  ["PEN", "Peruvian Sol", "S/", 3.8],
  ["CAD", "Canadian Dollar", "C$", 1.42],
  ["AUD", "Australian Dollar", "A$", 1.55],
  ["NZD", "New Zealand Dollar", "NZ$", 1.7],
  ["JPY", "Japanese Yen", "¥", 155],
  ["CNY", "Chinese Yuan", "¥", 7.3],
  ["KRW", "South Korean Won", "₩", 1450],
  ["HKD", "Hong Kong Dollar", "HK$", 7.8],
  ["SGD", "Singapore Dollar", "S$", 1.35],
  ["TWD", "Taiwan Dollar", "NT$", 32],
  ["RUB", "Russian Ruble", "₽", 95],
  ["UAH", "Ukrainian Hryvnia", "₴", 42],
  ["PLN", "Polish Zloty", "zł", 4.0],
  ["CZK", "Czech Koruna", "Kč", 23.5],
  ["HUF", "Hungarian Forint", "Ft", 395],
  ["RON", "Romanian Leu", "lei", 4.6],
  ["BGN", "Bulgarian Lev", "лв", 1.8],
  ["SEK", "Swedish Krona", "kr", 10.5],
  ["NOK", "Norwegian Krone", "kr", 11],
  ["DKK", "Danish Krone", "kr", 6.9],
  ["CHF", "Swiss Franc", "CHF", 0.88],
  ["QAR", "Qatari Riyal", "﷼", 3.64],
  ["KWD", "Kuwaiti Dinar", "د.ك", 0.31],
  ["BHD", "Bahraini Dinar", ".د.ب", 0.38],
  ["OMR", "Omani Rial", "﷼", 0.38],
  ["JOD", "Jordanian Dinar", "د.ا", 0.71],
  ["LBP", "Lebanese Pound", "ل.ل", 89500],
  ["IQD", "Iraqi Dinar", "ع.د", 1310],
  ["IRR", "Iranian Rial", "﷼", 42000],
  ["AFN", "Afghan Afghani", "؋", 70],
  ["NPR", "Nepalese Rupee", "₨", 140],
  ["LKR", "Sri Lankan Rupee", "Rs", 300],
  ["MMK", "Myanmar Kyat", "K", 2100],
  ["KHR", "Cambodian Riel", "៛", 4100],
  ["LAK", "Lao Kip", "₭", 22000],
  ["MNT", "Mongolian Tugrik", "₮", 3400],
  ["KZT", "Kazakhstani Tenge", "₸", 500],
  ["UZS", "Uzbekistani Som", "so'm", 12800],
  ["AZN", "Azerbaijani Manat", "₼", 1.7],
  ["GEL", "Georgian Lari", "₾", 2.7],
  ["AMD", "Armenian Dram", "֏", 390],
  ["BYN", "Belarusian Ruble", "Br", 3.3],
  ["MDL", "Moldovan Leu", "L", 18],
  ["RSD", "Serbian Dinar", "дин", 108],
  ["MKD", "Macedonian Denar", "ден", 56],
  ["ALL", "Albanian Lek", "L", 95],
  ["BAM", "Bosnia Convertible Mark", "KM", 1.8],
  ["ISK", "Icelandic Krona", "kr", 138],
  ["GHS", "Ghanaian Cedi", "₵", 15.5],
  ["TZS", "Tanzanian Shilling", "TSh", 2650],
  ["UGX", "Ugandan Shilling", "USh", 3700],
  ["ETB", "Ethiopian Birr", "Br", 125],
  ["RWF", "Rwandan Franc", "FRw", 1450],
  ["ZMW", "Zambian Kwacha", "ZK", 27],
  ["BWP", "Botswana Pula", "P", 13.5],
  ["MZN", "Mozambican Metical", "MT", 64],
  ["AOA", "Angolan Kwanza", "Kz", 950],
  ["XOF", "West African CFA", "CFA", 600],
  ["XAF", "Central African CFA", "FCFA", 600],
  ["MAD", "Moroccan Dirham", "د.م.", 10],
  ["DZD", "Algerian Dinar", "د.ج", 135],
  ["TND", "Tunisian Dinar", "د.ت", 3.2],
  ["LYD", "Libyan Dinar", "ل.د", 4.9],
  ["SDG", "Sudanese Pound", "ج.س.", 600],
  ["SOS", "Somali Shilling", "Sh", 570],
  ["YER", "Yemeni Rial", "﷼", 250],
  ["SYP", "Syrian Pound", "£S", 13000],
  ["DOP", "Dominican Peso", "RD$", 62],
  ["GTQ", "Guatemalan Quetzal", "Q", 7.8],
  ["HNL", "Honduran Lempira", "L", 26],
  ["NIO", "Nicaraguan Cordoba", "C$", 37],
  ["CRC", "Costa Rican Colon", "₡", 510],
  ["PAB", "Panamanian Balboa", "B/.", 1],
  ["JMD", "Jamaican Dollar", "J$", 160],
  ["TTD", "Trinidad Dollar", "TT$", 6.8],
  ["BSD", "Bahamian Dollar", "B$", 1],
  ["BBD", "Barbadian Dollar", "Bds$", 2],
  ["XCD", "East Caribbean Dollar", "EC$", 2.7],
  ["HTG", "Haitian Gourde", "G", 132],
  ["CUP", "Cuban Peso", "$", 24],
  ["BOB", "Bolivian Boliviano", "Bs", 6.9],
  ["PYG", "Paraguayan Guarani", "₲", 7800],
  ["UYU", "Uruguayan Peso", "$U", 42],
  ["VES", "Venezuelan Bolivar", "Bs.S", 90],
  ["GYD", "Guyanese Dollar", "G$", 209],
  ["SRD", "Surinamese Dollar", "SRD", 36],
  ["FKP", "Falkland Pound", "£", 0.79],
  ["FJD", "Fijian Dollar", "FJ$", 2.3],
  ["PGK", "Papua New Guinean Kina", "K", 4.0],
  ["SBD", "Solomon Islands Dollar", "SI$", 8.5],
  ["VUV", "Vanuatu Vatu", "VT", 120],
  ["WST", "Samoan Tala", "T", 2.8],
  ["TOP", "Tongan Paanga", "T$", 2.4],
  ["MVR", "Maldivian Rufiyaa", "Rf", 15.4],
  ["BTN", "Bhutanese Ngultrum", "Nu", 88],
  ["BND", "Brunei Dollar", "B$", 1.35],
  ["BMD", "Bermudian Dollar", "BD$", 1],
  ["KYD", "Cayman Islands Dollar", "CI$", 0.83],
  ["AWG", "Aruban Florin", "ƒ", 1.8],
  ["ANG", "Netherlands Antillean Guilder", "ƒ", 1.8],
  ["BAM2", "placeholder-unused", "", 0],
  ["CVE", "Cape Verdean Escudo", "$", 102],
  ["STN", "Sao Tome Dobra", "Db", 23],
  ["GMD", "Gambian Dalasi", "D", 72],
  ["GNF", "Guinean Franc", "FG", 8600],
  ["SLE", "Sierra Leonean Leone", "Le", 23],
  ["LRD", "Liberian Dollar", "L$", 195],
  ["MRU", "Mauritanian Ouguiya", "UM", 40],
  ["MGA", "Malagasy Ariary", "Ar", 4600],
  ["MUR", "Mauritian Rupee", "₨", 46],
  ["SCR", "Seychellois Rupee", "₨", 14],
  ["KMF", "Comorian Franc", "CF", 450],
  ["DJF", "Djiboutian Franc", "Fdj", 178],
  ["ERN", "Eritrean Nakfa", "Nfk", 15],
  ["SZL", "Eswatini Lilangeni", "E", 18],
  ["LSL", "Lesotho Loti", "L", 18],
  ["NAD", "Namibian Dollar", "N$", 18],
  ["MWK", "Malawian Kwacha", "MK", 1750],
  ["CDF", "Congolese Franc", "FC", 2850],
  ["BIF", "Burundian Franc", "FBu", 2900],
  ["TJS", "Tajikistani Somoni", "ЅМ", 10.7],
  ["TMT", "Turkmenistani Manat", "m", 3.5],
  ["KGS", "Kyrgyzstani Som", "с", 87],
];

export const CURRENCIES: CurrencyInfo[] = CURRENCY_ROWS
  .filter(([code]) => code !== "BAM2")
  .map(([code, name, symbol, fallbackRate]) => ({ code, name, symbol, fallbackRate }));

export const getCurrency = (code: string): CurrencyInfo =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

// Fiats commonly available on Binance P2P. Others use the fixed fallback rate.
const BINANCE_P2P_FIATS = new Set([
  "BDT", "INR", "PKR", "BRL", "EUR", "GBP", "NGN", "IDR", "PHP", "VND",
  "THB", "MYR", "EGP", "KES", "ZAR", "ARS", "MXN", "COP", "RUB", "UAH",
  "TRY", "AED", "SAR", "JPY", "KRW", "HKD", "TWD", "CAD", "AUD", "PLN",
  "CZK", "HUF", "RON", "SEK", "NOK", "DKK", "CHF", "QAR", "KWD", "LKR",
  "NPR", "KZT", "UZS", "GEL", "GHS", "TZS", "UGX", "MAD", "DZD", "TND",
  "DOP", "GTQ", "PEN", "CLP", "BOB", "PYG", "UYU", "JMD", "PAB", "MMK",
  "KHR", "LAK", "AZN", "BYN", "RSD", "XOF", "XAF",
]);

const rateCache: Record<string, { rate: number; at: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the local-currency rate per 1 USD/USDT.
 * Tries Binance P2P live sell price first; falls back to the fixed rate.
 */
export async function getUsdRate(code: string): Promise<{ rate: number; source: "binance" | "fixed" }> {
  const info = getCurrency(code);
  if (code === "USD") return { rate: 1, source: "fixed" };

  const cached = rateCache[code];
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return { rate: cached.rate, source: "binance" };
  }

  if (BINANCE_P2P_FIATS.has(code)) {
    try {
      const res = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiat: code,
          page: 1,
          rows: 3,
          tradeType: "SELL",
          asset: "USDT",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const prices: number[] = (json?.data ?? [])
          .map((d: any) => parseFloat(d?.adv?.price))
          .filter((p: number) => Number.isFinite(p) && p > 0);
        if (prices.length > 0) {
          // Use the cheapest available sell price (what a buyer actually pays).
          const rate = Math.min(...prices);
          rateCache[code] = { rate, at: Date.now() };
          return { rate, source: "binance" };
        }
      }
    } catch {
      // network/CORS failure — use fixed fallback below
    }
  }

  return { rate: info.fallbackRate, source: "fixed" };
}

export function formatLocalAmount(usdAmount: number, code: string, rate: number): string {
  const info = getCurrency(code);
  const value = usdAmount * rate;
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
  return `${info.symbol}${rounded.toLocaleString()} ${info.code}`;
}
