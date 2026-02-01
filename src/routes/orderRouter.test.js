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

test('getOrders', async () => {
    const getOrdersRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(getOrdersRes.status).toBe(200);
    expect(getOrdersRes.body).toHaveProperty('dinerId');
    expect(getOrdersRes.body).toHaveProperty('orders');
    expect(Array.isArray(getOrdersRes.body.orders)).toBe(true);
    expect(getOrdersRes.body).toHaveProperty('page');
});

test('createOrders', async () => {
    const createOrderRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`)
    .send({"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]});
    expect(createOrderRes.status).toBe(200);
    expect(createOrderRes.body).toHaveProperty('order');
    expect(createOrderRes.body).toHaveProperty('jwt');
    expect(createOrderRes.body.order).toHaveProperty('id');
});

//refactor createORder or something because right now you can create an order for any franchiseId.

// test('createOrders fail', async () => {
//     const createOrderRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`)
//     .send({"franchiseId": 9999, "storeId":9999, "items":[{ "menuId": 7, "description": "7Test", "price": 0.07 }]});
//     expect(createOrderRes.status).toBe(500);
   
// });

