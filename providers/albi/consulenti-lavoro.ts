import {adapterStatus, type AlboAdapterConfig} from "./base.ts";
export const config:AlboAdapterConfig={key:"CONSULENTI_LAVORO",professione:"Consulente del lavoro",territorio:"Torino",sourceUrlEnv:"F1_ALBO_CONSULENTI_LAVORO_SOURCE_URL"};
export const status=()=>adapterStatus(config);
