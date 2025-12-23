const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

// Spin up in-memory Mongo for integration tests
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    process.env.MONGO_URI = uri;
    process.env.JWT_SECRET = 'test-secret-32-char-minimum!';
    process.env.PORT = '0';
    process.env.NODE_ENV = 'test';
    process.env.BASE_URL = 'http://localhost:0';
});

// Clean between tests
afterEach(async () => {
    const { connections } = mongoose;
    for (const conn of connections) {
        const collections = await conn.db.collections();
        for (const collection of collections) {
            await collection.deleteMany({});
        }
    }
});

// Teardown
afterAll(async () => {
    await mongoose.connection.close();
    if (mongo) await mongo.stop();
});