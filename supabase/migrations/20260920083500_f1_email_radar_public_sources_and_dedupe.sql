-- F1 Email Radar — official source catalog + server-side automated deduplication
-- Live schema verified on 2026-09-20.

create table if not exists public.f1_email_radar_public_sources(
  source_code text primary key,
  provider_key text not null references public.f1_email_radar_providers(provider_key) on delete cascade,
  label text not null,
  profession text not null default '',
  territory text not null default 'Torino',
  comune text not null default '',
  source_url text not null,
  completion_mode text not null default 'INTERACTIVE_PARTIAL',
  marketing_rule text not null default 'DA_VALUTARE',
  enabled boolean not null default true,
  notes text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.f1_email_radar_public_sources enable row level security;
revoke all on public.f1_email_radar_public_sources from anon,authenticated;
grant select on public.f1_email_radar_public_sources to authenticated;
drop policy if exists "email radar public sources staff read" on public.f1_email_radar_public_sources;
create policy "email radar public sources staff read"
on public.f1_email_radar_public_sources for select to authenticated
using (exists(select 1 from public.f1_staff_profiles p where p.user_id=(select auth.uid()) and p.status='ACTIVE'));

insert into public.f1_email_radar_public_sources(source_code,provider_key,label,profession,territory,source_url,completion_mode,marketing_rule,notes)
values
('ALBO_GEOMETRI_TO','ALBI_PROFESSIONALI','Collegio Geometri Torino · Albo iscritti','Geometra','Torino','https://collegiogeometri.to.it/albo-iscritti/','INTERACTIVE_PARTIAL','NON_USARE_MARKETING','Fonte ufficiale; automazione limitata alle pagine pubbliche raggiungibili senza bypass.'),
('ALBO_ARCHITETTI_TO','ALBI_PROFESSIONALI','Ordine Architetti Torino · Ricerca professionista','Architetto','Torino','https://www.oato.it/albo/ricerca-professionista/','INTERACTIVE_PARTIAL','NON_USARE_MARKETING','Fonte ufficiale; ricerca interattiva/iframe, nessun bypass.'),
('ALBO_INGEGNERI_TO','ALBI_PROFESSIONALI','Ordine Ingegneri Torino · Elenco iscritti','Ingegnere','Torino','https://torino.ordingegneri.it/ordine/elenco-iscritti/','INTERACTIVE_PARTIAL','NON_USARE_MARKETING','La fonte dichiara che i contatti pubblici non sono utilizzabili per comunicazioni promozionali/pubblicitarie.'),
('ALBO_COMMERCIALISTI_TO','ALBI_PROFESSIONALI','ODCEC Torino · Albo ordinario','Commercialista','Torino','https://odcec.torino.it/albo_professionale/albo_ordinario','INTERACTIVE_PARTIAL','NON_USARE_MARKETING','Fonte ufficiale con maschera di ricerca.'),
('ALBO_AVVOCATI_TO','ALBI_PROFESSIONALI','Ordine Avvocati Torino · Consultazione Albo','Avvocato','Torino','https://www.ordineavvocatitorino.it/ordine/avvocati-torino','INTERACTIVE_PARTIAL','NON_USARE_MARKETING','Fonte ufficiale; ricerca tramite iframe/servizio collegato.')
on conflict(source_code) do update set
 label=excluded.label,profession=excluded.profession,territory=excluded.territory,source_url=excluded.source_url,
 completion_mode=excluded.completion_mode,marketing_rule=excluded.marketing_rule,notes=excluded.notes,enabled=true,updated_at=now();

update public.f1_email_radar_providers
set base_url='https://accessoallebanchedati.registroimprese.it/abdo/api',
    notes='InfoCamere/Registro Imprese offre API/Web Service ufficiali contrattuali. Adapter predisposto: endpoint/path/header/metodo devono provenire dal contratto autorizzato; nessun endpoint viene inventato.',
    updated_at=now()
where provider_key='REGISTRO_IMPRESE';

update public.f1_email_radar_providers
set notes='Consultazione pubblica INAD; le API di interoperabilità documentate da AgID sono messe a disposizione delle Pubbliche Amministrazioni. F1 non le usa senza titolo di accesso.',
    updated_at=now()
where provider_key='INAD';

update public.f1_email_radar_providers
set notes='Consultazione pubblica INI-PEC. F1 non assume disponibilità di una API massiva pubblica senza documentazione/abilitazione specifica.',
    updated_at=now()
where provider_key='INI_PEC';

create or replace function public.f1_email_radar_service_upsert_entity(p_actor uuid,p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_id uuid;
  v_den text := btrim(coalesce(p_payload->>'denomination',p_payload->>'legal_name',''));
  v_legal text := btrim(coalesce(p_payload->>'legal_name',''));
  v_comune text := btrim(coalesce(p_payload->>'comune',''));
  v_indirizzo text := btrim(coalesce(p_payload->>'indirizzo',''));
  v_email text := lower(btrim(coalesce(p_payload->>'email','')));
  v_pec text := lower(btrim(coalesce(p_payload->>'pec','')));
  v_vat text := regexp_replace(btrim(coalesce(p_payload->>'vat_number','')),'[^0-9A-Za-z]','','g');
  v_site text := lower(regexp_replace(btrim(coalesce(p_payload->>'website','')),'/+$','','g'));
  v_merged boolean := false;
begin
 if p_actor is null then raise exception 'ACTOR_REQUIRED'; end if;
 if v_comune='' then raise exception 'COMUNE_REQUIRED'; end if;
 if v_den='' and v_legal='' then raise exception 'DENOMINATION_REQUIRED'; end if;

 select e.entity_id into v_id
 from public.f1_email_radar_entities e
 where
   (v_vat<>'' and regexp_replace(e.vat_number,'[^0-9A-Za-z]','','g')=v_vat)
   or (v_pec<>'' and lower(e.pec)=v_pec)
   or (v_email<>'' and lower(e.email)=v_email and lower(e.comune)=lower(v_comune))
   or (v_site<>'' and lower(regexp_replace(e.website,'/+$','','g'))=v_site and lower(e.comune)=lower(v_comune))
   or (lower(coalesce(nullif(e.denomination,''),e.legal_name))=lower(coalesce(nullif(v_den,''),v_legal))
       and lower(e.comune)=lower(v_comune) and v_indirizzo<>'' and lower(e.indirizzo)=lower(v_indirizzo))
 order by e.updated_at desc limit 1;

 if v_id is null then
   insert into public.f1_email_radar_entities(
     created_by,subject_type,denomination,legal_name,category,profession,ateco_code,ateco_title,
     comune,frazione,indirizzo,civico,cap,provincia,latitude,longitude,phone,mobile,email,email_type,pec,website,vat_number,
     primary_source_type,primary_source_url,verification_status,confidence_score,activity_status,marketing_status,notes,last_verified_at
   ) values(
     p_actor,coalesce(nullif(p_payload->>'subject_type',''),'AZIENDA'),v_den,v_legal,
     coalesce(p_payload->>'category',''),coalesce(p_payload->>'profession',''),coalesce(p_payload->>'ateco_code',''),coalesce(p_payload->>'ateco_title',''),
     v_comune,coalesce(p_payload->>'frazione',''),v_indirizzo,coalesce(p_payload->>'civico',''),coalesce(p_payload->>'cap',''),coalesce(nullif(p_payload->>'provincia',''),'TO'),
     nullif(p_payload->>'latitude','')::double precision,nullif(p_payload->>'longitude','')::double precision,
     coalesce(p_payload->>'phone',''),coalesce(p_payload->>'mobile',''),v_email,coalesce(nullif(p_payload->>'email_type',''),'EMAIL_NON_VERIFICATA'),
     v_pec,coalesce(p_payload->>'website',''),coalesce(p_payload->>'vat_number',''),
     coalesce(p_payload->>'primary_source_type',''),coalesce(p_payload->>'primary_source_url',''),
     coalesce(nullif(p_payload->>'verification_status',''),'DA_VERIFICARE'),
     greatest(0,least(100,coalesce(nullif(p_payload->>'confidence_score','')::int,0))),
     coalesce(nullif(p_payload->>'activity_status',''),'DA_VERIFICARE'),
     coalesce(nullif(p_payload->>'marketing_status',''),'DA_VALUTARE'),
     coalesce(p_payload->>'notes',''),
     case when coalesce(p_payload->>'verification_status','')='VERIFICATO' then now() else null end
   ) returning entity_id into v_id;
 else
   v_merged:=true;
   update public.f1_email_radar_entities e set
     denomination=coalesce(nullif(v_den,''),e.denomination),
     legal_name=coalesce(nullif(v_legal,''),e.legal_name),
     subject_type=coalesce(nullif(p_payload->>'subject_type',''),e.subject_type),
     category=coalesce(nullif(p_payload->>'category',''),e.category),
     profession=coalesce(nullif(p_payload->>'profession',''),e.profession),
     ateco_code=coalesce(nullif(p_payload->>'ateco_code',''),e.ateco_code),
     ateco_title=coalesce(nullif(p_payload->>'ateco_title',''),e.ateco_title),
     frazione=coalesce(nullif(p_payload->>'frazione',''),e.frazione),
     indirizzo=coalesce(nullif(v_indirizzo,''),e.indirizzo),
     civico=coalesce(nullif(p_payload->>'civico',''),e.civico),
     cap=coalesce(nullif(p_payload->>'cap',''),e.cap),
     latitude=coalesce(nullif(p_payload->>'latitude','')::double precision,e.latitude),
     longitude=coalesce(nullif(p_payload->>'longitude','')::double precision,e.longitude),
     phone=coalesce(nullif(p_payload->>'phone',''),e.phone),
     mobile=coalesce(nullif(p_payload->>'mobile',''),e.mobile),
     email=coalesce(nullif(v_email,''),e.email),
     email_type=case when v_email<>'' then coalesce(nullif(p_payload->>'email_type',''),e.email_type) else e.email_type end,
     pec=coalesce(nullif(v_pec,''),e.pec),
     website=coalesce(nullif(p_payload->>'website',''),e.website),
     vat_number=coalesce(nullif(p_payload->>'vat_number',''),e.vat_number),
     primary_source_type=coalesce(nullif(p_payload->>'primary_source_type',''),e.primary_source_type),
     primary_source_url=coalesce(nullif(p_payload->>'primary_source_url',''),e.primary_source_url),
     verification_status=case when p_payload ? 'verification_status' then p_payload->>'verification_status' else e.verification_status end,
     confidence_score=greatest(e.confidence_score,greatest(0,least(100,coalesce(nullif(p_payload->>'confidence_score','')::int,0)))),
     marketing_status=case when e.marketing_status='NON_USARE_MARKETING' then e.marketing_status else coalesce(nullif(p_payload->>'marketing_status',''),e.marketing_status) end,
     last_verified_at=case when coalesce(p_payload->>'verification_status','')='VERIFICATO' then now() else e.last_verified_at end,
     updated_at=now()
   where e.entity_id=v_id;
 end if;
 return jsonb_build_object('ok',true,'entity_id',v_id,'merged',v_merged);
end $$;

revoke all on function public.f1_email_radar_service_upsert_entity(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.f1_email_radar_service_upsert_entity(uuid,jsonb) to service_role;
