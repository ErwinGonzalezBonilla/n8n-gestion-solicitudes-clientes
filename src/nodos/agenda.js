// Prepara el resumen con las citas de hoy para el negocio
//@@COMUN@@
const hoy = DateTime.now().setZone(ZONA).startOf('day');
const citas = $input.all()
  .map((i) => i.json)
  .filter((c) => c.ID_cita && c.Estado === 'Confirmada')
  .map((c) => ({ ...c, inicio: leerInicio(c) }))
  .filter((c) => c.inicio && c.inicio.hasSame(hoy, 'day'))
  .sort((a, b) => a.inicio - b.inicio);

const filas = citas.map((c) =>
  `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee"><b>${c.inicio.toFormat('HH:mm')}</b></td><td style="padding:8px 12px;border-bottom:1px solid #eee">${c.Nombre}<br><small>${c.Telefono || ''} · ${c.Email}</small></td><td style="padding:8px 12px;border-bottom:1px solid #eee">${c.Servicio}<br><small>${c.Presupuesto} €</small></td></tr>`
).join('');

return [{
  json: {
    Asunto: citas.length ? `📋 Agenda de hoy: ${citas.length} cita(s)` : '📋 Hoy no hay citas',
    Html: citas.length
      ? `<div style="font-family:Arial,sans-serif"><p>Citas de hoy, ${hoy.setLocale('es').toFormat("cccc d 'de' LLLL")}:</p><table style="border-collapse:collapse;font-size:14px">${filas}</table></div>`
      : '<p style="font-family:Arial,sans-serif">Hoy no hay citas en la agenda. Buen momento para revisar las solicitudes pendientes de agendar.</p>',
  },
}];
