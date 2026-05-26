export class AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // segundos hasta que expira el accessToken
}
