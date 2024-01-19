

class System {
    static instance;
    constructor({db}) {
        if (!System.instance) {
            this.db = db || null;
            this.clients = [];
            System.instance = this;
            // cl
            // err
            // compareObjects
            // deepCopy
            // createCallStack
            // updateCallbackInput
            // doCallback
            for (const method of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
                if (method !== 'constructor') {
                    this[method] = this[method].bind(this);
                }
            }
        }
        return System.instance;
    }
    cl(message){
        this.db.cl(message)
    }
    cl(error){
        this.db.err(error)
    }
    compareObjects(obj1, obj2) {
        if (obj1 === undefined || obj2 === undefined) {
            return false;
        }
        if (obj1 === null || obj2 === null) {
            return obj1 === obj2;
        }
        return obj1.toString() === obj2.toString();
    }
    deepCopy(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        const newObj = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            newObj[key] = this.deepCopy(obj[key]);
        }
        return newObj;
    }
    clone(obj) { // alert(obj);
        return Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);
    }
    createCallStack(functions) {
        if (functions.length === 0) {
            return null;
        }
        const currentFunc = functions[0];
        const remainingFuncs = functions.slice(1);
        const nestedCallback = this.createCallStack(remainingFuncs);
    
        return {
            func: currentFunc.func,
            input: {
                ...currentFunc.input,
                dbTransaction: currentFunc.dbTransaction || false, // Setting the dbTransaction flag here
                callback: nestedCallback, // Directly set the nested callback here
            },
        };
    }  
    getCallbackAtIndex(callbackChain, index, currentIndex = 0) {
        if (!callbackChain) return null;
        if (currentIndex === index) return callbackChain;
        return this.getCallbackAtIndex(callbackChain.input.callback, index, currentIndex + 1);
    }
    updateCallbackInput(callbackChain, index, newInputs, currentIndex = 0) {
        if (!callbackChain) return null;

        if (currentIndex === index) {
            return {
                func: callbackChain.func,
                input: {
                    ...callbackChain.input,
                    ...newInputs,
                    callback: callbackChain.input.callback, // Carry over the rest of the chain
                },
            };
        }

        return {
            func: callbackChain.func,
            input: {
                ...callbackChain.input,
                callback: this.updateCallbackInput(callbackChain.input.callback, index, newInputs, currentIndex + 1),
            },
        };
    }
    async doCallback(msg, data, continueStack = true) {
        this.cl("EXECUTE CALLBACKS");
        this.cl(msg.callback)
        this.cl(msg.data)
        delete msg.data
        //this.cl("JOINS AND DATA");
        //this.cl(data)
        //this.cl(msg.callback)
        continueStack = (continueStack && msg.callback && msg.callback !== null) ? true : false;
        this.cl("CONTINUE STACK?: " + continueStack);
        if (!msg.callback) {
            return;
        }
        //this.cl(msg);
        const callback = msg.callback;
        let newMessage = {
            ...msg
        };
        // Merge properties from the data object
        if (typeof data === "object" && data !== null) {
            newMessage = {
                ...newMessage,
                ...data
            };
        } else {
            newMessage.data = data;
        }
  
        // Destructure callback.input into separate variables for `callback` and `...rest`
        const { callback: nestedCallback, ...rest } = callback.input;
    
        // Merge properties from `...rest` into `newMessage.data`
        newMessage.data = {
            ...newMessage.data,
            ...rest
        };
    
        if (!continueStack) {
            newMessage.callback = null; // Remove the remaining nested callbacks
        } else {
            newMessage.callback = msg.callback.input.callback; // Set the next callback in the chain
        }
    
        // When updating callback.input, ensure that the `callback` property remains unchanged
        callback.input = {
            ...callback.input,
            ...newMessage,
            callback: nestedCallback  // Restore the original `callback` property
        };
        
        await this.executeSystemRequest(callback.func, callback.input, callback.dbTransaction);
    }
    
    async executeSystemRequest(func, input, dbTransaction = false) {
        let result;
        const funcName = func.name || 'Anonymous function';
        try {
            await logSystemRequest(`Started executing ${funcName} dbTransaction:${dbTransaction}`, input);
            if (dbTransaction) {
                await db.startTransaction();  // Assume db.startTransaction is the correct method to start a transaction
                result = await func(input);
                await db.commitTransaction();
            } else {
                result = await func(input); 
            }
            await logSystemRequest(`Successfully executed ${funcName} dbTransaction:${dbTransaction}`, result);   
        } catch (error) {
            if (dbTransaction) {
                await db.abortTransaction();  // Assume db.abortTransaction is the correct method to abort a transaction
            }
            await logSystemRequest(`Failed executing ${funcName} dbTransaction:${dbTransaction}`, error);
            throw error;  // Re-throw the error after logging and handling the transaction
        }
        return result;
    }
    
    async logSystemRequest(status, result = null) {
        const logData = {
            status,
            result,
            timestamp: new Date()
        };
        await db.request('SERVER', status, 'SystemRequestsLog', "insert", {}, logData);  // Assume db.request is a function you've made to handle db operations
    }    
}

module.exports = System;

// async doCallback(msg, data, continueStack) {
//     this.cl("EXECUTE CALLBACKS");
//     this.cl(msg.callback)
//     this.cl(msg.data)
//     delete msg.data
//     //this.cl("JOINS AND DATA");
//     //this.cl(data)
//     //this.cl(msg.callback)
//     continueStack = (continueStack && msg.callback && msg.callback !== null) ? true : false;
//     this.cl("CONTINUE STACK?: "+ continueStack);
//     if (!msg.callback) {
//         return;
//     }
//     //this.cl(msg);
//     const callback = msg.callback;
//     let newMessage = {
//         ...msg
//     };
//     // Merge properties from the data object
//     if (typeof data === "object" && data !== null) {
//         newMessage = {
//             ...newMessage,
//             ...data
//         };
//     } else {
//         newMessage.data = data;
//     }
//     if (!continueStack) {
//         newMessage.callback = null; // Remove the remaining nested callbacks
//     } else {
//         newMessage.callback = msg.callback.input.callback; // Set the next callback in the chain
//     }
//     callback.input = {
//         ...callback.input,
//         ...newMessage
//     };
//     await this.executeTransaction(callback.func, callback.input);
//}