# Gestión automática de solicitudes de clientes

Proyecto de automatización desarrollado con **n8n** para recibir y organizar solicitudes de clientes mediante un formulario web.

## Objetivo

Practicar la creación de flujos de trabajo que permitan automatizar tareas repetitivas de un negocio, reducir el trabajo manual y mejorar la gestión de solicitudes.

## Tecnologías utilizadas

- **n8n:** creación y ejecución de flujos de automatización.
- **n8n Form Trigger:** recepción de formularios enviados por clientes.
- **GitHub:** control de versiones y documentación del proyecto.

## Funcionamiento actual

1. El cliente completa un formulario de solicitud.
2. El formulario recoge nombre, correo electrónico, servicio solicitado, presupuesto estimado, fecha deseada y descripción.
3. n8n recibe los datos enviados.
4. Se comprueba la recepción de los datos mediante una ejecución de prueba.

## Próximas mejoras

- Clasificar solicitudes mediante condiciones `IF` según el presupuesto.
- Registrar las solicitudes en Google Sheets.
- Enviar notificaciones por correo electrónico al negocio.
- Enviar confirmaciones automáticas al cliente.
- Añadir validaciones y gestión de errores.

## Estado del proyecto

**En desarrollo.** El formulario se ha probado correctamente. Las siguientes funcionalidades se incorporarán progresivamente.

## Autor

Erwin González

Repositorio creado como proyecto práctico de aprendizaje de automatización con n8n.
