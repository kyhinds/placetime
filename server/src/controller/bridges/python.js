// bridges/python.js
const { spawn } = require('child_process');

function py2js(pythonScript, args) {
    return new Promise((resolve, reject) => {
        // Make sure to specify the correct path to your python environment if it's not globally accessible
        const pythonProcess = spawn('python', [pythonScript, ...args]);
        let result = '';

        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        pythonProcess.stdout.on('end', () => {
            try {
                resolve(JSON.parse(result));
            } catch (e) {
                reject(e);
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            reject(data.toString());
        });
    });
}

module.exports = { py2js };
