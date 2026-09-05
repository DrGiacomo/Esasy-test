# Buenas — 2026-06-15 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `Docs/audit-2026-06-15.md`, `Docs/perfeccionar-2026-06-15.md` y 7 commits. Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. Primera auditoria seria: 28 hallazgos, 25 cerrados el mismo dia

| Nivel | Hallazgos | Cerrados |
|---|---|---|
| CRITICO | 12 | 12 |
| ALTO | 7 | 7 |
| MEDIO | 6 | 4 + 1 mitigado + 1 «no es problema» |
| BAJO | 3 | 2 |

Los **2 que quedaron abiertos se declararon con su motivo**: cablear secretos al executor
(requiere diseno de producto) y renombrar `semanticModel` (requiere migracion). No se
ocultaron ni se dieron por menores.

## 2. El trabajo se organizo por patron, no por lista

En vez de atacar 28 hallazgos sueltos, se agruparon en tres bloques que corresponden a las
tres **causas comunes**:

1. **Aislamiento multi-tenant** — gateways WS sin auth y servicios de IA sin filtro de org.
2. **Ciclo de vida de contenedores** — sin cleanup en error, sin timeout, reintentos no
   idempotentes, cancelacion inefectiva.
3. **Parsing de respuestas de IA y aserciones que no asertaban.**

**Por que cuenta:** cerrar por patron evita el arreglo puntual que deja los hermanos vivos.
Es la leccion 0 aplicada bien: *buscarlo en todas las variantes, no solo donde se vio*.

## 3. Se distinguio «resuelto» de «mitigado» de «no es problema»

`executor.js:160` quedo como **MITIGADO** con su riesgo residual escrito, y
`deepseek.provider.ts:14` como **NO ES PROBLEMA** explicando por que el `!` era seguro (Joi
lo valida al arrancar). Tres estados, no dos.

**Por que cuenta:** un informe que solo tiene «abierto/cerrado» empuja a cerrar cosas que no
lo estan.

## 4. Los hallazgos mas graves eran de fuga entre organizaciones

Cinco de los doce criticos eran cross-tenant: gateways sin auth, y `nl-to-flow`, `codegen` y
`self-healing` consultando por id **sin filtrar por organizacion**. Cualquiera podia aplicar
un fix de IA a un test de otra empresa. Encontrarlos antes de tener clientes es la diferencia
entre un hallazgo y un incidente.
