// Independent Emerald arithmetic fixtures, not captured engine output.
// Pinned reference: pret/pokeemerald 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881,
// pokemon.c CalculateBaseDamage; battle_script_commands.c damagecalc/typecalc.
// At Lv50 the level factor is 22. Notes show pre-random integer boundaries.
export const pairMaxima=[
 {player:0,opponent:0,attacks:{Surf:90,'Rock Slide':5,Earthquake:168},incoming:{Surf:26,Thunder:0,'Fire Blast':33},note:'Surf:57 ->spread28 ->+2=30 ->STAB45 ->Rock x2=90; EQ26+2 ->STAB42 ->Steel/Rock x4=168; incoming Surf51 ->spread25+2 ->Water13 ->Ground26'},
 {player:0,opponent:1,attacks:{Surf:78,'Rock Slide':50,Earthquake:0},incoming:{Earthquake:71,'Fire Blast':30,Bite:31},note:'Surf48 ->24+2 ->STAB39 ->Rock x2=78; Rock Slide46 ->23+2 ->Flying x2=50'},
 {player:1,opponent:0,attacks:{Surf:44,'Rock Slide':6,Earthquake:120},incoming:{Surf:20,Thunder:48,'Fire Blast':48},note:'Surf41 ->20+2 ->Rock x2=44; EQ28+2 ->Steel/Rock x4=120; incoming Thunder46+2=48'},
 {player:1,opponent:1,attacks:{Surf:38,'Rock Slide':54,Earthquake:0},incoming:{Earthquake:71,'Fire Blast':44,Bite:23},note:'Surf35 ->17+2 ->Rock x2=38; Rock Slide50 ->25+2 ->Flying x2=54; incoming Bite21+2=23'},
];
// Real canonical operands independently recomputed with Lv50 IV31, EV/4
// truncation, and nature. Aggron3 SpA:floor((120+31+63)/2)+5=112 ->Modest123.
// Aerodactyl4 Attack:floor((210+31+63)/2)+5=157; HP floor191/2+60=155.
export const canonicalOperands={
 'Aggron 3':{stats:{hp:177,attack:117,defense:200,spAttack:123,spDefense:80,speed:70},item:'Bright Powder',nature:'Modest',moves:['Surf','Thunder','Fire Blast','Blizzard'],abilities:['Sturdy','Rock Head']},
 'Aerodactyl 4':{stats:{hp:155,attack:157,defense:85,spAttack:112,spDefense:95,speed:150},item:'Kings Rock',nature:'Hardy',moves:['Double Edge','Earthquake','Fire Blast','Bite'],abilities:['Rock Head','Pressure']},
};
// Controlled Lv50/stats100/Normal models isolate mechanics in a complete field.
// maxima are AFTER all arithmetic/types/STAB, BEFORE the 16 random multipliers.
export const mechanicCases=[
 {id:'surf-two',move:'Surf',max:22,note:'41 ->spread20 ->+2=22'},
 {id:'surf-one-fainted',move:'Surf',defenders:1,max:43,note:'41+2; other defender HP0 removes spread'},
 {id:'surf-one-empty',move:'Surf',empty:true,defenders:1,max:43,note:'empty teammate removes spread; clear-weather hit needs no field assumption'},
 {id:'rock-slide-two',move:'Rock Slide',max:18,note:'33 ->16+2'},
 {id:'rock-slide-one',move:'Rock Slide',defenders:1,max:35,note:'33+2'},
 {id:'earthquake-two',move:'Earthquake',max:46,note:'44+2; FOES_AND_ALLY receives no Gen3 BOTH reduction'},
 {id:'earthquake-one',move:'Earthquake',defenders:1,max:46,note:'same full-damage arithmetic'},
 {id:'surf-two-screen',move:'Surf',screen:'lightScreen',max:15,note:'41 ->2*floor41/3=26 ->spread13+2'},
 {id:'surf-one-screen',move:'Surf',screen:'lightScreen',defenders:1,max:22,note:'41 ->floor41/2=20 ->+2'},
 {id:'rock-two-screen',move:'Rock Slide',screen:'reflect',max:13,note:'33 ->22 ->11+2'},
 {id:'rock-one-screen',move:'Rock Slide',screen:'reflect',defenders:1,max:18,note:'33 ->16+2'},
 {id:'surf-critical-screen',move:'Surf',screen:'lightScreen',critical:true,max:44,note:'screen bypassed; spread20+2 ->crit44'},
 {id:'rock-critical-screen',move:'Rock Slide',screen:'reflect',critical:true,max:36,note:'screen bypassed; spread16+2 ->crit36'},
 {id:'critical-armor-screen',move:'Rock Slide',screen:'reflect',critical:true,defenderAbility:'Battle Armor',max:13,note:'armor cancels crit, restoring screen22 ->spread11+2'},
 {id:'helping-hand',move:'Surf',helpingHand:true,max:33,note:'spread20+2 ->HH floor22*1.5=33'},
 {id:'quake-screen-help',move:'Earthquake',screen:'reflect',helpingHand:true,max:45,note:'44 ->screen28+2 ->HH45'},
 {id:'burn-spread',move:'Rock Slide',status:'burn',max:10,note:'33 ->burn16 ->spread8+2'},
 {id:'guts-burn',move:'Rock Slide',status:'burn',attackerAbility:'Guts',max:26,note:'Atk150 ->subtotal49; no burn division ->spread24+2'},
 {id:'adverse-stages-crit',move:'Rock Slide',critical:true,attackStage:-2,defenseStage:2,max:36,note:'crit ignores adverse attacking/defending stages ->33 ->spread16+2 ->crit36'},
 {id:'beneficial-stages-crit',move:'Rock Slide',critical:true,attackStage:2,defenseStage:-1,max:104,note:'Atk200/Def66 ->subtotal100 ->spread50+2 ->crit104'},
 {id:'rain-spread',move:'Surf',weather:'rain',max:32,note:'41 ->spread20 ->rain30+2'},
 {id:'sun-spread',move:'Surf',weather:'sun',max:12,note:'41 ->spread20 ->sun10+2'},
 {id:'cloud-nine',move:'Surf',weather:'rain',partnerAbility:'Cloud Nine',max:22,note:'unviewed living holder suppresses base weather'},
 {id:'fainted-cloud-nine',move:'Surf',weather:'rain',partnerAbility:'Cloud Nine',partnerHp:0,max:22,note:'FIELD_SPORT still sees zero-HP record'},
 {id:'air-lock',move:'Surf',weather:'rain',partnerAbility:'Air Lock',max:22,note:'opposing unviewed holder suppresses base weather',partnerSide:'enemy'},
 {id:'weather-ball-rain',move:'Weather Ball',weather:'rain',max:70,note:'Water50 subtotal22 ->rain33+2 ->script x2=70',metadata:['WATER',100]},
 {id:'weather-ball-cloud',move:'Weather Ball',weather:'rain',partnerAbility:'Cloud Nine',max:36,note:'Normal50 subtotal22+2 ->Normal STAB36',metadata:['NORMAL',50]},
 {id:'weather-ball-fainted-cloud',move:'Weather Ball',weather:'rain',partnerAbility:'Cloud Nine',partnerHp:0,max:48,note:'script Water100 remains; base weather suppressed ->22+2 ->script48',metadata:['WATER',100]},
 {id:'explosion-clean',move:'Explosion',max:333,note:'Defense50 ->subtotal220+2 ->Normal STAB333'},
 {id:'damp',move:'Explosion',partnerAbility:'Damp',blocked:'damp',note:'execution prevented, not ordinary zero damage'},
 {id:'fainted-damp',move:'Self Destruct',partnerAbility:'Damp',partnerHp:0,blocked:'damp',note:'Damp lookup retains fainted record'},
 {id:'plus-minus',move:'Surf',attackerAbility:'Plus',partnerAbility:'Minus',max:33,note:'SpA150 ->subtotal62 ->spread31+2'},
 {id:'opposing-minus',move:'Surf',attackerAbility:'Plus',partnerAbility:'Minus',partnerSide:'enemy',partnerHp:0,max:64,note:'opposite field lookup sees fainted record; one living defender means no spread reduction:62+2'},
 {id:'same-sign',move:'Surf',attackerAbility:'Plus',partnerAbility:'Plus',max:22,note:'same-sign Plus supplies no boost'},
 {id:'lightning-rod',move:'Thunderbolt',partnerAbility:'Lightning Rod',partnerSide:'enemy',max:21,redirected:true,note:'actual Electric target:41+2 ->resistance floor43/2=21, no ability immunity'},
 {id:'reduced-hp',move:'Surf',attackerHp:20,defenderHp:40,max:22,note:'nonzero HP still counts living; Immunity has no low-HP modifier'},
];

export const numericalPlayerData=[
 {identity:'swampert',name:'Swampert',dex:260,level:50,types:['WATER','GROUND'],ability:'Torrent',item:'None',stats:{hp:200,attack:120,defense:100,spAttack:110,spDefense:100,speed:70}},
 {identity:'snorlax',name:'Snorlax',dex:143,level:50,types:['NORMAL'],ability:'Immunity',item:'None',stats:{hp:240,attack:130,defense:100,spAttack:80,spDefense:140,speed:40}},
];
