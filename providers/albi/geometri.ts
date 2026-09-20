import {adapterStatus, type AlboAdapterConfig} from "./base.ts";
export const config:AlboAdapterConfig={key:"GEOMETRI",professione:"Geometra",territorio:"Torino",sourceUrlEnv:"F1_ALBO_GEOMETRI_SOURCE_URL"};
export const status=()=>adapterStatus(config);
