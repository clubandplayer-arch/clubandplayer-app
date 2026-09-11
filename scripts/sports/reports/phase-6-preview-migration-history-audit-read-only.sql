-- Phase 6 Preview migration-history audit. Run only in the SQL Editor of
-- fase6-github (jbovlevodfouwuvtdlja). One read-only JSON result, no repair.
begin transaction read only;

with local_history(version, name) as (
  values
    ('20250220000000', 'initial_public_schema_baseline'),
    ('20250221090000', 'add_club_id_to_opportunities'),
    ('20250224090000', 'job5_messaging'),
    ('20250226090000', 'job5_notifications'),
    ('20250901084935', 'rls_policies_and_storage'),
    ('20250902', 'cp17_rls_policies'),
    ('20250912', 'feed_posts_applications'),
    ('20250918', 'feed_apps_rls_fix'),
    ('20250921', 'feed_apps_enforce'),
    ('20250923', 'supabase_security'),
    ('20250925', 'feed_link_preview'),
    ('20251002', 'social_layer'),
    ('20251006000000', 'replay_post_reactions_compatibility'),
    ('20251007', 'notifications_follows_reactions'),
    ('20251018', 'fix_notifications_follows_post_reactions'),
    ('20251115100000', 'add_category_to_opportunities'),
    ('20251126120000', 'add_club_motto_to_profiles'),
    ('20251126', 'feed_events'),
    ('20251127100000', 'harden_social_rls'),
    ('20251128120000', 'profiles_status_and_invites'),
    ('20251129120000', 'add_onboarding_dismiss_count'),
    ('20251202100000', 'ensure_posts_kind'),
    ('20251203090000', 'direct_messages_basic'),
    ('20251203100000', 'direct_messages_read_state'),
    ('20251205100000', 'add_missing_quoted_post_id'),
    ('20251205120000', 'align_posts_kind_normal'),
    ('20251210100000', 'job1_player_sections'),
    ('20251215103000', 'post_comments_select_public'),
    ('20251217120000', 'post_comments_repair'),
    ('20251219120000', 'rebuild_follows_with_profiles'),
    ('20251220110000', 'prevent_self_follow'),
    ('20251221100000', 'clean_messaging_schema'),
    ('20260105090000', 'profiles_public_read'),
    ('20260118120000', 'fix_athletes_view_display_name'),
    ('20260212090000', 'direct_messages_edit_delete'),
    ('20260301090000', 'reset_follow_messaging'),
    ('20260306093000', 'add_post_quotes'),
    ('20260309090000', 'add_profile_skills'),
    ('20260320120000', 'ensure_profile_skills_column'),
    ('20260321090000', 'direct_message_hidden_threads'),
    ('20260321123000', 'create_profile_skill_endorsements'),
    ('20260427130000', 'add_push_tokens'),
    ('20260429120000', 'grouped_push_queue'),
    ('20260511120000', 'lower_profiles_birth_year_min_to_1930'),
    ('20260524000150', 'registry_claims_replay_foundation'),
    ('202605240001', 'registry_master_v2'),
    ('202605240002', 'registry_claims_master_id'),
    ('20260603120000', 'public_repost_quote_visibility'),
    ('20260620120000', 'platform_admin_role'),
    ('20260620130000', 'institution_role_verification'),
    ('20260626120000', 'migrate_luciano_cesaretti_to_staff'),
    ('20260626130000', 'migrate_marcello_tajani_to_player'),
    ('20260702090000', 'add_cleared_at_to_hidden_threads'),
    ('20260702100000', 'migrate_davide_modica_to_player'),
    ('20260705090000', 'backfill_opportunity_club_name'),
    ('20260708090010', 'backfill_opportunity_club_name_priority'),
    ('20260708090500', 'fix_athletes_view_city'),
    ('20260712090000', 'align_club_name_and_role'),
    ('20260715090000', 'supabase_security_fixes'),
    ('20260717093000', 'players_view'),
    ('20260720100000', 'club_roster_members'),
    ('20260720101000', 'roster_unique_player'),
    ('20260720102000', 'roster_unique_player_sport'),
    ('20260720102500', 'normalize_pallavolo_to_volley'),
    ('20260720103000', 'seed_players_from_excel'),
    ('20260723090000', 'applications_mvp'),
    ('20260730090000', 'notifications_rls_select_user'),
    ('20260731090000', 'notifications_direct_messages_applications'),
    ('20260801090000', 'backfill_interest_labels'),
    ('20260805090000', 'ads_base'),
    ('20260806090000', 'ads_targets_province'),
    ('20260806091000', 'ad_events_rich_payload'),
    ('20260806100000', 'ads_campaigns_customer_fields'),
    ('20260807090000', 'ads_creatives_bucket'),
    ('20260807120000', 'migrate_luca_fabbrizio_to_staff'),
    ('20260808090000', 'club_verification_requests'),
    ('20260809090000', 'fix_club_verification_requests_rls'),
    ('20260809100000', 'fix_club_verification_fk'),
    ('20260809103000', 'fix_club_verification_requests_rls_final'),
    ('20260809110000', 'sync_profile_names'),
    ('20260809120000', 'share_links'),
    ('20260809143000', 'auto_approve_users'),
    ('20260810123000', 'players_view_add_links'),
    ('20260810130000', 'players_view_prefer_interest_location'),
    ('20260810133000', 'players_view_canonical_interest_labels'),
    ('20260810140000', 'draft_invalid_club_profiles'),
    ('20260810150000', 'profile_publication_status'),
    ('20260810160000', 'club_quality_moderation'),
    ('20260814120000', 'direct_message_images'),
    ('20260814130000', 'direct_message_image_policies'),
    ('20260814140000', 'direct_message_voice_notes'),
    ('20260814150000', 'direct_message_reactions'),
    ('20260818120000', 'profile_presence_and_read_receipts'),
    ('20260822120000', 'european_catalog_foundation'),
    ('20260822130000', 'european_profile_preferences'),
    ('20260824120000', 'european_geo_area_foundation'),
    ('20260824130000', 'relax_geo_area_code_uniqueness'),
    ('20260824140000', 'import_italy_legacy_geo_areas'),
    ('20260901090000', 'create_ad_leads'),
    ('20261001120000', 'post_media'),
    ('20261015100000', 'load_campania_into_canonical_geo_tables'),
    ('20261016100000', 'user_auth_providers'),
    ('20261030100000', 'ugc_reports_and_profile_blocks'),
    ('20261107110000', 'add_role_group_to_opportunities'),
    ('20261107123000', 'allow_staff_in_profiles_checks'),
    ('20261108100000', 'club_staff_members'),
    ('20261111100000', 'fix_notifications_profile_fks_on_delete'),
    ('20261112100000', 'registry_figc_import'),
    ('20261113090000', 'create_registry_claim_disputes'),
    ('20261113100000', 'add_registry_master_id_to_claim_disputes'),
    ('20261113110000', 'data_api_explicit_grants'),
    ('20261201090000', 'scalability_p0_indexes'),
    ('20261202090000', 'allow_institution_in_profiles_checks'),
    ('20261202091000', 'player_fan_votes'),
    ('20261202093000', 'migrate_ricceri_scaparra_to_players'),
    ('20261202100000', 'seed_fan_test_users'),
    ('20261202101000', 'fix_current_player_fan_vote_counts_security_invoker'),
    ('20261202110000', 'normalize_person_profile_names'),
    ('20261202120000', 'preserve_club_name_moderation_decisions'),
    ('20261203120000', 'profile_canonical_geography'),
    ('20261204120000', 'transactional_profile_residence_rpc'),
    ('20261204121000', 'profile_residence_trigger_guards'),
    ('20261204121500', 'profile_residence_database_canary'),
    ('20261205120000', 'opportunity_canonical_geography'),
    ('20261205121000', 'make_opportunity_city_nullable'),
    ('20261206120000', 'canonical_sports_competition_schema'),
    ('20261207120000', 'seed_controlled_sports_vocabulary'),
    ('20261208120000', 'profile_primary_sport'),
    ('20261209120000', 'athlete_experience_sport_context'),
    ('20261210120000', 'opportunity_canonical_sports_context'),
    ('20261211120000', 'add_seven_a_side_football_variant'),
    ('20261211130000', 'complete_profile_edit_schema'),
    ('20261211140000', 'restore_public_read_contracts'),
    ('20261211150000', 'restore_profile_geo_area_interest_read')
), remote_history as (
  select version::text as version, coalesce(to_jsonb(sm)->>'name', '') as name
  from supabase_migrations.schema_migrations sm
), required_profile_columns(column_name) as (
  values
    ('birth_place'), ('birth_country'), ('birth_region_id'), ('birth_province_id'), ('birth_municipality_id'),
    ('residence_region_id'), ('residence_province_id'), ('residence_municipality_id'), ('foot'), ('visibility'),
    ('notify_email_new_message'), ('club_foundation_year'), ('club_stadium'), ('club_stadium_address'),
    ('club_stadium_lat'), ('club_stadium_lng'), ('club_league_category'), ('club_motto')
)
select jsonb_build_object(
  'report', 'phase-6-preview-migration-history-v1',
  'expectedProjectRef', 'jbovlevodfouwuvtdlja',
  'remoteOnly', coalesce((
    select jsonb_agg(jsonb_build_object('version', r.version, 'remoteName', r.name) order by r.version)
    from remote_history r left join local_history l using (version) where l.version is null
  ), '[]'::jsonb),
  'localOnly', coalesce((
    select jsonb_agg(jsonb_build_object('version', l.version, 'localName', l.name) order by l.version)
    from local_history l left join remote_history r using (version) where r.version is null
  ), '[]'::jsonb),
  'sameVersionDifferentName', coalesce((
    select jsonb_agg(jsonb_build_object('version', l.version, 'localName', l.name, 'remoteName', r.name) order by l.version)
    from local_history l join remote_history r using (version)
    where r.name <> '' and r.name <> l.name
  ), '[]'::jsonb),
  -- Supabase CLI reconciles the two version sequences in version order.  These
  -- fields make an ordering problem visible instead of proving only set equality.
  'localVersionOrder', (
    select jsonb_agg(version order by version collate "C") from local_history
  ),
  'remoteVersionOrder', (
    select jsonb_agg(version order by version collate "C") from remote_history
  ),
  'orderedVersionsMatch', (
    (select array_agg(version order by version collate "C") from local_history)
      is not distinct from
    (select array_agg(version order by version collate "C") from remote_history)
  ),
  'remoteTail', coalesce((
    select jsonb_agg(x order by x.version) from (
      select version, name from remote_history order by version desc limit 20
    ) x
  ), '[]'::jsonb),
  'profileEditColumns', (
    select jsonb_object_agg(required.column_name, columns.column_name is not null order by required.column_name)
    from required_profile_columns required
    left join information_schema.columns columns
      on columns.table_schema='public' and columns.table_name='profiles' and columns.column_name=required.column_name
  )
) as phase_6_preview_migration_history_audit;

rollback;
