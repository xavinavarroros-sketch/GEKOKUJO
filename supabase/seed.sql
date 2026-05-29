-- =====================================================================
-- SENGOKU JIDAI — Seed Data
-- Run AFTER schema.sql and policies.sql.
-- =====================================================================

-- ---------- CURRENT SEASON ----------
insert into seasons (year, season, turn_number, is_current)
values (1560, 'spring', 1, true)
on conflict do nothing;

-- ---------- GAME RULES ----------
insert into game_rules (key, value, description) values
  ('devastation', '{"minor_raid":5,"severe_raid":15,"total":30}', 'Population % loss per devastation tier'),
  ('espionage', '{"base_cost":100,"base_chance":60,"visibility_seasons":1,"capture_chance":20}', 'Ninja mission defaults'),
  ('movement', '{"base_speed":1,"forced_march_supply_cost":20}', 'Army movement settings')
on conflict (key) do nothing;

-- ---------- BUILDING TEMPLATES ----------
insert into building_templates (name, category, description, koku_cost, food_cost, build_seasons, production, bonuses, is_special, icon) values
  ('Market','economy','A bustling market generating koku each season.',300,50,1,'{"koku":40}','{}',false,'coins'),
  ('Harbor','economy','Coastal trade hub.',500,100,2,'{"koku":70}','{}',false,'anchor'),
  ('Artisan Workshop','economy','Craftsmen producing goods.',250,40,1,'{"koku":30}','{}',false,'hammer'),
  ('Merchant House','economy','Wealthy merchant family.',400,60,2,'{"koku":55}','{}',false,'building'),
  ('Mint','economy','Coins the realm itself.',700,80,2,'{"koku":100}','{}',false,'coins'),
  ('Rice Paddies','food','Flooded fields of rice.',200,0,1,'{"food":80}','{}',false,'wheat'),
  ('Granary','food','Stores food against famine.',150,0,1,'{"food":30}','{"food_storage":500}',false,'warehouse'),
  ('Irrigation System','food','Improves crop yields.',300,50,2,'{"food":60}','{}',false,'droplets'),
  ('Watermill','food','Mills grain efficiently.',180,20,1,'{"food":40}','{}',false,'wind'),
  ('Dojo','military','Trains elite warriors.',350,80,2,'{}','{"unit_xp":10}',false,'swords'),
  ('Samurai Barracks','military','Houses samurai retainers.',400,100,2,'{}','{"recruit_cap":2}',false,'shield'),
  ('Ashigaru Training Ground','military','Drills peasant levies.',200,60,1,'{}','{"recruit_cap":1}',false,'users'),
  ('Stable','military','Breeds warhorses.',300,40,2,'{"horses":50}','{}',false,'horse'),
  ('Armory','military','Forges arms and armor.',350,30,2,'{}','{"attack":2}',false,'sword'),
  ('Bowyer Workshop','military','Crafts yumi and arrows.',250,20,1,'{}','{"ranged":2}',false,'target'),
  ('Foundry','military','Casts cannon and teppo.',900,120,3,'{}','{"firearms":true}',false,'flame'),
  ('Walls','military','Stone fortifications.',600,40,2,'{}','{"defense":15}',false,'castle'),
  ('Watchtower','military','Spots approaching enemies.',200,20,1,'{}','{"scout":true}',false,'eye'),
  ('Temple','culture','A place of worship and learning.',300,60,2,'{"koku":20}','{"honor":5}',false,'flower'),
  ('Shrine','culture','Honors the kami.',250,40,1,'{}','{"honor":3}',false,'torii'),
  ('Scribe School','culture','Educates administrators.',350,50,2,'{"koku":15}','{"admin":2}',false,'scroll'),
  ('Daimyo Residence','culture','Seat of the lord.',800,100,3,'{}','{"prestige":10}',false,'crown'),
  ('Ceremonial Gardens','culture','Gardens of contemplation.',400,30,2,'{}','{"honor":4}',false,'flower');

-- Special buildings (unique regional advantages)
insert into building_templates (name, category, description, koku_cost, food_cost, build_seasons, production, bonuses, is_special, icon) values
  ('Silver Mine','special','Rich veins of silver.',0,0,0,'{"koku":150}','{}',true,'gem'),
  ('Foreign Trade Port','special','Trades with Nanban ships.',0,0,0,'{"koku":120}','{"firearms":true}',true,'ship'),
  ('Famous Shrine','special','Pilgrims bring wealth and honor.',0,0,0,'{"koku":60}','{"honor":15}',true,'torii'),
  ('Legendary Castle','special','An impregnable fortress.',0,0,0,'{}','{"defense":40}',true,'castle'),
  ('Fertile Paddies','special','The most fertile land in Japan.',0,0,0,'{"food":200}','{}',true,'wheat'),
  ('Horse Market','special','Finest warhorses in the realm.',0,0,0,'{"horses":120}','{}',true,'horse');

-- ---------- UNIT TEMPLATES ----------
insert into unit_templates (name, type, size_max, koku_cost, food_cost, population_cost, horse_cost, koku_maintenance, food_maintenance, attack, defense, morale, movement, creation_time_seasons, description) values
  ('Ashigaru (Yari)','infantry',500,100,50,500,0,20,30,12,14,40,1,1,'Peasant spearmen, the backbone of any army.'),
  ('Ashigaru (Bow)','infantry',500,120,50,500,0,22,30,16,8,38,1,1,'Peasant archers raining arrows on the foe.'),
  ('Ashigaru (Sword)','infantry',500,110,50,500,0,20,30,14,12,40,1,1,'Peasant swordsmen for close combat.'),
  ('Samurai (Katana)','infantry',300,300,80,300,0,50,40,28,24,70,1,2,'Elite warriors of the bushi class.'),
  ('Samurai (Yari)','infantry',300,300,80,300,0,50,40,26,28,70,1,2,'Samurai spearmen, disciplined and deadly.'),
  ('Warrior Monks','infantry',300,260,70,300,0,40,40,30,22,80,1,2,'Sohei zealots who fear no death.'),
  ('Samurai Cavalry','cavalry',200,400,100,200,200,80,60,34,26,75,2,2,'Mounted samurai who shatter enemy lines.'),
  ('Mounted Archers','cavalry',200,420,100,200,200,82,60,30,18,70,2,2,'Horsemen loosing arrows at the gallop.'),
  ('Light Cavalry','cavalry',250,300,80,250,250,60,55,24,16,60,3,1,'Fast riders for scouting and pursuit.'),
  ('Siege Engineers','siege',150,250,60,150,0,40,30,8,10,50,1,1,'Builders of siege machinery.'),
  ('Battering Ram','siege',50,200,20,50,0,20,15,5,5,40,1,1,'Smashes castle gates.'),
  ('Siege Tower','siege',50,350,30,50,0,30,20,6,8,40,1,2,'Allows troops to scale the walls.'),
  ('Shinobi','special',50,300,20,50,0,30,15,20,12,60,3,2,'Ninja agents for espionage and sabotage.'),
  ('Daimyo Guard','special',100,500,100,100,0,90,50,36,40,90,1,2,'The lord''s personal elite bodyguard.'),
  ('Teppo Ashigaru','special',300,400,60,300,0,60,40,40,10,45,1,2,'Matchlock gunners (requires Foundry/Trade Port).'),
  ('Ronin','special',300,200,60,0,0,45,40,22,18,45,1,1,'Hired masterless samurai (no population cost).');

-- ---------- CLANS ----------
-- Note: daimyo assigned later when players register. Colors are historical-ish.
insert into clans (name, description, color, status, prestige, laws) values
  ('Oda','Ambitious clan of Owari, masters of innovation and firearms.','#3b3b3b','active',20,'The realm shall be unified under heaven. Tenka Fubu.'),
  ('Takeda','The mountain clan of Kai, famed for unmatched cavalry.','#7d1414','active',18,'Swift as wind, silent as forest, fierce as fire, immovable as mountain.'),
  ('Uesugi','Honorable warriors of Echigo, the Dragon of the North.','#27384a','active',16,'Honor and the way of the warrior above all.'),
  ('Mori','Lords of the western sea, commanding mighty fleets.','#4a5a3a','active',15,'The three arrows bound together cannot be broken.'),
  ('Shimazu','Fierce clan of Satsuma, the southern tigers.','#9c7c2c','active',14,'Conquer through courage and fire.');

-- ---------- CLAN POSITIONS (Daimyo + 2 Vassals each) ----------
insert into clan_positions (clan_id, title, role)
select id, 'Daimyo', 'daimyo' from clans;
insert into clan_positions (clan_id, title, role)
select id, 'Vassal I', 'vassal' from clans;
insert into clan_positions (clan_id, title, role)
select id, 'Vassal II', 'vassal' from clans;

-- ---------- CLAN RESOURCES ----------
insert into clan_resources (clan_id, koku, food, horses, total_population)
select id, 2000, 1500, 300, 60000 from clans
on conflict do nothing;

-- ---------- PROVINCES (stylized map of Japan) ----------
-- map_x / map_y are percentage coordinates on the SVG (0-1000 viewBox).
do $$
declare
  oda uuid; takeda uuid; uesugi uuid; mori uuid; shimazu uuid;
  pid uuid;
begin
  select id into oda from clans where name='Oda';
  select id into takeda from clans where name='Takeda';
  select id into uesugi from clans where name='Uesugi';
  select id into mori from clans where name='Mori';
  select id into shimazu from clans where name='Shimazu';

  -- helper inline: insert province + resources + 3 subprovinces
  -- Owari (Oda capital)
  insert into provinces (name, region, clan_id, special_building, map_x, map_y, strategic_value, defensive_value)
    values ('Owari','Tokai',oda,'Foreign Trade Port',560,560,9,20) returning id into pid;
  update clans set capital_province_id = pid where id = oda;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,120,180,20,20000);
  insert into subprovinces (province_id,name,type,clan_id) values (pid,'Kiyosu','central',oda),(pid,'Atsuta','vassal',oda),(pid,'Tsushima','vassal',oda);

  -- Mino
  insert into provinces (name, region, clan_id, map_x, map_y, strategic_value, defensive_value)
    values ('Mino','Tokai',oda,540,520,7,16) returning id into pid;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,90,140,15,16000);
  insert into subprovinces (province_id,name,type,clan_id) values (pid,'Gifu','central',oda),(pid,'Ogaki','vassal',oda),(pid,'Iwamura','vassal',oda);

  -- Kai (Takeda capital)
  insert into provinces (name, region, clan_id, special_building, map_x, map_y, strategic_value, defensive_value)
    values ('Kai','Chubu',takeda,'Horse Market',610,500,8,22) returning id into pid;
  update clans set capital_province_id = pid where id = takeda;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,80,120,80,18000);
  insert into subprovinces (province_id,name,type,clan_id) values (pid,'Kofu','central',takeda),(pid,'Tsutsujigasaki','vassal',takeda),(pid,'Katsuyama','vassal',takeda);

  -- Shinano
  insert into provinces (name, region, clan_id, map_x, map_y, strategic_value, defensive_value)
    values ('Shinano','Chubu',takeda,590,470,6,18) returning id into pid;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,70,110,40,15000);
  insert into subprovinces (province_id,name,type,clan_id) values (pid,'Matsumoto','central',takeda),(pid,'Ueda','vassal',takeda),(pid,'Komoro','vassal',takeda);

  -- Echigo (Uesugi capital)
  insert into provinces (name, region, clan_id, special_building, map_x, map_y, strategic_value, defensive_value)
    values ('Echigo','Hokuriku',uesugi,'Legendary Castle',600,400,8,30) returning id into pid;
  update clans set capital_province_id = pid where id = uesugi;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,90,160,30,17000);
  insert into subprovinces (province_id,name,type,clan_id) values (pid,'Kasugayama','central',uesugi),(pid,'Nagaoka','vassal',uesugi),(pid,'Sado','vassal',uesugi);

  -- Etchu
  insert into provinces (name, region, clan_id, map_x, map_y, strategic_value, defensive_value)
    values ('Etchu','Hokuriku',uesugi,560,420,5,14) returning id into pid;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,60,100,15,12000);
  insert into subprovinces (province_id,name,type,clan_id) values (pid,'Toyama','central',uesugi),(pid,'Takaoka','vassal',uesugi),(pid,'Uozu','vassal',uesugi);

  -- Aki (Mori capital)
  insert into provinces (name, region, clan_id, special_building, map_x, map_y, strategic_value, defensive_value)
    values ('Aki','Chugoku',mori,300,560,8,20) returning id into pid;
  update clans set capital_province_id = pid where id = mori;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,100,150,20,16000);
  insert into subprovinces (province_id,name,type,clan_id) values (pid,'Hiroshima','central',mori),(pid,'Miyajima','vassal',mori),(pid,'Yoshida','vassal',mori);

  -- Izumo
  insert into provinces (name, region, clan_id, special_building, map_x, map_y, strategic_value, defensive_value)
    values ('Izumo','Chugoku',mori,260,520,6,16) returning id into pid;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,70,120,15,13000);
  insert into subprovinces (province_id,name,type,clan_id) values (pid,'Matsue','central',mori),(pid,'Izumo-taisha','vassal',mori),(pid,'Yasugi','vassal',mori);

  -- Satsuma (Shimazu capital)
  insert into provinces (name, region, clan_id, special_building, map_x, map_y, strategic_value, defensive_value)
    values ('Satsuma','Kyushu',shimazu,150,720,8,22) returning id into pid;
  update clans set capital_province_id = pid where id = shimazu;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,90,140,40,15000);
  insert into subprovinces (province_id,name,type,clan_id) values (pid,'Kagoshima','central',shimazu),(pid,'Kokubu','vassal',shimazu),(pid,'Chiran','vassal',shimazu);

  -- Osumi
  insert into provinces (name, region, clan_id, map_x, map_y, strategic_value, defensive_value)
    values ('Osumi','Kyushu',shimazu,180,740,5,12) returning id into pid;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,60,100,20,11000);
  insert into subprovinces (province_id,name,type,clan_id) values (pid,'Kanoya','central',shimazu),(pid,'Tarumizu','vassal',shimazu),(pid,'Soo','vassal',shimazu);

  -- NEUTRAL / UNCLAIMED provinces (no clan)
  insert into provinces (name, region, map_x, map_y, strategic_value, defensive_value, special_building)
    values ('Yamashiro','Kinai',440,540,10,18,'Famous Shrine') returning id into pid;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,110,130,10,22000);
  insert into subprovinces (province_id,name,type) values (pid,'Kyoto','central'),(pid,'Fushimi','vassal'),(pid,'Uji','vassal');

  insert into provinces (name, region, map_x, map_y, strategic_value, defensive_value, special_building)
    values ('Settsu','Kinai',420,560,9,15,'Foreign Trade Port') returning id into pid;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,100,120,10,19000);
  insert into subprovinces (province_id,name,type) values (pid,'Osaka','central'),(pid,'Sakai','vassal'),(pid,'Amagasaki','vassal');

  insert into provinces (name, region, map_x, map_y, strategic_value, defensive_value, special_building)
    values ('Iwami','Chugoku',230,540,7,12,'Silver Mine') returning id into pid;
  insert into province_resources (province_id, koku_output, food_output, horse_output, population) values (pid,60,80,10,9000);
  insert into subprovinces (province_id,name,type) values (pid,'Hamada','central'),(pid,'Omori','vassal'),(pid,'Gotsu','vassal');
end $$;

-- ---------- SHOGUNATE (vacant initially) ----------
insert into shogunate (clan_id, active) values (null, true) on conflict do nothing;

-- ---------- WELCOME ANNOUNCEMENT ----------
insert into announcements (title, body) values
  ('The Age of Warring States Begins','The authority of the shogun has crumbled. Daimyo across the realm raise their banners. Gather your retainers, levy your peasants, and seize your destiny. Tenka Fubu.');

-- =====================================================================
-- To create the first GM: register normally in the app, then run:
--   update profiles set is_gm = true, role = 'gm' where email = 'you@example.com';
-- =====================================================================
