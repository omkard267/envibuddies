# Account Recovery and OAuth Linking

This document outlines the account recovery and OAuth linking flows implemented in the EnviBuddies backend.

## Table of Contents
- [Account Recovery Flow](#account-recovery-flow)
- [OAuth Account Linking](#oauth-account-linking)
- [Testing](#testing)
- [Security Considerations](#security-considerations)

## Account Recovery Flow

### 1. Soft Deletion
When a user deletes their account:
- `isDeleted` is set to `true`
- `deletedAt` is set to the current timestamp
- Original email is moved to `originalEmail`
- Email is replaced with a deleted placeholder
- A recovery token is generated and stored

### 2. Recovery Process
1. User requests account recovery with their email
2. System checks for a deleted account with that email
3. If found, a recovery email is sent with a secure link
4. User clicks the link and is prompted to confirm recovery
5. On confirmation, the account is restored with the original email

### 3. Recovery Endpoints
- `POST /api/account/recovery/request` - Request account recovery
- `POST /api/account/recovery/verify` - Verify recovery token

## OAuth Account Linking

### 1. New User
- User signs up with OAuth (e.g., Google)
- If email doesn't exist, a new account is created

### 2. Existing User (Email/Password)
- User signs in with OAuth using an existing email
- If email exists with password auth, prompt to link accounts
- On confirmation, OAuth credentials are added to the existing account

### 3. Deleted Account
- If account is soft-deleted, recovery is required first
- Recovery token is generated and user is prompted to recover
- After recovery, OAuth can be linked

## Testing

### Test Scripts
1. **Recovery Flow Test**
   ```bash
   node scripts/testRecoveryFlow.js
   ```
   Tests the complete account recovery flow including soft deletion and restoration.

2. **OAuth Linking Test**
   ```bash
   node scripts/testOAuthLinking.js
   ```
   Tests the OAuth account linking flow with an existing email/password account.

3. **Cleanup Duplicates**
   ```bash
   node scripts/cleanupDuplicates.js
   ```
   Identifies and handles duplicate accounts, generating recovery tokens when needed.

## Security Considerations

1. **Recovery Tokens**
   - Valid for 1 hour
   - Single-use only
   - Securely generated using crypto
   - Stored hashed in the database

2. **Email Verification**
   - Recovery emails require verification
   - Original emails are preserved for recovery
   - Placeholder emails follow a consistent pattern

3. **Rate Limiting**
   - Implement rate limiting on recovery endpoints
   - Monitor for abuse attempts
   - Log all recovery attempts

4. **Data Privacy**
   - Original emails are stored securely
   - Recovery tokens are never logged
   - All communications are encrypted in transit

## Monitoring and Logging

- Log all recovery attempts (success/failure)
- Monitor for suspicious patterns
- Alert on multiple failed recovery attempts
- Regularly clean up expired recovery tokens

## Maintenance

- Run the cleanup script periodically to handle duplicates
- Monitor database for accounts stuck in deleted state
- Review and update security practices regularly
