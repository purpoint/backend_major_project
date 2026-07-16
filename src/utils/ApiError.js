class ApiError extends Error {
    constructor(
        StatusCode,
        message="Something went wrong",
        errors=[],
        stack=""
    ){
        super(message)
        this.statusCode = StatusCode
        this.data=null
        this.message=message
        this.success=false
        this.errors=errors


        if(stack) {
            this.stack=stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}


export {ApiError}
