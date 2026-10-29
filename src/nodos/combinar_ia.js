// Une la solicitud con el análisis de la IA (si la IA falla, el flujo sigue igual)
const solicitud = $('Normalizar y calcular prioridad').item.json;
let ia = {};
try {
  ia = JSON.parse($json.choices[0].message.content);
} catch (error) {
  ia = {};
}

return {
  json: {
    ...solicitud,
    Resumen_IA: ia.resumen || 'Sin resumen (IA no disponible)',
    Categoria_IA: ia.categoria || solicitud.Servicio,
    Complejidad_IA: ia.complejidad || 'sin evaluar',
    Respuesta_IA: ia.respuesta_cliente || 'Gracias por contarnos tu proyecto. Ya lo estamos revisando.',
  },
};
