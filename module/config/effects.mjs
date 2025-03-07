/*
    Pour mémoire : ACTIVE_EFFECT_MODES : CUSTOM = 0, MULTIPLY = 1, ADD = 2, DOWNGRADE = 3, UPGRADE = 4, OVERRIDE = 5
    C:\Program Files\Foundry Virtual Tabletop\resources\app\common\constants.mjs

    Liste des StatusEffect du core (CONFIG.statusEffects): 
    [
    {
        "id": "dead",
        "name": "EFFECT.StatusDead",
        "img": "icons/svg/skull.svg"
    },
    {
        "id": "unconscious",
        "name": "EFFECT.StatusUnconscious",
        "img": "icons/svg/unconscious.svg"
    },
    {
        "id": "sleep",
        "name": "EFFECT.StatusAsleep",
        "img": "icons/svg/sleep.svg"
    },
    {
        "id": "stun",
        "name": "EFFECT.StatusStunned",
        "img": "icons/svg/daze.svg"
    },
    {
        "id": "prone",
        "name": "EFFECT.StatusProne",
        "img": "icons/svg/falling.svg"
    },
    {
        "id": "restrain",
        "name": "EFFECT.StatusRestrained",
        "img": "icons/svg/net.svg"
    },
    {
        "id": "paralysis",
        "name": "EFFECT.StatusParalysis",
        "img": "icons/svg/paralysis.svg"
    },
    {
        "id": "fly",
        "name": "EFFECT.StatusFlying",
        "img": "icons/svg/wing.svg"
    },
    {
        "id": "blind",
        "name": "EFFECT.StatusBlind",
        "img": "icons/svg/blind.svg"
    },
    {
        "id": "deaf",
        "name": "EFFECT.StatusDeaf",
        "img": "icons/svg/deaf.svg"
    },
    {
        "id": "silence",
        "name": "EFFECT.StatusSilenced",
        "img": "icons/svg/silenced.svg"
    },
    {
        "id": "fear",
        "name": "EFFECT.StatusFear",
        "img": "icons/svg/terror.svg"
    },
    {
        "id": "burning",
        "name": "EFFECT.StatusBurning",
        "img": "icons/svg/fire.svg"
    },
    {
        "id": "frozen",
        "name": "EFFECT.StatusFrozen",
        "img": "icons/svg/frozen.svg"
    },
    {
        "id": "shock",
        "name": "EFFECT.StatusShocked",
        "img": "icons/svg/lightning.svg"
    },
    {
        "id": "corrode",
        "name": "EFFECT.StatusCorrode",
        "img": "icons/svg/acid.svg"
    },
    {
        "id": "bleeding",
        "name": "EFFECT.StatusBleeding",
        "img": "icons/svg/blood.svg"
    },
    {
        "id": "disease",
        "name": "EFFECT.StatusDisease",
        "img": "icons/svg/biohazard.svg"
    },
    {
        "id": "poison",
        "name": "EFFECT.StatusPoison",
        "img": "icons/svg/poison.svg"
    },
    {
        "id": "curse",
        "name": "EFFECT.StatusCursed",
        "img": "icons/svg/sun.svg"
    },
    {
        "id": "regen",
        "name": "EFFECT.StatusRegen",
        "img": "icons/svg/regen.svg"
    },
    {
        "id": "degen",
        "name": "EFFECT.StatusDegen",
        "img": "icons/svg/degen.svg"
    },
    {
        "id": "hover",
        "name": "EFFECT.StatusHover",
        "img": "icons/svg/wingfoot.svg"
    },
    {
        "id": "burrow",
        "name": "EFFECT.StatusBurrow",
        "img": "icons/svg/mole.svg"
    },
    {
        "id": "upgrade",
        "name": "EFFECT.StatusUpgrade",
        "img": "icons/svg/upgrade.svg"
    },
    {
        "id": "downgrade",
        "name": "EFFECT.StatusDowngrade",
        "img": "icons/svg/downgrade.svg"
    },
    {
        "id": "invisible",
        "name": "EFFECT.StatusInvisible",
        "img": "icons/svg/invisible.svg"
    },
    {
        "id": "target",
        "name": "EFFECT.StatusTarget",
        "img": "icons/svg/target.svg"
    },
    {
        "id": "eye",
        "name": "EFFECT.StatusMarked",
        "img": "icons/svg/eye.svg"
    },
    {
        "id": "bless",
        "name": "EFFECT.StatusBlessed",
        "img": "icons/svg/angel.svg"
    },
    {
        "id": "fireShield",
        "name": "EFFECT.StatusFireShield",
        "img": "icons/svg/fire-shield.svg"
    },
    {
        "id": "coldShield",
        "name": "EFFECT.StatusIceShield",
        "img": "icons/svg/ice-shield.svg"
    },
    {
        "id": "magicShield",
        "name": "EFFECT.StatusMagicShield",
        "img": "icons/svg/mage-shield.svg"
    },
    {
        "id": "holyShield",
        "name": "EFFECT.StatusHolyShield",
        "img": "icons/svg/holy-shield.svg"
    }
]
    Liste des specialStatusEffects
    {
        "DEFEATED": "dead",
        "INVISIBLE": "invisible",
        "BLIND": "blind",
        "BURROW": "burrow",
        "HOVER": "hover",
        "FLY": "fly"
    }
*/

/**
 * TODO : Ajouter le dé malus sur melee distance et magique pour affaibli/weakened
 */
export const EFFECTS_DESCRIPTION = {     
    "weakened":{
        label:"CO.customStatus.weakened",
        changes:[
			{
				key: "system.abilities.agi.superior",
				mode: 5,
				value: false
			},
            {
				key: "system.abilities.con.superior",
				mode: 5,
				value: false
			},  
            {
				key: "system.abilities.for.superior",
				mode: 5,
				value: false
			},
            {
				key: "system.abilities.per.superior",
				mode: 5,
				value: false
			},
            {
				key: "system.abilities.cha.superior",
				mode: 5,
				value: false
			},
            {
				key: "system.abilities.int.superior",
				mode: 5,
				value: false
			},
            {
				key: "system.abilities.vol.superior",
				mode: 5,
				value: false
			},
		],
        description:"CO.customStatus.weakenedDescription"
    },
    "blind":{
        label:"CO.customStatus.blind",        
        changes:[
			{
				key: "system.combat.melee.bonus",
				mode: 2,
				value: -5
			},
			{
				key: "system.combat.ranged.bonus",
				mode: 2,
				value: -10
			},
			{
				key: "system.combat.init.bonus",
				mode: 2,
				value: -5
			},          
			{
				key: "system.combat.def.bonus",
				mode: 2,
				value: -5
			}            		
		]  ,
        description:"CO.customStatus.blindDescription"      
    },
    "outOfBreath":{
        label:"CO.customStatus.outOfBreath",
        changes:[
			{
				key: "system.attributes.movement.base",
				mode: 5,
				value: 5
			}
		],
        description:"CO.customStatus.outOfBreathDescription"     
    },
    "stun":{
        label:"CO.customStatus.stun",
        changes:[
			{
				key: "system.combat.def.bonus",
				mode: 2,
				value: -5
			}
		],
        description:"CO.customStatus.stunDescription"        
    },    
    "immobilized":{
        label:"CO.customStatus.immobilized",
		changes:[
			{
				key: "system.attribute.movment.base",
				mode: 5,
				value: 0
			}
		],
        description:"CO.CustomStatus.immobilizedDescription"       
    },
    "invalid":{
        label:"CO.customStatus.invalid",
        changes:[
			{
				key: "system.attributes.movement.base",
				mode: 5,
				value: 5
			}
		],
        description:"CO.customStatus.invalidDescription"    
    },
	"dead":{
		label:"CO.customStatus.dead",
        changes:[
			{
				key: "system.attributes.hp.value",
				mode: 5,
				value: "0"
			}
		],
        description:"CO.customStatus.deadDescription"
	},
    "paralysis":{
		label:"CO.customStatus.paralysis",
        changes:[
			{
				key: "system.attribute.movment.base",
				mode: 5,
				value: 0
			}
		],
        description:"CO.customStatus.paralysisDescription"
	},
    "slowed":{
		label:"CO.customStatus.slowed",
        changes:[],
        description:"CO.customStatus.slowedDescription"
	},
    "overturned":{
		label:"CO.customStatus.overturned",
        changes:[
			{
				key: "system.combat.melee.bonus",
				mode: 2,
				value: -5
			},
			{
				key: "system.combat.ranged.bonus",
				mode: 2,
				value: -5
			},
			{
				key: "system.combat.magic.bonus",
				mode: 2,
				value: -5
			},          
			{
				key: "system.combat.def.bonus",
				mode: 2,
				value: -5
			}            
		],
        description:"CO.customStatus.overturnedDescription"
	},
    "surprised":{
		label:"CO.customStatus.surprised",
        changes:[
			{
				key: "system.combat.def.bonus",
				mode: 2,
				value: -5
			}
		],
        description:"CO.customStatus.surprisedDescription"
	}
}

export const CUSTOM_STATUS_EFFECT= [
    {
      id: "dead",
      name: "CO.customStatus.dead",
      img: "icons/svg/skull.svg"
    },
    {
      id: "immobilized",
      name: "CO.customStatus.immobilized",
      img: "systems/co/ui/effects/immobilized.webp"
    },
    {
      id: "stun",
      name: "EFFECT.StatusStunned",
      img: "icons/svg/daze.svg"
    },
    {
      id: "paralysis",
      name: "EFFECT.StatusParalysis",
      img: "icons/svg/paralysis.svg"
    },
    {
      id: "blind",
      name: "CO.customStatus.blind",
      img: "icons/svg/blind.svg"
    },
    {
      id: "silence",
      name: "EFFECT.StatusSilenced",
      img: "icons/svg/silenced.svg"
    },    
    {
      id: "outOfBreath",
      name: "CO.customStatus.outOfBreath",
      img: "systems/co/ui/effects/breath.webp"
    },
    {
      id: "corrode",
      name: "EFFECT.StatusCorrode",
      img: "icons/svg/acid.svg"
    },
    {
      id: "bleeding",
      name: "EFFECT.StatusBleeding",
      img: "icons/svg/blood.svg"
    },
    {
      id: "invalid",
      name: "CO.customStatus.invalid",
      img: "systems/co/ui/effects/disably.webp"
    },
    {
      id: "poison",
      name: "EFFECT.StatusPoison",
      img: "icons/svg/poison.svg"
    },
    {
      id: "slowed",
      name: "CO.customStatus.slowed",
      img: "systems/co/ui/effects/slow.webp"
    },
    {
      id: "overturned",
      name: "CO.customStatus.overturned",
      img: "systems/co/ui/effects/upsidedown.webp"
    },
    {
      id: "surprised",
      name: "CO.customStatus.surprised",
      img: "systems/co/ui/effects/surprised.webp"
    },    
    {
      id: "weakened",
      name: "CO.customStatus.weakened",
      img: "icons/svg/downgrade.svg"
    },
    {
      id: "invisible",
      name: "EFFECT.StatusInvisible",
      img: "icons/svg/invisible.svg"
    },
    {
      id: "bless",
      name: "EFFECT.StatusBlessed",
      img: "icons/svg/angel.svg"
    }
  ]