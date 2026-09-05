import type { Request } from 'express';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Una petición HTTP con el usuario que el JwtAuthGuard ya resolvió.
 *
 * Existe porque la ampliación global de `Express.Request` (`express.d.ts`) **no funciona
 * aquí**: Express ya declara `Request.user` como `Express.User`, y la fusión de interfaces
 * no puede cambiar el tipo de una propiedad que ya existe. El resultado era que
 * `getRequest()` devolvía `any` y siete accesos a `.user` quedaban sin comprobar.
 *
 * Un tipo explícito no depende de que la fusión de declaraciones salga bien.
 */
export interface RequestConUsuario extends Request {
  user?: JwtPayload;
}
