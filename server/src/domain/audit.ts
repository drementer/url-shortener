/**
 * Canonical action identifiers written to the audit log, kept in one place so
 * producers and query filters share exact strings.
 */

const AUDIT_ACTIONS = {
  AUTH_REGISTER: 'auth.register',
  AUTH_LOGIN_SUCCEEDED: 'auth.login.succeeded',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_REFRESH_REUSED: 'auth.refresh.reused',
  AUTH_ACCESS_DENIED: 'auth.access.denied',
  ROLE_CREATED: 'role.created',
  ROLE_UPDATED: 'role.updated',
  ROLE_DELETED: 'role.deleted',
  USER_ROLE_ASSIGNED: 'user.role.assigned',
  URL_CREATED: 'url.created',
  URL_DELETED: 'url.deleted',
  AUDIT_LOGS_VIEWED: 'audit.logs.viewed',
} as const;

type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export { AUDIT_ACTIONS };
export type { AuditAction };
