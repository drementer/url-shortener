/** Shapes the auth use cases take in, shared by more than one of them */

type Credentials = {
  email: string;
  password: string;
};

/** Recorded with the session, so a user can tell their own devices apart */
type SessionContext = {
  userAgent?: string;
  ip?: string;
};

export type { Credentials, SessionContext };
