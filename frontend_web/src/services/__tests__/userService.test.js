import userService from '../userService';
import authService from '../authService';

jest.mock('../authService', () => ({
  getApiClient: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('userService', () => {
  let mockApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient = authService.getApiClient();
  });

  it('getAllUsers should call GET /users/', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await userService.getAllUsers();
    expect(result).toEqual([{ id: 1 }]);
    expect(mockApiClient.get).toHaveBeenCalledWith('/users/');
  });

  it('getUserById should call GET /users/:id/', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { id: 123 } });
    const result = await userService.getUserById(123);
    expect(result).toEqual({ id: 123 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/users/123/');
  });

  it('createPatient should call POST /users/', async () => {
    const patientData = {
      email: 'p@test.com',
      username: 'puser',
      firstName: 'P',
      lastName: 'T',
      password: 'pass',
    };
    mockApiClient.post.mockResolvedValueOnce({ data: { id: 456 } });
    const result = await userService.createPatient(patientData);
    expect(result).toEqual({ id: 456 });
    expect(mockApiClient.post).toHaveBeenCalledWith('/users/', expect.objectContaining({
      email: 'p@test.com',
      role: 'patient'
    }));
  });

  it('updateUser should call PATCH /users/:id/', async () => {
    mockApiClient.patch.mockResolvedValueOnce({ data: { id: 123, name: 'New' } });
    const result = await userService.updateUser(123, { name: 'New' });
    expect(result).toEqual({ id: 123, name: 'New' });
    expect(mockApiClient.patch).toHaveBeenCalledWith('/users/123/', { name: 'New' });
  });

  it('deleteUser should call DELETE /users/:id/', async () => {
    mockApiClient.delete.mockResolvedValueOnce({});
    const result = await userService.deleteUser(123);
    expect(result).toEqual({ message: 'Utilisateur supprimé avec succès' });
    expect(mockApiClient.delete).toHaveBeenCalledWith('/users/123/');
  });

  it('getAllPatients should call GET /users/?role=patient', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: [] });
    await userService.getAllPatients();
    expect(mockApiClient.get).toHaveBeenCalledWith('/users/?role=patient');
  });

  it('searchUsers should call GET /users/?search=:query', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: [] });
    await userService.searchUsers('abc');
    expect(mockApiClient.get).toHaveBeenCalledWith('/users/?search=abc');
  });
});
