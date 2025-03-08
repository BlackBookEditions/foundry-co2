/*
    Pour mémoire : ACTIVE_EFFECT_MODES : CUSTOM = 0, MULTIPLY = 1, ADD = 2, DOWNGRADE = 3, UPGRADE = 4, OVERRIDE = 5
    C:\Program Files\Foundry Virtual Tabletop\resources\app\common\constants.mjs

 
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

export const CUSTOM_STATUS_EFFECT= [
    {
      id: "dead",
      name: "CO.customStatus.dead",
      img: "icons/svg/skull.svg",
      changes:[
        {
            key: "system.attributes.hp.value",
            mode: 5,
            value: "0"
        }
        ],
        description:"CO.customStatus.deadDescription"
    },
    {
      id: "immobilized",
      name: "CO.customStatus.immobilized",
      img: "systems/co/ui/effects/immobilized.webp",
      changes:[
        {
            key: "system.attribute.movment.bonuses.effects",
            mode: 5,
            value: 0
        }
        ],
        description:"CO.CustomStatus.immobilizedDescription"
    },
    {
      id: "stun",
      name: "CO.customStatus.stun",
      img: "icons/svg/daze.svg",
      changes:[
        {
            key: "system.combat.def.bonuses.effects",
            mode: 2,
            value: -5
        }
        ],
        description:"CO.customStatus.stunDescription"
    },
    {
      id: "paralysis",
      name: "CO.customStatus.paralysis",
      img: "icons/svg/paralysis.svg",
      changes:[
        {
            key: "system.attribute.movment.bonuses.effects",
            mode: 5,
            value: 0
        }
        ],
        description:"CO.customStatus.paralysisDescription"
    },
    {
      id: "blind",
      name: "CO.customStatus.blind",
      img: "icons/svg/blind.svg",
      changes:[
        {
            key: "system.combat.melee.bonuses.effects",
            mode: 2,
            value: -5
        },
        {
            key: "system.combat.ranged.bonuses.effects",
            mode: 2,
            value: -10
        },
        {
            key: "system.combat.init.bonuses.effects",
            mode: 2,
            value: -5
        },          
        {
            key: "system.combat.def.bonuses.effects",
            mode: 2,
            value: -5
        }],
        description:"CO.customStatus.blindDescription" 
    },
    {
      id: "silence",
      name: "CO.customStatus.silence",
      img: "icons/svg/silenced.svg"
    },    
    {
      id: "outOfBreath",
      name: "CO.customStatus.outOfBreath",
      img: "systems/co/ui/effects/breath.webp",
      changes:[
        {
            key: "system.attributes.movement.bonuses.effects",
            mode: 5,
            value: 5
        }
        ],
        description:"CO.customStatus.outOfBreathDescription"   
    },
    {
      id: "bleeding",
      name: "CO.customStatus.bleeding",
      img: "icons/svg/blood.svg"
    },
    {
      id: "invalid",
      name: "CO.customStatus.invalid",
      img: "systems/co/ui/effects/disably.webp",
      changes:[
        {
            key: "system.attributes.movement.bonuses.effects",
            mode: 5,
            value: 5
        }
        ],
        description:"CO.customStatus.invalidDescription"
    },
    {
      id: "poison",
      name: "CO.customStatus.poison",
      img: "icons/svg/poison.svg"
    },
    {
      id: "slowed",
      name: "CO.customStatus.slowed",
      img: "systems/co/ui/effects/slow.webp",
      description:"CO.customStatus.slowedDescription"
    },
    {
      id: "overturned",
      name: "CO.customStatus.overturned",
      img: "systems/co/ui/effects/upsidedown.webp",
      changes:[
        {
            key: "system.combat.melee.bonuses.effects",
            mode: 2,
            value: -5
        },
        {
            key: "system.combat.ranged.bonuses.effects",
            mode: 2,
            value: -5
        },
        {
            key: "system.combat.magic.bonuses.effects",
            mode: 2,
            value: -5
        },          
        {
            key: "system.combat.def.bonuses.effects",
            mode: 2,
            value: -5
        }            
        ],
        description:"CO.customStatus.overturnedDescription"
    },
    {
      id: "surprised",
      name: "CO.customStatus.surprised",
      img: "systems/co/ui/effects/surprised.webp",
      changes:[
        {
            key: "system.combat.def.bonuses.effects",
            mode: 2,
            value: -5
        }
        ],
        description:"CO.customStatus.surprisedDescription"
    },    
    {
      id: "weakened",
      name: "CO.customStatus.weakened",
      img: "icons/svg/downgrade.svg",
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
        }],
        description:"CO.customStatus.weakenedDescription"
    },
    {
      id: "invisible",
      name: "CO.customStatus.Invisible",
      img: "icons/svg/invisible.svg"
    }
  ]