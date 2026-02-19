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

test('getUser', async () => {
    const getUser = await request(app).get('/api/user/me').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(getUser.status).toBe(200);
    expect(getUser.body).toMatchObject({
        name: testUser.name,
        email: testUser.email
    });
    expect(getUser.body).toHaveProperty('roles');
});

test('updateUser not admin', async () => {
    const updateUserRes = await request(app)
      .put('/api/user/notAdmin')
      .set('Authorization', `Bearer ${testUserAuthToken}`)
      .send({"name":"常用名字", "email":"a@jwt.com", "password":"admin"});
    expect(updateUserRes.status).toBe(403);
    expect(updateUserRes.body.message).toBe('unauthorized');
});

test('updateUser as admin', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;
    expectValidJwt(adminAuthToken);
    const updateUserRes = await request(app)
      .put(`/api/user/${admin.id}`)
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({"name":"Updated Name", "email":"updated@test.com", "password":"newpass"});
    expect(updateUserRes.status).toBe(200);
    expect(updateUserRes.body).toHaveProperty('user');
    expect(updateUserRes.body).toHaveProperty('token');
});

test('list users unauthorized', async () => {
  const listUsersRes = await request(app).get('/api/user');
  expect(listUsersRes.status).toBe(401);
});

test('list users', async () => {
  // const [user, userToken] = await registerUser(request(app));
  const admin = await createAdminUser();
  await registerUser(request(app));

  const loginRes = await request(app).put('/api/auth').send(admin);
  const adminAuthToken = loginRes.body.token;
  expectValidJwt(adminAuthToken);

  const listUsersRes = await request(app)
    .get('/api/user?page=1&limit=10&name=*')
    .set('Authorization', 'Bearer ' + adminAuthToken);
    
  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body).toHaveProperty('users');
  expect(listUsersRes.body.users.length).toBeGreaterThan(1);
});

async function registerUser(service) {
  const testUser = {
    name: 'pizza diner',
    email: `${randomName()}@test.com`,
    password: 'a',
  };
  const registerRes = await service.post('/api/auth').send(testUser);
  registerRes.body.user.password = testUser.password;

  return [registerRes.body.user, registerRes.body.token];
}

//implement and add tests for deleteUser and listUsers

