# Move Tutors reference verification

Verified 2026-10-18. This is a chart-only projection: canonical move names/IDs
come from reference.json; Emerald lists, BP costs and tutor sides come from the
existing learnset tutorResources.js. No reference records are modified.

## Primary sources

- Emerald ordinary tutors: https://github.com/pret/pokeemerald/blob/master/data/scripts/move_tutors.inc
  Ten tutor scripts identify each map and move, with separate one-time flags.
- Frontier: https://github.com/pret/pokeemerald/blob/master/data/maps/BattleFrontier_Lounge7/scripts.inc
  Confirms all twenty moves, left/right tutor assignments, and every BP cost.
- FRLG: https://github.com/pret/pokefirered/blob/master/data/scripts/move_tutors.inc
  Fifteen ordinary moves plus the three Cape Brink moves. Matching ordinary
  map scripts verify Celadon Department Store 3F, Cinnabar Lab Research Room,
  Copycat's house 2F, and the other named maps. Victory Road tutor is on 2F.
- Cape Brink restrictions: https://github.com/pret/pokefirered/blob/master/src/field_specials.c
  CapeBrinkGetMoveToTeachLeadPokemon requires Venusaur/Charizard/Blastoise
  and friendship 255. HasLearnedAllMovesFromCapeBrinkTutor sets a separate flag
  for each of Frenzy Plant, Blast Burn and Hydro Cannon. Each can be taught once
  per save, rather than only one lesson total. No version-exclusive tutor rows.

## Cross-checks and discrepancies

- https://www.smogon.com/ingame/guides/third_movetutorlist
  Used for concise NPC/building details and Frontier house west of Battle Dome.
- https://www.serebii.net/emerald/movetutor.shtml
  Its Metronome paragraph says Verdanturf. The Emerald script explicitly places
  it in FallarborTown_Mart; this page uses Fallarbor Town's Poké Mart.
- https://www.serebii.net/emerald/movetutor-battle.shtml
  Its Mega Kick entry says 24 BP. The script charges 48 BP, matching the existing
  2.0 records. This page uses 48 BP.
- https://www.serebii.net/fireredleafgreen/movetutor.shtml
  Confirms ordinary locations; its Cape Brink single-lesson claim conflicts with
  the separate game flags. This page follows the game code.

Lists: 10 Emerald, 20 Frontier (grouped left/right, alphabetical within each),
18 FRLG. Ordinary lists are alphabetical. Existing crossGameMoves data independently
confirms all FRLG IDs. Compatibility grids, move descriptions, type icons,
Move Reminder/Deleter services, TM/HM listings, and other games are excluded.
Canonical names such as Double Edge, Soft Boiled and ThunderPunch are retained.
No unresolved entries; legacy 1.0 was not accessed.
