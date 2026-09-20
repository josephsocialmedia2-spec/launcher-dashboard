import {adapterStatus, type AlboAdapterConfig} from "./base.ts";
export const config:AlboAdapterConfig={key:"ARCHITETTI",professione:"Architetto",territorio:"Torino",sourceUrlEnv:"F1_ALBO_ARCHITETTI_SOURCE_URL"};
export const status=()=>adapterStatus(config);
