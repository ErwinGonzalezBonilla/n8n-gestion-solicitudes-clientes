// Genera los workflows de n8n (carpeta workflows/) a partir del código de src/nodos/
const fs = require('fs');
const crypto = require('crypto');
const out = process.argv[2] || 'workflows';
const code = (n) => fs.readFileSync(`src/nodos/${n}.js`, 'utf8').replace('//@@COMUN@@', fs.readFileSync('src/nodos/comun_citas.js', 'utf8').trim());
const SHEET = { __rl: true, value: 'PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET', mode: 'id' };
const EMAIL_NEGOCIO = 'TU_CORREO@gmail.com';
const tab = (name) => ({ __rl: true, value: name, mode: 'name' });
const node = (name, type, typeVersion, position, parameters, extra = {}) =>
  ({ parameters, id: crypto.randomUUID(), name, type, typeVersion, position, ...extra });
const codeNode = (name, file, pos, mode) =>
  node(name, 'n8n-nodes-base.code', 2, pos, { ...(mode ? { mode } : {}), jsCode: code(file) });
const sheetsAppend = (name, t, pos) => node(name, 'n8n-nodes-base.googleSheets', 4.5, pos, {
  operation: 'append', documentId: SHEET, sheetName: tab(t),
  columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [] },
  options: { cellFormat: 'RAW' } });
const sheetsRead = (name, t, pos, extra = {}) => node(name, 'n8n-nodes-base.googleSheets', 4.5, pos,
  { operation: 'read', documentId: SHEET, sheetName: tab(t), options: {} }, extra);
const gmail = (name, pos, sendTo, subject, message) => node(name, 'n8n-nodes-base.gmail', 2.1, pos,
  { sendTo, subject, emailType: 'html', message, options: { appendAttribution: false } }, { webhookId: crypto.randomUUID() });
const note = (content, pos, w, h, color) => node(`Nota ${crypto.randomUUID().slice(0, 4)}`, 'n8n-nodes-base.stickyNote', 1, pos, { content, width: w, height: h, color });
const connect = (pairs) => {
  const c = {};
  for (const [from, to, output = 0] of pairs) {
    c[from] ??= { main: [] };
    while (c[from].main.length <= output) c[from].main.push([]);
    c[from].main[output].push({ node: to, type: 'main', index: 0 });
  }
  return c;
};
const workflow = (name, nodes, connections) => ({
  name, nodes, pinData: {}, connections, active: false,
  settings: { executionOrder: 'v1', timezone: 'Europe/Madrid' }, tags: [],
});
const caja = (titulo, cuerpo) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e3e3e3;border-radius:10px;overflow:hidden">
  <div style="background:#1B2A3A;color:#fff;padding:18px 22px;font-size:18px;font-weight:bold">${titulo}</div>
  <div style="padding:22px;color:#1B2836;font-size:15px;line-height:1.55">${cuerpo}</div>
</div>`;

// ───────── 1. Solicitudes y citas ─────────
const S = "$('Combinar análisis IA').item.json";
const C = "$('Asignar hueco en la agenda').item.json";
const iaBody = `={{ JSON.stringify({
  model: 'gpt-4o-mini',
  temperature: 0.3,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: 'Eres el asistente de un negocio de servicios digitales. Analiza la solicitud de un cliente y responde SOLO con JSON con estas claves: resumen (una frase), categoria (web, automatizacion, chatbot u otro), complejidad (baja, media o alta), respuesta_cliente (2 frases cercanas en español sobre su proyecto, sin saludo inicial porque el correo ya empieza con «Hola + nombre», y sin prometer precios ni plazos).' },
    { role: 'user', content: JSON.stringify({ nombre: $json.Nombre, servicio: $json.Servicio, presupuesto_eur: $json.Presupuesto, descripcion: $json.Descripcion }) }
  ]
}) }}`;
const horas = Array.from({ length: 9 }, (_, i) => ({ option: `${String(9 + i).padStart(2, '0')}:00` }));

const w1 = workflow('1 · Solicitudes de clientes y citas', [
  note('## 1 · Solicitudes de clientes y citas\nEl cliente rellena el formulario → la IA resume la solicitud → se registra en Google Sheets.\n\n**Presupuesto ≥ 300 €** → prioridad alta: se le asigna la primera hora libre, se crea el evento en Google Calendar y recibe la confirmación de su cita.\n\n**Menos de 300 €** → queda *pendiente de agendar* y el negocio recibe el aviso para darle cita.', [-40, -380], 620, 260, 5),
  node('Formulario de solicitud', 'n8n-nodes-base.formTrigger', 2.2, [0, 0], {
    formTitle: 'Solicitud de presupuesto y cita',
    formDescription: 'Cuéntanos qué necesitas y elige cuándo te viene bien. Te confirmamos por correo.',
    formFields: { values: [
      { fieldLabel: 'Nombre completo', requiredField: true },
      { fieldLabel: 'Correo electrónico', fieldType: 'email', requiredField: true },
      { fieldLabel: 'Teléfono' },
      { fieldLabel: 'Servicio solicitado', fieldType: 'dropdown', fieldOptions: { values: [{ option: 'Diseño web' }, { option: 'Automatización' }, { option: 'Chatbot' }, { option: 'Otro' }] }, requiredField: true },
      { fieldLabel: 'Presupuesto estimado (€)', fieldType: 'number', requiredField: true },
      { fieldLabel: 'Fecha deseada', fieldType: 'date', requiredField: true },
      { fieldLabel: 'Hora preferida', fieldType: 'dropdown', fieldOptions: { values: horas }, requiredField: true },
      { fieldLabel: 'Descripción de la solicitud', fieldType: 'textarea', requiredField: true },
    ] },
    responseMode: 'onReceived',
    options: { respondWithOptions: { values: { formSubmittedText: '¡Gracias! Hemos recibido tu solicitud. Revisa tu correo en unos minutos.' } } },
  }, { webhookId: crypto.randomUUID() }),
  codeNode('Normalizar y calcular prioridad', 'normalizar', [220, 0]),
  node('IA: analizar solicitud', 'n8n-nodes-base.httpRequest', 4.2, [440, 0], {
    method: 'POST', url: 'https://api.openai.com/v1/chat/completions',
    authentication: 'predefinedCredentialType', nodeCredentialType: 'openAiApi',
    sendBody: true, specifyBody: 'json', jsonBody: iaBody, options: { timeout: 30000 },
  }, { onError: 'continueRegularOutput' }),
  codeNode('Combinar análisis IA', 'combinar_ia', [660, 0], 'runOnceForEachItem'),
  sheetsAppend('Registrar solicitud', 'Solicitudes', [880, 0]),
  node('¿Presupuesto ≥ 300 €?', 'n8n-nodes-base.if', 2, [1100, 0], {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
      conditions: [{ id: crypto.randomUUID(), leftValue: `={{ ${S}.Presupuesto }}`, rightValue: 300, operator: { type: 'number', operation: 'gte' } }],
      combinator: 'and',
    },
    options: {},
  }),
  sheetsRead('Leer agenda', 'Citas', [1340, -140], { alwaysOutputData: true, executeOnce: true }),
  codeNode('Asignar hueco en la agenda', 'asignar_hueco', [1560, -140]),
  sheetsAppend('Guardar cita', 'Citas', [1780, -140]),
  node('Crear evento en Google Calendar', 'n8n-nodes-base.googleCalendar', 1.3, [2000, -140], {
    calendar: { __rl: true, value: EMAIL_NEGOCIO, mode: 'id' },
    start: `={{ ${C}.Inicio }}`, end: `={{ ${C}.Fin }}`,
    additionalFields: {
      summary: `=⭐ ${'{{'} ${C}.Servicio }} · ${'{{'} ${C}.Nombre }}`,
      description: `=Cita prioritaria (${'{{'} ${S}.Presupuesto }} €)\nCliente: ${'{{'} ${C}.Nombre }} · ${'{{'} ${C}.Email }} · ${'{{'} ${C}.Telefono }}\n\nResumen IA: ${'{{'} ${S}.Resumen_IA }}\n\nDescripción: ${'{{'} ${S}.Descripcion }}\n\nID: ${'{{'} ${C}.ID_cita }}`,
    },
  }),
  gmail('Confirmar cita al cliente', [2220, -140], `={{ ${C}.Email }}`,
    `=✅ Cita confirmada: {{ ${C}.Fecha_texto }} a las {{ ${C}.Hora }}`,
    '=' + caja('Tu cita está confirmada', `<p>Hola {{ ${C}.Nombre.split(' ')[0] }},</p>
<p>{{ ${S}.Respuesta_IA }}</p>
<p style="background:#F2F5F9;border-radius:8px;padding:12px 16px">📅 <b>{{ ${C}.Fecha_texto }}</b><br>🕒 <b>{{ ${C}.Hora }} h</b><br>🛠️ {{ ${C}.Servicio }}</p>
{{ ${C}.Hora_cambiada === 'Sí' ? '<p>La hora que pediste ya estaba ocupada, así que te hemos reservado la primera disponible. Si no te viene bien, responde a este correo.</p>' : '' }}
<p>Te enviaremos un recordatorio el día antes y otro el mismo día de la cita.</p>`)),
  gmail('Avisar al negocio: prioritaria', [2440, -140], EMAIL_NEGOCIO,
    `=⭐ Solicitud PRIORITARIA · {{ ${S}.Presupuesto }} € · cita {{ ${C}.Fecha }} {{ ${C}.Hora }}`,
    '=' + caja('Nueva solicitud prioritaria', `<p><b>{{ ${S}.Nombre }}</b> · {{ ${S}.Email }} · {{ ${S}.Telefono }}</p>
<p>🛠️ {{ ${S}.Servicio }} · 💶 <b>{{ ${S}.Presupuesto }} €</b> · Complejidad IA: {{ ${S}.Complejidad_IA }}</p>
<p>🤖 <i>{{ ${S}.Resumen_IA }}</i></p>
<p>📅 Cita asignada: <b>{{ ${C}.Fecha_texto }} a las {{ ${C}.Hora }}</b> (ya está en Google Calendar)</p>
<p style="color:#5B6676">{{ ${S}.Descripcion }}</p>`)),
  gmail('Confirmar recepción al cliente', [1340, 140], `={{ ${S}.Email }}`,
    '=📩 Hemos recibido tu solicitud',
    '=' + caja('Solicitud recibida', `<p>Hola {{ ${S}.Nombre.split(' ')[0] }},</p>
<p>{{ ${S}.Respuesta_IA }}</p>
<p>En menos de 48 horas te escribimos para confirmar el día y la hora de tu cita. Pediste: <b>{{ ${S}.Fecha_deseada }} a las {{ ${S}.Hora_deseada }}</b>.</p>`)),
  gmail('Avisar al negocio: pendiente de agendar', [1560, 140], EMAIL_NEGOCIO,
    `=📋 Nueva solicitud · {{ ${S}.Presupuesto }} € · pendiente de agendar`,
    '=' + caja('Solicitud pendiente de agendar', `<p><b>{{ ${S}.Nombre }}</b> · {{ ${S}.Email }} · {{ ${S}.Telefono }}</p>
<p>🛠️ {{ ${S}.Servicio }} · 💶 {{ ${S}.Presupuesto }} € · pide {{ ${S}.Fecha_deseada }} a las {{ ${S}.Hora_deseada }}</p>
<p>🤖 <i>{{ ${S}.Resumen_IA }}</i></p>
<p>Para darle cita, añade una fila en la pestaña <b>Citas</b> con Estado <b>Confirmada</b>. Los recordatorios se enviarán solos.</p>`)),
], connect([
  ['Formulario de solicitud', 'Normalizar y calcular prioridad'],
  ['Normalizar y calcular prioridad', 'IA: analizar solicitud'],
  ['IA: analizar solicitud', 'Combinar análisis IA'],
  ['Combinar análisis IA', 'Registrar solicitud'],
  ['Registrar solicitud', '¿Presupuesto ≥ 300 €?'],
  ['¿Presupuesto ≥ 300 €?', 'Leer agenda', 0],
  ['¿Presupuesto ≥ 300 €?', 'Confirmar recepción al cliente', 1],
  ['Leer agenda', 'Asignar hueco en la agenda'],
  ['Asignar hueco en la agenda', 'Guardar cita'],
  ['Guardar cita', 'Crear evento en Google Calendar'],
  ['Crear evento en Google Calendar', 'Confirmar cita al cliente'],
  ['Confirmar cita al cliente', 'Avisar al negocio: prioritaria'],
  ['Confirmar recepción al cliente', 'Avisar al negocio: pendiente de agendar'],
]));

// ───────── 2. Recordatorios y agenda ─────────
const w2 = workflow('2 · Recordatorios de citas y agenda diaria', [
  note('## 2 · Recordatorios y agenda diaria\nCada hora revisa la pestaña **Citas** y envía, solo una vez por cita:\n- ⏰ recordatorio **el día antes**\n- 📍 recordatorio **el mismo día**\n- 💬 mensaje de **seguimiento** al día siguiente\n\nDe lunes a sábado a las 7:30 envía al negocio la **agenda del día**.', [-40, -400], 560, 280, 5),
  node('Cada hora', 'n8n-nodes-base.scheduleTrigger', 1.2, [0, 0], { rule: { interval: [{ field: 'cronExpression', expression: '0 * * * *' }] } }),
  sheetsRead('Leer citas', 'Citas', [220, 0]),
  codeNode('Detectar avisos pendientes', 'recordatorios', [440, 0]),
  gmail('Enviar aviso al cliente', [660, 0], '={{ $json.Email }}', '={{ $json.Asunto }}', '={{ $json.Html }}'),
  codeNode('Preparar marca de enviado', 'marcar', [880, 0], 'runOnceForEachItem'),
  node('Marcar aviso como enviado', 'n8n-nodes-base.googleSheets', 4.5, [1100, 0], {
    operation: 'update', documentId: SHEET, sheetName: tab('Citas'),
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: ['ID_cita'], schema: [] },
    options: { cellFormat: 'RAW' } }),
  node('Cada mañana 7:30', 'n8n-nodes-base.scheduleTrigger', 1.2, [0, 260], { rule: { interval: [{ field: 'cronExpression', expression: '30 7 * * 1-6' }] } }),
  sheetsRead('Leer citas del día', 'Citas', [220, 260], { alwaysOutputData: true }),
  codeNode('Preparar agenda del día', 'agenda', [440, 260]),
  gmail('Enviar agenda al negocio', [660, 260], EMAIL_NEGOCIO, '={{ $json.Asunto }}', '={{ $json.Html }}'),
], connect([
  ['Cada hora', 'Leer citas'],
  ['Leer citas', 'Detectar avisos pendientes'],
  ['Detectar avisos pendientes', 'Enviar aviso al cliente'],
  ['Enviar aviso al cliente', 'Preparar marca de enviado'],
  ['Preparar marca de enviado', 'Marcar aviso como enviado'],
  ['Cada mañana 7:30', 'Leer citas del día'],
  ['Leer citas del día', 'Preparar agenda del día'],
  ['Preparar agenda del día', 'Enviar agenda al negocio'],
]));

// ───────── 3. Alertas de error ─────────
const w3 = workflow('3 · Alertas de error', [
  note('## 3 · Alertas de error\nSi falla cualquier paso de los workflows 1 o 2, avisa por correo con el nodo y el error para revisarlo.\n\nEn los workflows 1 y 2: **Settings → Error workflow → 3 · Alertas de error**.', [-40, -300], 480, 220, 3),
  node('Si falla un workflow', 'n8n-nodes-base.errorTrigger', 1, [0, 0], {}),
  gmail('Avisar del error', [220, 0], EMAIL_NEGOCIO,
    '=⚠️ Error en «{{ $json.workflow.name }}»',
    '=' + caja('Algo ha fallado en una automatización', `<p>Workflow: <b>{{ $json.workflow.name }}</b></p>
<p>Paso que falló: <b>{{ $json.execution.lastNodeExecuted }}</b></p>
<p>Error: <code>{{ $json.execution.error.message }}</code></p>
<p><a href="{{ $json.execution.url }}">Ver la ejecución en n8n</a></p>`)),
], connect([['Si falla un workflow', 'Avisar del error']]));

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/1-solicitudes-y-citas.json`, JSON.stringify(w1, null, 2) + '\n');
fs.writeFileSync(`${out}/2-recordatorios-y-agenda.json`, JSON.stringify(w2, null, 2) + '\n');
fs.writeFileSync(`${out}/3-alertas-de-error.json`, JSON.stringify(w3, null, 2) + '\n');
for (const w of [w1, w2, w3]) {
  const names = new Set(w.nodes.map((n) => n.name));
  for (const [from, { main }] of Object.entries(w.connections)) {
    if (!names.has(from)) throw new Error('falta ' + from);
    main.flat().forEach((c) => { if (!names.has(c.node)) throw new Error('falta ' + c.node); });
  }
  console.log(w.name, '→', w.nodes.length, 'nodos OK');
}
