// Limpia los datos del formulario y calcula la prioridad de la solicitud
const ZONA = 'Europe/Madrid';
const PRESUPUESTO_PRIORITARIO = 300;

return $input.all().map((item) => {
  const f = item.json;
  const ahora = DateTime.now().setZone(ZONA);
  const presupuesto = Number(String(f['Presupuesto estimado (€)'] ?? '').replace(',', '.')) || 0;
  const sufijo = Math.random().toString(36).slice(2, 5).toUpperCase();

  return {
    json: {
      ID: `SOL-${ahora.toFormat('yyMMdd-HHmm')}-${sufijo}`,
      Fecha_registro: ahora.toFormat('yyyy-MM-dd HH:mm'),
      Nombre: String(f['Nombre completo'] ?? '').trim(),
      Email: String(f['Correo electrónico'] ?? '').trim().toLowerCase(),
      Telefono: String(f['Teléfono'] ?? '').trim(),
      Servicio: f['Servicio solicitado'] ?? 'Otro',
      Presupuesto: presupuesto,
      Fecha_deseada: String(f['Fecha deseada'] ?? '').slice(0, 10),
      Hora_deseada: f['Hora preferida'] ?? '10:00',
      Descripcion: String(f['Descripción de la solicitud'] ?? '').trim(),
      Prioridad: presupuesto >= PRESUPUESTO_PRIORITARIO ? 'Alta' : 'Normal',
      Estado: presupuesto >= PRESUPUESTO_PRIORITARIO ? 'Cita confirmada' : 'Pendiente de agendar',
    },
  };
});
