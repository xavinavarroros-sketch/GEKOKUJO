export type UserRole = 'gm' | 'daimyo' | 'vassal' | 'commander' | 'unassigned';
export type ClanStatus = 'active' | 'destroyed' | 'subjugated' | 'rebel' | 'shogunate';
export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';
export type ProvinceState = 'normal' | 'at_war' | 'under_siege' | 'rebellion' | 'devastated';
export type BuildingState = 'constructing' | 'active' | 'damaged' | 'destroyed';
export type UnitStatus = 'creating' | 'active' | 'damaged' | 'destroyed';
export type ArmyState = 'idle' | 'marching' | 'besieging' | 'in_battle' | 'retreating' | 'garrisoned';
export type ArmyPosture = 'normal_march' | 'forced_march' | 'defensive' | 'ambush' | 'raid' | 'siege' | 'retreat';
export type EspionageStatus = 'sent' | 'success' | 'failure' | 'captured' | 'executed';
export type VisibilityType = 'owner' | 'army_present' | 'espionage' | 'gm_granted';

export interface Profile {
  id: string;
  email: string | null;
  character_name: string;
  role: UserRole;
  clan_id: string | null;
  is_gm: boolean;
  approved: boolean;
  blocked: boolean;
  avatar_url: string | null;
  honor: number;
  fame: number;
}

export interface Clan {
  id: string;
  name: string;
  description: string;
  banner_url: string | null;
  mon_url: string | null;
  color: string;
  daimyo_id: string | null;
  capital_province_id: string | null;
  status: ClanStatus;
  controls_shogunate: boolean;
  prestige: number;
  laws: string;
  max_vassals: number;
}

export interface ClanPosition {
  id: string;
  clan_id: string;
  title: string;
  role: UserRole;
  occupied_by: string | null;
  locked: boolean;
}

export interface Season {
  id: string;
  year: number;
  season: SeasonName;
  turn_number: number;
  is_current: boolean;
  resolved: boolean;
}

export interface Province {
  id: string;
  name: string;
  region: string | null;
  clan_id: string | null;
  owner_player_id: string | null;
  has_main_castle: boolean;
  castle_level: number;
  defensive_value: number;
  strategic_value: number;
  state: ProvinceState;
  special_building: string | null;
  svg_path: string | null;
  map_x: number | null;
  map_y: number | null;
}

export interface ProvinceResources {
  province_id: string;
  koku_output: number;
  food_output: number;
  horse_output: number;
  population: number;
  devastation_level: number;
}

export interface Subprovince {
  id: string;
  province_id: string;
  name: string;
  type: 'central' | 'vassal';
  controller_id: string | null;
  clan_id: string | null;
  in_rebellion: boolean;
}

export interface ClanResources {
  clan_id: string;
  koku: number;
  food: number;
  horses: number;
  total_population: number;
}

export interface UnitTemplate {
  id: string;
  name: string;
  type: string;
  size_max: number;
  koku_cost: number;
  food_cost: number;
  population_cost: number;
  horse_cost: number;
  koku_maintenance: number;
  food_maintenance: number;
  attack: number;
  defense: number;
  morale: number;
  movement: number;
  creation_time_seasons: number;
  description: string;
}

export interface Unit {
  id: string;
  unit_template_id: string;
  clan_id: string;
  owner_player_id: string | null;
  army_id: string | null;
  name: string | null;
  current_strength: number;
  max_strength: number;
  status: UnitStatus;
  experience: number;
  morale: number;
  seasons_remaining: number;
}

export interface Army {
  id: string;
  name: string;
  clan_id: string;
  commander_id: string | null;
  current_province_id: string | null;
  destination_province_id: string | null;
  state: ArmyState;
  posture: ArmyPosture;
  seasons_to_arrival: number;
  supplies: number;
  morale: number;
  speed: number;
  last_action: string;
}

export interface BuildingTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  koku_cost: number;
  food_cost: number;
  build_seasons: number;
  production: Record<string, number>;
  bonuses: Record<string, unknown>;
  is_special: boolean;
  icon: string;
}

export interface EspionageMission {
  id: string;
  sending_clan_id: string;
  target_province_id: string;
  koku_cost: number;
  success_chance: number;
  status: EspionageStatus;
  result_summary: string | null;
  revealed_data: Record<string, unknown> | null;
  discovered: boolean;
  expires_at_season_turn: number | null;
  created_at: string;
}

export interface GraveyardEntry {
  id: string;
  character_name: string;
  clan_name: string | null;
  title: string | null;
  cause: string;
  season_label: string | null;
  executed_by: string | null;
  location: string | null;
  image_url: string | null;
  notes: string | null;
}

export interface GameLog {
  id: string;
  type: string;
  message: string;
  clan_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

/** Fog-of-war troop strength buckets shown to non-owners */
export type TroopHint = 'none' | 'small' | 'medium' | 'large' | 'unknown';
