# 01 — Tests unitarios del backend

- **Tipo:** automática (jest + ts-jest, sin BD/Redis/Docker, todo mockeado)
- **Comando:** `cd Backend && npm test`
- **Fecha:** 2026-06-27

## Resultado: ✅ 29/29

```
Test Suites: 5 passed, 5 total
Tests:       29 passed, 29 total
```

## Suites cubiertas
- `executions.service.spec.ts` — multi-tenant + cancelación.
- `ai/operations/nl-to-flow.service.spec.ts`, `codegen.service.spec.ts`, `self-healing.service.spec.ts` — aislamiento por org + parseo JSON.
- `workers/execution/execution.processor.spec.ts` — **nuevo** (4 tests): inyección de secretos
  - descifra solo secretos `ENV_VAR` y los formatea `NAME=value`;
  - omite nombres que pisan env reservadas (`DATABASE_URL`, etc.);
  - un secreto corrupto no aborta la ejecución (se omite);
  - sin secretos → lista vacía.

## Observaciones
- Antes de esta tanda el worker tenía CERO cobertura; ahora hay un primer spec.
- Sigue faltando cobertura del ciclo de vida del contenedor/cancelación en el worker, del recorder y del frontend (ver [05-hallazgos](05-hallazgos.md)).
