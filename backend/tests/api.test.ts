import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/api/app';
import { login, type Session } from '../src/services/login';
import { listClubs } from '../src/services/listClubs';

// The services have their own unit tests: here they are simulated so that
// only the HTTP layer (status codes, sessions, JSON) is tested.
jest.mock('../src/services/login', () => ({
  ...jest.requireActual('../src/services/login'),
  login: jest.fn(),
}));
jest.mock('../src/services/listClubs', () => ({ listClubs: jest.fn() }));

const prisma = {} as PrismaClient;

const alice: Session = {
  accountId: 7,
  name: 'Alice Tremblay',
  email: 'alice.tremblay@mail.mcgill.ca',
  role: 'USER',
};

const clubs = [
  { id: 4, name: 'Debate Union', category: 'Academic' },
  { id: 2, name: 'Jazz Society', category: 'Arts' },
];

describe('HTTP API', () => {

  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    jest.resetAllMocks();
    app = createApp(prisma);
  });

  /** Logs in as Alice and returns the session token. */
  async function loginAsAlice(): Promise<string> {
    jest.mocked(login).mockResolvedValue({ success: true, message: 'Login successful', session: alice });
    const response = await request(app)
      .post('/login')
      .send({ email: alice.email, password: 'Passw0rd!23' });
    return response.body.token;
  }

  describe('POST /login', () => {

    test('should return a token and the session when the credentials are valid', async () => {

      // Arrange
      jest.mocked(login).mockResolvedValue({ success: true, message: 'Login successful', session: alice });

      // Act
      const response = await request(app)
        .post('/login')
        .send({ email: alice.email, password: 'Passw0rd!23' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.token).toMatch(/^[0-9a-f]{64}$/);
      expect(response.body.session).toEqual(alice);
      expect(login).toHaveBeenCalledWith({ email: alice.email, password: 'Passw0rd!23' }, prisma);
    });

    test('should return 401 with the message when the credentials are wrong', async () => {

      // Arrange
      jest.mocked(login).mockResolvedValue({ success: false, message: 'Invalid email or password' });

      // Act
      const response = await request(app)
        .post('/login')
        .send({ email: alice.email, password: 'wrong' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Invalid email or password' });
    });

    test('should return 400 when a required field is missing', async () => {

      // Arrange
      jest.mocked(login).mockResolvedValue({ success: false, message: 'Email is required' });

      // Act
      const response = await request(app).post('/login').send({ password: 'Passw0rd!23' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Email is required' });
      expect(login).toHaveBeenCalledWith({ email: undefined, password: 'Passw0rd!23' }, prisma);
    });

    test('should ignore fields that are not strings', async () => {

      // Arrange
      jest.mocked(login).mockResolvedValue({ success: false, message: 'Email is required' });

      // Act
      await request(app).post('/login').send({ email: 42, password: ['Passw0rd!23'] });

      // Assert
      expect(login).toHaveBeenCalledWith({ email: undefined, password: undefined }, prisma);
    });

    test('should give each login a different token', async () => {

      // Act
      const first = await loginAsAlice();
      const second = await loginAsAlice();

      // Assert
      expect(first).not.toBe(second);
    });
  });

  describe('GET /clubs', () => {

    test('should list the clubs for the logged-in user of the token', async () => {

      // Arrange
      const token = await loginAsAlice();
      jest.mocked(listClubs).mockResolvedValue({ success: true, clubs });

      // Act
      const response = await request(app).get('/clubs').set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ clubs });
      expect(listClubs).toHaveBeenCalledWith({ actorId: alice.accountId }, prisma);
    });

    test('should return 401 Login required when no token is sent', async () => {

      // Arrange
      jest.mocked(listClubs).mockResolvedValue({ success: false, message: 'Login required' });

      // Act
      const response = await request(app).get('/clubs');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Login required' });
      expect(listClubs).toHaveBeenCalledWith({ actorId: null }, prisma);
    });

    test('should treat an unknown token as not logged in', async () => {

      // Arrange
      jest.mocked(listClubs).mockResolvedValue({ success: false, message: 'Login required' });

      // Act
      await request(app).get('/clubs').set('Authorization', 'Bearer not-a-real-token');

      // Assert
      expect(listClubs).toHaveBeenCalledWith({ actorId: null }, prisma);
    });

    test('should only accept the token in a Bearer header', async () => {

      // Arrange
      const token = await loginAsAlice();
      jest.mocked(listClubs).mockResolvedValue({ success: false, message: 'Login required' });

      // Act
      await request(app).get('/clubs').set('Authorization', token);

      // Assert
      expect(listClubs).toHaveBeenCalledWith({ actorId: null }, prisma);
    });
  });

  test('should answer the browser preflight request with the CORS headers', async () => {

    // Act
    const response = await request(app)
      .options('/clubs')
      .set('Origin', 'http://localhost:8081')
      .set('Access-Control-Request-Headers', 'authorization');

    // Assert
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    expect(listClubs).not.toHaveBeenCalled();
  });

  test('should return 500 without details when a service fails unexpectedly', async () => {

    // Arrange
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(listClubs).mockRejectedValue(new Error('database is locked'));

    // Act
    const response = await request(app).get('/clubs');

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Something went wrong' });
    consoleError.mockRestore();
  });
});
