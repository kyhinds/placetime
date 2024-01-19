const fs = require("fs");
const path = require("path");
const consoleLogPath = "console_logs";

const {
    MongoClient,
    ObjectId
} = require("mongodb");
//const u = new(require('./system.js'))();

class DB {
    constructor({dbName, uri}) {
        this.dbName = dbName;
        this.uri = uri;
        this.client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        this.fs = fs;
        this.path = path;
        this.consoleLogPath = consoleLogPath; // Make it a class property
        this.currentOutputFileName = this.generateOutputFileName();
        this.initializeConsoleLog();
        // Commented out manual binding for all methods
        // this.request = this.request.bind(this);
        // this.updateElement = this.updateElement.bind(this);
        // this.incrementFieldById = this.incrementFieldById.bind(this);
        // this.getNextElementId = this.getNextElementId.bind(this);
        // this.search = this.search.bind(this);
        // this.start = this.start.bind(this);
        // sanitizeAndCheckDangerousInput
        // sanitizeInput
        // deserializeInput
        // hasDangerousCharacters
        // Loop binding all methods
        for (const method of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
            if (method !== 'constructor') {
                this[method] = this[method].bind(this);
            }
        }
    }
    //DATABASE FUNCTIONS
    async request(
        userId = 'SERVER',
		request,
        collectionName,
        operationType,
        options = {},
        ...pipeline
     ) {
        const db = this.client.db(this.dbName);
        const collection = db.collection(collectionName);
        //this.cl("USER: " + userId +" MADE REQUEST " +request+ " ON COLLECTION "+collectionName);
        //this.cl("operationType: " + operationType);
        //this.cl("pipeline: " + pipeline);

        // Determine the structure of the pipeline variable
        let aggregatePipeline;
        if (Array.isArray(pipeline[0])) {
            // A pipeline array was passed as the first argument
            aggregatePipeline = pipeline[0];
        } else {
            // Individual pipeline stages were passed as separate arguments
            aggregatePipeline = pipeline;
        }

        const operationsWithId = ['findOne', 'updateOne', 'updateMany', 'findAndUpdate', 'delete', 'deleteMany', 'countDocuments'];
        if (operationsWithId.includes(operationType) && pipeline.length > 0) {
            if (pipeline[0].hasOwnProperty('_id') && typeof pipeline[0]._id === 'string') {
                pipeline[0]._id = new ObjectId(pipeline[0]._id);
            }
        }

        let operationResult;
        //this.cl(`Calling request with operationType: ${operationType}`);
        switch (operationType) {
            case 'insert': {
                pipeline[0].docStatus = 0;
                pipeline[0].docCreated = new Date();
                const insertResult = await collection.insertOne(pipeline[0]);
                if (insertResult.acknowledged) {
                    const insertedDocument = await collection.findOne({
                        _id: insertResult.insertedId
                    });
                    operationResult = insertedDocument;
                } else {
                    throw new Error('Insert operation was not acknowledged.');
                }
				break;
            }
            case 'insertMany': {
                if (!Array.isArray(pipeline[0])) {
                    throw new Error('Invalid data format for insertMany operation. Expected an array of documents.');
                }

                // Add additional fields to each document in the array
                const enhancedDocs = pipeline[0].map(doc => ({
                    ...doc,
                    docStatus: 0,
                    docCreated: new Date()
                }));

                const insertResult = await collection.insertMany(enhancedDocs);

                // Create an array of inserted documents
                const insertedDocuments = enhancedDocs.map((doc, index) => {
                    return {
                        ...doc,
                        _id: insertResult.insertedIds[index]
                    };
                });
                operationResult = insertedDocuments;
				break;
            }


            case 'find': {
                const cursor = collection.find(pipeline[0]);

                if (options.sort) {
                    cursor.sort(options.sort);
                }

                if (options.limit) {
                    cursor.limit(options.limit);
                }

                const findResult = await cursor.toArray();
                operationResult = findResult;
                break;
            }
            case 'findOne': {
                const findOneResult = await collection.findOne(pipeline[0]);
                operationResult = findOneResult;
                break;
            }
            case "fetchAll":
                // logic for fetching all items
                response = await db[collection].find({});
                break;
            case 'updateOne': {
                if (pipeline.length === 2) {
                    const [filter, update] = pipeline;
                    const updateResult = await collection.findOneAndUpdate(filter, update, options);
                    //const findOneResult = await collection.findOne(filter);//hacky solution				  
                    if (updateResult && updateResult.ok) { // Make sure updateResult is not undefined
                        console.log("Update successful");
                        operationResult = updateResult.value; // this is the updated document
                    } else {
                        console.error('Update operation failed.'); // Enhanced logging
                        throw new Error('Update operation failed.');
                    }
                } else {
                    console.error('Invalid pipeline format for update operation'); // Enhanced logging
                    throw new Error('Invalid pipeline format for update operation');
                }
                break;
            }

            case 'updateMany': {
                if (pipeline.length === 2) {
                    const [filter, update] = pipeline;
                    const updateResult = await collection.updateMany(filter, update, options);
                    operationResult = updateResult.modifiedCount;
                } else {
                    throw new Error('Invalid pipeline format for update operation');
                }
                break;
            }
            case 'findAndUpdate': {
                const findOneAndUpdateResult = await collection.findOneAndUpdate(
                    pipeline[0].filter, {
                        $set: pipeline[0].update
                    }, {
                        ...options,
                        returnOriginal: false
                    }
                );
                operationResult = findOneAndUpdateResult.value;
                break;
            }
            case 'findOneAndUpdate': {
                const findOneAndUpdateResult = await collection.findOneAndUpdate(
                    pipeline[0],
                    pipeline[1], {
                        ...options,
                        returnOriginal: false // Set this to false if you want the updated document
                    }
                );
                operationResult = findOneAndUpdateResult.value;
                break;
            }
            case 'aggregate': {
                console.log("Input pipeline:", aggregatePipeline);
                console.log("Input options:", options);
                const aggregateResult = await collection.aggregate(aggregatePipeline).toArray();
                console.log("Output aggregateResult:", aggregateResult);
                operationResult = aggregateResult;
                break;
            }
            case 'delete': {
                const deleteResult = await collection.deleteOne(pipeline[0]);
                operationResult = deleteResult.deletedCount;
                break;
            }
            case 'deleteMany': {
                const deleteResult = await collection.deleteMany(pipeline[0]);
                operationResult = deleteResult.deletedCount;
                break;
            }
            case 'deleteAll': {
                const deleteResult = await collection.deleteMany({});
                operationResult = deleteResult.deletedCount;
                break;
            }
            case 'countDocuments': {
                const countResult = await collection.countDocuments(pipeline[0], options);
                operationResult = countResult;
                break;
            }
            case 'dropCollection': {
                const dropResult = await collection.drop();
                operationResult = dropResult;
                break;
            }
            case 'createCollection': {
                const newCollection = await db.createCollection(collectionName);
                operationResult = newCollection;
                break;
            }
            default: {
                throw new Error('Invalid operation type ${operationType}');
            }
        }
        // Insert event document
        if (operationResult) {
            const event = {
                userId,
				request,
                collectionName,
                operationType,
                details: {
                    ...operationResult
                },
                docCreated: new Date(),
            };
            const serverRequests = db.collection("serverRequests");
            await serverRequests.insertOne(event);
        } else {
            console.error('Operation failed, no event logged.');
        }

        return operationResult;

    }
    async updateElement(userId, request, collectionName, _id, updateFields = {}, template = null, objectKey = null) {
		console.log("UPDATE ELEMENT");
	
		// If the template is not provided, assume we can update all fields
		if (!template) {
			template = updateFields;
		}
	
		const updateQuery = {
			$set: {}
		};
	
		// Always exclude _id and docCreated from updates
        if(updateFields._id){
            delete updateFields._id;
        }
		if(updateFields.docCreated){
            delete updateFields.docCreated;
        }
            for (const [key, value] of Object.entries(updateFields)) {
                if (key in template) {
                    if (objectKey) {
                        updateQuery.$set[`${objectKey}.${key}`] = value;
                    } else {
                        updateQuery.$set[key] = value;
                    }
                }
            }       
        
		
		//console.log(updateFields);
		//console.log(updateQuery);
	
		// Perform the update
		try {
			const options = {
				returnDocument: 'after',
				upsert: true
			}; // Add upsert option
	
			const result = await this.request(
				userId,
				request,
				collectionName,
				"updateOne",
				options,       // these are your custom options
				{_id: _id}, // query
				updateQuery	 // update document
			);
	
			console.log("UPDATED ELEMENT AFTER");
	
			if (result.ok) {
				console.log(`Successfully inserted or updated an element with _id ${_id} in ${collectionName}`);
			} else {
				console.log(`No changes were made to the element with _id ${_id} in ${collectionName}`);
			}
	
			return result;
		} catch (err) {
			console.error(`Error updating element in ${collectionName}: ${err}`);
		}
	}
	
    async updateElementsInCollection(collectionName, selectionQuery, updateQuery) {
        console.log("Updating elements in collection...");

        // Ensure _id and docCreated are never altered
        if (updateQuery.$set) {
            delete updateQuery.$set._id;
            delete updateQuery.$set.docCreated;
        }

        try {
            const result = await this.request("SERVER", "UPDATE ELEMENTS IN COLLECTION", collectionName, "updateMany", {}, selectionQuery, updateQuery);
            console.log(`Updated ${result.matchedCount} document(s) in collection ${collectionName}.`);
        } catch (error) {
            console.error(`Error updating elements in collection ${collectionName}:`, error);
        }
    }
    async incrementFieldById(collectionName, documentId, fieldName, incrementValue) {
        if (fieldName === '_id' || fieldName === 'docCreated') {
            console.error("Cannot increment the _id or docCreated fields.");
            return;
        }

        try {
            // Fetch the document to check if the field is numeric
            const doc = await this.request("SERVER", "FIND DOCUMENT", collectionName, "findOne", {}, {
                _id: documentId
            });
            if (typeof doc[fieldName] !== 'number') {
                console.error(`The field ${fieldName} is not a number and cannot be incremented.`);
                return;
            }

            const updateResult = await this.request("SERVER", "INCREMENT FIELD", collectionName, "updateOne", {}, {
                _id: documentId
            }, {
                $inc: {
                    [fieldName]: incrementValue
                }
            });

            if (updateResult.modifiedCount === 1) {
                console.log(`Successfully incremented ${fieldName} by ${incrementValue} for document with _id ${documentId} in the ${collectionName} collection.`);
            } else {
                console.log(`Failed to increment ${fieldName} for document with _id ${documentId} in the ${collectionName} collection.`);
            }
        } catch (error) {
            console.error(`Error incrementing field by ID in collection ${collectionName}:`, error);
        }
    }
    async getNextElementId(collection) {
        const lastElement = await this.request("SERVER", "GET NEXT ELEMENT ID", collection, "find", {
            sort: {
                id: -1
            },
            limit: 1
        }, {});
        this.cl("LAST ELEMENT" + lastElement)
        if (lastElement && lastElement.length > 0) {
            return lastElement[0].id + 1;
        } else {
            return 0;
        }
    }
    async renameFieldsInCollection(collectionName, selectionQuery, updateQuery) {
        // Ensure we aren't renaming to or from _id or docCreated
        Object.entries(updateQuery).forEach(([key, value]) => {
            if (key === '_id' || key === 'docCreated' || value === '_id' || value === 'docCreated') {
                delete updateQuery[key];
            }
        });

        try {
            const allDocuments = await this.request("SERVER", "FIND DOCUMENTS TO RENAME", collectionName, "find", selectionQuery);
            for (const doc of allDocuments) {
                await this.request("SERVER", "RENAME FIELDS", collectionName, "updateOne", {}, {
                    _id: doc._id
                }, updateQuery);
            }
        } catch (error) {
            console.error(`Error in renaming fields in collection ${collectionName}:`, error);
        }
    }
    generateUpdateQuery(prefix, query) {
        const updateQuery = {
            $set: {}
        };

        for (const [key, value] of Object.entries(query)) {
            updateQuery.$set[`${prefix}.${key}`] = value;
        }

        return updateQuery;
    }
    //SERVER FUNCTIONS
    initializeConsoleLog() {
        if (!this.fs.existsSync(consoleLogPath)) {
            this.fs.mkdirSync(consoleLogPath);
        }
    }
    replacer() {
        const seen = new Set();
        return (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        };
    }
    cl(message) {
        // Get the caller's file and line number
        const stackTrace = new Error().stack.split('\n');
        const callerInfo = stackTrace[2].trim(); // The second line in the stack trace is the caller's info
        console.log(typeof message === 'object' ? JSON.stringify(message, this.replacer(), 2) : message);
        const messageString = message;
        this.fs.appendFile(this.path.join(this.consoleLogPath, this.currentOutputFileName),
         messageString + "\n" + callerInfo + "\n" + "\n" + "\n", (err) => {
            if (err) {
                console.error("Error writing to output file:", err);
            }
        });
    }
    err(error) {
        // Get the caller's file and line number
        const stackTrace = new Error().stack.split('\n');
        const callerInfo = stackTrace[2].trim(); 
        console.error("Error: ", error);
        const messageString = "Error: "+error;
        this.fs.appendFile(this.path.join(this.consoleLogPath, this.currentOutputFileName),
         messageString + "\n" + callerInfo + "\n" + "\n" + "\n", (err) => {
            if (err) {
                console.error("Error writing to output file:", err);
            }
        });
    }
    generateOutputFileName() {
        const date = new Date();
        const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
        const timeString = `${date.getHours().toString().padStart(2, "0")}-${date.getMinutes().toString().padStart(2, "0")}-${date.getSeconds().toString().padStart(2, "0")}`;
        return `output-${dateString}-${timeString}.js`;
    }
    sanitizeAndCheckDangerousInput(msg) {
        const sanitizedObj = this.sanitizeInput(msg);
        if (this.hasDangerousCharacters(sanitizedObj) || this.hasDangerousCharacters(msg)) {
            sanitizedObj.finalWords = "DIRTY INPUT";
            completeRequest(sanitizedObj);
            return;
        }
    }
    sanitizeInput(obj) {
        const newObj = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                newObj[key] = obj[key].replace(/</g, '&lt;').replace(/>/g, '&gt;');
            } else if (typeof obj[key] === 'object') {
                newObj[key] = this.sanitizeInput(obj[key]);
            } else {
                newObj[key] = obj[key];
            }
        }
        return newObj;
    }
    deserializeInput(obj) {
        const newObj = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                newObj[key] = obj[key].replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            } else if (typeof obj[key] === 'object') {
                newObj[key] = this.deserializeInput(obj[key]);
            } else {
                newObj[key] = obj[key];
            }
        }
        return newObj;
    }
    hasDangerousCharacters(obj) {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                if (obj[key].includes('<') || obj[key].includes('>')) {
                    return true;
                }
            } else if (typeof obj[key] === 'object') {
                if (this.hasDangerousCharacters(obj[key])) {
                    return true;
                }
            }
        }
        return false;
    }
    async start() {
        try {
            await this.client.connect();
            this.cl("Connected to MongoDB");
            //this.renameCollections()
        } catch (e) {
            console.error(e);
        }
    }

}
module.exports = DB;
