// Marca en la hoja que este correo ya se envió, para no repetirlo en la siguiente ejecución
const envio = $('Detectar avisos pendientes').item.json;
return { json: { ID_cita: envio.ID_cita, [envio.Campo]: 'Sí' } };
