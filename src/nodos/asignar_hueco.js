// Busca la primera hora libre en la agenda a partir de la fecha y hora que pidió el cliente
const ZONA = 'Europe/Madrid';
const APERTURA = 9;          // primera cita del día
const CIERRE = 18;           // la última cita debe terminar antes de esta hora
const DURACION_MIN = 60;     // duración de cada cita
const DIAS_LABORABLES = [1, 2, 3, 4, 5]; // lunes a viernes
const ANTELACION_HORAS = 2;  // nunca dar una cita con menos antelación que esto

const s = $('Combinar análisis IA').first().json;
const ocupadas = new Set(
  $input.all()
    .map((i) => i.json)
    .filter((c) => c.ID_cita && c.Estado !== 'Cancelada')
    .map((c) => `${c.Fecha} ${String(c.Hora).slice(0, 5)}`)
);

const ahora = DateTime.now().setZone(ZONA);
const minimo = ahora.plus({ hours: ANTELACION_HORAS });
const apertura = (dia) => dia.set({ hour: APERTURA, minute: 0, second: 0, millisecond: 0 });
const cabe = (h) => h.plus({ minutes: DURACION_MIN }) <= h.set({ hour: CIERRE, minute: 0 });
const clave = (h) => `${h.toFormat('yyyy-MM-dd')} ${h.toFormat('HH:mm')}`;
const esLibre = (h) =>
  DIAS_LABORABLES.includes(h.weekday) && h.hour >= APERTURA && cabe(h) && h >= minimo && !ocupadas.has(clave(h));
const siguiente = (h) => {
  const n = h.plus({ minutes: DURACION_MIN });
  return cabe(n) ? n : apertura(n.plus({ days: 1 }));
};

const pedida = DateTime.fromISO(`${s.Fecha_deseada}T${s.Hora_deseada}`, { zone: ZONA });
let hueco = pedida.isValid ? pedida.set({ second: 0, millisecond: 0 }) : apertura(ahora.plus({ days: 1 }));
if (hueco < minimo) hueco = minimo.plus({ hours: 1 }).startOf('hour');
if (hueco.hour < APERTURA) hueco = apertura(hueco);

let intentos = 0;
while (!esLibre(hueco)) {
  hueco = siguiente(hueco);
  if (++intentos > 2000) throw new Error('No hay huecos libres en la agenda en los próximos meses');
}

const fin = hueco.plus({ minutes: DURACION_MIN });
return [{
  json: {
    ID_cita: `CITA-${hueco.toFormat('yyMMdd-HHmm')}`,
    ID_solicitud: s.ID,
    Nombre: s.Nombre,
    Email: s.Email,
    Telefono: s.Telefono,
    Servicio: s.Servicio,
    Presupuesto: s.Presupuesto,
    Fecha: hueco.toFormat('yyyy-MM-dd'),
    Hora: hueco.toFormat('HH:mm'),
    Fecha_texto: hueco.setLocale('es').toFormat("cccc d 'de' LLLL"),
    Inicio: hueco.toISO(),
    Fin: fin.toISO(),
    Hora_cambiada: pedida.isValid && +pedida === +hueco ? 'No' : 'Sí',
    Estado: 'Confirmada',
    Recordatorio_24h: 'No',
    Recordatorio_dia: 'No',
    Seguimiento: 'No',
  },
}];
