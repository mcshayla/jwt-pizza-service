const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

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

test('getFranchises', async () => {
    const franchisesRes = await request(app).get('/api/franchise');
    expect(franchisesRes.status).toBe(200);
    expect(franchisesRes.body).toHaveProperty('franchises');
    expect(franchisesRes.body).toHaveProperty('more');
    expect(Array.isArray(franchisesRes.body.franchises)).toBe(true);
});

test('createFranchise not admin', async () => {
    const createFranchiseRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${testUserAuthToken}`)
      .send({ name: 'Test Franchise', admins: [{ email: testUser.email }] });
    expect(createFranchiseRes.status).toBe(403);
    expect(createFranchiseRes.body.message).toMatch('unable to create a franchise');
});

test('createFranchise as admin', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;
    
    const createFranchiseRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({ name: 'Admin Franchise ' + randomName(), admins: [{ email: admin.email }] });
    expect(createFranchiseRes.status).toBe(200);
    expect(createFranchiseRes.body).toHaveProperty('id');
    expect(createFranchiseRes.body).toHaveProperty('name');
    expect(createFranchiseRes.body).toHaveProperty('admins');
});

test('getUserFranchises', async () => {
    const userFranchisesRes = await request(app)
      .get(`/api/franchise/${testUser.id}`)
      .set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(userFranchisesRes.status).toBe(200);
    expect(Array.isArray(userFranchisesRes.body)).toBe(true);
});

test('createStore', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;
    
    // First create a franchise
    const franchiseRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({ name: 'Store Test Franchise ' + randomName(), admins: [{ email: admin.email }] });
    const franchiseId = franchiseRes.body.id;

    // Then create a store
    const storeRes = await request(app)
      .post(`/api/franchise/${franchiseId}/store`)
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({ name: 'Test Store' });
    expect(storeRes.status).toBe(200);
    expect(storeRes.body).toHaveProperty('id');
    expect(storeRes.body).toHaveProperty('name');
});

test('createStore without permission', async () => {
    const storeRes = await request(app)
      .post('/api/franchise/1/store')
      .set('Authorization', `Bearer ${testUserAuthToken}`)
      .send({ name: 'Unauthorized Store' });
    expect(storeRes.status).toBe(403);
    expect(storeRes.body.message).toMatch('unable to create a store');
});

test('deleteFranchise', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;
    
    // First create a franchise
    const franchiseRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({ name: 'Delete Test Franchise ' + randomName(), admins: [{ email: admin.email }] });
    const franchiseId = franchiseRes.body.id;

    // Delete the franchise
    const deleteRes = await request(app)
      .delete(`/api/franchise/${franchiseId}`)
      .set('Authorization', `Bearer ${adminAuthToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toMatch('franchise deleted');
});

test('deleteStore', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;
    
    // First create a franchise
    const franchiseRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({ name: 'Store Delete Test ' + randomName(), admins: [{ email: admin.email }] });
    const franchiseId = franchiseRes.body.id;

    // Create a store
    const storeRes = await request(app)
      .post(`/api/franchise/${franchiseId}/store`)
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({ name: 'Store to Delete' });
    const storeId = storeRes.body.id;

    // Delete the store
    const deleteRes = await request(app)
      .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
      .set('Authorization', `Bearer ${adminAuthToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toMatch('store deleted');
});

test('deleteStore without permission', async () => {
    const deleteRes = await request(app)
      .delete('/api/franchise/1/store/1')
      .set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.message).toMatch('unable to delete a store');
});

test('getFranchises with name filter', async () => {
    const franchisesRes = await request(app).get('/api/franchise?name=pizza');
    expect(franchisesRes.status).toBe(200);
    expect(franchisesRes.body).toHaveProperty('franchises');
    expect(franchisesRes.body).toHaveProperty('more');
    expect(Array.isArray(franchisesRes.body.franchises)).toBe(true);
});

test('getFranchises with pagination', async () => {
    const franchisesRes = await request(app).get('/api/franchise?page=0&limit=5');
    expect(franchisesRes.status).toBe(200);
    expect(franchisesRes.body).toHaveProperty('franchises');
    expect(franchisesRes.body).toHaveProperty('more');
});

test('getUserFranchises unauthorized', async () => {
    const admin = await createAdminUser();
    const userFranchisesRes = await request(app)
      .get(`/api/franchise/${admin.id}`)
      .set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(userFranchisesRes.status).toBe(200);
    expect(Array.isArray(userFranchisesRes.body)).toBe(true);
    expect(userFranchisesRes.body.length).toBe(0);
});

test('createFranchise with unknown admin email', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;
    
    const createFranchiseRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({ name: 'Unknown Admin Franchise', admins: [{ email: 'nonexistent@test.com' }] });
    expect(createFranchiseRes.status).toBe(404);
});
