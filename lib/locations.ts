export interface LocationCity {
  name: string;
  areas: string[];
}

export interface LocationRegion {
  name: string;
  cities: LocationCity[];
}

export interface LocationCountry {
  code: string;
  name: string;
  regions: LocationRegion[];
}

export const locationData: LocationCountry[] = [
  {
    code: "NG",
    name: "Nigeria",
    regions: [
      { name: "Abia", cities: [{ name: "Aba", areas: ["Aba North", "Aba South", "Osisioma"] }, { name: "Umuahia", areas: ["Ibeku", "Umuahia North", "Umuahia South"] }] },
      { name: "Akwa Ibom", cities: [{ name: "Uyo", areas: ["Ewet Housing", "Itam", "Shelter Afrique"] }] },
      { name: "Cross River", cities: [{ name: "Calabar", areas: ["Calabar South", "State Housing", "Marian"] }] },
      { name: "Edo", cities: [{ name: "Benin City", areas: ["GRA", "Ikpoba Hill", "Ugbowo"] }] },
      { name: "Enugu", cities: [{ name: "Enugu", areas: ["Achara Layout", "Independence Layout", "New Haven"] }] },
      { name: "Federal Capital Territory", cities: [{ name: "Abuja", areas: ["Asokoro", "Garki", "Jabi", "Maitama", "Wuse"] }] },
      { name: "Imo", cities: [{ name: "Owerri", areas: ["Ikenegbu", "New Owerri", "World Bank"] }] },
      { name: "Kaduna", cities: [{ name: "Kaduna", areas: ["Barnawa", "Kaduna North", "Kawo"] }, { name: "Zaria", areas: ["GRA", "Samaru", "Tudun Wada"] }] },
      { name: "Kano", cities: [{ name: "Kano", areas: ["Bompai", "Nassarawa", "Sabon Gari"] }] },
      { name: "Lagos", cities: [{ name: "Lagos", areas: ["Ajah", "Ikeja", "Ikoyi", "Lekki", "Surulere", "Victoria Island"] }, { name: "Epe", areas: ["Epe Central", "Ibeju", "Lekki Free Zone"] }] },
      { name: "Ogun", cities: [{ name: "Abeokuta", areas: ["Adatan", "Ibara", "Kuto"] }] },
      { name: "Oyo", cities: [{ name: "Ibadan", areas: ["Agodi", "Akobo", "Bodija", "Challenge", "Jericho", "Mokola"] }, { name: "Ogbomoso", areas: ["Arowomole", "Ogbomoso North", "Takie"] }] },
      { name: "Rivers", cities: [{ name: "Port Harcourt", areas: ["D-Line", "GRA", "Rumuola", "Trans Amadi"] }] },
    ],
  },
];

export function getCountry(countryName: string) {
  return locationData.find((country) => country.name === countryName);
}

export function getRegion(countryName: string, regionName: string) {
  return getCountry(countryName)?.regions.find((region) => region.name === regionName);
}

export function getCity(countryName: string, regionName: string, cityName: string) {
  return getRegion(countryName, regionName)?.cities.find((city) => city.name === cityName);
}
