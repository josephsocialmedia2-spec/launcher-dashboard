import {adapterStatus, type AlboAdapterConfig} from "./base.ts";
export const config:AlboAdapterConfig={key:"AVVOCATI",professione:"Avvocato",territorio:"Torino",sourceUrlEnv:"F1_ALBO_AVVOCATI_SOURCE_URL"};
export const status=()=>adapterStatus(config);
