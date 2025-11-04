export class Co2Error extends Error {
  constructor(message, err) {
    super(message)
    this.name = "Co2Error"
    this.message = message  
    this.stack = err.stack
  }
}

 