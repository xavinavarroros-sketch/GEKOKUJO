-- =====================================================================
-- SENGOKU JIDAI — Complete Supabase Schema
-- Run this in the Supabase SQL Editor (entire file at once).
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('gm','daimyo','vassal','commander','unassigned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type clan_status as enum ('active','destroyed','subjugated','rebel','shogunate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type season_name as enum ('spring','summer','autumn','winter');
exception when duplicate_object then null; end $$;

do $$ begin
  create type province_state as enum ('normal','at_war','under_siege','rebellion','devastated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subprovince_type as enum ('central','vassal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type building_state as enum ('constructing','active','damaged','destroyed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type unit_status as enum ('creating','active','damaged','destroyed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type army_state as enum ('idle','marching','besieging','in_battle','retreating','garrisoned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type army_posture as enum ('normal_march','forced_march','defensive','ambush','raid','siege','retreat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type battle_state as enum ('pending','awaiting_orders','resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type siege_state as enum ('ongoing','castle_holds','castle_fell','negotiated','lifted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type espionage_status as enum ('sent','success','failure','captured','executed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visibility_type as enum ('owner','army_present','espionage','gm_granted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type death_cause as enum ('battle','execution','siege','illness','rebellion','seppuku','other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- CORE: profiles, clans, members, seasons
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  character_name text not null default 'Wandering Ronin',
  role user_role not null default 'unassigned',
  clan_id uuid,
  is_gm boolean not null default false,
  approved boolean not null default true,
  blocked boolean not null default false,
  avatar_url text,
  honor int not null default 0,
  fame int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists clans (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text default '',
  banner_url text,
  mon_url text,
  color text not null default '#a01f1f',
  daimyo_id uuid references profiles(id) on delete set null,
  capital_province_id uuid,
  status clan_status not null default 'active',
  controls_shogunate boolean not null default false,
  prestige int not null default 0,
  laws text default '',
  conquest_history jsonb not null default '[]',
  max_vassals int not null default 2,
  created_at timestamptz not null default now()
);

alter table profiles
  drop constraint if exists profiles_clan_fk;
alter table profiles
  add constraint profiles_clan_fk foreign key (clan_id) references clans(id) on delete set null;

-- positions inside a clan, locked once taken
create table if not exists clan_positions (
  id uuid primary key default uuid_generate_v4(),
  clan_id uuid not null references clans(id) on delete cascade,
  title text not null,                 -- 'Daimyo', 'Vassal 1', 'Vassal 2', custom
  role user_role not null default 'vassal',
  occupied_by uuid references profiles(id) on delete set null,
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists seasons (
  id uuid primary key default uuid_generate_v4(),
  year int not null,
  season season_name not null,
  turn_number int not null,
  is_current boolean not null default false,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- MAP: provinces, subprovinces
-- ---------------------------------------------------------------------
create table if not exists provinces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  region text,
  clan_id uuid references clans(id) on delete set null,
  owner_player_id uuid references profiles(id) on delete set null,
  has_main_castle boolean not null default true,
  castle_level int not null default 1,
  defensive_value int not null default 10,
  strategic_value int not null default 5,
  state province_state not null default 'normal',
  special_building text,           -- unique regional advantage
  -- map geometry
  svg_path text,                   -- optional polygon path
  map_x numeric,                   -- centroid for label/marker
  map_y numeric,
  created_at timestamptz not null default now()
);

alter table clans
  drop constraint if exists clans_capital_fk;
alter table clans
  add constraint clans_capital_fk foreign key (capital_province_id) references provinces(id) on delete set null;

create table if not exists subprovinces (
  id uuid primary key default uuid_generate_v4(),
  province_id uuid not null references provinces(id) on delete cascade,
  name text not null,
  type subprovince_type not null default 'vassal',
  controller_id uuid references profiles(id) on delete set null,   -- daimyo or vassal
  clan_id uuid references clans(id) on delete set null,
  in_rebellion boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- RESOURCES (koku, food, horses, population only)
-- ---------------------------------------------------------------------
create table if not exists clan_resources (
  clan_id uuid primary key references clans(id) on delete cascade,
  koku numeric not null default 0,
  food numeric not null default 0,
  horses numeric not null default 0,
  total_population numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists player_resources (
  player_id uuid primary key references profiles(id) on delete cascade,
  koku numeric not null default 0,
  food numeric not null default 0,
  horses numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists province_resources (
  province_id uuid primary key references provinces(id) on delete cascade,
  koku_output numeric not null default 0,
  food_output numeric not null default 0,
  horse_output numeric not null default 0,
  population numeric not null default 0,
  devastation_level int not null default 0,   -- 0..100
  updated_at timestamptz not null default now()
);

create table if not exists subprovince_resources (
  subprovince_id uuid primary key references subprovinces(id) on delete cascade,
  koku_output numeric not null default 0,
  food_output numeric not null default 0,
  horse_output numeric not null default 0,
  population numeric not null default 0,
  devastation_level int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- BUILDINGS
-- ---------------------------------------------------------------------
create table if not exists building_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,             -- economy/food/military/culture/special
  description text default '',
  koku_cost numeric not null default 0,
  food_cost numeric not null default 0,
  build_seasons int not null default 1,
  production jsonb not null default '{}',   -- {koku: x, food: y, horses: z}
  bonuses jsonb not null default '{}',
  requirements text default '',
  is_special boolean not null default false,
  icon text default 'building'
);

create table if not exists province_buildings (
  id uuid primary key default uuid_generate_v4(),
  province_id uuid not null references provinces(id) on delete cascade,
  template_id uuid not null references building_templates(id),
  state building_state not null default 'constructing',
  seasons_remaining int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists subprovince_buildings (
  id uuid primary key default uuid_generate_v4(),
  subprovince_id uuid not null references subprovinces(id) on delete cascade,
  template_id uuid not null references building_templates(id),
  state building_state not null default 'constructing',
  seasons_remaining int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- UNITS & ARMIES
-- ---------------------------------------------------------------------
create table if not exists unit_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null,                 -- infantry/cavalry/siege/special
  size_max int not null default 500,
  koku_cost numeric not null default 0,
  food_cost numeric not null default 0,
  population_cost numeric not null default 0,
  horse_cost numeric not null default 0,
  koku_maintenance numeric not null default 0,
  food_maintenance numeric not null default 0,
  attack int not null default 10,
  defense int not null default 10,
  morale int not null default 50,
  movement int not null default 1,
  creation_time_seasons int not null default 1,
  requirements text default '',
  description text default ''
);

create table if not exists armies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  clan_id uuid not null references clans(id) on delete cascade,
  commander_id uuid references profiles(id) on delete set null,
  current_province_id uuid references provinces(id) on delete set null,
  destination_province_id uuid references provinces(id) on delete set null,
  state army_state not null default 'idle',
  posture army_posture not null default 'normal_march',
  seasons_to_arrival int not null default 0,
  supplies numeric not null default 100,
  morale numeric not null default 50,
  speed int not null default 1,
  last_action text default '',
  created_at timestamptz not null default now()
);

create table if not exists units (
  id uuid primary key default uuid_generate_v4(),
  unit_template_id uuid not null references unit_templates(id),
  clan_id uuid not null references clans(id) on delete cascade,
  owner_player_id uuid references profiles(id) on delete set null,
  army_id uuid references armies(id) on delete set null,
  name text,
  current_strength int not null default 0,
  max_strength int not null default 500,
  population_origin_province_id uuid references provinces(id) on delete set null,
  population_origin_subprovince_id uuid references subprovinces(id) on delete set null,
  status unit_status not null default 'creating',
  experience int not null default 0,
  morale int not null default 50,
  seasons_remaining int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- MOVEMENTS, BATTLES, SIEGES
-- ---------------------------------------------------------------------
create table if not exists movements (
  id uuid primary key default uuid_generate_v4(),
  army_id uuid not null references armies(id) on delete cascade,
  from_province_id uuid references provinces(id),
  to_province_id uuid references provinces(id),
  posture army_posture not null default 'normal_march',
  season_id uuid references seasons(id),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists battles (
  id uuid primary key default uuid_generate_v4(),
  province_id uuid references provinces(id) on delete set null,
  season_id uuid references seasons(id),
  attacker_army_id uuid references armies(id) on delete set null,
  defender_army_id uuid references armies(id) on delete set null,
  attacker_clan_id uuid references clans(id),
  defender_clan_id uuid references clans(id),
  state battle_state not null default 'pending',
  result text,
  log jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists battle_orders (
  id uuid primary key default uuid_generate_v4(),
  battle_id uuid not null references battles(id) on delete cascade,
  player_id uuid references profiles(id),
  clan_id uuid references clans(id),
  is_attacker boolean not null,
  orders jsonb not null default '[]',   -- up to 3 chosen orders
  submitted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists sieges (
  id uuid primary key default uuid_generate_v4(),
  province_id uuid not null references provinces(id) on delete cascade,
  season_id uuid references seasons(id),
  attacker_army_id uuid references armies(id) on delete set null,
  defender_clan_id uuid references clans(id),
  attacker_clan_id uuid references clans(id),
  castle_defense int not null default 50,
  state siege_state not null default 'ongoing',
  seasons_elapsed int not null default 0,
  attacker_order text,
  defender_order text,
  log jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- TAXES & LAWS
-- ---------------------------------------------------------------------
create table if not exists taxes (
  id uuid primary key default uuid_generate_v4(),
  clan_id uuid not null references clans(id) on delete cascade,
  target_player_id uuid references profiles(id),
  target_province_id uuid references provinces(id),
  target_subprovince_id uuid references subprovinces(id),
  koku_due numeric not null default 0,
  food_due numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists tax_payments (
  id uuid primary key default uuid_generate_v4(),
  tax_id uuid references taxes(id) on delete cascade,
  clan_id uuid references clans(id),
  payer_id uuid references profiles(id),
  season_id uuid references seasons(id),
  koku_paid numeric not null default 0,
  food_paid numeric not null default 0,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists clan_laws (
  id uuid primary key default uuid_generate_v4(),
  clan_id uuid not null references clans(id) on delete cascade,
  content text not null,
  edited_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- SHOGUNATE
-- ---------------------------------------------------------------------
create table if not exists shogunate (
  id uuid primary key default uuid_generate_v4(),
  clan_id uuid references clans(id) on delete set null,
  shogun_player_id uuid references profiles(id) on delete set null,
  appointed_at timestamptz not null default now(),
  active boolean not null default true
);

create table if not exists decrees (
  id uuid primary key default uuid_generate_v4(),
  shogunate_id uuid references shogunate(id) on delete cascade,
  title text not null,
  body text not null,
  target_clan_id uuid references clans(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- GRAVEYARD
-- ---------------------------------------------------------------------
create table if not exists graveyard (
  id uuid primary key default uuid_generate_v4(),
  character_name text not null,
  clan_id uuid references clans(id) on delete set null,
  clan_name text,
  title text,
  cause death_cause not null default 'battle',
  season_label text,
  executed_by text,
  location text,
  image_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ESPIONAGE & VISIBILITY
-- ---------------------------------------------------------------------
create table if not exists province_visibility (
  id uuid primary key default uuid_generate_v4(),
  clan_id uuid not null references clans(id) on delete cascade,
  province_id uuid not null references provinces(id) on delete cascade,
  visibility_type visibility_type not null,
  season_id uuid references seasons(id),
  expires_at_season_turn int,
  created_at timestamptz not null default now()
);

create table if not exists espionage_missions (
  id uuid primary key default uuid_generate_v4(),
  sending_clan_id uuid not null references clans(id) on delete cascade,
  target_province_id uuid not null references provinces(id) on delete cascade,
  season_id uuid references seasons(id),
  koku_cost numeric not null default 100,
  success_chance int not null default 60,
  status espionage_status not null default 'sent',
  result_summary text,
  revealed_data jsonb,
  discovered boolean not null default false,
  discovered_by_clan_id uuid references clans(id),
  reveal_attacker boolean not null default false,
  expires_at_season_turn int,
  forced_outcome text,                 -- gm can force 'success'/'failure'/'captured'
  created_at timestamptz not null default now()
);

create table if not exists clan_intelligence_reports (
  id uuid primary key default uuid_generate_v4(),
  clan_id uuid not null references clans(id) on delete cascade,
  province_id uuid not null references provinces(id) on delete cascade,
  espionage_mission_id uuid references espionage_missions(id) on delete cascade,
  season_id uuid references seasons(id),
  report_data jsonb not null default '{}',
  expires_at_season_turn int,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- DIPLOMACY
-- ---------------------------------------------------------------------
create table if not exists diplomacy (
  id uuid primary key default uuid_generate_v4(),
  clan_a uuid references clans(id) on delete cascade,
  clan_b uuid references clans(id) on delete cascade,
  relation text not null default 'neutral',   -- ally/war/neutral/vassal/truce
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists treaties (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  clan_a uuid references clans(id),
  clan_b uuid references clans(id),
  terms text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- MEDIA, LOGS, NOTIFICATIONS, ANNOUNCEMENTS, RULES
-- ---------------------------------------------------------------------
create table if not exists media_assets (
  id uuid primary key default uuid_generate_v4(),
  section text not null,              -- cover/clan/province/building/unit/event/season/lore
  ref_id uuid,
  title text,
  url text not null,
  body text,
  created_at timestamptz not null default now()
);

create table if not exists game_logs (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  message text not null,
  clan_id uuid references clans(id),
  actor_id uuid references profiles(id),
  season_id uuid references seasons(id),
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid references profiles(id) on delete cascade,
  clan_id uuid references clans(id),
  type text not null,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  by_shogun boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists game_rules (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value jsonb not null default '{}',
  description text
);

-- ---------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------
create index if not exists idx_profiles_clan on profiles(clan_id);
create index if not exists idx_provinces_clan on provinces(clan_id);
create index if not exists idx_subprovinces_province on subprovinces(province_id);
create index if not exists idx_units_clan on units(clan_id);
create index if not exists idx_units_army on units(army_id);
create index if not exists idx_armies_clan on armies(clan_id);
create index if not exists idx_armies_province on armies(current_province_id);
create index if not exists idx_visibility_clan on province_visibility(clan_id, province_id);
create index if not exists idx_espionage_clan on espionage_missions(sending_clan_id);
create index if not exists idx_logs_clan on game_logs(clan_id);
create index if not exists idx_notif_recipient on notifications(recipient_id);

-- =====================================================================
-- See policies.sql for RLS and seed.sql for seed data.
-- =====================================================================
