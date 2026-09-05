#!/usr/bin/env node
/**
 * Prepara `Backend/.env` para que la plataforma pueda arrancar.
 *
 * Entregable 5.2 de la Fase 5. Antes, la guía de instalación pedía copiar `.env.example`
 * a mano y generar DOS secretos con comandos de `crypto` pegados desde la documentación.
 * Es la clase de paso que decide si alguien llega a ver el producto o lo deja.
 *
 * ─── Lo que hace ───
 *   1. Si no hay `.env`, lo crea a partir de `.env.example`.
 *   2. Rellena los secretos que sigan con su marcador `CHANGE_ME`.
 *   3. Deja intacto todo lo que ya tenga un valor de verdad.
 *   4. Cuenta lo que hizo y lo que sigue faltando.
 *
 * ─── Lo que NO hace, y es lo importante ───
 *   **Nunca regenera un secreto que ya existe.** Especialmente `VAULT_ENCRYPTION_KEY`:
 *   con esa clave se cifran los secretos de las organizaciones, y cambiarla no los
 *   invalida — los deja **indescifrables para siempre**, sin ningún error que lo avise.
 *   Un script de conveniencia que puede destruir datos no es una conveniencia.
 *
 *   Tampoco inventa la clave de la IA: eso hay que ir a buscarlo a DeepSeek. Lo dice y
 *   sigue, porque desde el 2026-09-05 la plataforma arranca sin ella.
 *
 * Uso:  npm run setup
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const ENV = path.join(RAIZ, '.env');
const EJEMPLO = path.resolve(RAIZ, '..', '.env.example');

/** Un valor sigue sin poner si falta, está vacío o conserva su marcador. */
function sinPoner(valor) {
  if (!valor) return true;
  const v = valor.trim();
  return v === '' || v.startsWith('CHANGE_ME');
}

/** Los secretos que este script sí puede fabricar, y cómo. */
const GENERABLES = {
  JWT_SECRET: {
    generar: () => crypto.randomBytes(32).toString('hex'),
    que: 'firma los tokens de sesión',
  },
  VAULT_ENCRYPTION_KEY: {
    generar: () => crypto.randomBytes(32).toString('hex'),
    que: 'cifra los secretos de cada organización',
  },
};

/** Lo que hay que ir a buscar fuera. Se avisa, no se inventa. */
const EXTERNAS = {
  DEEPSEEK_API_KEY: 'las funciones de IA (documentación, self-healing, chat). Opcional: sin ella la plataforma arranca igual',
};

console.log('');
console.log('  Preparando Backend/.env');
console.log('  ' + '─'.repeat(60));

// ── 1. Que exista ────────────────────────────────────────────────────────────
if (!fs.existsSync(ENV)) {
  if (!fs.existsSync(EJEMPLO)) {
    console.error(`  [X] No encuentro ${EJEMPLO}. ¿Está completo el repositorio?`);
    process.exit(1);
  }
  fs.copyFileSync(EJEMPLO, ENV);
  console.log('  [+] Creado .env a partir de .env.example');
} else {
  console.log('  [=] .env ya existe: solo se rellenan los huecos');
}

// ── 2. Leer lo que hay ───────────────────────────────────────────────────────
let contenido = fs.readFileSync(ENV, 'utf8');
const valorDe = (clave) => {
  const m = new RegExp(`^${clave}=(.*)$`, 'm').exec(contenido);
  return m ? m[1] : null;
};

// ── 3. Rellenar solo lo que falta ────────────────────────────────────────────
const generados = [];
for (const [clave, { generar, que }] of Object.entries(GENERABLES)) {
  const actual = valorDe(clave);

  if (actual !== null && !sinPoner(actual)) {
    console.log(`  [=] ${clave} ya tiene valor — NO se toca (${que})`);
    continue;
  }

  const nuevo = generar();
  if (actual === null) {
    contenido = contenido.replace(/\n*$/, `\n${clave}=${nuevo}\n`);
  } else {
    contenido = contenido.replace(new RegExp(`^${clave}=.*$`, 'm'), `${clave}=${nuevo}`);
  }
  generados.push(clave);
  console.log(`  [+] ${clave} generado — ${que}`);
}

if (generados.length > 0) {
  fs.writeFileSync(ENV, contenido, 'utf8');
}

// ── 4. Lo que no se puede generar ────────────────────────────────────────────
const faltan = [];
for (const [clave, para] of Object.entries(EXTERNAS)) {
  if (sinPoner(valorDe(clave))) faltan.push([clave, para]);
}

console.log('  ' + '─'.repeat(60));
if (generados.length === 0) {
  console.log('  Nada que generar: los secretos ya estaban puestos.');
} else {
  console.log(`  ${generados.length} secreto(s) generado(s) y guardado(s) en Backend/.env`);
  console.log('');
  console.log('  Guarda ese archivo. VAULT_ENCRYPTION_KEY no se puede recuperar:');
  console.log('  si se pierde, los secretos ya cifrados quedan ilegibles para siempre.');
}

if (faltan.length > 0) {
  console.log('');
  console.log('  Sigue sin poner (hay que ir a buscarlo, no se puede inventar):');
  for (const [clave, para] of faltan) {
    console.log(`     ${clave}`);
    console.log(`        para ${para}`);
  }
}

console.log('');
console.log('  Listo. Siguiente:  arrancar.bat');
console.log('');
