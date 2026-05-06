const en = {
  // Settings panel
  title: 'Security',
  subtitle: 'Protect Joanium with a password lock.',

  statusEnabled: 'App Lock is on',
  statusDisabled: 'App Lock is off',
  statusEnabledDesc: 'A password is required every time Joanium opens.',
  statusDisabledDesc: 'Anyone with access to this device can open Joanium without a password.',

  enableBtn: 'Enable App Lock',
  disableBtn: 'Disable App Lock',
  changePasswordBtn: 'Change Password',

  // Setup / enable form
  setupTitle: 'Set up App Lock',
  newPasswordLabel: 'Password',
  newPasswordPlaceholder: 'At least 6 characters',
  confirmPasswordLabel: 'Confirm Password',
  confirmPasswordPlaceholder: 'Re-enter your password',
  secretQuestionLabel: 'Secret Question',
  secretQuestionPlaceholder: 'e.g. What was the name of your first pet?',
  secretAnswerLabel: 'Secret Answer',
  secretAnswerPlaceholder: 'Your answer (case-insensitive)',
  enableConfirmBtn: 'Enable',
  cancelBtn: 'Cancel',

  // Change password form
  changeTitle: 'Change Password',
  currentPasswordLabel: 'Current Password',
  currentPasswordPlaceholder: 'Enter current password',
  changeConfirmBtn: 'Update Password',

  // Disable form
  disableTitle: 'Disable App Lock',
  disableDesc: 'Enter your current password to confirm.',
  disableConfirmBtn: 'Disable',

  // Errors
  errorPasswordTooShort: 'Password must be at least 6 characters.',
  errorPasswordMismatch: 'Passwords do not match.',
  errorMissingQuestion: 'Please enter a secret question.',
  errorMissingAnswer: 'Please enter a secret answer.',
  errorWrongPassword: 'Incorrect password.',
  errorWrongAnswer: 'Incorrect answer.',
  errorGeneric: 'Something went wrong. Please try again.',

  // Success
  successEnabled: 'App Lock enabled.',
  successDisabled: 'App Lock disabled.',
  successPasswordChanged: 'Password updated.',

  // Lock screen
  lockTitle: 'Joanium is locked',
  lockSubtitle: 'Enter your password to continue.',
  lockPasswordPlaceholder: 'Password',
  lockUnlockBtn: 'Unlock',
  lockForgotBtn: 'Forgot password?',
  lockBackBtn: 'Back to password',
  lockQuestionLabel: 'Secret Question',
  lockAnswerPlaceholder: 'Your answer',
  lockAnswerBtn: 'Verify Answer',
  lockRateLimitMsg: 'Too many attempts. Try again in {time}.',
  lockWrongPassword: 'Incorrect password.',
  lockWrongAnswer: 'Incorrect answer.',
  lockAttemptsLeft: '{n} attempt{s} remaining before lockout.',

  // Auto-lock
  autoLockLabel: 'Auto-lock',
  autoLockDesc: 'Lock automatically after a period of inactivity.',
  autoLockNever: 'Never',
  autoLock1Min:  '1 minute',
  autoLock5Min:  '5 minutes',
  autoLock10Min: '10 minutes',
  autoLock15Min: '15 minutes',
  autoLock30Min: '30 minutes',
  autoLock1Hr:   '1 hour'
};

export default en;
