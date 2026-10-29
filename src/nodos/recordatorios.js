// Decide qué correos tocan ahora: recordatorio 24 h antes, recordatorio el mismo día y seguimiento al día siguiente
//@@COMUN@@
const NEGOCIO = 'Tu negocio';
const HORA_MINIMA_ENVIO = 8;  // no enviar correos de madrugada
const DIAS_SEGUIMIENTO = 3;   // no pedir opinión de citas muy antiguas

const ahora = DateTime.now().setZone(ZONA);
const hoy = ahora.startOf('day');
if (ahora.hour < HORA_MINIMA_ENVIO) return [];

const plantilla = (titulo, cuerpo) => `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e3e3e3;border-radius:10px;overflow:hidden">
  <div style="background:#1B2A3A;color:#fff;padding:18px 22px;font-size:18px;font-weight:bold">${titulo}</div>
  <div style="padding:22px;color:#1B2836;font-size:15px;line-height:1.55">${cuerpo}
    <p style="margin-top:22px;color:#5B6676">Un saludo,<br>${NEGOCIO}</p>
  </div>
</div>`;
const detalle = (c, inicio) =>
  `<p style="background:#F2F5F9;border-radius:8px;padding:12px 16px">📅 <b>${inicio.setLocale('es').toFormat("cccc d 'de' LLLL")}</b><br>🕒 <b>${inicio.toFormat('HH:mm')} h</b><br>🛠️ ${c.Servicio}</p>`;

const envios = [];
for (const { json: c } of $input.all()) {
  if (!c.ID_cita || c.Estado !== 'Confirmada' || !c.Email) continue;
  const inicio = leerInicio(c);
  if (!inicio) continue;
  const dias = Math.round(inicio.startOf('day').diff(hoy, 'days').days);
  const nombre = String(c.Nombre || '').split(' ')[0] || 'Hola';

  if (dias === 1 && c.Recordatorio_24h !== 'Sí') {
    envios.push({ ID_cita: c.ID_cita, Campo: 'Recordatorio_24h', Email: c.Email,
      Asunto: `⏰ Mañana tienes cita a las ${inicio.toFormat('HH:mm')}`,
      Html: plantilla('Tu cita es mañana', `<p>Hola ${nombre}, te recordamos que <b>mañana</b> tenemos una cita:</p>${detalle(c, inicio)}<p>Si no puedes asistir, responde a este correo y buscamos otra hora.</p>`) });
  } else if (dias === 0 && c.Recordatorio_dia !== 'Sí' && inicio > ahora) {
    envios.push({ ID_cita: c.ID_cita, Campo: 'Recordatorio_dia', Email: c.Email,
      Asunto: `📍 Hoy es tu cita: ${inicio.toFormat('HH:mm')} h`,
      Html: plantilla('Hoy es el día', `<p>Hola ${nombre}, te esperamos <b>hoy</b>:</p>${detalle(c, inicio)}<p>¡Hasta luego!</p>`) });
  } else if (dias < 0 && dias >= -DIAS_SEGUIMIENTO && c.Seguimiento !== 'Sí') {
    envios.push({ ID_cita: c.ID_cita, Campo: 'Seguimiento', Email: c.Email,
      Asunto: '¿Qué tal fue? Tu opinión nos ayuda',
      Html: plantilla('Gracias por confiar en nosotros', `<p>Hola ${nombre}, gracias por la cita de ${c.Servicio}.</p><p>¿Nos cuentas en una línea qué tal fue? Solo tienes que responder a este correo. Y si quieres seguir con el proyecto, dinos y te preparamos los siguientes pasos.</p>`) });
  }
}
return envios.map((json) => ({ json }));
