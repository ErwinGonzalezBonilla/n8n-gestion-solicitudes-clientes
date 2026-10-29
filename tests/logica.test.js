// Pruebas de la lógica de los nodos Code: simula el entorno de n8n ($input, $(), DateTime) con un reloj fijo
const fs = require('fs');
const assert = require('assert');
const { DateTime, Settings } = require('luxon');
const src = (n) => fs.readFileSync(`src/nodos/${n}.js`, 'utf8').replace('//@@COMUN@@', fs.readFileSync('src/nodos/comun_citas.js', 'utf8'));
function run(name, { input = [], nodes = {}, json, now }) {
  Settings.now = () => Date.now(); const ms = now ? DateTime.fromISO(now, { zone: 'Europe/Madrid' }).toMillis() : Date.now(); Settings.now = () => ms;
  const $input = { all: () => input.map((j) => ({ json: j })) };
  const $ = (n) => ({ item: { json: nodes[n] }, first: () => ({ json: nodes[n] }) });
  return new Function('$input', '$', '$json', 'DateTime', src(name))($input, $, json, DateTime);
}
const sol = { ID: 'SOL-1', Nombre: 'Ana Pérez', Email: 'a@b.com', Telefono: '600', Servicio: 'Chatbot', Presupuesto: 350, Fecha_deseada: '2026-11-03', Hora_deseada: '10:00' };
const N = (o) => ({ 'Combinar análisis IA': { ...sol, ...o } });
let r;

// Normalizar
r = run('normalizar', { now: '2026-10-29T12:00', input: [{ 'Nombre completo': ' Ana ', 'Correo electrónico': 'A@B.com ', 'Presupuesto estimado (€)': '300', 'Fecha deseada': '2026-11-03', 'Hora preferida': '10:00', 'Servicio solicitado': 'Chatbot', 'Descripción de la solicitud': 'x' }] });
assert.equal(r[0].json.Prioridad, 'Alta'); assert.equal(r[0].json.Email, 'a@b.com'); assert.equal(r[0].json.Presupuesto, 300);
r = run('normalizar', { now: '2026-10-29T12:00', input: [{ 'Presupuesto estimado (€)': '299,5' }] });
assert.equal(r[0].json.Prioridad, 'Normal'); assert.equal(r[0].json.Presupuesto, 299.5);

// IA ok / IA caída
r = run('combinar_ia', { nodes: { 'Normalizar y calcular prioridad': sol }, json: { choices: [{ message: { content: '{"resumen":"R","categoria":"C","complejidad":"alta","respuesta_cliente":"Hola"}' } }] } });
assert.equal(r.json.Resumen_IA, 'R'); assert.equal(r.json.Respuesta_IA, 'Hola');
r = run('combinar_ia', { nodes: { 'Normalizar y calcular prioridad': sol }, json: { error: 'x' } });
assert.match(r.json.Resumen_IA, /no disponible/);

// Hueco libre: se respeta lo pedido (martes 3 nov 10:00)
r = run('asignar_hueco', { now: '2026-10-29T12:00', nodes: N({}), input: [{}] });
assert.equal(r[0].json.Fecha, '2026-11-03'); assert.equal(r[0].json.Hora, '10:00'); assert.equal(r[0].json.Hora_cambiada, 'No');
assert.equal(r[0].json.Inicio, '2026-11-03T10:00:00.000+01:00');
console.log('texto:', r[0].json.Fecha_texto);
// Ocupado 10 y 11 → 12:00
r = run('asignar_hueco', { now: '2026-10-29T12:00', nodes: N({}), input: [{ ID_cita: 'a', Fecha: '2026-11-03', Hora: '10:00', Estado: 'Confirmada' }, { ID_cita: 'b', Fecha: '2026-11-03', Hora: '11:00', Estado: 'Confirmada' }] });
assert.equal(r[0].json.Hora, '12:00'); assert.equal(r[0].json.Hora_cambiada, 'Sí');
// Cancelada no bloquea
r = run('asignar_hueco', { now: '2026-10-29T12:00', nodes: N({}), input: [{ ID_cita: 'a', Fecha: '2026-11-03', Hora: '10:00', Estado: 'Cancelada' }] });
assert.equal(r[0].json.Hora, '10:00');
// Última hora del día ocupada → siguiente día 9:00
r = run('asignar_hueco', { now: '2026-10-29T12:00', nodes: N({ Hora_deseada: '17:00' }), input: [{ ID_cita: 'a', Fecha: '2026-11-03', Hora: '17:00', Estado: 'Confirmada' }] });
assert.equal(r[0].json.Fecha, '2026-11-04'); assert.equal(r[0].json.Hora, '09:00');
// Sábado → lunes 9:00
r = run('asignar_hueco', { now: '2026-10-29T12:00', nodes: N({ Fecha_deseada: '2026-10-31' }), input: [{}] });
assert.equal(r[0].json.Fecha, '2026-11-02'); assert.equal(r[0].json.Hora, '09:00');
// Fecha pasada → mínimo 2h después, hora en punto (ahora jueves 12:00 → 15:00)
r = run('asignar_hueco', { now: '2026-10-29T12:00', nodes: N({ Fecha_deseada: '2026-10-20' }), input: [{}] });
assert.equal(r[0].json.Fecha, '2026-10-29'); assert.equal(r[0].json.Hora, '15:00');
// Viernes 17:30 con fecha pasada → lunes 9:00
r = run('asignar_hueco', { now: '2026-10-30T17:30', nodes: N({ Fecha_deseada: '2026-10-20' }), input: [{}] });
assert.equal(r[0].json.Fecha, '2026-11-02'); assert.equal(r[0].json.Hora, '09:00');
// Fecha vacía → mañana 9:00
r = run('asignar_hueco', { now: '2026-10-29T12:00', nodes: N({ Fecha_deseada: '' }), input: [{}] });
assert.equal(r[0].json.Fecha, '2026-10-30'); assert.equal(r[0].json.Hora, '09:00');

// Recordatorios
const citas = [
  { ID_cita: 'M', Fecha: '2026-11-04', Hora: '10:00', Estado: 'Confirmada', Email: 'm@x', Nombre: 'Mañana Uno', Servicio: 'Web', Recordatorio_24h: 'No' },
  { ID_cita: 'M2', Fecha: '2026-11-04', Hora: '11:00', Estado: 'Confirmada', Email: 'm@x', Servicio: 'Web', Recordatorio_24h: 'Sí' },
  { ID_cita: 'H', Fecha: '03/11/2026', Hora: '16:00', Estado: 'Confirmada', Email: 'h@x', Servicio: 'Web', Recordatorio_24h: 'Sí', Recordatorio_dia: 'No' },
  { ID_cita: 'Hpas', Fecha: '2026-11-03', Hora: '08:00', Estado: 'Confirmada', Email: 'h@x', Servicio: 'Web' },
  { ID_cita: 'A', Fecha: '2026-11-02', Hora: '10:00', Estado: 'Confirmada', Email: 'a@x', Servicio: 'Web', Seguimiento: 'No' },
  { ID_cita: 'Viejo', Fecha: '2026-10-20', Hora: '10:00', Estado: 'Confirmada', Email: 'a@x', Servicio: 'Web' },
  { ID_cita: 'C', Fecha: '2026-11-04', Hora: '12:00', Estado: 'Cancelada', Email: 'c@x', Servicio: 'Web' },
  {},
];
r = run('recordatorios', { now: '2026-11-03T09:00', input: citas });
const got = r.map((x) => `${x.json.ID_cita}:${x.json.Campo}`).sort();
console.log(got, '|', r[0].json.Asunto);
assert.deepEqual(got, ['A:Seguimiento', 'H:Recordatorio_dia', 'M:Recordatorio_24h']);
assert.equal(run('recordatorios', { now: '2026-11-03T06:00', input: citas }).length, 0);
// cambio de hora (DST 25 oct) no rompe el cálculo de días
r = run('recordatorios', { now: '2026-10-24T20:00', input: [{ ID_cita: 'D', Fecha: '2026-10-25', Hora: '10:00', Estado: 'Confirmada', Email: 'd@x', Servicio: 'Web' }] });
assert.equal(r[0].json.Campo, 'Recordatorio_24h');

// Marcar
r = run('marcar', { nodes: { 'Detectar avisos pendientes': { ID_cita: 'M', Campo: 'Recordatorio_24h' } } });
assert.deepEqual(r.json, { ID_cita: 'M', Recordatorio_24h: 'Sí' });

// Agenda
r = run('agenda', { now: '2026-11-03T07:30', input: citas });
assert.match(r[0].json.Asunto, /2 cita/); assert.ok(r[0].json.Html.indexOf("08:00") < r[0].json.Html.indexOf("16:00")); 
r = run('agenda', { now: '2026-11-03T07:30', input: [{}] });
assert.match(r[0].json.Asunto, /no hay/);
console.log('TODAS LAS PRUEBAS OK');
