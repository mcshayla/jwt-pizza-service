const request = require('supertest');
const app = require('../service');

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('getMenu', async () => {
    const menuRes = await request(app).get('/api/order/menu');
    expect(menuRes.status).toBe(200);
});

test('addMenuItem not admin', async () => {
    const addMenuItemRes = await request(app)
      .put('/api/order/menu')
      .set('Authorization', `Bearer ${testUserAuthToken}`)
      .send({ title: 'test', description: 'test', image: 'test.png', price: 0.05 });
    expect(addMenuItemRes.status).toBe(403);
});

test('addMenuItem Admin', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;
    expectValidJwt(adminAuthToken);
    const addItemRes = await request(app).put('/api/order/menu')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send({ title: 'test', description: 'test', image: 'test.png', price: 0.05 });
    expect(addItemRes.status).toBe(200);

});

// test('register', async () => {
//     const newUser = { name: 'test user', email: Math.random().toString(36).substring(2, 12) + '@test.com', password: 'a'};
//     const registerRes = (await request(app).post('/api/auth').send(newUser));
//     testUserAuthToken = registerRes.body.token;
//     expect(registerRes.status).toBe(200);
//     expectValidJwt(registerRes.body.token);
//     expect(registerRes.body.user.email).toBe(newUser.email)
// });

// test('register missing fields', async () => {
//     const registerRes = await request(app).post('/api/auth').send({ email: 'test@test.com' });
//     expect(registerRes.status).toBe(400);
//     expect(registerRes.body.message).toMatch('required');
// });

// test('login with invalid password', async () => {
//     const loginRes = await request(app).put('/api/auth').send({ email: testUser.email, password: 'wrong' });
//     expect(loginRes.status).toBe(404);
// });

// test('logout without token', async () => {
//     const logoutRes = await request(app).delete('/api/auth');
//     expect(logoutRes.status).toBe(401);
// });