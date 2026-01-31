const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

async function login() {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    expectValidJwt(loginRes.body.token);

    const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
    delete expectedUser.password;
    expect(loginRes.body.user).toMatchObject(expectedUser);
    return loginRes;
}

test('login', login);

test('logout', async () => {
    const loginRes = await login();
    const token = loginRes.body.token;
    const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toMatch("logout successful");
});

test('register', async () => {
    const newUser = { name: 'test user', email: Math.random().toString(36).substring(2, 12) + '@test.com', password: 'a'};
    const registerRes = (await request(app).post('/api/auth').send(newUser));
    testUserAuthToken = registerRes.body.token;
    expect(registerRes.status).toBe(200);
    expectValidJwt(registerRes.body.token);
    expect(registerRes.body.user.email).toBe(newUser.email)
});

test('register missing fields', async () => {
    const registerRes = await request(app).post('/api/auth').send({ email: 'test@test.com' });
    expect(registerRes.status).toBe(400);
    expect(registerRes.body.message).toMatch('required');
});

test('login with invalid password', async () => {
    const loginRes = await request(app).put('/api/auth').send({ email: testUser.email, password: 'wrong' });
    expect(loginRes.status).toBe(404);
});

test('logout without token', async () => {
    const logoutRes = await request(app).delete('/api/auth');
    expect(logoutRes.status).toBe(401);
});

