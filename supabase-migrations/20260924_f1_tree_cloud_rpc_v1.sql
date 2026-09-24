-- Applied in Supabase as migration f1_tree_cloud_rpc_v1.
-- RPCs for atomic tree operations. Authenticated users may act only on their own records.

create or replace function public.f1_tree_convert_trigger_news_v1(p_legacy_id text,p_trigger_type text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_contact public.network_contacts%rowtype;
  v_trigger public.f1_network_life_triggers%rowtype;
  v_news public.f1_real_estate_news%rowtype;
  v_ref text;
begin
  if v_uid is null then raise exception 'ACCESSO RICHIESTO'; end if;
  select * into v_contact from public.network_contacts
   where user_id=v_uid and app_scope='albero_fonti_notizie' and legacy_id=p_legacy_id and deleted=false limit 1;
  if not found then raise exception 'CONTATTO NON TROVATO'; end if;
  select * into v_trigger from public.f1_network_life_triggers
   where user_id=v_uid and contact_id=v_contact.contact_id and trigger_type=p_trigger_type limit 1;
  if not found then raise exception 'TRIGGER NON TROVATO'; end if;
  v_ref:=p_legacy_id||':'||p_trigger_type;
  select * into v_news from public.f1_real_estate_news
   where user_id=v_uid and source='ALBERO_FONTI_NOTIZIE' and source_reference=v_ref
   order by created_at desc limit 1;
  if not found then
    insert into public.f1_real_estate_news(
      user_id,network_contact_id,origin_trigger_id,level,title,detail,source,source_reference,
      comune,zona,justification,status,usable,tree_status
    ) values (
      v_uid,v_contact.contact_id,v_trigger.trigger_id,'N1',v_trigger.trigger_label,coalesce(v_trigger.note,''),
      'ALBERO_FONTI_NOTIZIE',v_ref,v_contact.comune,v_contact.comune,
      'Trigger di cambiamento di vita verificato nella rete relazionale','ACTIVE',false,'DA_VERIFICARE'
    ) returning * into v_news;
  end if;
  update public.f1_network_life_triggers
     set status='TRASFORMATO_IN_NOTIZIA',active=true,news_id=v_news.news_id,updated_at=now()
   where trigger_id=v_trigger.trigger_id and user_id=v_uid;
  update public.network_contacts set stato_contatto='Notizia',updated_at=now()
   where contact_id=v_contact.contact_id and user_id=v_uid;
  return jsonb_build_object('news_id',v_news.news_id,'trigger_id',v_trigger.trigger_id,'contact_id',v_contact.contact_id,'tree_status',coalesce(v_news.tree_status,'DA_VERIFICARE'));
end;
$function$;

grant execute on function public.f1_tree_convert_trigger_news_v1(text,text) to authenticated;

create or replace function public.f1_tree_delete_branch_v1(p_legacy_id text)
returns integer
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_contact_id uuid;
  v_count integer:=0;
begin
  if v_uid is null then raise exception 'ACCESSO RICHIESTO'; end if;
  select contact_id into v_contact_id from public.network_contacts
   where user_id=v_uid and app_scope='albero_fonti_notizie' and legacy_id=p_legacy_id and deleted=false limit 1;
  if v_contact_id is null then return 0; end if;
  with recursive branch as (
    select contact_id from public.network_contacts where contact_id=v_contact_id and user_id=v_uid
    union all
    select c.contact_id from public.network_contacts c join branch b on c.parent_contact_id=b.contact_id
     where c.user_id=v_uid and c.app_scope='albero_fonti_notizie'
  ) select count(*) into v_count from branch;
  delete from public.network_contacts where contact_id=v_contact_id and user_id=v_uid;
  return v_count;
end;
$function$;

grant execute on function public.f1_tree_delete_branch_v1(text) to authenticated;

create or replace function public.f1_tree_reset_v1()
returns integer
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_count integer:=0;
begin
  if v_uid is null then raise exception 'ACCESSO RICHIESTO'; end if;
  select count(*) into v_count from public.network_contacts where user_id=v_uid and app_scope='albero_fonti_notizie';
  delete from public.network_contacts where user_id=v_uid and app_scope='albero_fonti_notizie';
  return v_count;
end;
$function$;

grant execute on function public.f1_tree_reset_v1() to authenticated;
