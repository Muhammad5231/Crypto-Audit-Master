/**
 * India Crypto Tax Configuration
 * 
 * These are the default rates for Indian VDA (Virtual Digital Asset) taxation.
 * Rates can be updated here for future changes.
 */
export const TAX_CONFIG = {
  // Base VDA tax rate
  BASE_CRYPTO_TAX: 0.30, // 30%

  // Health and Education Cess on base tax
  CESS_RATE: 0.04, // 4% of base tax

  // TDS (Tax Deducted at Source) on sell value
  TDS_RATE: 0.01, // 1%

  // GST on exchange fees
  GST_RATE: 0.18, // 18%

  // Decimal precision for calculations
  DECIMAL_PLACES: 2,

  // Default fee percentages if not set per exchange
  DEFAULT_BUY_FEE: 0.001, // 0.1%
  DEFAULT_SELL_FEE: 0.001, // 0.1%,

  DISCLAIMER: "This tool is for operational review and audit visibility only. It does not replace professional tax advice. Please consult a qualified Chartered Accountant for your tax filings.",

  FINANCIAL_YEARS: [
    "2020-2021",
    "2021-2022",
    "2022-2023",
    "2023-2024",
    "2024-2025",
    "2025-2026",
  ],
};
