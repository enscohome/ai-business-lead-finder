import type { Business, SavedLead } from "@/types";
export const GOOGLE_PROVIDER="google_places";
export function savedLeadWithoutProviderSnapshot(business:Business,userId="user-1"):SavedLead{
  const google=business.source===GOOGLE_PROVIDER;
  return {id:crypto.randomUUID(),userId,businessId:business.id,business:google?{...business,name:"Google Maps business",phone:"",address:"",city:"",area:undefined,state:"",country:"Nigeria",businessType:"Business",website:null,googleMapsUrl:"",latitude:0,longitude:0,rating:undefined,reviewCount:undefined,source:GOOGLE_PROVIDER,createdAt:new Date().toISOString()}:business,notes:"",status:"new",tags:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}
export const GOOGLE_EXPORT_RESTRICTION="Google-derived names, contacts, addresses, websites, coordinates, ratings, review counts, and Maps URLs are excluded pending provider licensing confirmation.";
