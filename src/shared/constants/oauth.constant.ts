export const DEFAULT_OAUTH_VALUES = {
  USER_AGENT: 'Unknown',
  IP_ADDRESS: 'Unknown',
  PHONE_NUMBER: '',
  AVATAR: '',
  LAST_NAME: '',
  FIRST_NAME: '',
  
}

export const GOOGLE_ACCESS_TYPES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
} as const

export const GOOGLE_PROMPTS = {
  CONSENT: 'consent',
  SELECT_ACCOUNT: 'select_account',
} as const
export const GOOGLE_OAUTH_VERSION = 'v2'

export const OAUTH_SCOPES = {
  FACEBOOK: ['email', 'public_profile'],
}

export const API_URLS = {
  FACEBOOK_TOKEN: 'https://graph.facebook.com/v19.0/oauth/access_token',
  FACEBOOK_USER: 'https://graph.facebook.com/me',
}
export const FACEBOOK_FIELDS = ['id', 'name', 'email', 'picture']
