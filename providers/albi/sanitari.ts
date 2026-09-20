import {adapterStatus, type AlboAdapterConfig} from "./base.ts";
export const config:AlboAdapterConfig={key:"SANITARI",professione:"Professionista sanitario",territorio:"Torino",sourceUrlEnv:"F1_ALBO_SANITARI_SOURCE_URL"};
export const status=()=>adapterStatus(config);
