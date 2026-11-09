/**
 * Place names for the location box suggestions: every state/UT, all Odisha
 * districts and the main industrial towns. Same list as the landing site
 * (Job_Search_Engine/client/src/utils/searchData.ts); keep them in step.
 */
export interface Place {
  name: string;
  state?: string;
  kind: "State" | "District" | "City";
}

const STATES = [
  "Odisha", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const ODISHA_DISTRICTS = [
  "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam",
  "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Keonjhar", "Khordha", "Koraput",
  "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Sonepur", "Sundargarh",
];

/** Industrial towns and cities: Odisha first, then the main hubs across India. */
const CITIES: Array<[string, string]> = [
  ["Bhubaneswar", "Odisha"], ["Rourkela", "Odisha"], ["Paradip", "Odisha"], ["Talcher", "Odisha"], ["Berhampur", "Odisha"],
  ["Kalinganagar", "Odisha"], ["Lanjigarh", "Odisha"], ["Damanjodi", "Odisha"], ["Barbil", "Odisha"], ["Joda", "Odisha"], ["Brajrajnagar", "Odisha"],
  ["Jamshedpur", "Jharkhand"], ["Dhanbad", "Jharkhand"], ["Bokaro", "Jharkhand"], ["Ranchi", "Jharkhand"],
  ["Bhilai", "Chhattisgarh"], ["Raipur", "Chhattisgarh"], ["Korba", "Chhattisgarh"],
  ["Visakhapatnam", "Andhra Pradesh"], ["Kakinada", "Andhra Pradesh"], ["Hyderabad", "Telangana"],
  ["Chennai", "Tamil Nadu"], ["Hosur", "Tamil Nadu"], ["Coimbatore", "Tamil Nadu"], ["Thoothukudi", "Tamil Nadu"],
  ["Bengaluru", "Karnataka"], ["Mangaluru", "Karnataka"], ["Ballari", "Karnataka"], ["Kochi", "Kerala"],
  ["Pune", "Maharashtra"], ["Mumbai", "Maharashtra"], ["Nhava Sheva", "Maharashtra"], ["Nagpur", "Maharashtra"], ["Aurangabad", "Maharashtra"],
  ["Jamnagar", "Gujarat"], ["Vadodara", "Gujarat"], ["Ahmedabad", "Gujarat"], ["Surat", "Gujarat"], ["Mundra", "Gujarat"], ["Kandla", "Gujarat"],
  ["Kolkata", "West Bengal"], ["Haldia", "West Bengal"], ["Durgapur", "West Bengal"], ["Asansol", "West Bengal"],
  ["Gurugram", "Haryana"], ["Faridabad", "Haryana"], ["Ludhiana", "Punjab"], ["Noida", "Uttar Pradesh"], ["Kanpur", "Uttar Pradesh"],
  ["Patna", "Bihar"], ["Singrauli", "Madhya Pradesh"], ["Indore", "Madhya Pradesh"],
];

export const PLACES: Place[] = [
  ...STATES.map((name): Place => ({ name, kind: "State" })),
  ...ODISHA_DISTRICTS.map((name): Place => ({ name, state: "Odisha", kind: "District" })),
  ...CITIES.map(([name, state]): Place => ({ name, state, kind: "City" })),
];

