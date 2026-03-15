// Export all API services
export { default as sponsorAPI } from './sponsor';
export { default as sponsorshipAPI } from './sponsorship';
export { default as sponsorshipIntentAPI } from './sponsorshipIntent';

// Re-export existing API services (using named exports)
export * from './auth';
export * from './event';
export * from './organization';
export * from './registration';
export * from './recurringEvents';
export * from './calendar'; 