# Specialized held items — Step 5D-2

The active `coreDamage.js` engine uses canonical National Dex identifiers from the existing save/Frontier adapters and canonical item IDs from `battleItemId`. Names shown on cards do not determine species eligibility. Item modifiers change the appropriate stat operand before defensive abilities and stat stages; they never multiply displayed damage.

Supported effects: Pikachu's Light Ball doubles Special Attack; Cubone/Marowak's Thick Club doubles Attack; Clamperl's DeepSeaTooth doubles Special Attack and DeepSeaScale doubles Special Defense. Soul Dew boosts Latios/Latias Special Attack and Special Defense by 50% outside the Frontier only. Metal Powder doubles untransformed Ditto's Defense.

## Soul Dew and battle context

Battle Tower is currently the only selectable facility. `BattleMatchup` passes the existing rules to the popup and scenario engine. Every facility context suppresses Soul Dew; missing context also defaults to Frontier suppression. A facility cannot be overridden with `frontier:false`.

For standalone reference calculations only, the sixth argument to `calculateCoreDamage` may be `{frontier:false}` with no facility. Scenario callers supply this as `battleContext`. There is no new non-Frontier mode or control in the app.

## Metal Powder limitation

The app does not track transformation state. Imported Ditto species alone does not prove that Ditto is untransformed during a battle. Accordingly, physical damage against a Metal Powder Ditto is **unavailable** when transformation state is unknown. Special damage needs no transformation assumption because Metal Powder does not change Special Defense.

The engine accepts an explicitly reliable `defender.transformed` boolean: `false` enables the Defense boost, and `true` disables it. Missing, null or malformed flags are not coerced to false. No adapter invents this flag, and no transformation mechanics or controls were added. Ability scenarios retain unavailable results rather than dropping uncertain branches.
