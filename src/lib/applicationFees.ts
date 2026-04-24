// AHI Official Application Fee Structure (Effective 09-04-2026)
export interface BusinessCategoryFee {
  key: string;
  label: string;
  fee: number; // ZMW
}

export const BUSINESS_CATEGORY_FEES: BusinessCategoryFee[] = [
  { key: "Restaurants", label: "Restaurants", fee: 10000 },
  { key: "Cafés", label: "Cafés", fee: 10000 },
  { key: "Butcheries", label: "Butcheries", fee: 10000 },
  { key: "Abattoirs", label: "Abattoirs", fee: 20000 },
  { key: "Franchises", label: "Franchises", fee: 20000 },
  { key: "Manufacturing Companies", label: "Manufacturing Companies", fee: 30000 },
];

export const getFeeForCategory = (category: string): number => {
  const match = BUSINESS_CATEGORY_FEES.find((c) => c.key === category);
  return match ? match.fee : 0;
};
