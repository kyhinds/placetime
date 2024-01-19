const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { py2js } = require('./src/controller/bridges/python');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Map to store bitcoin addresses and their bitmaps
const addressBitmapMap = new Map();

// Sample data for testing
addressBitmapMap.set('testBitcoinAddress', [123456, 654321]);

// API Route to get bitmaps associated with a given address
app.get('/api/address-to-bitmaps/:address', (req, res) => {
    const address = req.params.address;
    const bitmaps = addressBitmapMap.get(address);

    if (!bitmaps) {
        return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ address: address, bitmaps: bitmaps });
});

// API Route to get Plus Codes for a specific array of bitmaps
app.get('/api/bitmaps-to-pluscodes/:bitmaps', async (req, res) => {
    const bitmaps = req.params.bitmaps.split(',').map(Number);

    try {
        const result = await py2js('python_modules/p.py', ['bitmaps_to_plus_codes', ...bitmaps]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Route to convert Plus Code to bitmap
app.get('/api/pluscode-to-bitmap/:pluscode', async (req, res) => {
    const plusCode = req.params.pluscode;

    try {
        const result = await py2js('python_modules/p.py', ['plus_code_to_bitmap', plusCode]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Route to find the address associated with a bitmap
app.get('/api/bitmap-to-address/:bitmap', (req, res) => {
    const bitmap = parseInt(req.params.bitmap);
    let foundAddress = null;

    for (let [address, bitmaps] of addressBitmapMap.entries()) {
        if (bitmaps.includes(bitmap)) {
            foundAddress = address;
            break;
        }
    }

    if (foundAddress) {
        res.json({ address: foundAddress });
    } else {
        res.status(404).json({ error: 'Bitmap not associated with any address' });
    }
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected');

    // Emit current state to the newly connected client
    socket.emit('update', Array.from(addressBitmapMap.entries()));

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

