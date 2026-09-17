-- F1 CASH / Generatore di opportunità
-- Canonical repository copy. Applied to production Supabase on 2026-09-17.
-- Principle: public.leads remains the master CRM. These tables extend it with a marketing/cash pipeline.

create table if not exists public.f1_cash_products (
  product_id uuid primary key default gen_random_uuid(),
  name text not null unique,
  target_price numeric not null default 0 check(target_price>=0),
  price_min numeric not null default 0 check(price_min>=0),
  price_max numeric null,
  content text not null default '', duration text not null default '', payment_terms text not null default '', delivery_time text not null default '',
  estimated_margin numeric null,
  pricing_note text not null default 'TARGET COMMERCIALE / CONFIGURAZIONE INTERNA. NON È UN PREZZO DI MERCATO GARANTITO.',
  active boolean not null default true, sort_order integer not null default 100,
  created_by uuid null references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(price_max is null or price_max>=price_min)
);

create table if not exists public.f1_cash_opportunities (
  opportunity_id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(lead_id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  territory_progress_id uuid null references public.f1_territory_progress(progress_id) on delete set null,
  territory_observation_id uuid null references public.f1_territory_observations(observation_id) on delete set null,
  business_name text not null default '', category text not null default 'ALTRO', observed_issue text not null default 'NON_SO',
  evidence_kind text not null default 'DA_VERIFICARE' check(evidence_kind in ('OSSERVATO','DICHIARATO','VERIFICATO','DA_VERIFICARE')),
  comune text not null default '', zona text not null default '', via text not null default '', civico text not null default '',
  latitude double precision null, longitude double precision null, gps_accuracy double precision null,
  website text not null default '', social text not null default '', contact_person text not null default '',
  source text not null default 'F1_CASH', source_reference text not null default '',
  stage text not null default 'DA_CONTATTARE' check(stage in ('DA_CONTATTARE','CONTATTATO','CONVERSAZIONE','INTERESSATO','APPUNTAMENTO','OFFERTA_DA_PREPARARE','OFFERTA_INVIATA','FOLLOW_UP','ACCETTATO','DA_PAGARE','PAGATO','IN_PRODUZIONE','CONSEGNATO','UPSELL','CLIENTE_RICORRENTE','REFERRAL','NON_INTERESSATO','RICHIAMARE','NON_RISPONDE','CONTATTO_ERRATO','PERSO')),
  last_action text not null default 'PROSPECT CREATO', last_action_at timestamptz not null default now(), next_action text not null default 'CONTATTARE', next_action_at timestamptz null,
  priority smallint not null default 50 check(priority between 0 and 100),
  product_id uuid null references public.f1_cash_products(product_id) on delete set null,
  potential_value numeric not null default 0 check(potential_value>=0), proposed_value numeric not null default 0 check(proposed_value>=0), accepted_value numeric not null default 0 check(accepted_value>=0),
  offer_sent_at timestamptz null, accepted_at timestamptz null, delivered_at timestamptz null,
  referral_source_opportunity_id uuid null references public.f1_cash_opportunities(opportunity_id) on delete set null,
  notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.f1_cash_payments (
  payment_id uuid primary key default gen_random_uuid(), opportunity_id uuid not null references public.f1_cash_opportunities(opportunity_id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict, amount numeric not null check(amount>0), received_at timestamptz not null default now(),
  payment_method text not null default '', note text not null default '', created_by uuid null references auth.users(id) on delete set null default auth.uid(), created_at timestamptz not null default now()
);

create table if not exists public.f1_cash_production (
  production_id uuid primary key default gen_random_uuid(), opportunity_id uuid not null unique references public.f1_cash_opportunities(opportunity_id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  stage text not null default 'RACCOLTA_MATERIALE' check(stage in ('RACCOLTA_MATERIALE','PRODUZIONE','REVISIONE','CONSEGNA','CHIUSO')),
  started_at timestamptz not null default now(), due_at timestamptz null, completed_at timestamptz null, next_action text not null default 'RACCOGLI MATERIALE', note text not null default '', updated_at timestamptz not null default now()
);

create table if not exists public.f1_cash_day_closures (
  closure_id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  work_date date not null default (now() at time zone 'Europe/Rome')::date, snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_user_id,work_date)
);

create index if not exists f1_cash_opportunities_owner_stage_idx on public.f1_cash_opportunities(owner_user_id,stage,next_action_at);
create index if not exists f1_cash_opportunities_location_idx on public.f1_cash_opportunities(lower(comune),lower(via),civico);
create index if not exists f1_cash_payments_opportunity_idx on public.f1_cash_payments(opportunity_id,received_at desc);
create index if not exists f1_cash_production_due_idx on public.f1_cash_production(owner_user_id,due_at) where completed_at is null;

alter table public.f1_cash_products enable row level security;
alter table public.f1_cash_opportunities enable row level security;
alter table public.f1_cash_payments enable row level security;
alter table public.f1_cash_production enable row level security;
alter table public.f1_cash_day_closures enable row level security;

do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='f1_cash_products' and policyname='f1 cash products read') then create policy "f1 cash products read" on public.f1_cash_products for select to authenticated using(true); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='f1_cash_products' and policyname='f1 cash products admin insert') then create policy "f1 cash products admin insert" on public.f1_cash_products for insert to authenticated with check((select f1_private.is_titolare())); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='f1_cash_products' and policyname='f1 cash products admin update') then create policy "f1 cash products admin update" on public.f1_cash_products for update to authenticated using((select f1_private.is_titolare())) with check((select f1_private.is_titolare())); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='f1_cash_opportunities' and policyname='f1 cash opportunities select') then create policy "f1 cash opportunities select" on public.f1_cash_opportunities for select to authenticated using((select f1_private.can_access_user(owner_user_id))); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='f1_cash_opportunities' and policyname='f1 cash opportunities insert') then create policy "f1 cash opportunities insert" on public.f1_cash_opportunities for insert to authenticated with check((select f1_private.current_staff_role())<>'' and owner_user_id=(select auth.uid())); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='f1_cash_opportunities' and policyname='f1 cash opportunities update') then create policy "f1 cash opportunities update" on public.f1_cash_opportunities for update to authenticated using((select f1_private.can_access_user(owner_user_id))) with check((select f1_private.can_access_user(owner_user_id))); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='f1_cash_payments' and policyname='f1 cash payments select') then create policy "f1 cash payments select" on public.f1_cash_payments for select to authenticated using((select f1_private.can_access_user(owner_user_id))); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='f1_cash_production' and policyname='f1 cash production select') then create policy "f1 cash production select" on public.f1_cash_production for select to authenticated using((select f1_private.can_access_user(owner_user_id))); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='f1_cash_day_closures' and policyname='f1 cash closures select') then create policy "f1 cash closures select" on public.f1_cash_day_closures for select to authenticated using((select f1_private.can_access_user(owner_user_id))); end if;
end $$;

grant select on public.f1_cash_products,public.f1_cash_opportunities,public.f1_cash_payments,public.f1_cash_production,public.f1_cash_day_closures to authenticated;

insert into public.f1_system_settings(setting_key,setting_value,updated_at) values
('cash_goal_eur',jsonb_build_object('label','OBIETTIVO LIQUIDITÀ','amount',10000,'metric','INCASSATO','target_date',null),now()),
('cash_conversion_min_sample',jsonb_build_object('count',10),now())
on conflict(setting_key) do nothing;

insert into public.f1_cash_products(name,target_price,price_min,price_max,content,duration,payment_terms,delivery_time,sort_order) values
('CASH',150,150,150,'Lavoro rapido configurabile per una necessità concreta di comunicazione.','Intervento singolo','Da definire prima dell’accettazione','24/72 ore se compatibile con il lavoro',10),
('START',500,500,500,'Pacchetto configurabile di comunicazione/promozione.','Progetto breve','Da definire prima dell’accettazione','Da configurare',20),
('90 GIORNI',1500,1500,1500,'Percorso continuativo configurabile.','90 giorni','Condizioni di pagamento da definire','Da configurare',30),
('PREMIUM',1500,1500,3000,'Progetto specifico di maggiore ampiezza, da definire sul caso reale.','Da configurare','Condizioni di pagamento da definire','Da configurare',40)
on conflict(name) do nothing;

-- The authoritative RPC implementations are deliberately SECURITY DEFINER and use f1_private role/access helpers.
-- They are installed by the production migration and tested by the F1 CASH QA suite:
-- f1_cash_create_prospect(jsonb)
-- f1_cash_record_outcome(uuid,text,text,timestamptz)
-- f1_cash_list_opportunities(integer,text)
-- f1_cash_dashboard_state(text)
-- f1_cash_conversion_stats(text)
-- f1_cash_set_offer(uuid,uuid,numeric,numeric,timestamptz)
-- f1_cash_record_payment(uuid,numeric,timestamptz,text,text)
-- f1_cash_update_production(uuid,text,timestamptz,text)
-- f1_cash_update_goal(numeric,date)
-- f1_cash_upsert_product(uuid,text,numeric,numeric,numeric,text,text,text,text,numeric,boolean,integer)
-- f1_cash_close_day()
