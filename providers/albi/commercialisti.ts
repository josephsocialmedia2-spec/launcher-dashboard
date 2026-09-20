import {adapterStatus, type AlboAdapterConfig} from "./base.ts";
export const config:AlboAdapterConfig={key:"COMMERCIALISTI",professione:"Commercialista",territorio:"Torino",sourceUrlEnv:"F1_ALBO_COMMERCIALISTI_SOURCE_URL"};
export const status=()=>adapterStatus(config);
