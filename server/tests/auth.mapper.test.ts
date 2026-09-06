import { describe, expect, it } from 'bun:test';
import { toUserResponse, toSessionResponse } from '../mappers/auth';
import type { User } from '../types';

const user: User = {
  id: 'user-1',
  email: 'mapped@example.com',
  roleId: null,
  role: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('toUserResponse', () => {
  it('answers with the public fields only', () => {
    expect(toUserResponse(user)).toEqual({
      id: 'user-1',
      email: 'mapped@example.com',
      role: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('drops anything the user object carries beyond them', () => {
    // A column added to the user table must not travel to the client by itself
    const withSecrets = {
      ...user,
      passwordHash: 'scrypt:secret',
      extraSecretColumn: 'secret',
    };

    expect(Object.keys(toUserResponse(withSecrets)).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'role',
    ]);
  });
});

describe('toSessionResponse', () => {
  const session = {
    user,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 900,
  };

  it('nests the mapped user next to the token pair', () => {
    expect(toSessionResponse(session)).toEqual({
      user: toUserResponse(user),
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
    });
  });

  it('maps the nested user rather than passing it through', () => {
    const withSecrets = {
      ...session,
      user: { ...user, passwordHash: 'scrypt:secret' },
    };

    expect(toSessionResponse(withSecrets).user).not.toHaveProperty(
      'passwordHash',
    );
  });
});
