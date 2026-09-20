import {adapterStatus, type AlboAdapterConfig} from "./base.ts";
export const config:AlboAdapterConfig={key:"INGEGNERI",professione:"Ingegnere",territorio:"Torino",sourceUrlEnv:"F1_ALBO_INGEGNERI_SOURCE_URL"};
export const status=()=>adapterStatus(config);
