import type { TestStep } from '@/types/models';

/**
 * Cómo se cuenta un paso a una persona.
 *
 * **Una sola copia.** Cuatro pantallas pintaban el paso a su manera y las cuatro acababan
 * enseñando el selector crudo (`#btn-login`), que es justo lo que el §2.1 de
 * `Docs/PROJECT_CONTEXT.md` prohíbe enseñar al perfil que no programa. Si esto se copia a
 * cada componente, dentro de dos meses habrá cuatro versiones distintas de la misma frase.
 *
 * El orden de preferencia importa:
 *   1. `description` — la escribe el recorder con la etiqueta real del elemento
 *      («Pulsar «Entrar»»). Es lo bueno.
 *   2. una frase armada aquí a partir de la acción y el valor.
 *   3. el selector, como último recurso. Preferible a una línea vacía: el modo sencillo
 *      lo enseña igual, porque una descripción fea informa y una vacía no.
 */

const ACCIONES: Record<string, string> = {
  navigate: 'Ir a',
  click: 'Pulsar',
  dblclick: 'Pulsar dos veces',
  fill: 'Escribir en',
  press: 'Pulsar la tecla',
  hover: 'Poner el ratón sobre',
  select: 'Elegir en',
  assert_visible: 'Comprobar que se ve',
  assert_text: 'Comprobar el texto',
  screenshot: 'Hacer una captura',
  wait: 'Esperar',
};

/** El nombre de la acción, para la columna corta que ya existía. */
export function describeAction(action: string): string {
  return ACCIONES[action] ?? action;
}

export function describeStep(
  step: Pick<TestStep, 'action' | 'selector' | 'value' | 'description'>,
): string {
  if (step.description) return step.description;

  const verbo = ACCIONES[step.action] ?? step.action;

  switch (step.action) {
    case 'navigate':
      return step.value ? `Ir a ${step.value}` : 'Ir a una página';
    case 'fill':
      return step.value ? `Escribir "${step.value}"` : 'Escribir en un campo';
    case 'press':
      return step.value ? `Pulsar la tecla ${step.value}` : 'Pulsar una tecla';
    case 'select':
      return step.value ? `Elegir "${step.value}"` : 'Elegir una opción';
    case 'assert_text':
      return step.value ? `Comprobar que aparece "${step.value}"` : 'Comprobar un texto';
    case 'wait':
      return step.value ? `Esperar ${step.value}` : 'Esperar';
    default:
      return step.selector ? `${verbo} ${step.selector}` : verbo;
  }
}

/**
 * El detalle técnico de un paso, para el desplegable «ver detalle técnico».
 * `null` cuando no hay nada que enseñar — entonces no se pinta el desplegable.
 */
export function technicalDetail(
  step: Pick<TestStep, 'action' | 'selector' | 'selectorType' | 'value'>,
): string | null {
  const partes: string[] = [`acción: ${step.action}`];
  if (step.selector) partes.push(`selector: ${step.selector}`);
  if (step.selectorType) partes.push(`tipo: ${step.selectorType}`);
  if (step.value) partes.push(`valor: ${step.value}`);
  return partes.length > 1 ? partes.join('  ·  ') : null;
}
