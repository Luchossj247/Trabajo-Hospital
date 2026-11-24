# 11. Riesgos y deuda técnica (versión actualizada)

Estado al 24/11/2026. Los 12 puntos de la versión anterior fueron analizados y resueltos; el análisis reveló además cuatro problemas críticos adicionales (A–D) que también se corrigieron.

## 11.1 Riesgos de la versión anterior — resolución

| # | Riesgo original | Resolución implementada | Dónde |
|---|---|---|---|
| 1 | Portal Paciente sin autenticación real (DNI + fecha de nacimiento) | Cuentas reales en **Supabase Auth** (email + contraseña, JWT). El alta pasa por la Edge Function `portal-register` (service_role, solo en servidor). Pacientes nuevos se autoregistran; los ya cargados por el hospital **reclaman su ficha con un código de activación** (8 caracteres, vence a los 7 días) generado por Recepción/Administración. La ficha se vincula en `paciente."usuarioId"`. Ver ADR-04 (reemplazada). | `portal-register`, `generar_codigo_activacion()`, `PacienteAuthContext` |
| 2 | `allow_all` en `paciente`/`historialClinico`/`coberturaMedica`, incluso para `anon` | Se eliminaron **todas** las políticas `allow_all_*` y las de `anon`. RLS por rol con helpers `has_rol()`, `is_staff()`, `get_my_paciente_id()`. Un paciente solo ve su propia ficha, historial, atenciones, documentos y turnos. `anon` no accede a ninguna tabla. | migración `riesgos_seguridad_integridad` |
| 3 | Turno programado sin puente a Guardia/Internación | RPC transaccional `turno_a_guardia()`: valida el turno, evita duplicar guardia activa, crea la guardia (con el médico y motivo del turno) y marca el turno como realizado. Botón «Pasar a guardia» en Turnos (solo turnos del día). | `turno_a_guardia`, `Turnos.jsx` |
| 4 | `finalizarInternacion` liberaba la cama pero la guardia quedaba «internado» | RPC `finalizar_internacion()`: en **una sola transacción** cierra la internación, libera la cama y pasa la guardia a «alta» con `egresoAt`. `crear_internacion()` también es atómica (bloqueo de fila sobre la cama). Dar de alta desde Triaje a un paciente internado también libera la cama. | `crear_internacion`, `finalizar_internacion`, `camaService.js`, `triajeService.js` |
| 5 | `crearIngresoGuardia` no validaba guardia activa | **Índice único parcial** `guardia_activa_unica_por_paciente` (estados en_espera/en_atencion/internado): la regla vive en la base y no se puede eludir. El servicio traduce el error a un mensaje claro. | índice + `triajeService.js` |
| 6 | `documentoClinico` sin carga real de archivos | **Supabase Storage**: bucket privado `documentos-clinicos` (10 MB, PDF/PNG/JPG/WEBP), ruta `{pacienteId}/{uuid}-{nombre}`, políticas RLS sobre `storage.objects` (personal clínico y el propio paciente) y **URLs firmadas de 5 minutos**. Los links externos antiguos siguen funcionando. | `historialClinicoService.js`, `HistorialMedico.jsx` |
| 7 | `auditoria` sin pantalla ni triggers | Trigger genérico `audit_row()` sobre 15 tablas sensibles (INSERT/UPDATE/DELETE con datos anteriores y nuevos, usuario = `auth.uid()`). Pantalla **Auditoría** (solo administrador) con filtros, paginación y diff de campos. | `audit_row`, `Auditoria.jsx` |
| 8 | `horario`/`cambioHorario` sin pantalla | Pantalla **Horarios**: el administrador carga y elimina horarios; cada empleado ve los suyos y pide cambios; el receptor/administrador aprueba o rechaza con la RPC `resolver_cambio_horario()` (transfiere el horario atómicamente). | `GestionHorarios.jsx`, `horarioService.js` |
| 9 | Ruta «Mi Perfil» placeholder redundante | Ruta y permiso `perfil` eliminados; los datos personales se gestionan en Configuración. | `routes.jsx`, `employeePermissions.js` |
| 10 | Sin modo oscuro | Modo claro/oscuro con selector en Configuración, recordado en `localStorage` y aplicado antes del primer render (sin parpadeo); respeta la preferencia del sistema. | `theme.js`, `index.css`, `Ajustes.jsx` |
| 11 | Agregados en cliente (reportes) | Reportes calculados en PostgreSQL: `reporte_ocupacion_camas()`, `reporte_pacientes_atendidos()`, `reporte_facturacion()` (misma forma de respuesta; `Reportes.jsx` sin cambios). Mensajería y cola de Farmacia quedan en cliente por volumen bajo (deuda aceptada, ver 11.3). | `reportesService.js` |
| 12 | Posible `.env` expuesto en el historial | Revisado: el `.env` solo contenía la URL del proyecto y la clave **publicable (anon)**, pública por diseño; no hay `service_role` en el repositorio (vive solo como secreto de las Edge Functions). Se dejó de versionar `.env` y `supabase/.temp`, `.gitignore` los excluye y se agregó `.env.example`. | `.gitignore`, `.env.example` |

## 11.2 Problemas críticos adicionales detectados y corregidos

- **A. `usuario` abierta a `anon`** (política `allow_all_usuario`): cualquiera podía leer o modificar el personal. Cerrada.
- **B. Escalada de privilegios:** `usuarios_update` dejaba a cualquier empleado cambiarse el `rol` a administrador. Trigger `proteger_rol_usuario` (solo un administrador puede modificar rol, estado o email).
- **C. Seis tablas con RLS activo y sin políticas** (`internacion`, `equipamiento`, `camaEquipamiento`, `comentarioGuardia`, `auditoria`, `cambioHorario`): Control de Camas, equipamiento y comentarios de guardia no podían funcionar para ningún cliente. Se agregaron políticas por rol.
- **D. Inserciones con `with check (true)`** en facturación, recetas y pedidos, y acceso de cualquier autenticado: restringidas por rol (`is_staff()` / `has_rol()`), ya que ahora existen usuarios autenticados que no son personal (pacientes).

Mejora adicional: el horario de un turno cancelado vuelve a poder reservarse (índice único parcial `turno_medico_slot_unico … where estado <> 'cancelado'`).

## 11.3 Deuda técnica remanente (aceptada)

1. **Mensajería y cola de Farmacia** siguen agregando en el cliente; migrar a vistas/RPC si el volumen crece.
2. **Un paciente puede reprogramar su propio turno** (cambiar médico o fecha) por la política de UPDATE; aceptable hoy, se endurecería con un trigger que limite el cambio a `estado = 'cancelado'`.
3. **Protección de contraseñas filtradas** (HaveIBeenPwned) es una opción del panel de Supabase Auth, no activable por SQL.
4. **Rate limiting** del registro del portal: delegado en los límites nativos de Supabase Auth / Edge Functions.
5. **Funciones SECURITY DEFINER ejecutables por `authenticated`** (lint 0029): son intencionales (helpers de RLS y RPC que validan el rol internamente); `anon` no puede ejecutar ninguna.
6. **Extensión `btree_gist` en el esquema `public`**: sin impacto funcional.
7. **Pruebas automatizadas:** la verificación de RLS se hizo con consultas por rol; falta una suite automática (Vitest/pgTAP).

## 11.4 Cambios al modelo de datos (para el DER y el diccionario)

- `paciente`: + `usuarioId` (uuid, único, FK → `usuario.id`), `codigoActivacion` (text), `codigoActivacionExpira` (timestamptz).
- `documentoClinico`: + `rutaStorage`, `nombreArchivo`; `urlArchivo` ahora opcional (`CHECK` exige uno de los dos).
- `usuario.rol` admite `paciente` (cuenta del portal, sin acceso al panel de empleados).
- `medicamento` (catálogo con stock): `id`, `nombre`, `stockActual`, `stockMinimo`, `createdAt`, `updatedAt`.
- Índices: `guardia_activa_unica_por_paciente` (parcial), `turno_medico_slot_unico` (parcial), `idx_auditoria_createdat`, `idx_auditoria_tabla`.
- Nuevo bucket de Storage `documentos-clinicos` (privado).

## 11.5 Contrato de API a agregar (sección 2.3)

| Método | Ruta | Cuerpo | Éxito | Errores |
|---|---|---|---|---|
| POST | `/functions/v1/portal-register` (pública) | `{dni, email, password, nombre?, apellido?, fechaNacimiento?, sexo?, telefono?, codigo?}` | `201 {ok:true}` | `400` datos inválidos / email duplicado · `403` DNI existente sin código válido · `409` ficha ya vinculada · `500` |
| POST | `/rest/v1/rpc/crear_internacion` | `{p_guardia, p_cama, p_medico}` | `200` internación | `400` cama no disponible / guardia no activa |
| POST | `/rest/v1/rpc/finalizar_internacion` | `{p_internacion}` | `200` internación | `400` ya finalizada |
| POST | `/rest/v1/rpc/turno_a_guardia` | `{p_turno, p_nivel, p_medio?, p_enfermero?}` | `200` guardia | `400` turno no válido / guardia duplicada |
| POST | `/rest/v1/rpc/generar_codigo_activacion` | `{p_paciente}` | `200` "A1B2C3D4" | `400` sin permiso / ya activado |
| POST | `/rest/v1/rpc/resolver_cambio_horario` | `{p_cambio, p_aprobar}` | `200` cambio | `400` sin permiso / ya resuelto |
| POST | `/rest/v1/rpc/reporte_*` | `{p_desde}` | `200` JSON | `401/403` sin sesión de personal |

## 11.6 Casos de prueba nuevos (manual de testing, sección 3.1)

| ID | Módulo | Tipo | Entrada / precondición | Resultado esperado |
|---|---|---|---|---|
| TC-011 | Control de acceso | Integración | Consulta como `anon` a `paciente`, `usuario`, `turno`, `guardia`, `documentoClinico` | 0 filas (RLS) |
| TC-012 | Control de acceso | Integración | Paciente autenticado consulta `paciente` y `historialClinico` | Solo ve su propia ficha |
| TC-013 | Seguridad | Integración | Médico ejecuta `update usuario set rol='administrador'` sobre su propia fila | Excepción «No tenés permiso…» |
| TC-014 | Lógica de negocio | Integración | Crear dos guardias activas para el mismo paciente | Segunda rechazada (23505) con mensaje claro |
| TC-015 | Lógica de negocio | E2E | Internar y dar de alta a un paciente | Cama pasa a ocupada y luego a disponible; guardia a «internado» y luego a «alta» con egreso |
| TC-016 | Portal | E2E | Registro con DNI existente sin código / con código vencido | `403`; con código vigente, cuenta creada y ficha vinculada |
| TC-017 | Documentos | E2E | Subir archivo de 15 MB o `.exe` | Rechazado por validación y por el bucket |
| TC-018 | Auditoría | Integración | Modificar un paciente | Se registra fila con datos anteriores y nuevos y el usuario |
