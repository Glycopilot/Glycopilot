const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../authService', () => ({
  __esModule: true,
  default: {
    getApiClient: jest.fn(() => mockClient),
  },
}));

import userService from '../userService';
import authService from '../authService';

describe('userService', () => {
  beforeEach(() => {
    authService.getApiClient.mockReturnValue(mockClient);
    mockClient.get.mockReset();
    mockClient.post.mockReset();
    mockClient.patch.mockReset();
    mockClient.delete.mockReset();
  });

  it('getAllUsers should call GET /users/', async () => {
    mockClient.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await userService.getAllUsers();
    expect(result).toEqual([{ id: 1 }]);
    expect(mockClient.get).toHaveBeenCalledWith('/users/');
  });

  it('getUserById should call GET /users/:id/', async () => {
    mockClient.get.mockResolvedValueOnce({ data: { id: 123 } });
    const result = await userService.getUserById(123);
    expect(result).toEqual({ id: 123 });
    expect(mockClient.get).toHaveBeenCalledWith('/users/123/');
  });

  it('createPatient should call POST /users/', async () => {
    mockClient.post.mockResolvedValueOnce({ data: { id: 456 } });
    const result = await userService.createPatient({
      email: 'p@test.com', username: 'puser', firstName: 'P', lastName: 'T', password: 'pass',
    });
    expect(result).toEqual({ id: 456 });
    expect(mockClient.post).toHaveBeenCalledWith('/users/', expect.objectContaining({
      email: 'p@test.com', role: 'patient',
    }));
  });

  it('updateUser should call PATCH /users/:id/', async () => {
    mockClient.patch.mockResolvedValueOnce({ data: { id: 123, name: 'New' } });
    const result = await userService.updateUser(123, { name: 'New' });
    expect(result).toEqual({ id: 123, name: 'New' });
    expect(mockClient.patch).toHaveBeenCalledWith('/users/123/', { name: 'New' });
  });

  it('deleteUser should call DELETE /users/:id/', async () => {
    mockClient.delete.mockResolvedValueOnce({});
    const result = await userService.deleteUser(123);
    expect(result).toEqual({ message: 'Utilisateur supprimé avec succès' });
    expect(mockClient.delete).toHaveBeenCalledWith('/users/123/');
  });

  it('getAllPatients should call GET /users/?role=patient', async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });
    await userService.getAllPatients();
    expect(mockClient.get).toHaveBeenCalledWith('/users/?role=patient');
  });

  it('searchUsers should call GET /users/?search=:query', async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });
    await userService.searchUsers('abc');
    expect(mockClient.get).toHaveBeenCalledWith('/users/?search=abc');
  });
});
