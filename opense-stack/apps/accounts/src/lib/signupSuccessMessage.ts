import { isGoogleAuthEnabled } from './googleAuth'

const SIGNUP_CONFIRMATION_MESSAGE = 'Please check your email to confirm your account, then sign in.'
const SIGNUP_CREATED_MESSAGE = 'Account created. Sign in to continue.'

export const getSignupSuccessMessage = () =>
  isGoogleAuthEnabled() ? SIGNUP_CONFIRMATION_MESSAGE : SIGNUP_CREATED_MESSAGE
