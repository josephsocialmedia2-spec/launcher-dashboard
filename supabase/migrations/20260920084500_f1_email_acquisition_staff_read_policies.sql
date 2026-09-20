-- F1 Email Acquisition — staff read RLS policies
-- Applied live on 2026-09-20.

revoke all on public.f1_email_acquisition_leads from anon,authenticated;
revoke all on public.f1_email_acquisition_events from anon,authenticated;
revoke all on public.f1_email_acquisition_kpi_snapshots from anon,authenticated;

grant select on public.f1_email_acquisition_leads to authenticated;
grant select on public.f1_email_acquisition_events to authenticated;
grant select on public.f1_email_acquisition_kpi_snapshots to authenticated;

drop policy if exists "f1 acquisition leads staff read" on public.f1_email_acquisition_leads;
create policy "f1 acquisition leads staff read"
on public.f1_email_acquisition_leads
for select to authenticated
using (
  exists (
    select 1 from public.f1_staff_profiles p
    where p.user_id=(select auth.uid()) and p.status='ACTIVE'
  )
);

drop policy if exists "f1 acquisition events staff read" on public.f1_email_acquisition_events;
create policy "f1 acquisition events staff read"
on public.f1_email_acquisition_events
for select to authenticated
using (
  exists (
    select 1 from public.f1_staff_profiles p
    where p.user_id=(select auth.uid()) and p.status='ACTIVE'
  )
);

drop policy if exists "f1 acquisition kpi staff read" on public.f1_email_acquisition_kpi_snapshots;
create policy "f1 acquisition kpi staff read"
on public.f1_email_acquisition_kpi_snapshots
for select to authenticated
using (
  exists (
    select 1 from public.f1_staff_profiles p
    where p.user_id=(select auth.uid()) and p.status='ACTIVE'
  )
);
