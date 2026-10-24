## Estado actual del proyecto

### Funcionalidades implementadas
- Recepción de solicitudes mediante un formulario de n8n.
- Captura de nombre, correo electrónico, servicio solicitado, presupuesto estimado, fecha deseada y descripción.
- Clasificación de solicitudes mediante un nodo IF.
- Enrutamiento a la rama verdadera cuando el presupuesto es igual o superior a 300 €.

### Pruebas realizadas
- Se envió una solicitud de prueba con un presupuesto de 350 €.
- Se ejecutó el nodo IF y se comprobó que la solicitud llegó a la rama verdadera.

### Próximas funcionalidades
- Registrar solicitudes en Google Sheets.
- Enviar notificaciones por correo electrónico.
- Confirmar la recepción al cliente.
- Gestionar errores y validar el flujo completo.

**Nota:** La integración con Google Sheets está en desarrollo y todavía no se ha validado.
