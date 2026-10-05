-- F1 CRM AZIENDE — batch import RPC used by the incremental Excel import.
-- Applied to production on 2026-10-05.

create or replace function public.f1_import_companies_batch_v1(
  p_job_id uuid,
  p_batch_no integer,
  p_user_id uuid,
  p_source_file text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  r jsonb;
  v_id bigint;
  v_existing boolean;
  v_created integer:=0;
  v_updated integer:=0;
  v_duplicates integer:=0;
  v_errors integer:=0;
  v_name text;
  v_address text;
  v_cell text;
  v_fixed text;
  v_email text;
  v_primary_phone text;
  v_comune text;
  v_cap text;
  v_provincia text;
  v_source_row integer;
  v_score integer;
begin
  if p_rows is null or jsonb_typeof(p_rows)<>'array' then
    raise exception 'ROWS JSON ARRAY REQUIRED';
  end if;

  for r in select value from jsonb_array_elements(p_rows)
  loop
    begin
      v_name:=trim(coalesce(r->>'nome',''));
      v_address:=trim(coalesce(r->>'indirizzo',''));
      v_cell:=trim(coalesce(r->>'cellulare',''));
      v_fixed:=trim(coalesce(r->>'telefono_fisso',''));
      v_email:=lower(trim(coalesce(r->>'email','')));
      v_comune:=trim(coalesce(r->>'comune',''));
      v_cap:=trim(coalesce(r->>'cap',''));
      v_provincia:=trim(coalesce(r->>'provincia',''));
      v_source_row:=nullif(r->>'source_row','')::integer;
      v_primary_phone:=coalesce(nullif(v_cell,''),nullif(v_fixed,''),'');
      if v_name='' then raise exception 'RAGIONE SOCIALE MANCANTE'; end if;

      select a.id into v_id
      from public.aziende a
      where
        (v_email<>'' and lower(trim(a.email))=v_email)
        or (v_cell<>'' and regexp_replace(coalesce(a.cellulare,a.telefono,''),'\D','','g')=regexp_replace(v_cell,'\D','','g'))
        or (v_fixed<>'' and regexp_replace(coalesce(a.telefono_fisso,a.telefono,''),'\D','','g')=regexp_replace(v_fixed,'\D','','g'))
        or (lower(trim(a.ragione_sociale))=lower(v_name) and v_address<>'' and lower(trim(a.indirizzo))=lower(v_address))
        or (lower(trim(a.ragione_sociale))=lower(v_name) and v_comune<>'' and lower(trim(a.comune))=lower(v_comune))
      order by a.updated_at desc limit 1;

      v_existing:=v_id is not null;
      v_score:=least(100,40
        + case when v_cell<>'' then 20 else 0 end
        + case when v_fixed<>'' then 10 else 0 end
        + case when v_email<>'' then 20 else 0 end
        + case when v_address<>'' then 10 else 0 end);

      if not v_existing then
        insert into public.aziende(
          user_id,ragione_sociale,indirizzo,comune,cap,provincia,telefono,cellulare,telefono_fisso,email,
          canale_acquisizione,stato,interesse,budget_stimato,note,data_acquisizione,
          prossima_azione,data_prossima_azione,lead_score,do_not_contact,privacy_basis,
          processing_status,source_file,source_row,import_batch,import_job_id,source_payload,field_provenance
        ) values (
          p_user_id,v_name,v_address,v_comune,v_cap,v_provincia,v_primary_phone,v_cell,v_fixed,v_email,
          'IMPORT_EXCEL','DA_CONTATTARE','',null,
          'Importazione incrementale da '||p_source_file||'. Dati da verificare e arricchire.',current_date,
          case when v_primary_phone<>'' then 'CALL' when v_email<>'' then 'EMAIL' else 'RICERCA_CONTATTO' end,
          current_date,v_score,false,'DA_VERIFICARE',
          'DA_ARRICCHIRE',p_source_file,v_source_row,p_batch_no,p_job_id,r,
          jsonb_build_object('ragione_sociale','FILE_ORIGINALE','indirizzo','FILE_ORIGINALE','cellulare','FILE_ORIGINALE','telefono_fisso','FILE_ORIGINALE','email','FILE_ORIGINALE')
        ) returning id into v_id;
        v_created:=v_created+1;
      else
        update public.aziende a set
          indirizzo=case when trim(coalesce(a.indirizzo,''))='' then v_address else a.indirizzo end,
          comune=case when trim(coalesce(a.comune,''))='' then v_comune else a.comune end,
          cap=case when trim(coalesce(a.cap,''))='' then v_cap else a.cap end,
          provincia=case when trim(coalesce(a.provincia,''))='' then v_provincia else a.provincia end,
          cellulare=case when trim(coalesce(a.cellulare,''))='' then v_cell else a.cellulare end,
          telefono_fisso=case when trim(coalesce(a.telefono_fisso,''))='' then v_fixed else a.telefono_fisso end,
          telefono=case when trim(coalesce(a.telefono,''))='' then v_primary_phone else a.telefono end,
          email=case when trim(coalesce(a.email,''))='' then v_email else a.email end,
          source_file=case when trim(coalesce(a.source_file,''))='' then p_source_file else a.source_file end,
          source_row=coalesce(a.source_row,v_source_row),
          import_batch=coalesce(a.import_batch,p_batch_no),
          import_job_id=coalesce(a.import_job_id,p_job_id),
          source_payload=coalesce(a.source_payload,'{}'::jsonb)||r,
          processing_status=case when a.processing_status in ('','IMPORTATA') then 'DA_ARRICCHIRE' else a.processing_status end,
          updated_at=now()
        where a.id=v_id;
        v_updated:=v_updated+1;
        v_duplicates:=v_duplicates+1;
      end if;

      if v_primary_phone<>'' and not exists(
        select 1 from public.azienda_tasks t where t.azienda_id=v_id and t.task_type='CALL' and t.status in ('OPEN','IN_PROGRESS')
      ) then
        insert into public.azienda_tasks(user_id,azienda_id,task_type,status,destination,reason,priority,due_at,metadata)
        values(p_user_id,v_id,'CALL','OPEN',v_primary_phone,'Primo contatto azienda importata',v_score,now(),
          jsonb_build_object('origin','IMPORT_EXCEL','job_id',p_job_id,'batch',p_batch_no,'compliance_gate','VERIFICARE_RPO_E_BASE_GIURIDICA'));
      end if;

      if v_email<>'' and not exists(
        select 1 from public.azienda_tasks t where t.azienda_id=v_id and t.task_type='EMAIL' and t.status in ('OPEN','IN_PROGRESS')
      ) then
        insert into public.azienda_tasks(user_id,azienda_id,task_type,status,destination,reason,priority,due_at,metadata)
        values(p_user_id,v_id,'EMAIL','OPEN',v_email,'Email di primo contatto da preparare/inviare',v_score,now(),
          jsonb_build_object('origin','IMPORT_EXCEL','job_id',p_job_id,'batch',p_batch_no,'compliance_gate','VERIFICARE_BASE_GIURIDICA'));
      end if;

      if v_primary_phone='' and v_email='' and not exists(
        select 1 from public.azienda_tasks t where t.azienda_id=v_id and t.task_type='RICERCA_CONTATTO' and t.status in ('OPEN','IN_PROGRESS')
      ) then
        insert into public.azienda_tasks(user_id,azienda_id,task_type,status,destination,reason,priority,due_at,metadata)
        values(p_user_id,v_id,'RICERCA_CONTATTO','OPEN','','Reperire recapito professionale pubblico',v_score,now(),
          jsonb_build_object('origin','IMPORT_EXCEL','job_id',p_job_id,'batch',p_batch_no));
      end if;

      v_id:=null;
    exception when others then
      v_errors:=v_errors+1;
      insert into public.azienda_import_errors(import_job_id,source_row,company_name,error_text,payload)
      values(p_job_id,v_source_row,v_name,sqlerrm,r);
      v_id:=null;
    end;
  end loop;

  update public.azienda_import_jobs
  set imported_rows=imported_rows+v_created,
      updated_rows=updated_rows+v_updated,
      duplicate_rows=duplicate_rows+v_duplicates,
      error_rows=error_rows+v_errors,
      current_batch=greatest(current_batch,p_batch_no),
      last_batch_at=now()
  where id=p_job_id;

  return jsonb_build_object('batch',p_batch_no,'created',v_created,'updated',v_updated,'duplicates',v_duplicates,'errors',v_errors);
end;
$$;

revoke all on function public.f1_import_companies_batch_v1(uuid,integer,uuid,text,jsonb) from public,anon;
grant execute on function public.f1_import_companies_batch_v1(uuid,integer,uuid,text,jsonb) to authenticated;
