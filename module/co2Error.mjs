export class Co2Error extends Error {
    static objToString (obj) {
    return Object.entries(obj).reduce((str, [p, val]) => {
        return `${str}${p}::${val}\n`;
    }, '');
    }
  constructor(message, err, objet) {  
    let text = message + '\nObjet suspecté :\n' + Co2Error.objToString(objet)   
    super(text)
    this.name = "Co2Error"
    this.stack = err.stack    
  }
   
}

 