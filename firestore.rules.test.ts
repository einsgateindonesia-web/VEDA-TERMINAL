/**
 * Payload-First Security Spec Test Cases for VEDA Firestore Rules
 * Validates the Dirty Dozen attack payloads against blueprint invariants.
 */

export interface SecurityTestCase {
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOW';
}

export const DIRTY_DOZEN_PAYLOADS: SecurityTestCase[] = [
  {
    name: '1. Unauthenticated read on /users/{uid}',
    operation: 'get',
    path: '/users/user123',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '2. Unverified admin email spoof attack',
    operation: 'get',
    path: '/users/victimUid',
    auth: { uid: 'attacker1', email: 'einsgateindonesia@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '3. Self-assigned admin role on profile creation',
    operation: 'create',
    path: '/users/user123',
    auth: { uid: 'user123', email: 'op@example.com', email_verified: true },
    payload: {
      uid: 'user123',
      displayName: 'Rogue',
      role: 'admin',
      theme: 'dark',
      displayMode: 'grid',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '4. Privilege escalation on profile update',
    operation: 'update',
    path: '/users/user123',
    auth: { uid: 'user123', email: 'op@example.com', email_verified: true },
    payload: {
      role: 'admin',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '5. Cross-user bookmark injection',
    operation: 'create',
    path: '/users/victimUid/bookmarks/hash123',
    auth: { uid: 'attacker1', email: 'atk@example.com', email_verified: true },
    payload: {
      uid: 'victimUid',
      hashId: 'hash123',
      title: 'Injected',
      summary: '',
      link: 'https://example.com',
      sourceId: 'bbc-world',
      sourceName: 'BBC',
      category: 'world',
      language: 'en',
      publishedAt: '2026-11-22T00:00:00Z',
      savedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '6. UID spoofing inside own subcollection',
    operation: 'create',
    path: '/users/user123/bookmarks/hash123',
    auth: { uid: 'user123', email: 'op@example.com', email_verified: true },
    payload: {
      uid: 'victimUid',
      hashId: 'hash123',
      title: 'Spoofed',
      summary: '',
      link: 'https://example.com',
      sourceId: 'bbc-world',
      sourceName: 'BBC',
      category: 'world',
      language: 'en',
      publishedAt: '2026-11-22T00:00:00Z',
      savedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '7. Shadow ghost field injection (isVerified)',
    operation: 'create',
    path: '/users/user123/customSources/src1',
    auth: { uid: 'user123', email: 'op@example.com', email_verified: true },
    payload: {
      uid: 'user123',
      name: 'Node',
      url: 'https://example.com/rss.xml',
      category: 'technology',
      language: 'en',
      description: '',
      active: true,
      isVerified: true,
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '8. Client-forged timestamp on create',
    operation: 'create',
    path: '/users/user123/customSources/src1',
    auth: { uid: 'user123', email: 'op@example.com', email_verified: true },
    payload: {
      uid: 'user123',
      name: 'Node',
      url: 'https://example.com/rss.xml',
      category: 'technology',
      language: 'en',
      description: '',
      active: true,
      createdAt: '1999-01-01T00:00:00Z',
      updatedAt: '1999-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '9. Immutable field tampering (createdAt) on update',
    operation: 'update',
    path: '/users/user123/customSources/src1',
    auth: { uid: 'user123', email: 'op@example.com', email_verified: true },
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '10. ID poisoning with oversized/invalid characters',
    operation: 'create',
    path: `/users/user123/customSources/${'a'.repeat(1500)}`,
    auth: { uid: 'user123', email: 'op@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '11. Non-HTTP javascript: URI injection',
    operation: 'create',
    path: '/users/user123/customSources/src1',
    auth: { uid: 'user123', email: 'op@example.com', email_verified: true },
    payload: {
      uid: 'user123',
      name: 'XSS',
      url: 'javascript:alert(1)',
      category: 'technology',
      language: 'en',
      description: '',
      active: true,
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    name: '12. Blanket collection listing on /users as non-admin',
    operation: 'list',
    path: '/users',
    auth: { uid: 'user123', email: 'op@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
