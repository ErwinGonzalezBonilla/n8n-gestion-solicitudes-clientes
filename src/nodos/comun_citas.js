const ZONA = 'Europe/Madrid';
// Acepta fechas escritas como 2026-11-05 o 05/11/2026 (por si añades citas a mano en la hoja)
const leerFecha = (texto) => {
  const t = String(texto ?? '').trim();
  let d = DateTime.fromISO(t.slice(0, 10), { zone: ZONA });
  if (!d.isValid) d = DateTime.fromFormat(t, 'd/M/yyyy', { zone: ZONA });
  return d.isValid ? d.startOf('day') : null;
};
const leerInicio = (cita) => {
  const dia = leerFecha(cita.Fecha);
  const [h, m] = String(cita.Hora ?? '').split(':').map(Number);
  return dia && Number.isFinite(h) ? dia.set({ hour: h, minute: m || 0 }) : null;
};
