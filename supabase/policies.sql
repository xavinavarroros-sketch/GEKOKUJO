-- =====================================================================
-- SENGOKU JIDAI — Row Level Security
-- Run AFTER schema.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- HELPER FUNCTIONS (security definer so they can read freely)
-- ---------------------------------------------------------------------
create or replace function is_gm()
returns boolean language sql security definer stable as $$
  select coalesce((select is_gm from profiles where id = auth.uid()), false);
$$;

create or replace function my_clan_id()
returns uuid language sql security definer stable as $$
  select clan_id from profiles where id = auth.uid();
$$;

create or replace function current_turn()
returns int language sql security definer stable as $$
  select coalesce((select turn_number from seasons where is_current limit 1), 0);
$$;

-- Does my clan have full visibility on a province this turn?
create or replace function clan_can_see_province(p_province uuid)
returns boolean language sql security definer stable as $$
  select
    is_gm()
    or exists (select 1 from provinces where id = p_province and clan_id = my_clan_id())
    or exists (
      select 1 from armies a
      where a.current_province_id = p_province and a.clan_id = my_clan_id()
    )
    or exists (
      select 1 from province_visibility v
      where v.province_id = p_province
        and v.clan_id = my_clan_id()
        and (v.expires_at_season_turn is null or v.expires_at_season_turn >= current_turn())
    );
$$;

-- ---------------------------------------------------------------------
-- ENABLE RLS
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
alter table clans enable row level security;
alter table clan_positions enable row level security;
alter table seasons enable row level security;
alter table provinces enable row level security;
alter table subprovinces enable row level security;
alter table clan_resources enable row level security;
alter table player_resources enable row level security;
alter table province_resources enable row level security;
alter table subprovince_resources enable row level security;
alter table building_templates enable row level security;
alter table province_buildings enable row level security;
alter table subprovince_buildings enable row level security;
alter table unit_templates enable row level security;
alter table units enable row level security;
alter table armies enable row level security;
alter table movements enable row level security;
alter table battles enable row level security;
alter table battle_orders enable row level security;
alter table sieges enable row level security;
alter table taxes enable row level security;
alter table tax_payments enable row level security;
alter table clan_laws enable row level security;
alter table shogunate enable row level security;
alter table decrees enable row level security;
alter table graveyard enable row level security;
alter table province_visibility enable row level security;
alter table espionage_missions enable row level security;
alter table clan_intelligence_reports enable row level security;
alter table diplomacy enable row level security;
alter table treaties enable row level security;
alter table media_assets enable row level security;
alter table game_logs enable row level security;
alter table notifications enable row level security;
alter table announcements enable row level security;
alter table game_rules enable row level security;

-- ---------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------
create policy "profiles read all" on profiles for select using (true);
create policy "profiles self update" on profiles for update using (id = auth.uid() or is_gm());
create policy "profiles insert self" on profiles for insert with check (id = auth.uid());
create policy "profiles gm delete" on profiles for delete using (is_gm());

-- ---------------------------------------------------------------------
-- CLANS — public read (names, banners are public); writes by daimyo/gm
-- ---------------------------------------------------------------------
create policy "clans read all" on clans for select using (true);
create policy "clans gm all" on clans for all using (is_gm()) with check (is_gm());
create policy "clans daimyo update" on clans for update
  using (daimyo_id = auth.uid()) with check (daimyo_id = auth.uid());

-- ---------------------------------------------------------------------
-- CLAN POSITIONS — public read; gm manage; player claim handled via API
-- ---------------------------------------------------------------------
create policy "positions read all" on clan_positions for select using (true);
create policy "positions gm all" on clan_positions for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- SEASONS — public read; gm write
-- ---------------------------------------------------------------------
create policy "seasons read" on seasons for select using (true);
create policy "seasons gm" on seasons for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- PROVINCES — base row public (name/clan/state); details gated separately
-- ---------------------------------------------------------------------
create policy "provinces read public" on provinces for select using (true);
create policy "provinces gm all" on provinces for all using (is_gm()) with check (is_gm());

-- SUBPROVINCES — visible only with province visibility
create policy "subprovinces read visible" on subprovinces for select
  using (clan_can_see_province(province_id));
create policy "subprovinces gm all" on subprovinces for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- RESOURCES — gated by visibility (this is the fog-of-war core)
-- ---------------------------------------------------------------------
create policy "clan_resources owner" on clan_resources for select
  using (is_gm() or clan_id = my_clan_id());
create policy "clan_resources gm write" on clan_resources for all using (is_gm()) with check (is_gm());

create policy "player_resources self" on player_resources for select
  using (is_gm() or player_id = auth.uid()
    or exists (select 1 from clans c where c.daimyo_id = auth.uid()
               and c.id = (select clan_id from profiles where id = player_resources.player_id)));
create policy "player_resources gm write" on player_resources for all using (is_gm()) with check (is_gm());

create policy "province_resources visible" on province_resources for select
  using (clan_can_see_province(province_id));
create policy "province_resources gm write" on province_resources for all using (is_gm()) with check (is_gm());

create policy "subprovince_resources visible" on subprovince_resources for select
  using (exists (select 1 from subprovinces s where s.id = subprovince_resources.subprovince_id
                 and clan_can_see_province(s.province_id)));
create policy "subprovince_resources gm write" on subprovince_resources for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- BUILDINGS
-- ---------------------------------------------------------------------
create policy "building_templates read" on building_templates for select using (true);
create policy "building_templates gm" on building_templates for all using (is_gm()) with check (is_gm());

create policy "province_buildings visible" on province_buildings for select
  using (clan_can_see_province(province_id));
create policy "province_buildings gm" on province_buildings for all using (is_gm()) with check (is_gm());

create policy "subprovince_buildings visible" on subprovince_buildings for select
  using (exists (select 1 from subprovinces s where s.id = subprovince_buildings.subprovince_id
                 and clan_can_see_province(s.province_id)));
create policy "subprovince_buildings gm" on subprovince_buildings for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- UNITS & ARMIES — only own clan sees exact composition (+gm)
-- ---------------------------------------------------------------------
create policy "unit_templates read" on unit_templates for select using (true);
create policy "unit_templates gm" on unit_templates for all using (is_gm()) with check (is_gm());

create policy "units own clan" on units for select
  using (is_gm() or clan_id = my_clan_id());
create policy "units gm write" on units for all using (is_gm()) with check (is_gm());

create policy "armies own clan" on armies for select
  using (is_gm() or clan_id = my_clan_id());
create policy "armies gm write" on armies for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- MOVEMENTS / BATTLES / SIEGES
-- ---------------------------------------------------------------------
create policy "movements own" on movements for select
  using (is_gm() or exists (select 1 from armies a where a.id = movements.army_id and a.clan_id = my_clan_id()));
create policy "movements gm" on movements for all using (is_gm()) with check (is_gm());

create policy "battles involved" on battles for select
  using (is_gm() or attacker_clan_id = my_clan_id() or defender_clan_id = my_clan_id());
create policy "battles gm" on battles for all using (is_gm()) with check (is_gm());

create policy "battle_orders own" on battle_orders for select
  using (is_gm() or clan_id = my_clan_id());
create policy "battle_orders insert own" on battle_orders for insert
  with check (clan_id = my_clan_id() or is_gm());
create policy "battle_orders update own" on battle_orders for update
  using (clan_id = my_clan_id() or is_gm());

create policy "sieges involved" on sieges for select
  using (is_gm() or attacker_clan_id = my_clan_id() or defender_clan_id = my_clan_id());
create policy "sieges gm" on sieges for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- TAXES & LAWS
-- ---------------------------------------------------------------------
create policy "taxes clan" on taxes for select using (is_gm() or clan_id = my_clan_id());
create policy "taxes gm" on taxes for all using (is_gm()) with check (is_gm());

create policy "tax_payments clan" on tax_payments for select using (is_gm() or clan_id = my_clan_id());
create policy "tax_payments gm" on tax_payments for all using (is_gm()) with check (is_gm());

create policy "laws read clan" on clan_laws for select using (true);
create policy "laws gm" on clan_laws for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- SHOGUNATE / DECREES — public read
-- ---------------------------------------------------------------------
create policy "shogunate read" on shogunate for select using (true);
create policy "shogunate gm" on shogunate for all using (is_gm()) with check (is_gm());
create policy "decrees read" on decrees for select using (true);
create policy "decrees gm" on decrees for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- GRAVEYARD — public read
-- ---------------------------------------------------------------------
create policy "graveyard read" on graveyard for select using (true);
create policy "graveyard gm" on graveyard for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- VISIBILITY / ESPIONAGE / INTEL — only own clan + gm
-- ---------------------------------------------------------------------
create policy "visibility own" on province_visibility for select using (is_gm() or clan_id = my_clan_id());
create policy "visibility gm" on province_visibility for all using (is_gm()) with check (is_gm());

create policy "espionage own" on espionage_missions for select
  using (is_gm() or sending_clan_id = my_clan_id()
    or (discovered and reveal_attacker and discovered_by_clan_id = my_clan_id()));
create policy "espionage gm" on espionage_missions for all using (is_gm()) with check (is_gm());

create policy "intel own" on clan_intelligence_reports for select using (is_gm() or clan_id = my_clan_id());
create policy "intel gm" on clan_intelligence_reports for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- DIPLOMACY / TREATIES — involved clans + gm
-- ---------------------------------------------------------------------
create policy "diplomacy involved" on diplomacy for select
  using (is_gm() or clan_a = my_clan_id() or clan_b = my_clan_id());
create policy "diplomacy gm" on diplomacy for all using (is_gm()) with check (is_gm());
create policy "treaties read" on treaties for select using (true);
create policy "treaties gm" on treaties for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- MEDIA / LOGS / NOTIFICATIONS / ANNOUNCEMENTS / RULES
-- ---------------------------------------------------------------------
create policy "media read" on media_assets for select using (true);
create policy "media gm" on media_assets for all using (is_gm()) with check (is_gm());

create policy "logs clan" on game_logs for select using (is_gm() or clan_id = my_clan_id() or clan_id is null);
create policy "logs gm" on game_logs for all using (is_gm()) with check (is_gm());

create policy "notif self" on notifications for select using (is_gm() or recipient_id = auth.uid());
create policy "notif self update" on notifications for update using (recipient_id = auth.uid() or is_gm());
create policy "notif gm" on notifications for all using (is_gm()) with check (is_gm());

create policy "announcements read" on announcements for select using (true);
create policy "announcements gm" on announcements for all using (is_gm()) with check (is_gm());

create policy "rules read" on game_rules for select using (true);
create policy "rules gm" on game_rules for all using (is_gm()) with check (is_gm());

-- ---------------------------------------------------------------------
-- AUTO-CREATE PROFILE ON SIGNUP
-- ---------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, character_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'character_name', 'Wandering Ronin'))
  on conflict (id) do nothing;
  insert into player_resources (player_id) values (new.id) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
