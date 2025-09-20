export interface TokenPayload {
  userId: string
  email: string
  tokenId: string
  iat: number
  exp: number
}

export enum JwtType {
  accessToken = 'AccessToken',
  refreshToken = 'RefreshToken',
}
