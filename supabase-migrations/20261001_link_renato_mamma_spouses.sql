do $$
declare
  v_owner uuid := 'f7eeeb4c-e48d-4693-8dd3-b8862f97fac0';
  v_renato text := 'p_mumr5taa_nt5a5';
  v_mamma text := 'p_muf68uhb_gqpfg';
  v_pair text := 'pair_'||replace(gen_random_uuid()::text,'-','');
  v_now text := now()::text;
  v_meta jsonb;
  v_rel jsonb;
  v_pos jsonb;
begin
  select coalesce(graph_meta,'{}'::jsonb) into v_meta
  from public.f1_tree_settings
  where owner_id=v_owner
  for update;

  if v_meta is null then
    raise exception 'f1_tree_settings row not found for owner';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_meta->'relations','[]'::jsonb)) r
    where (r->>'sourceId'=v_renato and r->>'targetId'=v_mamma)
       or (r->>'sourceId'=v_mamma and r->>'targetId'=v_renato)
  ) then
    return;
  end if;

  v_rel := coalesce(v_meta->'relations','[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'id','rel_'||replace(gen_random_uuid()::text,'-',''),
      'pairId',v_pair,
      'pairRole','forward',
      'sourceId',v_renato,
      'targetId',v_mamma,
      'type','moglie',
      'inverseType','marito',
      'customLabel','',
      'inverseCustomLabel','',
      'periodId','',
      'context','quick_relationship',
      'createdAt',v_now,
      'updatedAt',v_now
    ),
    jsonb_build_object(
      'id','rel_'||replace(gen_random_uuid()::text,'-',''),
      'pairId',v_pair,
      'pairRole','reverse',
      'sourceId',v_mamma,
      'targetId',v_renato,
      'type','marito',
      'inverseType','moglie',
      'customLabel','',
      'inverseCustomLabel','',
      'periodId','',
      'context','quick_relationship',
      'createdAt',v_now,
      'updatedAt',v_now
    )
  );

  v_pos := coalesce(v_meta->'graphPositions','{}'::jsonb)
    || jsonb_build_object(
      'root',jsonb_build_object('x',520,'y',100),
      v_renato,jsonb_build_object('x',360,'y',330),
      v_mamma,jsonb_build_object('x',570,'y',330)
    );

  update public.f1_tree_settings
  set graph_meta = jsonb_set(
                     jsonb_set(v_meta,'{relations}',v_rel,true),
                     '{graphPositions}',v_pos,true
                   ),
      updated_at=now()
  where owner_id=v_owner;
end $$;