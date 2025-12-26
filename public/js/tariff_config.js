// ==========================================
// 1. STANDARD TARIFF DATA (Domestik Am)
// ==========================================
const STANDARD_TIERS = [
    {
        name: "1,500 kWh and below",
        subtext: "Low Usage Tier",
        limit: 1500,
        energy: 27.03,
        capacity: 4.55,
        network: 12.85,
        totalColorClass: "text-blue-600",
        rowBgClass: "bg-white"
    },
    {
        name: "Above 1,500 kWh",
        subtext: "High Usage Tier",
        limit: Infinity,
        energy: 37.03,
        capacity: 4.55,
        network: 12.85,
        totalColorClass: "text-red-600",
        rowBgClass: "bg-gray-50"
    }
];

// ==========================================
// 2. ToU TARIFF DATA (Domestik Time of Use)
// ==========================================
const TOU_TIERS = [
    // --- Low Usage Tier (<= 1,500) ---
    {
        name: "≤ 1,500 kWh (Peak)",
        subtext: "Peak Hours (8am - 10pm)",
        limit: 1500,
        energy: 28.52,
        capacity: 4.55,
        network: 12.85,
        totalColorClass: "text-orange-600",
        rowBgClass: "bg-white"
    },
    {
        name: "≤ 1,500 kWh (Off-Peak)",
        subtext: "Off-Peak Hours (10pm - 8am)",
        limit: 1500,
        energy: 24.43,
        capacity: 4.55,
        network: 12.85,
        totalColorClass: "text-green-600",
        rowBgClass: "bg-gray-50"
    },
    // --- High Usage Tier (> 1,500) ---
    {
        name: "> 1,500 kWh (Peak)",
        subtext: "Peak Hours (8am - 10pm)",
        limit: Infinity,
        energy: 38.52,
        capacity: 4.55,
        network: 12.85,
        totalColorClass: "text-orange-600",
        rowBgClass: "bg-white"
    },
    {
        name: "> 1,500 kWh (Off-Peak)",
        subtext: "Off-Peak Hours (10pm - 8am)",
        limit: Infinity,
        energy: 34.43,
        capacity: 4.55,
        network: 12.85,
        totalColorClass: "text-green-600",
        rowBgClass: "bg-gray-50"
    }
];

// ==========================================
// 3. MAIN CONFIGURATION OBJECT
// ==========================================
export const TARIFF_CONFIG = {
    sstRate: 0.06, // 6% SST
    
    types: {
        standard: {
            title: "TNB Tariff (Domestik Am) - Current Rates",
            lastUpdated: "1 July 2025",
            fixedCharge: 10.00,
            tiers: STANDARD_TIERS
        },
        alternative: {
            title: "TNB Tariff (Domestik ToU) - Time of Use",
            lastUpdated: "1 July 2025",
            fixedCharge: 10.00, // Same fixed charge as per image
            tiers: TOU_TIERS
        }
    }
};