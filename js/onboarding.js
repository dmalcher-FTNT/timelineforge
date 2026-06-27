export const WELCOME_SEEN_KEY = 'timelineforge-welcome-v1';

export function hasWelcomeBeenSeen() {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    /* private browsing */
  }
}
