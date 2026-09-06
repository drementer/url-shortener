import { describe, expect, it, beforeEach } from 'bun:test';
import roleRepository from '../repositories/role';
import { UniqueConstraintError } from '../errors';
import { resetDatabase } from './helpers';

beforeEach(resetDatabase);

describe('roleRepository.create', () => {
  it('creates a new role with given limits', async () => {
    const role = await roleRepository.create({
      name: 'PRO',
      description: 'Professional tier',
      maxActiveLinks: 50,
    });

    expect(role.name).toBe('PRO');
    expect(role.description).toBe('Professional tier');
    expect(role.maxActiveLinks).toBe(50);
    expect(role.id).toBeString();
  });

  it('rejects duplicate role names', async () => {
    await roleRepository.create({ name: 'DUPLICATE', maxActiveLinks: 10 });

    const attempt = roleRepository.create({
      name: 'DUPLICATE',
      maxActiveLinks: 20,
    });

    await expect(attempt).rejects.toThrow(UniqueConstraintError);
  });
});

describe('roleRepository.findByName and findById', () => {
  it('finds existing default roles', async () => {
    const userRole = await roleRepository.findByName('USER');
    expect(userRole).not.toBeNull();
    expect(userRole?.maxActiveLinks).toBe(5);

    const editorRole = await roleRepository.findByName('EDITOR');
    expect(editorRole).not.toBeNull();
    expect(editorRole?.maxActiveLinks).toBe(10);

    const adminRole = await roleRepository.findByName('ADMIN');
    expect(adminRole).not.toBeNull();
    expect(adminRole?.maxActiveLinks).toBeNull();
  });

  it('answers null for a role name that does not exist', async () => {
    expect(await roleRepository.findByName('UNKNOWN')).toBeNull();
  });
});

describe('roleRepository.update', () => {
  it('updates role limits and description', async () => {
    const role = await roleRepository.findByName('EDITOR');
    expect(role).not.toBeNull();

    const updated = await roleRepository.update(role!.id, {
      maxActiveLinks: 25,
      description: 'Updated editor description',
    });

    expect(updated.maxActiveLinks).toBe(25);
    expect(updated.description).toBe('Updated editor description');
  });
});
