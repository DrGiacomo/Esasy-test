# 📖 Biblia del Proyecto
## Easy Test — automatización de pruebas web para quien no programa

> **Documento fundacional.** Toda decisión de diseño, arquitectura y alcance del proyecto se
> ancla aquí. Si algo contradice este documento, o se actualiza el documento, o se descarta la
> idea. Es la única fuente de verdad.

| | |
|---|---|
| **Estado real** | **En construcción — Fase 5 (Instalación).** Fases 1-4 cerradas. El flujo completo funciona: se graba, se convierte, se ejecuta en contenedor y se ve con vídeo y traza |
| **Versión** | `1.0.0` |
| **Última actualización** | `2026-09-05` |
| **Manda sobre** | todos los documentos del proyecto |

> **De dónde sale este documento.** Se escribió el `2026-09-05`, **cuatro meses después de
> empezar el proyecto**, destilando lo que ya estaba disperso en `PROJECT_CONTEXT.md`,
> `PENDIENTES.md`, las dos auditorías y la bitácora `curva/`. Lo que no estaba escrito en
> ningún sitio —el alcance negativo, el criterio de abandono y el gobierno— se decidió ese día
> respondiendo cuatro preguntas. Esas cuatro son las que dan autoridad al resto.

---

## 1. Qué es y para quién

**Easy Test convierte lo que un tester hace a mano en algo que se repite solo, mil veces, sin
que nadie tenga que escribir código.**

**Para quién.** Dos personas concretas, y el orden importa:

| | Quién es | Qué necesita |
|---|---|---|
| **El principal** | **QA manual.** No programa, ni va a aprender. Sabe perfectamente qué hay que probar y en qué orden | Grabar el recorrido con el ratón y que la máquina lo repita. Nunca ver un selector ni una terminal |
| **El secundario** | **QA automation.** Programa, audita el código generado y lo lleva a su repositorio | Acceso completo al código TypeScript y a Git, sin que le estorbe la capa visual |

**Qué hace hoy el QA manual sin esto, y qué le duele.** Repite el mismo recorrido a mano cada
vez que alguien toca el código: entrar, buscar, añadir al carrito, pagar, comprobar. Veinte
minutos por vuelta, varias veces por semana, y aun así **los fallos aparecen en producción**
porque nadie puede repetirlo todo cada día. La alternativa que existe hoy —automatizarlo— le
exige aprender a programar o depender de un desarrollador que no tiene.

---

## 2. Qué NO es (alcance negativo)

> Lo que este proyecto no va a construir nunca, y por qué. **Esta sección no se borra: crece.**

| No es… | Por qué no |
|---|---|
| **Un SaaS que aloje los datos de los clientes** | Se instala donde el cliente decida y sus pruebas no salen de ahí. Es la única ventaja real frente a Testim, Mabl, Katalon y las otras veinte: para banca, salud o sector público, «tus datos pasan por nuestros servidores» es un no directo |
| **Un producto que cobre por ejecución o por minuto** | Es lo que mata estas herramientas: cada prueba cuesta dinero, los equipos ejecutan menos para ahorrar, y la herramienta deja de aportar hasta que se abandona |
| **Una herramienta que exija programar para lo básico** | Grabar, ejecutar y ver resultados no requerirán nunca escribir código ni abrir una terminal. El código está para quien lo quiera; jamás es obligatorio |
| **Un sistema que se arregle solo** | La IA propone; una persona aprueba. Ver `P4` |
| ~~Framework de pruebas propio~~ | Descartado desde el diseño: por debajo va **Playwright**. Reinventar el motor de ejecución es tirar años en resolver lo ya resuelto |

---

## 3. Principios inviolables

> Mandan sobre cualquier decisión técnica futura. Si una funcionalidad los viola, no se
> construye. **Los IDs no se renumeran nunca.**

| # | Principio | Significado | Consecuencia si se viola |
|---|---|---|---|
| **P1** | **Los datos del cliente no salen de su casa** | La plataforma se instala en su máquina o su servidor. Ni pruebas, ni capturas, ni credenciales viajan a un servidor nuestro | Se pierde la única ventaja competitiva real y el proyecto pasa a competir de frente contra empresas con 300 ingenieros |
| **P2** | **Nunca se cobra por uso** | Ni por ejecución, ni por minuto, ni por prueba | El cliente empieza a ejecutar menos para ahorrar, la herramienta deja de cazar fallos y se abandona. Se paga por sí misma la salida |
| **P3** | **Lo básico no exige programar ni abrir una terminal** | Grabar, ejecutar y ver resultados son accesibles sin una línea de código | El producto se convierte en otra herramienta para desarrolladores, que ya las tienen, y pierde a la única persona para la que existe |
| **P4** | **La máquina propone, la persona decide** | El self-healing y cualquier corrección automática crean una **propuesta pendiente de aprobación**, nunca un cambio aplicado | El tester deja de saber qué está probando. Una prueba que se arregla sola puede acabar comprobando otra cosa sin que nadie se entere |
| **P5** | **Honestidad: dar una prueba por buena sin estarlo es el error crítico** | Ante la duda, la plataforma **falla o avisa**, nunca aprueba. Una falsa alarma cuesta diez minutos de revisión; un fallo no detectado cuesta un despliegue roto **y la confianza en la herramienta entera** | El cliente despliega roto creyendo que estaba probado. De ese golpe una herramienta de pruebas no se recupera |
| **P6** | **Trazabilidad: todo resultado lleva su evidencia** | Cada ejecución guarda vídeo, captura y traza. Si un artefacto no está, **se dice**; no se deja un hueco mudo | Un resultado sin evidencia no es un resultado: es una opinión de la máquina, y no se puede discutir con ella |
| **P7** | **Degradar, no caer** | Si falla una pieza opcional —la IA, por ejemplo— el resto sigue funcionando y **se avisa de qué falta** | Una dependencia de pago o de terceros se convierte en un requisito para arrancar, y el producto deja de poder instalarse |
| **P8** | **Nada se borra en silencio** | Ejecuciones, grabaciones y artefactos se retiran con aviso explícito o por una política de retención conocida | El usuario pierde la prueba de algo que ocurrió y no sabe si existió |
| **P9** | **Determinista sobre lo verificable** | Lo que tiene una respuesta única —un selector, un estado, una comparación— va por código. La IA solo donde no hay respuesta única | Se paga por adivinar lo que se puede calcular, y encima con menos fiabilidad |

---

## 4. Modelo mental del dominio

Cinco conceptos, y esta separación es la que da forma a todo lo demás:

| Concepto | Qué es | Por qué está separado |
|---|---|---|
| **Grabación** | Lo que una persona hizo con el ratón, tal cual, en bruto | Es materia prima. Se guarda aparte porque una grabación puede convertirse en varias pruebas distintas, y porque conservar el original permite reconvertir cuando el conversor mejore (`P6`) |
| **Prueba** | La lista ordenada de pasos con sus comprobaciones | Es lo que el usuario edita y entiende. **No es código**: el código es una salida más, como el informe |
| **Ejecución** | Un intento concreto de correr una o varias pruebas, con su fecha y su resultado | Separada de la prueba porque una misma prueba se ejecuta mil veces. Es la unidad que se encola, se cancela y se cobra en tiempo de máquina |
| **Artefacto** | Vídeo, captura y traza que deja una ejecución | Es la evidencia de `P6`. Vive fuera de la base de datos porque pesa, y por eso tiene su propia política de retención |
| **Propuesta de reparación** | Un cambio de selector sugerido por la IA, esperando aprobación | Existe como concepto propio precisamente para que `P4` sea imposible de saltarse: no hay camino que aplique un cambio sin pasar por aquí |

**La frontera que más se cuestiona, y su razón:** la prueba **no** guarda código, guarda pasos.
El código TypeScript se genera a partir de los pasos, nunca al revés. Si fuera al revés, el
perfil que no programa quedaría fuera de su propia herramienta en cuanto alguien tocara el
código a mano.

---

## 5. Arquitectura de alto nivel

Cinco piezas, y lo que importa es **por qué** están separadas:

| Pieza | Qué hace | Por qué es una pieza aparte |
|---|---|---|
| **Pantalla** | Lo que ve el usuario: proyectos, pruebas, resultados | Es la capa primaria del producto (`P3`), no un adorno sobre una API |
| **API** | Guarda, autoriza y coordina | Es el único sitio donde se decide quién ve qué. El aislamiento entre organizaciones vive aquí |
| **Cola y trabajador** | Recibe la orden de ejecutar y la gestiona | Ejecutar tarda minutos: si fuera parte de la API, una prueba lenta bloquearía la pantalla de todos |
| **Ejecutor** | Un contenedor por ejecución, con su navegador | **Aislamiento**: la prueba de un cliente no puede ver ni afectar a la de otro, y un navegador colgado se tira sin tocar el resto |
| **Grabador** | Un contenedor con un navegador que el usuario maneja en remoto | Separado del ejecutor porque su ciclo de vida es humano —dura lo que dura una persona grabando— y no automático |

**La frontera clave:** todo lo que toca un navegador vive **fuera** del proceso principal, en
contenedores desechables. Es lo que permite ejecutar veinte pruebas a la vez sin que una tumbe
a las demás.

---

## 6. Flujo de punta a punta

El recorrido completo de una prueba, desde que existe una idea hasta que hay un veredicto:

1. **Se graba.** El usuario abre el grabador, se le da un navegador remoto y **hace el recorrido
   con el ratón**. Cada clic y cada texto se apuntan, con el mejor selector que se puede
   calcular en ese momento.
2. **Se convierte.** La grabación se transforma en una prueba: pasos con nombre en lenguaje
   llano («Pulsar «Entrar»»), no selectores en crudo.
3. **Se ejecuta.** La orden entra en la cola. El trabajador levanta un contenedor con el
   navegador, le pasa los pasos y los secretos que necesite, y espera.
4. **Se recoge la evidencia.** Al terminar: vídeo, captura final y traza (`P6`). Si un paso
   falló, además el HTML y la captura del momento exacto.
5. **Se propone la reparación.** Si el fallo fue un selector que ya no encuentra nada, la IA
   propone uno nuevo con su nivel de confianza — y **queda pendiente de aprobación** (`P4`).
6. **Se lee el resultado.** El usuario ve qué pasó, con el vídeo delante, sin leer una línea de
   código.

---

## 7. Restricciones y dependencias externas

### Lo que caduca o cambia solo

| Qué | Riesgo | Qué hacer |
|---|---|---|
| **Playwright y los navegadores** | Cambian cada pocas semanas. Un cambio de Chromium puede alterar cómo se renderiza una página y romper pruebas que nadie tocó | Fijar versión exacta (hoy `1.48.0`) y actualizar a propósito, comparando evidencia antes y después |
| **DeepSeek (IA)** | Servicio de pago de un tercero: puede cambiar precio, formato de respuesta o desaparecer | Ya cubierto por `P7`: sin clave, la plataforma arranca y funciona; solo se desactivan las funciones de IA |
| **Docker Desktop** | Requisito de instalación que no controlamos, y el mayor obstáculo para el perfil objetivo | Es el entregable `5.4`. Mientras no esté resuelto, el criterio de la Fase 5 no se cumple |

### Dependencias humanas

- **Cinco equipos de QA reales** dispuestos a verlo funcionando. Sin ellos no se puede aplicar
  el criterio de abandono del §8, y **no son un problema técnico**: hay que buscarlos desde ya,
  no cuando el producto esté «listo».

### Supuestos sin verificar

| Supuesto | Si fuera falso | Cómo se comprueba |
|---|---|---|
| Un QA manual **quiere** automatizar sus pruebas y solo se lo impide la barrera técnica | El proyecto entero apunta a un problema que su usuario no tiene | Enseñárselo a los cinco equipos del §8 y ver si lo instalan |
| Grabar con el ratón produce pruebas **que aguantan** cambios de la web | Las pruebas se romperían tan seguido que mantenerlas costaría más que hacerlas a mano | Medir cuántas ejecuciones fallan por selector roto sobre una web real, durante semanas |
| El self-healing propone arreglos **que un humano aprueba** la mayoría de las veces | La función es ruido: una cola de propuestas que nadie mira | Contar propuestas aprobadas frente a rechazadas. **Hoy ese número no se mide** |

---

## 8. Criterio de éxito y de abandono

### Éxito

**Un QA que no programa instala Easy Test él solo, graba su primera prueba y la ve ejecutarse
—sin ayuda técnica y sin abrir una terminal.** Ese es el hecho observable. No hay métrica de
vanidad detrás: ni descargas, ni estrellas, ni pruebas creadas.

### Abandono

> **Si cinco equipos de QA reales lo ven funcionando y ninguno lo instala, se para.**

Decidido el `2026-09-05`. Es un criterio con denominador (`V1`): cinco equipos, no «poca
gente». Y con nombre (`V4`): tienen que ser equipos de fuera, no el autor ni su hermano.

**Por qué este y no otro.** Si cinco equipos lo ven gratis, funcionando y sin coste de uso, y
aun así ninguno lo instala, **el problema no es el producto: no hay demanda**. Seguir puliendo
sería mejorar la respuesta a una pregunta que nadie hizo.

**Y lo que este criterio NO permite decir:** que el producto sea malo. Solo mide adopción. Si
se para por esto, lo aprendido —el motor, el arranque, la arquitectura— sigue valiendo y se
dice así.

---

## 9. Reglas de oro

Checklist para consultar **al diseñar cualquier cosa**, derivado de los principios:

1. ¿Esto obliga a que algún dato del cliente salga de su máquina? → viola `P1`.
2. ¿Esto haría que ejecutar una prueba tuviera un coste por vez? → viola `P2`.
3. ¿Para usar esto hay que escribir código o abrir una terminal? → viola `P3`. *(Salvo que sea
   una función explícita del perfil avanzado.)*
4. ¿Esto cambia algo del usuario sin que él lo apruebe? → viola `P4`.
5. Cuando esto dude, ¿qué hace: aprobar o avisar? Si aprueba, viola `P5`.
6. ¿Este resultado se puede defender con evidencia delante? Si no, viola `P6`.
7. Si esta pieza no está disponible, ¿el resto sigue funcionando y se avisa? Si no, viola `P7`.
8. ¿Esto borra algo sin dejar rastro ni avisar? → viola `P8`.
9. ¿Esto le pregunta a una IA algo que tiene respuesta única? → viola `P9`.

---

## 10. Hoja de ruta por fases

Sin fechas ni estimaciones: **el orden y su razón**. El estado vivo de cada fase está en
`PROJECT_CONTEXT.md` §6, que es la única fuente de ese estado.

| Fase | Qué resuelve | Por qué va aquí |
|---|---|---|
| **1 · Diseño y arquitectura** | Las fronteras entre piezas | Cambiar una frontera con código encima cuesta diez veces más |
| **2 · Flujo core** | Grabar → convertir → ejecutar → ver | Hasta que el viaje entero no funciona una vez, ninguna mejora se puede juzgar |
| **3 · Grado producción** | Robustez, aislamiento, secretos | Antes de enseñarlo, que no pierda datos ni los mezcle entre clientes |
| **4 · Producto usable** | Los dos modos, documentación por IA, informes | Que se use sin programar, que es `P3` |
| **5 · Instalación** ← *abierta* | Que se instale sin programar | Es lo que separa «se lo enseño» de «se lo lleva». Sin esto el criterio de éxito del §8 no se puede ni intentar |

**Lo que la Fase 1 enseñó y no se repite:** cerrar una fase tiene que **producir la siguiente**.
La Fase 2 se declaró «desbloqueada» y **no se escribió jamás**: se construyeron tres meses de
plataforma guiados por una lista de bugs.

---

## 11. Advertencias honestas

Lo que puede salir mal de verdad:

1. **El mercado está lleno y bien financiado.** Testim, Mabl, Katalon, Testsigma, testRigor,
   Functionize, QA Wolf y una veintena más hacen lo mismo, con equipos de cientos de personas.
   **Competir en funciones está perdido.** Lo único defendible es `P1` + `P2`: en tu casa y sin
   coste por uso.
2. **La capacidad «IA Contextual» está prometida desde mayo y no se puede usar.** Las cinco
   operaciones existen en el servidor y **ninguna tiene botón** en la pantalla. El perfil
   No-Code del §1 se apoya en ella.
3. **Las pruebas E2E se rompen solas.** Es la razón número uno por la que estos proyectos se
   abandonan a los tres meses. El self-healing existe para eso y **todavía no se ha medido si
   sus propuestas se aprueban o se ignoran**.
4. **Nadie de fuera ha instalado esto nunca.** Todo lo que sabemos de la instalación lo sabemos
   de una sola máquina: la del autor.
5. **La segunda capa de aislamiento no existe.** Las políticas RLS están escritas y sin aplicar;
   lo que protege hoy es el filtro de la aplicación, auditado el `2026-09-05` y correcto. Una
   sola consulta que olvide el filtro sería una fuga entre clientes, **sin nada debajo que la
   pare**. Ver `PENDIENTES.md` §9.

---

## 12. Glosario

Cada término **en este proyecto**, no en el diccionario:

| Término | Aquí significa |
|---|---|
| **E2E** | Probar el viaje entero como lo haría una persona, con un navegador de verdad |
| **Grabación** | Lo que el usuario hizo con el ratón, en bruto, antes de convertirse en prueba |
| **Prueba** | Lista ordenada de pasos con comprobaciones. **No es código** |
| **Paso** | Una acción («pulsar», «escribir») o una comprobación («debe aparecer») |
| **Selector** | La dirección de un elemento en la página, escrita para una máquina |
| **Ejecución** | Un intento concreto de correr pruebas, con su fecha y su veredicto |
| **Artefacto** | Vídeo, captura o traza que deja una ejecución. La evidencia de `P6` |
| **Traza** | Grabación técnica de Playwright, para revisar paso a paso qué pasó |
| **Self-healing** | Propuesta de selector nuevo cuando el viejo dejó de encontrar nada. **Propuesta, nunca cambio** |
| **Modo Sencillo / Complejo** | Las dos caras de la pantalla: sin código y con código. El rol **no** decide cuál se ve; lo decide el usuario |
| **Organización** | La unidad de aislamiento. Lo de una organización no lo ve otra |

---

## 13. Gobierno del documento

| | |
|---|---|
| **Quién puede cambiarla** | Los dos hermanos. En el día a día, cualquiera de los dos |
| **Ante desacuerdo** | **Decide el hermano.** Es su proyecto |
| **Qué exige un cambio de principio** | Fecha, motivo y línea en el §14. Un principio **nunca se borra**: se marca derogado |
| **Qué NO obliga a tocar esta biblia** | Cambiar de librería, reordenar tareas, que algo cueste más de lo previsto. Eso vive en el plan |
| **Ritual al cerrar una fase** | Recorrer el §9 y actualizar la cabecera |

---

## 14. Historial de cambios

| Fecha | Qué | Por qué |
|---|---|---|
| `2026-09-05` | **Documento creado**, versión 1.0.0 | El proyecto llevaba cuatro meses y once documentos sin ninguno que mandara sobre los demás |
| `2026-09-05` | Entran `P1`–`P9` | Los cuatro primeros los decidió el autor ese día; `P5`–`P9` se destilaron de decisiones ya tomadas en el código y en las auditorías |
| `2026-09-05` | Entra el criterio de abandono del §8 | No existía. Un proyecto sin criterio de abandono no muere: se pudre |
| `2026-09-05` | El §11.5 recoge que la RLS no está aplicada | Hallazgo crítico de `audit-2026-09-05.md`: tres documentos la daban por entregada |

---

## 15. Documentos hermanos

Qué leer después, y qué manda sobre qué:

| Documento | Qué contiene | Relación |
|---|---|---|
| `PROJECT_CONTEXT.md` | **La única fuente del estado de fases** (§6), capacidades y stack | Manda esta biblia; él manda sobre el estado de fases |
| `PENDIENTES.md` | Lo que falta, con prioridad y estado | Deriva de la hoja de ruta del §10 |
| `COMO-PROBAR.md` | Cómo comprobar en media hora que hace lo que dice | Verifica lo que esta biblia promete |
| `audit-*.md` · `perfeccionar-*.md` | Hallazgos con su fecha y cómo se verificaron | Alimentan el §11 |
| `PROJECT_STRUCTURE.md` | Dónde vive cada cosa en el disco | Descriptivo, no normativo |
| `curva/AAAA-MM-DD/` | Bitácora diaria: qué salió bien y qué salió mal, con su lección | De ahí suben los principios cuando se repiten |

> **En todos ellos vale la misma regla:** si algo contradice esta biblia, manda la biblia.
