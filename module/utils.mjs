import { SYSTEM } from "./config/system.mjs"

export default class Utils {
  /**
   * Generates a tooltip string based on the provided name and value.
   *
   * @param {string} name The name to be included in the tooltip.
   * @param {number} value The value to be included in the tooltip.
   * @returns {string} "Nom : valeur " the formatted tooltip string if both name and value are valid, otherwise an empty string.
   */
  static getTooltip(name, value) {
    if (name !== "" && value !== 0) {
      return ` ${name} : ${value}`
    }
    return ""
  }

  /**
   * Logs a message with the system description.
   *
   * @param {string} message The message to log.
   * @returns {string} The formatted log message.
   */
  static log(message) {
    return `${SYSTEM.SYSTEM_DESCRIPTION} | ${message}`
  }

  /**
   * Retrieves the localized name of an ability.
   *
   * @param {string} ability The ability identifier.
   * @returns {string} The localized name of the ability.
   */
  static getAbilityName(ability) {
    return game.i18n.localize(`CO.abilities.long.${ability}`)
  }

  /**
   * Évalue un modificateur basé sur la formule fournie.
   *
   * @param {Object} actor L'objet acteur contenant les données pertinentes.
   * @param {string} formula La formule à évaluer.
   * @param {Object} source L'objet source pour les valeurs personnalisées.
   * @returns {number} Le résultat de la formule évaluée ou 0 si invalide.
   */
  static evaluateModifier(actor, formula, source) {
    if (formula === "" || formula.includes("d") || formula.includes("D")) return 0

    // Formule avec des raccourcis
    if (formula.includes("@")) {
      let newFormula = Utils.evaluateFormulaCustomValues(actor, formula, source)
      newFormula = Roll.replaceFormulaData(newFormula, actor.getRollData())
      return eval(newFormula)
    }

    // Un simple chiffre
    const resultat = parseInt(formula)
    if (isNaN(resultat)) return 0
    return resultat
  }

  /**
   * Pour un acteur, évalue une formule  en remplaçant les valeurs custom pour le rang ou le dé évolutif
   * @param {*} actor : l'acteur concerné
   * @param {*} formula : une formule de type texte qui peut potentiellement contenir des @rank/@rang ou du dé évolutif
   * @param {UUID} sourceUuid The item source's UUID : used for the #rank
   * @returns {string} la formule avec les éléments remplacés
   */
  static evaluateFormulaCustomValues(actor, formula, sourceUuid = null) {
    let replacedFormula = foundry.utils.duplicate(formula)
    // Cas du dé évolutif
    if (replacedFormula.includes("d4°")) {
      replacedFormula = Utils._replaceEvolvingDice(actor, replacedFormula)
    }
    // Cas du rang
    if (replacedFormula.includes("@rank") || replacedFormula.includes("@rang")) {
      if (sourceUuid) replacedFormula = this._replaceRank(actor, replacedFormula, sourceUuid)
    }
    if (replacedFormula.includes("@allrank") || replacedFormula.includes("@toutrang")) {
      if (sourceUuid) replacedFormula = this._replaceAllRank(actor, replacedFormula, sourceUuid)
    }
    // Cas du @arme qui remplace par les dommages de l'action principale de l'arme équipée
    if (replacedFormula.includes("@arme.dmg")) {
      const weapon = actor.equippedWeapons[0]
      if (weapon) {
        const dmg = weapon.system.damage
        if (dmg) replacedFormula = replacedFormula.replace("@arme.dmg", dmg)
      }
    }
    return replacedFormula
  }

  /**
   * Retourne un texte dans lequel on a remplacé le dé évolutif par le dé qu'il devrait y avoir selon le niveau de l'acteur
   * @param {*} actor L'acteur concerné
   * @param {*} content Le texte contenant un dé évolutif
   * @returns {string} Le texte avec le vrai dé à utiliser
   */
  static _replaceEvolvingDice(actor, content) {
    let result
    if (actor.type === "character") {
      if (actor.system.attributes.level < 6) result = content.replace("d4°", "d4")
      else if (actor.system.attributes.level <= 8) result = content.replace("d4°", "d6")
      else if (actor.system.attributes.level <= 11) result = content.replace("d4°", "d8")
      else if (actor.system.attributes.level <= 14) result = content.replace("d4°", "d10")
      else result = content.replace("d4°", "d12")
    } else if (actor.type === "encounter") {
      if (actor.system.attributes.nc < 6) result = content.replace("d4°", "d4")
      else if (actor.system.attributes.nc <= 8) result = content.replace("d4°", "d6")
      else if (actor.system.attributes.nc <= 11) result = content.replace("d4°", "d8")
      else if (actor.system.attributes.nc <= 14) result = content.replace("d4°", "d10")
      else result = content.replace("d4°", "d12")
    }
    return result
  }

  /**
   * Retourne un texte dans lequel on a remplacé le rang dans une categorie par sa valeur
   * La syntaxe peut être @rank ou @rang ou @rank[1,0,0,1,0] ou @rang[1,0,0,1,0] pour un bonus de 1 au rang 1 et au rang 4
   * @param {*} actor : acteur concerné
   * @param {*} content : le texte contenant une référence à un rang
   * @param {UUID} source The item source's UUID : used for the #rank
   */
  static _replaceRank(actor, content, source) {
    // Pour connaitre le rang d'une voie il faut remonter à la source pour savoir de quelle voie il s'agit
    let itemSource = fromUuidSync(source)
    if (!itemSource || itemSource.type !== "capacity") return content

    // Si on est sur une capacité enfant on depend du rang du parent
    if (itemSource.system.parentCapacity) {
      console.log("ReplaceRank sur une capacité enfant, on remplace par le parent pour le calcul : ", itemSource.system.parentCapacity)
      itemSource = fromUuidSync(itemSource.system.parentCapacity)
    }

    if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`Utils - _replaceRank - actor, formula, source, itemSource`), actor, content, source, itemSource)
    const pathUuid = itemSource.system.path
    const path = fromUuidSync(pathUuid)
    const rank = path?.system.rank ?? 0

    // Cas @rank[x,x,x,x,x]
    // Géré en premier pour éviter un remplacement de @rank avant le remplacement de @rank[x,x,x,x,x]
    let regexBracket = /@rank\[(.*?)\]/
    if (regexBracket.test(content)) {
      // Utilisation de replace avec une fonction de rappel pour calculer la somme
      content = content.replace(regexBracket, (match, numbersStr) => {
        // Séparer la chaîne en tableau et convertir en nombres
        const numbers = numbersStr
          .split(",")
          .map((n) => parseInt(n, 10))
          .slice(0, rank) // Prendre uniquement les rank premiers éléments

        // Calculer la somme
        const sum = numbers.reduce((acc, cur) => acc + cur, 0)

        // Remplacer l'intégralité de la chaîne par la somme
        return sum.toString()
      })
    }
    regexBracket = /@rang\[(.*?)\]/
    if (regexBracket.test(content)) {
      // Utilisation de replace avec une fonction de rappel pour calculer la somme
      content = content.replace(regexBracket, (match, numbersStr) => {
        // Séparer la chaîne en tableau et convertir en nombres
        const numbers = numbersStr
          .split(",")
          .map((n) => parseInt(n, 10))
          .slice(0, rank) // Prendre uniquement les rank premiers éléments

        // Calculer la somme
        const sum = numbers.reduce((acc, cur) => acc + cur, 0)

        // Remplacer l'intégralité de la chaîne par la somme
        return sum.toString()
      })
    }

    // Cas @rank
    let regexSimple = /@rank/
    if (regexSimple.test(content)) {
      content = content.replace("@rank", rank)
    }
    regexSimple = /@rang/
    if (regexSimple.test(content)) {
      content = content.replace("@rang", rank)
    }

    return content
  }

  /**
   * Retourne un texte dans lequel on a remplacé @allrank[level] par le nombre de fois que ce rang est atteint dans une voie de ce profil
   * @param {*} actor : acteur concerné
   * @param {*} content : le texte contenant une référence à un rang
   * @param {UUID} source The item source's UUID : used for the #rank
   */
  static _replaceAllRank(actor, content, source) {
    const { id } = foundry.utils.parseUuid(source)
    let itemSource = actor.items.get(id)
    if (itemSource.type !== "capacity") return formula

    // Si on est sur une capacité enfant on depend du rang du parent
    if (itemSource.system.parentCapacity) {
      console.log("ReplaceRank sur une capacité enfant, on remplace par le parent pour le calcul : ", itemSource.system.parentCapacity)
      itemSource = fromUuidSync(itemSource.system.parentCapacity)
    }

    let startRank = content.includes("@allrank") ? content.substring(content.indexOf("@allrank")) : content.substring(content.indexOf("@toutrang"))
    let extract = startRank.substring(startRank.indexOf("[") + 1, startRank.indexOf("]"))
    if (extract) {
      const rank = parseInt(extract)
      if (rank && rank > 0 && rank <= 8) {
        if (CONFIG.debug.co?.rolls) console.debug(Utils.log(`Utils - _replaceAllRank - itemSource`), itemSource)

        const profile = actor.system.profile
        if (profile) {
          let compteur = 0
          // Toutes les voies du profil qui ont atteint le rang demandé
          profile.system.paths.forEach((p) => {
            const { id } = foundry.utils.parseUuid(p)
            const path = actor.items.get(id)
            if (path.system.rank >= rank) compteur += 1
          })
          content = content.includes("@allrank") ? content.replace(`@allrank[${extract}]`, compteur) : content.replace(`@toutrang[${extract}]`, compteur)
        }
      }
    }
    return content
  }

  /**
   * Determines the attack type based on the provided formula string.
   *
   * @param {string} formula The formula string to evaluate.
   * @returns {string|undefined} The ID of the attack type (melee, ranged, or magic) if found, otherwise undefined.
   */
  static getAttackTypeFromFormula(formula) {
    if (formula.includes("@atc")) return SYSTEM.ACTION_TYPES.melee.id
    if (formula.includes("@atd")) return SYSTEM.ACTION_TYPES.ranged.id
    if (formula.includes("@atm")) return SYSTEM.ACTION_TYPES.magical.id
    return undefined
  }

  /**
   * Calcul la somme d'un tableau de valeurs positives ou négatives
   *
   * @param {*} array Un tableau de valeurs
   * @returns {int} 0 ou la somme des valeurs
   */
  static addAllValuesFromArray(array) {
    return array.length > 0 ? array.reduce((acc, curr) => acc + curr, 0) : 0
  }

  /**
   * Evaluates the given formula to find the opposite value.
   *
   * This function checks if the formula contains the "@oppose" keyword.
   * If found, it extracts and returns the value following "@oppose.".
   * If the keyword is not present, it returns undefined.
   *
   * @param {string} formula The formula string to evaluate.
   * @param {object} actor
   * @returns {string|undefined} The extracted opposite value or undefined if not found.
   */
  static evaluateOppositeFormula(formula, actor) {
    if (!formula.includes("@oppose")) return undefined
    const regex = /@oppose\.([^\s]+)/
    const match = formula.match(regex)
    let result = undefined
    if (match) {
      result = match[1]
    }
    const rollData = actor.getRollData()
    if (foundry.utils.hasProperty(rollData, result)) {
      return foundry.utils.getProperty(rollData, result)
    }
    return undefined
  }
}
