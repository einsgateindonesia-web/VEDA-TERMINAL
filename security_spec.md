# VEDA News Dashboard — Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership:** Every `UserProfile`, `BookmarkDispatch`, and `CustomRssSource` document must carry a `uid` field matching both the `{userId}` path segment and `request.auth.uid`.
2. **Verified Identity:** Write and read operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Master Gate:** Subcollections (`/users/{userId}/bookmarks` and `/users/{userId}/customSources`) require parent `/users/{userId}` document existence (`exists(...)`) on creation.
4. **No Self-Assigned Admin Role:** A user creating `/users/{userId}` can only set `role: "operator"` (unless verified admin email `einsgateindonesia@gmail.com`), and cannot modify `role` during updates.
5. **Temporal Integrity:** `createdAt`, `updatedAt`, and `savedAt` must equal `request.time`; `createdAt` and `uid` are immutable on update.
6. **Strict Bounds & Regex:** All document IDs match `^[a-zA-Z0-9_\-]+$` with length `<= 128`, all URLs match `^https?://.+`, and every string has explicit `.size()` constraints.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write:** `request.auth == null` reading `/users/{uid}`.
2. **Unverified Email Spoof:** `request.auth.token.email == 'einsgateindonesia@gmail.com'` with `email_verified == false`.
3. **Self-Assigned Admin Escalation:** Creating `/users/{uid}` with `role: "admin"` as a regular user.
4. **Role Escalation via Update:** Updating `/users/{uid}` to change `role` from `"operator"` to `"admin"`.
5. **Cross-User Bookmark Injection:** User A creating `/users/userB/bookmarks/b1` with `uid: "userB"`.
6. **UID Spoofing in Subcollection:** User A creating `/users/userA/bookmarks/b1` with `uid: "userB"`.
7. **Shadow Ghost Field Injection:** Creating a bookmark or user with an extra field `isVerified: true`.
8. **Client-Forged Timestamp:** Creating a custom source with `createdAt` set to a past client timestamp instead of `serverTimestamp()`.
9. **Immutable Field Tampering:** Updating a custom source's `createdAt` or `uid`.
10. **ID Poisoning (1.5KB Junk ID):** Creating `/users/{uid}/customSources/<1500-char-string>` or invalid characters in ID.
11. **XSS / Non-HTTP URL Injection:** Creating a custom source with `url: "javascript:alert(1)"`.
12. **Blanket Collection Listing:** Listing `/users` as a non-admin operator, or listing `/users/userB/bookmarks` as User A.
