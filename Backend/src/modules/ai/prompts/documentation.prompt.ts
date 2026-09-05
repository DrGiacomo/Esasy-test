import { AiMessage } from '../providers/ai-provider.interface';

/** Un paso tal y como se lo damos a la IA: sin selector, a propósito. */
export interface DocumentableStep {
  order: number;
  action: string;
  description: string | null;
  value: string | null;
}

/**
 * Documentación de un test **para quien no programa**.
 *
 * La restricción que la hace útil es la negativa: **no puede salir un selector en el
 * texto**. Este es el artefacto que el modo SENCILLO sí enseña, así que si la salida
 * lleva `#btn-login` dentro, el entregable no vale. Por eso al modelo ni siquiera se le
 * pasan los selectores: no puede citar lo que no ha visto.
 */
export function buildDocumentationPrompt(
  testName: string,
  testDescription: string | null,
  baseUrl: string | null,
  steps: DocumentableStep[],
): AiMessage[] {
  const pasos = steps
    .map((s) => `${s.order + 1}. [${s.action}] ${s.description ?? '(sin descripción)'}${s.value ? ` — valor: "${s.value}"` : ''}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: `Eres un analista de calidad que explica pruebas automatizadas a personas que NO programan.

Escribe en español, en prosa clara y corta. Nada de tecnicismos innecesarios.

Estructura la respuesta exactamente en estas tres secciones, con estos títulos:

## Qué comprueba
Un párrafo: qué comportamiento del producto valida esta prueba, contado como se lo contarías a alguien de negocio.

## Cómo lo hace
Una lista numerada, un punto por paso, en lenguaje llano. Agrupa pasos triviales consecutivos si aporta claridad.

## Qué significaría que fallase
Un párrafo: qué le estaría pasando al usuario real si esta prueba falla. Concreto, no genérico.

REGLAS ESTRICTAS:
- PROHIBIDO escribir selectores CSS, XPath, nombres de clases, IDs o cualquier fragmento de código.
- PROHIBIDO usar bloques de código o comillas invertidas.
- No inventes comportamiento que no esté en los pasos. Si algo no se deduce, no lo digas.
- Máximo 300 palabras en total.`,
    },
    {
      role: 'user',
      content: `Prueba: "${testName}"
${testDescription ? `Descripción que le puso su autor: ${testDescription}\n` : ''}${baseUrl ? `Aplicación bajo prueba: ${baseUrl}\n` : ''}
Pasos:
${pasos || '(esta prueba todavía no tiene pasos)'}

Documenta esta prueba siguiendo la estructura indicada:`,
    },
  ];
}
