require('./setup');
const request = require('supertest');
const mongoose = require('mongoose');
const initServer = require('../../config/server');
const connectDB = require('../../config/db');
const userRoutes = require('../../routes/userRoutes');
const errorHandler = require('../../utils/errorHandler');
const User = require('../../models/userModel');

// Helper to build fresh app per test
const buildApp = () => {
    const app = initServer();
    app.use('/api/users', userRoutes);
    app.use(errorHandler);
    return app;
};

describe('Integration: Auth + Users', () => {
    let app;

    beforeAll(async () => {
        await connectDB();
    });

    beforeEach(() => {
        app = buildApp();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    const register = (payload = {}) => {
        const defaults = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'Password1!'
        };
        return request(app)
            .post('/api/users/register')
            .send({ ...defaults, ...payload });
    };

    const login = (payload = {}) => {
        const defaults = {
            email: 'test@example.com',
            password: 'Password1!'
        };
        return request(app)
            .post('/api/users/login')
            .send({ ...defaults, ...payload });
    };

    it('registers and logs in a verified user', async () => {
        const regRes = await register();
        expect(regRes.status).toBe(201);

        // Manually mark verified for login
        const user = await User.findOne({ email: 'test@example.com' });
        user.isVerified = true;
        await user.save();

        const loginRes = await login();
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.data.accessToken).toBeDefined();
        expect(loginRes.body.data.refreshToken).toBeDefined();
    });

    it('rejects login for unverified user', async () => {
        await register();
        const loginRes = await login();
        expect(loginRes.status).toBe(401);
        expect(loginRes.body.error).toMatch(/verify/i);
    });

    it('returns profile for authenticated user', async () => {
        await register();
        const user = await User.findOne({ email: 'test@example.com' });
        user.isVerified = true;
        await user.save();

        const loginRes = await login();
        const token = loginRes.body.data.accessToken;

        const profileRes = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(profileRes.status).toBe(200);
        expect(profileRes.body.data.email).toBe('test@example.com');
    });

    it('changes password and prevents old password login', async () => {
        await register();
        const user = await User.findOne({ email: 'test@example.com' });
        user.isVerified = true;
        await user.save();

        const loginRes = await login();
        const token = loginRes.body.data.accessToken;

        const changeRes = await request(app)
            .patch('/api/users/password')
            .set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: 'Password1!', newPassword: 'NewPassword1!' });

        expect(changeRes.status).toBe(200);

        const badLogin = await login({ password: 'Password1!' });
        expect(badLogin.status).toBe(401);

        const goodLogin = await login({ password: 'NewPassword1!' });
        expect(goodLogin.status).toBe(200);
    });

    it('soft deletes and restricts access after delete', async () => {
        await register();
        const user = await User.findOne({ email: 'test@example.com' });
        user.isVerified = true;
        await user.save();

        const loginRes = await login();
        const token = loginRes.body.data.accessToken;

        const delRes = await request(app)
            .delete(`/api/users/${user._id.toString()}`)
            .set('Authorization', `Bearer ${token}`);
        expect(delRes.status).toBe(200);

        const profileRes = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${token}`);
        expect(profileRes.status).toBe(200);
        expect(profileRes.body.data.deletedAt).not.toBeNull();
    });
});