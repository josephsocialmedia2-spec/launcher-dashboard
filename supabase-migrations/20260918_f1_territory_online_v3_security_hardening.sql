-- Harden F1 Territory v3 API and bulletin RLS.
revoke execute on function public.f1_territory_sync_streets_v3(text,jsonb) from public, anon;
revoke execute on function public.f1_territory_streets_v3(text) from public, anon;
revoke execute on function public.f1_territory_open_street_v3(text,text,text,text) from public, anon;
revoke execute on function public.f1_territory_set_manual_civic_v3(uuid,text) from public, anon;
revoke execute on function public.f1_territory_complete_civic_v3(uuid,text) from public, anon;
revoke execute on function public.f1_territory_note_add_v3(uuid,text,text,text,text,integer) from public, anon;
revoke execute on function public.f1_territory_bulletin_publish_v3(text,text,text) from public, anon;
revoke execute on function public.f1_territory_mobile_crm_v3(integer) from public, anon;

grant execute on function public.f1_territory_sync_streets_v3(text,jsonb) to authenticated;
grant execute on function public.f1_territory_streets_v3(text) to authenticated;
grant execute on function public.f1_territory_open_street_v3(text,text,text,text) to authenticated;
grant execute on function public.f1_territory_set_manual_civic_v3(uuid,text) to authenticated;
grant execute on function public.f1_territory_complete_civic_v3(uuid,text) to authenticated;
grant execute on function public.f1_territory_note_add_v3(uuid,text,text,text,text,integer) to authenticated;
grant execute on function public.f1_territory_bulletin_publish_v3(text,text,text) to authenticated;
grant execute on function public.f1_territory_mobile_crm_v3(integer) to authenticated;

drop policy if exists f1_territory_bulletins_select on public.f1_territory_bulletins;
drop policy if exists f1_territory_bulletins_write on public.f1_territory_bulletins;

create policy f1_territory_bulletins_select
on public.f1_territory_bulletins for select to authenticated
using (true);

create policy f1_territory_bulletins_insert
on public.f1_territory_bulletins for insert to authenticated
with check (
  exists (
    select 1 from public.f1_staff_profiles p
    where p.user_id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')
  )
);

create policy f1_territory_bulletins_update
on public.f1_territory_bulletins for update to authenticated
using (
  exists (
    select 1 from public.f1_staff_profiles p
    where p.user_id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')
  )
)
with check (
  exists (
    select 1 from public.f1_staff_profiles p
    where p.user_id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')
  )
);

create policy f1_territory_bulletins_delete
on public.f1_territory_bulletins for delete to authenticated
using (
  exists (
    select 1 from public.f1_staff_profiles p
    where p.user_id=auth.uid()
      and p.status='ACTIVE'
      and upper(coalesce(p.role,'')) in ('TITOLARE','ADMIN','MANAGER')
  )
);
