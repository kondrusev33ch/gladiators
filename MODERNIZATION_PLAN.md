# Gladiator Arena - Modernization Plan

## Implementation Phases (Next Modernization: Realistic Arena Combat)

### Phase 1: Real-Time Combat Core
- [x] Replace the turn-based loop with a fixed-timestep update (RAF + accumulator) to support simultaneous actions
- [x] Introduce stamina/initiative meters that govern action frequency and recovery
- [x] Define hitboxes/hurtboxes and interaction rules (active frames, invulnerability windows)
- [x] Update the StateMachine/EventBus to dispatch frame-level combat events

### Phase 2: Movement, Dodging, and Spacing
- [x] Add arena navigation (lanes/zones) with collision checks to prevent overlap and wall clipping
- [x] Implement dash/dodge mechanics with distance, i-frames, and directionality
- [x] Add footwork animations (advance, retreat, strafe) tied to movement speed and stamina cost
- [x] Surface spacing advantages in the HUD (out of range, sweet spot, danger zone)

### Phase 3: Attacks, Blocks, and Parries
- [ ] Build attack states with wind-up/active/recovery windows and cancel rules
- [ ] Implement blocking with stamina drain, chip damage, and guard-break thresholds
- [ ] Add parry/counter timings that open opponents to high-damage follow-ups
- [ ] Integrate stagger/stun reactions based on impact force and angle

### Phase 4: Animation Overhaul
- [ ] Move to state-driven animation controller with blending (idle ↔ move ↔ attack ↔ hit ↔ down)
- [ ] Create directional animation sets (front/oblique/side) for movement and attacks
- [ ] Add root-motion approximations so lunges/dodges translate fighters believably
- [ ] Layer procedural tweaks (weapon trails, head turns, shield adjustments) on top of keyframes

### Phase 5: Visual Effects and Camera
- [ ] Add impact VFX (sparks, dust, blood variants) keyed to weapon type and surface
- [ ] Implement camera behaviors: subtle shake on heavy hits, quick zooms on finishers, arena-wide sweeps at round start/end
- [ ] Add hit-stop and time dilation on parries/critical blows for readability
- [ ] Integrate directional lighting/shadows to ground characters in the arena

### Phase 6: AI Behaviors
- [ ] Build behavior trees or utility AI that choose between attack, block, dodge, reposition based on spacing/stamina
- [ ] Add feints, baits, and delayed attacks to prevent pattern exploitation
- [ ] Implement difficulty tiers that adjust reaction windows, aggression, and mistake rates
- [ ] Add awareness of arena bounds and obstacle avoidance

### Phase 7: Controls, UX, and Feedback
- [ ] Add input buffering and queueing for chained attacks/dodges
- [ ] Expose keybinds/controller mapping and on-screen tutorials for new mechanics
- [ ] Enhance HUD: stamina, block meter, parry window cues, spacing indicators, and threat arrows
- [ ] Add slow-motion replays or end-of-round highlights showing key exchanges

### Phase 8: Performance, Testing, and Tooling
- [ ] Optimize animation playback (sprite atlas packing, GPU-friendly shaders, culling off-screen VFX)
- [ ] Add deterministic replay recording for debugging combat behaviors
- [ ] Create automated tests for combat rules (iframes, block stamina drain, hitbox alignment)
- [ ] Profile frame times and memory during heavy VFX to set performance budgets

### Phase 9: Asset Pipeline
- [ ] Define asset specs for new animation sets (frame counts, directions, resolutions)
- [ ] Establish naming conventions and import scripts for animations/VFX
- [ ] Set up a quick preview tool to inspect hitboxes and animation timing
- [ ] Add compression/optimization steps for textures, audio, and sprite sheets
