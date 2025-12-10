# Gladiator Arena - Modernization Plan v2.0 (2D Enhanced)

## Previously Completed (Phases 1-6)
- Real-time combat core with fixed-timestep updates
- Movement, dodging, and spacing mechanics
- Attacks, blocks, and parries system
- State-driven animation controller
- Visual effects and camera behaviors
- AI behaviors with behavior trees


### Phase 7: Enhanced 2D Rendering & Visual Effects
**Goal:** Upgrade sprite system with better graphics and effects

#### 7.1 Advanced Canvas Rendering
- [x] Implement layered canvas system (background, arena floor, fighters, effects, UI)
- [x] Add sprite batching for performance optimization
- [x] Implement viewport culling (don't render off-screen elements)
- [x] Create particle system for dust, blood, sparks
- [x] Add sprite shadows (dynamic shadow sprites beneath fighters)

#### 7.2 Camera & Screen Effects
- [x] Implement camera zoom/pan for team battles (auto-adjust to show all fighters)
- [x] Add camera shake intensity based on impact force (already started, enhance it)
- [x] Create slow-motion effect for critical hits and executions
- [x] Add chromatic aberration for heavy impacts

#### 7.3 Lighting & Atmosphere (2D)
- [ ] Dynamic lighting system using blend modes
- [ ] Directional lighting on sprites (simulate sun position)
- [ ] Time-of-day color grading (morning warm, noon bright, sunset orange)

---

### Phase 8: Realistic 2D Gladiator Sprites & Customization
**Goal:** Replace emoji icons with detailed pixel art or hand-drawn 2D sprites

#### 8.1 New Gladiator Classes & Visual Design
Expand from 8 to 12+ unique gladiator types with distinct 2D sprite designs:

**Melee Specialists:**
- [ ] **Murmillo** - Heavy infantry with tall rectangular shield
  - Sprite: Bronze helmet with fish crest, large scutum shield, gladius
  - Stance: Defensive, shield forward
  - Color scheme: Bronze/red

- [ ] **Secutor** - Swift pursuer with smooth helmet
  - Sprite: Egg-shaped helmet, shoulder guard, medium shield
  - Stance: Aggressive lean forward
  - Color scheme: Silver/blue

- [ ] **Thraex** - Thracian with curved blade and small shield
  - Sprite: Wide-brimmed helmet with griffin crest, small square shield, sica sword
  - Stance: Mobile, crouched
  - Color scheme: Gold/green

- [ ] **Hoplomachus** - Greek hoplite with spear
  - Sprite: Corinthian helmet, round shield, long spear
  - Stance: Spear extended forward
  - Color scheme: Bronze/white

- [ ] **Dimachaerus** - Dual-wielding berserker
  - Sprite: Minimal armor, two swords crossed
  - Stance: Wide aggressive stance
  - Color scheme: Dark leather/bare skin

**Ranged & Hybrid Classes:**
- [ ] **Sagittarius** - Roman archer (NEW)
  - Sprite: Leather armor, quiver on back, composite bow
  - Stance: Bow ready, arrows visible in quiver
  - Color scheme: Brown leather/wood
  - **Range mechanics:** 8-12m range, aim trajectory arc, headshot criticals

- [ ] **Velites** - Light skirmisher with javelins
  - Sprite: Wolf-skin cap, small shield, 3 javelins in hand/back
  - Stance: Javelin raised for throw
  - Color scheme: Gray/brown
  - **Range mechanics:** 6-10m range, limited ammo (3 javelins), can retrieve from ground

- [ ] **Laquearius** - Lasso fighter (NEW UNIQUE)
  - Sprite: Minimal armor, rope/lasso coiled in hand
  - Stance: Rope spinning animation
  - Color scheme: Tan/rope brown
  - **Mechanics:** Can entangle enemies at medium range, pull them closer

**Exotic & Crowd-Pleasers:**
- [ ] **Retiarius** - Net and trident fisherman
  - Sprite: Shoulder guard (galerus), arm guard, net in left hand, trident in right
  - Stance: Net ready to throw
  - Color scheme: Bronze/sea blue
  - **Mechanics:** Net entangles/immobilizes (5m range), trident for melee

- [ ] **Scissor** - Fighter with blade gauntlet
  - Sprite: Heavy arm guard with scissor blade attachment
  - Stance: Scissor blade raised
  - Color scheme: Steel/dark metal

- [ ] **Eques** - Former cavalry fighter
  - Sprite: Round shield, cavalry helmet with plume, spear
  - Stance: Dynamic, as if just dismounted
  - Color scheme: Red/gold plumes

- [ ] **Crupellarius** - Fully armored tank
  - Sprite: Complete plate armor, heavy helmet, mace
  - Stance: Slow, heavily armored walk
  - Color scheme: Dark iron/black

#### 8.2 Sprite Art Requirements
For each gladiator class:
- [ ] **Sprite dimensions:** 128x128 to 256x256 pixels (high resolution for quality)
- [ ] **Art style options:**
  - Option A: Pixel art (retro style, faster to create)
  - Option B: Hand-drawn digital art (more realistic, more detail)
  - Option C: Pre-rendered 3D converted to 2D sprites (most realistic looking)
- [ ] Idle sprite (breathing animation, 4-8 frames)
- [ ] Multiple directional sprites (at minimum: facing left, facing right)
- [ ] Damage states (pristine, wounded, heavily wounded - different sprite overlays)
- [ ] Equipment visible on sprite (helmet, armor, weapons clearly distinguishable)

#### 8.3 Sprite Sourcing Strategy
- [ ] **Option A:** Commission 2D artist (Fiverr, ArtStation, DeviantArt)
- [ ] **Option B:** Purchase sprite packs (itch.io, OpenGameArt, Kenney.nl)
- [ ] **Option C:** Use AI generation (Midjourney, DALL-E) + manual cleanup
- [ ] **Option D:** Create in-house using Aseprite or Photoshop
- [ ] Ensure consistent art style across all gladiators
- [ ] Create sprite atlas for efficient loading

#### 8.4 Weapon & Shield Sprites
**Melee Weapons:**
- [ ] Gladius (short sword) - 32x32px sprite
- [ ] Sica (curved sword) - 40x32px sprite with curve
- [ ] Spatha (long sword) - 48x32px sprite
- [ ] Hasta (spear) - 64x16px long sprite
- [ ] Trident - 56x32px three-pronged sprite
- [ ] Mace - 40x40px heavy head sprite
- [ ] Scissor blade - 48x32px mechanical claw

**Ranged Weapons & Projectiles:**
- [ ] Composite bow - 48x64px sprite (drawn and relaxed states)
- [ ] Arrow sprite - 32x8px, rotation for flight arc
- [ ] Pilum (heavy javelin) - 48x16px sprite
- [ ] Hasta velitaris (light javelin) - 40x12px sprite
- [ ] Net sprite - 48x48px web pattern, throw animation
- [ ] Lasso sprite - curved rope, 64px long

**Shields:**
- [ ] Scutum (rectangular) - 64x96px tall shield
- [ ] Parma (round) - 48x48px circular
- [ ] Peltae (crescent) - 56x64px crescent shape

#### 8.5 Visual Customization System
- [ ] Sprite color palette swapping (8 color schemes: red, blue, green, gold, silver, black, white, purple)
- [ ] Helmet crest customization (different feather/plume colors)
- [ ] Shield emblem system (painted symbols: eagle, wolf, lion, SPQR, laurel)
- [ ] Battle damage overlays (blood spatters, dirt, scratches appear during fight)
- [ ] Victory/defeat sprite variants (raised weapon, kneeling, collapsed)

---

### Phase 9: Advanced 2D Animation System
**Goal:** Create fluid sprite-based combat animations

#### 9.1 Core Animation Sprite Sheets
For each gladiator class, create sprite sheets:

- [ ] **Idle Animation** (4-8 frames looping)
  - Breathing motion
  - Weapon/shield slight movement
  - Stance shifts (tired when low HP)

- [ ] **Movement Animations** (6-8 frames per direction)
  - Walk forward (weapon ready)
  - Walk backward (defensive retreat)
  - Run/sprint (faster movement)
  - Strafe left/right
  - Dodge roll (8-12 frames, shows full roll motion)

- [ ] **Combat Animations**
  - Light attack (4-6 frames: wind-up → strike → recovery)
  - Heavy attack (8-10 frames: long wind-up → powerful strike → long recovery)
  - Shield bash (4 frames: pull back → thrust forward)
  - Block/parry (2-4 frames: shield up, deflection motion)
  - Counter-attack (6 frames: parry → immediate riposte)

- [ ] **Ranged Attack Animations**
  - **Bow:** Draw (4 frames) → Hold aim (1 frame loop) → Release (3 frames)
  - **Javelin:** Wind-up (3 frames) → Throw (4 frames) → Recovery (2 frames)
  - **Net:** Spin (4 frames) → Cast (5 frames) → Pull back (3 frames)

- [ ] **Projectile Animations**
  - Arrow flight (4 frame rotation sprite, trails behind)
  - Javelin flight (3 frame rotation)
  - Net expanding (4 frames, opens mid-flight)

- [ ] **Hit Reaction Animations** (4-6 frames each)
  - Light hit (small recoil)
  - Heavy hit (large knockback)
  - Stagger (stumble backward)
  - Knocked down (fall to ground)
  - Entangled in net (struggling animation)

- [ ] **Death Animations** (8-12 frames)
  - Collapse forward
  - Fall backward
  - Dramatic spin-fall
  - Executed (head bow, weapon drop)

- [ ] **Victory Animations** (6-8 frames looping)
  - Weapon raised overhead
  - Chest-beat with fist
  - Salute to crowd
  - Shield plant (plant shield in ground)

#### 9.2 Animation Technology
- [ ] Sprite sheet parser (load and slice animation frames)
- [ ] Frame-based animation system (specify FPS, loop/one-shot)
- [ ] Animation state machine integration (smooth transitions between states)
- [ ] Sprite flipping (mirror sprites for left/right facing)
- [ ] Animation blending (crossfade between animations)
- [ ] Hit-pause system (freeze frame on impact for 0.1-0.2s)

#### 9.3 Dynamic Animation Effects
- [ ] Motion blur trails on fast attacks (draw previous frames with transparency)
- [ ] Weapon swing arcs (draw arc sprites along weapon path)
- [ ] Impact sparks (particle burst on sword clash)
- [ ] Blood spray particles (directional from hit)
- [ ] Dust clouds on movement/dodges
- [ ] Screen flash on critical hits

#### 9.4 Animation Sourcing
- [ ] **Option A:** Commission sprite animator
- [ ] **Option B:** Use sprite animation tools (Aseprite, Piskel, PyxelEdit)
- [ ] **Option C:** Rotoscope from video reference
- [ ] Create animation timing sheets (specify frame durations)
- [ ] Optimize sprite sheets (trim transparent pixels, pack efficiently)

---

### Phase 10: 2D Coliseum Arena Design
**Goal:** Transform arena into a detailed 2D Roman Coliseum with parallax layers

#### 10.1 Main Arena Background Layers
Create multi-layer parallax background:

- [ ] **Layer 1 - Sky** (slowest parallax)
  - Blue sky with clouds
  - Sun position (affects lighting)
  - Birds flying occasionally
  - 1920x1080 seamless horizontal

- [ ] **Layer 2 - Upper Coliseum Seating** (slow parallax)
  - 3-tier seating structure
  - Animated crowd sprites (cheering, waving)
  - Cloth awnings (velarium) with wave animation
  - Emperor's box with gold decorations
  - 2560x800 to allow horizontal panning

- [ ] **Layer 3 - Arena Walls** (medium parallax)
  - Stone walls with Roman architecture
  - Entrance gates (Porta Sanavivaria, Porta Libitinensis)
  - Torch sconces with fire animation
  - Roman banners with SPQR emblems
  - 2048x600

- [ ] **Layer 4 - Arena Floor** (no parallax, static)
  - Sand texture (1920x400)
  - Grid lines for positioning
  - Dynamic elements drawn on top (blood, footprints, weapons)

- [ ] **Foreground Layer** (inverse parallax, moves faster)
  - Arena barriers/walls close to camera
  - Atmospheric dust particles
  - Occasional debris blowing past

#### 10.2 Arena Variants (5-7 different arenas)
Create complete background sets for:

- [ ] **Colosseum Classicus** - Standard sunny day coliseum
  - Bright lighting, blue sky
  - Cheering crowd
  - Golden sand

- [ ] **Twilight Arena** - Sunset battle
  - Orange/red sky gradient
  - Long shadows
  - Torches lit
  - Dramatic atmosphere

- [ ] **Night Games** - Torch-lit night battle
  - Dark blue/black sky with stars
  - Heavy torch lighting (glowing effect)
  - Firelight flickering on walls

- [ ] **Underground Hypogeum** - Basement arena
  - Stone ceiling, limited height
  - Torch-only lighting (darker, claustrophobic)
  - Dripping water effects
  - Cages visible in background

- [ ] **Flooded Arena** - Naumachia (shallow water)
  - Water on arena floor (reflections)
  - Wooden platforms
  - Splashing effects
  - Ships in background (optional)

- [ ] **Provincial Arena** - Smaller wooden structure
  - Wooden walls and seating
  - Smaller, more intimate
  - Good for team battles
  - Rougher construction

- [ ] **Ruined Coliseum** - Post-apocalyptic
  - Crumbling walls
  - Overgrown vegetation
  - Fewer spectators
  - Broken statues

#### 10.3 Dynamic Arena Elements
- [ ] **Sand deformation** - Draw darker sprites where fighters stand/move
- [ ] **Blood decals** - Persist blood splatter sprites on floor
- [ ] **Dropped weapons** - Show weapon sprites stuck in ground when disarmed
- [ ] **Destructible objects** - Breakable pottery, wooden barriers (for cover)
- [ ] **Environmental hazards** (optional/toggleable):
  - Spike pits (trap doors open to reveal spikes)
  - Fire pits (damage over time)
  - Swinging blades (timed obstacles)

#### 10.4 Crowd Animation System
- [ ] Create animated crowd sprites (64x64 each spectator)
- [ ] 4-frame cheer animation (arms up, wave)
- [ ] Crowd reaction system:
  - Cheer on critical hits (raise arms)
  - Gasp on near-death moments (hands to face)
  - Boo on cowardly tactics (thumbs down)
  - Stand and applaud on executions
- [ ] Randomize crowd member positions and colors
- [ ] Wave propagation effect (Mexican wave through sections)

#### 10.5 Performance Optimization
- [ ] Use sprite atlases for backgrounds (single texture load)
- [ ] Static background caching (render to off-screen canvas)
- [ ] LOD for crowd (fewer frames when zoomed out)
- [ ] Lazy load arena variants (only load selected arena)
- [ ] Compress background images (WebP format)

---

### Phase 11: Team Battle System (2x2 through 7x7)
**Goal:** Support multi-fighter battles with tactical formations

#### 11.1 Formation System
- [ ] **Pre-battle Formation Screen**
  - Visual formation editor (drag fighters into positions)
  - Template formations (shield wall, line, scattered)
  - Save custom formations

- [ ] **2v2 Formations**
  - Side-by-side (spacing: 3m apart)
  - Front-back (ranged behind melee)
  - Diagonal (flanking setup)

- [ ] **3v3 Formations**
  - Line formation (even spacing)
  - Triangle (1 front, 2 back)
  - V-formation (2 front, 1 back)
  - Scattered (spread out, anti-AOE)

- [ ] **4v4+ Formations**
  - Shield wall (tanks front, ranged back, 2 rows)
  - Phalanx (spear users in front row, overlapping)
  - Skirmish line (spread out, ranged heavy)
  - Testudo (tight formation, shields up)
  - Box formation (ranged in center, melee surrounding)

- [ ] **Formation Bonuses**
  - Shield wall: +20% defense to front row
  - Phalanx: +2m reach for spears
  - Testudo: +30% defense, -30% movement speed
  - Scattered: Harder to hit with ranged AOE

#### 11.2 Team Combat Mechanics
- [ ] **Targeting System**
  - Click to select target (highlight with red outline)
  - Auto-target nearest enemy if none selected
  - Smart targeting priority (low HP > isolated > ranged)
  - Target lock icon above selected enemy

- [ ] **Team Coordination**
  - Flanking bonus: +15% damage if 2+ allies attack same target from different sides
  - Focus fire: Damage bonus when 3+ fighters attack same target
  - Cover fire: Ranged fighters can suppress enemies (reduce their accuracy)
  - Assist attacks: Chance for nearby ally to follow up your hit

- [ ] **Friendly Fire** (optional toggle)
  - Ranged attacks check collision with allies
  - If enabled, arrows can hit teammates
  - Show warning indicators for dangerous shots

- [ ] **Morale System**
  - Team morale bar (0-100%)
  - Decreases: Ally death (-20%), heavy damage (-5%), outnumbered (-10%)
  - Increases: Enemy death (+15%), critical hit (+5%), execution (+20%)
  - Effects: Low morale (<30%) = reduced damage, slower movement, chance to flee

#### 11.3 Arena Scaling for Team Battles
- [ ] **Dynamic Arena Size**
  - 1v1: 600px x 400px visible area
  - 2v2: 800px x 500px
  - 3v3: 1000px x 600px
  - 4v4: 1200px x 700px
  - 5v5+: 1400px x 800px (camera zooms out)

- [ ] **Camera Auto-zoom**
  - Calculate bounding box of all fighters
  - Zoom to fit all fighters in view (with margin)
  - Smooth zoom transitions (0.5s ease)

- [ ] **Spawn Points**
  - Team 1 spawns on left side
  - Team 2 spawns on right side
  - Minimum 10m separation at start
  - Prevent overlap with collision detection

- [ ] **Cover Elements** (for 4v4+)
  - Add wooden barriers (3-4 per arena)
  - Broken columns (partial cover)
  - Provides defense bonus when behind cover

#### 11.4 AI Team Coordination
- [ ] **Squad AI Leader**
  - Designate one fighter as squad leader (crown icon)
  - Leader makes tactical decisions for team
  - Other fighters follow leader's target priority

- [ ] **Flanking Behavior**
  - AI attempts to surround isolated enemies
  - Coordinate movement to attack from multiple angles
  - Avoid clustering (maintain formation spacing)

- [ ] **Tactical Abilities**
  - Protect the weak: Melee fighters guard low-HP allies
  - Focus fire: All ranged units target same enemy
  - Retreat and regroup: Fall back when outnumbered 2:1
  - Bait and punish: One fighter lures enemy, others ambush

- [ ] **Role-based AI**
  - **Tanks:** Stay front, protect ranged allies
  - **Ranged:** Maintain distance, target low-armor enemies
  - **Assassins:** Target enemy ranged fighters
  - **Support:** Stay near wounded allies, intervene when needed

#### 11.5 UI/UX for Team Battles
- [ ] **Minimap** (corner of screen, 200x150px)
  - Show arena layout (simplified)
  - Fighter positions (colored dots)
  - Red = enemies, Blue = allies
  - HP bars under dots
  - Click minimap to move camera

- [ ] **Team Health Display**
  - Stacked health bars on left (your team)
  - Stacked health bars on right (enemy team)
  - Color-coded by class
  - Show name/class icon next to bar
  - Highlight currently selected fighter

- [ ] **Kill Feed** (top-right corner)
  - Scrolling log of eliminations
  - "Spartacus [sword icon] killed Maximus"
  - Show last 5 kills
  - Fade out after 5 seconds
  - Critical kill/execution shows gold text

- [ ] **Team Color Coding**
  - Team 1: Blue accents (blue name tags, blue outline)
  - Team 2: Red accents (red name tags, red outline)
  - Color applied to sprites as overlay/tint

- [ ] **Match Stats Display**
  - Timer (countdown or count-up)
  - Team score (kills/points)
  - Round indicator (if best-of-3)

- [ ] **Camera Controls**
  - Spacebar: Center camera on selected fighter
  - Tab: Cycle through your team members
  - Click fighter: Select and focus camera
  - Drag screen edges: Pan camera manually

#### 11.6 Game Modes
- [ ] **Deathmatch** - Last team standing wins
  - No respawns
  - Victory when all enemies defeated

- [ ] **Elimination** - Best of X rounds
  - Each round is separate
  - Team that wins 2 out of 3 (or 3 out of 5) wins match

- [ ] **King of the Hill** - Control center area
  - Circular zone in arena center
  - Gain points while fighters in zone
  - First to 100 points wins
  - Show zone as glowing circle on ground

- [ ] **Capture the Standard** - Retrieve enemy banner
  - Each team has a banner in their spawn
  - Carry enemy banner to your spawn to score
  - Banner carrier moves slower
  - Dropped if carrier dies

- [ ] **Survival** - Waves of enemies
  - Team fights increasingly difficult AI waves
  - Short rest between waves
  - Score based on waves survived
  - Can revive fallen allies between waves

- [ ] **Tournament** - Bracket progression
  - 8-team or 16-team bracket
  - Single elimination
  - Win match to advance
  - Final champion crowned

---

### Phase 12: Audio & Immersion
**Goal:** Complete audio experience for 2D battles

#### 12.1 Sound Effects
- [ ] **Weapon Sounds** (at least 3 variations each)
  - Sword swing: whoosh (light, medium, heavy)
  - Sword hit: clang (metal on metal), squelch (flesh), thunk (wood)
  - Spear thrust: whoosh + stab
  - Arrow: bow twang + arrow whoosh + impact thud
  - Javelin: throw grunt + whoosh + impact
  - Net: rope swish + impact slap
  - Shield block: heavy clang/thud
  - Shield bash: impact crunch

- [ ] **Character Sounds**
  - Attack grunts (effort sounds, 5-8 variations per class)
  - Hit reactions: ugh, argh, oof (pain sounds, 5-8 variations)
  - Death sounds: dramatic yell/groan (3 variations per class)
  - Victory shouts: triumphant yell (3 variations)
  - Footsteps: sand crunch (light, heavy based on armor weight)
  - Armor clinking (on movement, 3 variations)
  - Breathing (heavy when low stamina)

- [ ] **Arena Ambience**
  - Crowd roar base loop (constant low rumble)
  - Crowd reactions:
    - Cheer (on good hit, 5 variations)
    - Gasp (on near-death moment, 3 variations)
    - Boo (on coward tactics, 3 variations)
    - Applause (on kill/execution)
  - Emperor's horn/trumpet (match start/end)
  - Announcer voice: "GLADIATORS, READY!" (Latin-accented)
  - Environmental:
    - Wind ambience (soft background)
    - Flag/awning flapping
    - Torch crackling (in torch-lit arenas)
    - Dripping water (in underground arena)

- [ ] **UI Sounds**
  - Menu click/hover sounds
  - Fighter selection confirm
  - Formation placement
  - Match countdown beeps
  - Victory fanfare
  - Defeat horn

#### 12.2 Music System
- [ ] **Battle Themes** (3-5 minute loops)
  - Epic orchestral with drums and horns
  - Intensity layers (add instruments as battle progresses)
  - 3-4 different battle tracks (rotate randomly)

- [ ] **Context Music**
  - Menu theme: Grand, Roman epic theme
  - Pre-battle: Tension-building drums
  - Victory: Triumphant fanfare (30s)
  - Defeat: Somber, tragic strings (30s)

- [ ] **Dynamic Music System**
  - Base layer always playing
  - Add percussion when HP < 50%
  - Add strings when HP < 25%
  - Increase tempo when in close combat
  - Reduce to ambient when far apart

- [ ] **Arena-specific Themes**
  - Colosseum: Grand orchestral
  - Underground: Dark, ominous
  - Flooded: Nautical instruments (horns, waves)
  - Night: Mysterious, quieter

#### 12.3 Spatial Audio (2D)
- [ ] Implement panning based on fighter X position
  - Left side of screen = left audio channel
  - Right side = right audio channel
  - Center = balanced

- [ ] Volume falloff based on distance from camera focus
  - Louder when close to selected fighter
  - Quieter when far away

- [ ] Priority system (limit simultaneous sounds)
  - Max 10 sounds playing at once
  - Priority: Death > Hit > Attack > Movement

- [ ] Audio ducking (reduce music volume during important sounds)
  - Lower music 30% during dialogue/announcements
  - Lower music 20% during executions

---

### Phase 13: Progression & Meta Systems
**Goal:** Long-term player engagement and replayability

#### 13.1 Gladiator Progression
- [ ] **Experience System**
  - Fighters gain XP from victories
  - XP formula: Base 100 + (50 * enemies killed) + (bonus for survival)
  - Level up every 500 XP (max level 20)

- [ ] **Stat Progression**
  - Each level: Choose 1 stat to increase (+1 point)
  - Stats: STR, AGI, DEF, ACC, HP
  - Show stat growth chart (visual progression)

- [ ] **Skill Trees** (3-5 unlockable abilities per class)
  - Example for Murmillo:
    - Shield Slam: Stun enemy for 2s (unlock level 5)
    - Iron Wall: +50% defense for 5s (level 10)
    - Fortress: Immune to knockback (level 15)
  - Skill points earned every 5 levels
  - Visual skill tree UI (branching paths)

- [ ] **Equipment Upgrades**
  - Unlock better weapons at levels 5, 10, 15, 20
  - Upgrade armor (Bronze → Iron → Steel → Mythic)
  - Each upgrade adds +10% to relevant stats
  - Visual change on sprite (fancier weapons/armor)

- [ ] **Fame/Reputation System**
  - Gain fame for victories, executions, crowd-pleasing moves
  - Fame levels: Unknown → Known → Famous → Legendary
  - High fame unlocks cosmetic rewards
  - Affects crowd reactions (more cheers)

#### 13.2 Career Mode
- [ ] **Gladiator Story Campaign**
  - Start as rookie Tiro gladiator
  - Progress through ranks:
    1. Tiro (rookie) - fights 1v1 against weak opponents
    2. Veteranus (veteran) - fights 2v2 battles
    3. Primus Palus (first rank) - fights 3v3, special events
    4. Champion - fights 5v5, legendary opponents, boss battles

- [ ] **Ludus Management** (gladiator school)
  - Recruit new gladiators (spend fame points)
  - Train fighters (assign to practice, gain XP over time)
  - Heal wounded (rest periods after battles)
  - Manage roster (max 10 gladiators)

- [ ] **Story Events**
  - 20-30 story battles with narrative
  - Boss fights: Legendary gladiators with unique abilities
  - Special arenas (night games, flooded, etc.)
  - Choices affect story path

- [ ] **Permadeath Option** (hardcore mode)
  - If fighter dies, they're gone forever
  - Extra XP/rewards for permadeath victories
  - Hall of Fame for fallen champions

#### 13.3 Unlockables & Customization
- [ ] **Unlockable Content**
  - New gladiator classes (unlock at certain fame levels)
  - Arena variants (unlock by winning in different conditions)
  - Color schemes/skins (unlock via achievements)
  - Weapon skins (special effects, particle trails)

- [ ] **Achievements System**
  - 30-50 achievements
  - Examples:
    - "First Blood" - Win first match
    - "Untouchable" - Win without taking damage
    - "David vs Goliath" - Defeat Crupellarius as Velites
    - "Net Profit" - Entangle 100 enemies as Retiarius
    - "Sniper" - Kill 50 enemies with headshots
  - Rewards: XP, fame, cosmetic unlocks

- [ ] **Daily Challenges**
  - Random daily challenge (e.g., "Win 3 matches as Sagittarius")
  - Rewards: Bonus XP, special currency
  - 24-hour rotation

#### 13.4 Multiplayer Considerations (Future-proofing)
- [ ] **Asynchronous PvP**
  - Players create and customize their team
  - AI controls your team when you're offline
  - Other players battle against your AI team
  - Gain rewards even when offline

- [ ] **Leaderboards**
  - Global ranking by wins
  - Weekly tournaments
  - Class-specific leaderboards

- [ ] **Replay System**
  - Auto-save epic matches (based on criteria: close match, many kills, etc.)
  - Manual save favorite matches
  - Share replay codes
  - Watch replays with camera control

- [ ] **Tournament Mode**
  - 8 or 16 player bracket
  - Single/double elimination
  - Prize pool (in-game currency/fame)

---

## Implementation Priorities

### High Priority (Core Experience - Start Here)
1. **Phase 8.1-8.3:** Create 2D sprites for at least 6 gladiator classes (including ranged)
2. **Phase 9.1-9.2:** Basic animation system (idle, move, attack, ranged attacks)
3. **Phase 10.1-10.2:** Build main coliseum background with 2-3 arena variants
4. **Phase 11.1-11.3:** Implement 2v2 and 3v3 team battles with formations
5. **Phase 7.1-7.2:** Enhanced rendering and camera system

### Medium Priority (Polish & Content)
1. **Phase 8.4-8.5:** Full weapon variety and visual customization
2. **Phase 9.3-9.4:** Advanced animation effects and polish
3. **Phase 11.4-11.5:** AI team coordination and full UI for team battles
4. **Phase 11.6:** Multiple game modes
5. **Phase 12.1-12.2:** Sound effects and music

### Low Priority (Long-term Engagement)
1. **Phase 10.3-10.4:** Dynamic arena elements and crowd system
2. **Phase 12.3:** Spatial audio
3. **Phase 13.1-13.2:** Progression and career mode
4. **Phase 13.3-13.4:** Unlockables and multiplayer features

---

## Technical Specifications

### Performance Targets (2D)
- 60 FPS on all modern devices (2015+)
- 30 FPS minimum on mobile/tablet
- < 3MB initial load (HTML/CSS/JS)
- < 20MB total assets (sprites, audio)

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

### Asset Pipeline (2D)
- **Sprites:** PNG with transparency (8-bit or 24-bit)
- **Sprite sheets:** JSON atlas format (texture packer)
- **Audio:** OGG Vorbis (primary), MP3 fallback
- **Backgrounds:** WebP format for compression
- **Compression:** Use WebP for static images, PNG for sprites needing pixel-perfect clarity

### Canvas Rendering
- Multiple layered canvases for performance
- Off-screen canvas for background caching
- RequestAnimationFrame for smooth 60fps
- Sprite batching to reduce draw calls

---

## Estimated Development Timeline (2D)

**Phase 7:** 2-3 weeks (enhanced rendering)
**Phase 8:** 6-8 weeks (sprite creation - depends on art style choice)
**Phase 9:** 4-6 weeks (animation system)
**Phase 10:** 3-4 weeks (arena backgrounds)
**Phase 11:** 5-7 weeks (team battle system)
**Phase 12:** 2-3 weeks (audio)
**Phase 13:** 6-8 weeks (progression systems)

**Total Estimated Time:** 28-39 weeks (7-10 months)

*Note: Timeline assumes part-time development (15-20 hours/week) and using purchased/commissioned art assets. Creating all art in-house could double the timeline.*

---

## Art Style Direction (2D)

### Visual References
- **Swords and Sandals** (game series) - gladiator sprite style
- **Dead Cells** - fluid 2D combat animations
- **Darkest Dungeon** - dark, detailed 2D character art
- **Pixel art gladiators** - retro aesthetic option
- **Comic book style** - bold outlines, hand-drawn look

### Art Style Options

**Option A: Pixel Art** (Retro)
- 64x64 or 128x128 sprites
- 16-bit era aesthetic
- Faster to create
- Nostalgia appeal
- Reference: Swords and Sandals, Gladihoppers

**Option B: Hand-Drawn Digital** (Realistic)
- 256x256 high-res sprites
- Detailed armor and weapons
- More cinematic feel
- Longer creation time
- Reference: Darkest Dungeon, Rayman Legends

**Option C: Vector Art** (Stylized)
- Scalable graphics
- Clean, modern look
- Easy to recolor
- Smooth animations
- Reference: Stick Fight, One Finger Death Punch

### Color Palette
- **Arena:** Warm stone (sandstone, limestone), golden hour lighting
- **Blood:** Deep crimson red, splatter patterns
- **Armor:** Bronze, iron grays, leather browns, gold accents
- **Team Colors:** Blue team vs Red team (applied as sprite tint)
- **UI:** Stone textures, gold trim, Roman aesthetic

---

## Success Metrics

### Player Engagement
- Average session length > 15 minutes
- Return rate > 40% (players return within 7 days)
- Career mode completion rate > 60%
- Achievement unlock rate > 30%

### Technical Performance
- Load time < 5 seconds on 4G connection
- Zero crashes in 95% of sessions
- Consistent 60fps for 1v1 and 2v2 battles
- Acceptable 45fps+ for 5v5+ battles

### Content Completeness
- Minimum 12 unique gladiator classes (with sprites)
- At least 15 unique weapon types (including ranged)
- 5+ fully detailed arena backgrounds
- 30+ animations per character class
- 100+ sound effects
- 20+ music tracks/variations

---

## Next Steps (Getting Started)

1. **Choose Art Style** - Decide between pixel art, hand-drawn, or vector
2. **Create First Gladiator Sprites** - Start with 2-3 classes (melee + ranged)
3. **Implement Ranged Combat** - Add bow/javelin mechanics
4. **Build First Arena Background** - Create coliseum with parallax layers
5. **Test 2v2 Battle** - Get basic team combat working
6. **Iterate and Expand** - Add more classes, arenas, features

---

This modernization plan transforms your gladiator arena into a rich 2D combat experience with realistic sprites, ranged combat, dynamic arenas, and massive team battles - all while staying true to the 2D aesthetic!
