# Security Specification for Edexchange

## Data Invariants
- A **User** document can only be created/updated by the user themselves (`request.auth.uid == userId`).
- A **Swap** record can only be created by the authenticated user it belongs to.
- Swap records are immutable once `status` is "completed" or "failed" (terminal states).
- Users cannot modify the `userId` or `timestamp` of a swap record after creation.

## The "Dirty Dozen" Payloads
1. **Identity Theft**: Attempt to create a user profile with another user's UID.
2. **Ghost Profile**: Attempt to create a user profile with extra fields like `isAdmin: true`.
3. **Swap Spoofing**: Attempt to create a swap record for another user.
4. **Time Travel**: Attempt to set a `timestamp` in the future for a swap.
5. **State Skipping**: Attempt to update a swap status from `pending` to `completed` without a valid signature.
6. **Terminal Edit**: Attempt to change the `toAmount` of a `completed` swap.
7. **Negative Value**: Attempt to create a swap with `fromAmount: -10`.
8. **PII Leak**: Attempt to read the entire `users` collection without being signed in.
9. **Query Scraping**: Attempt to list all swaps without filtering by `userId`.
10. **ID Poisoning**: Attempt to use a 1MB string as a `userId`.
11. **Shadow Update**: Attempt to update a user profile with a field not in the schema.
12. **Signature Forgery**: Attempt to update a failed swap with a "completed" status.

## Test Runner
See `firestore.rules.test.ts` for automated verification.
