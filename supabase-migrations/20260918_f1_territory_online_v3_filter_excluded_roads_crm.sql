
create or replace function public.f1_territory_mobile_crm_v3(p_limit integer default 700)
returns jsonb
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_limit integer:=greatest(1,least(coalesce(p_limit,700),1500));
  v_base jsonb;
  v_key text;
begin
  if auth.uid() is null then raise exception 'ACCESSO RICHIESTO'; end if;

  v_base:=public.f1_territory_mobile_crm_v2(v_limit);

  foreach v_key in array array['civics','conversations','news','letters','territory_leads']
  loop
    if jsonb_typeof(v_base->v_key)='array' then
      v_base:=jsonb_set(
        v_base,
        array[v_key],
        coalesce((
          select jsonb_agg(e)
          from jsonb_array_elements(v_base->v_key) e
          where upper(trim(coalesce(e->>'via',''))) not like '%AUTOSTRADA%'
            and upper(trim(coalesce(e->>'via',''))) not like '%RACCORDO AUTOSTRADALE%'
            and upper(trim(coalesce(e->>'via',''))) not in ('A32','E70')
        ),'[]'::jsonb),
        true
      );
    end if;
  end loop;

  return v_base || jsonb_build_object(
    'notes',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select n.*,r.comune,r.zona,r.via,r.civico
        from public.f1_territory_notes n
        join public.f1_territory_civic_records r on r.civic_record_id=n.civic_record_id
        where f1_private.can_access_user(n.user_id)
          and upper(trim(coalesce(r.via,''))) not like '%AUTOSTRADA%'
          and upper(trim(coalesce(r.via,''))) not like '%RACCORDO AUTOSTRADALE%'
          and upper(trim(coalesce(r.via,''))) not in ('A32','E70')
        order by n.created_at desc
        limit v_limit
      ) x
    ),'[]'::jsonb),
    'streets',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.comune,x.via)
      from (
        select *
        from public.f1_territory_street_catalog s
        where f1_private.can_access_user(s.user_id)
          and upper(trim(coalesce(s.via,''))) not like '%AUTOSTRADA%'
          and upper(trim(coalesce(s.via,''))) not like '%RACCORDO AUTOSTRADALE%'
          and upper(trim(coalesce(s.via,''))) not in ('A32','E70')
        order by s.updated_at desc
        limit v_limit
      ) x
    ),'[]'::jsonb),
    'active_bulletin',(
      select to_jsonb(b)
      from public.f1_territory_bulletins b
      where b.status='ACTIVE'
      order by b.published_at desc
      limit 1
    )
  );
end;
$$;

revoke execute on function public.f1_territory_mobile_crm_v3(integer) from public, anon;
grant execute on function public.f1_territory_mobile_crm_v3(integer) to authenticated;
