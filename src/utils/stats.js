export function computeStats(reportes) {
  const attrs = reportes.map(r => r.attributes);

  function groupBy(fn) {
    const map = {};
    attrs.forEach(a => { const k = fn(a) || "Desconocido"; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));
  }

  const imcData = (() => {
    const map = {};
    attrs.forEach(a => {
      const lastG = [...(a.sstgestions?.data || [])].reverse().find(g => g.attributes.peso_kg && g.attributes.talla_m);
      if (!lastG) return;
      const { peso_kg, talla_m } = lastG.attributes;
      const imc = peso_kg / (talla_m * talla_m);
      const category = imc < 18.5 ? "Bajo (<18.5)" : imc < 25 ? "Normal (18.5-24.9)" : imc < 30 ? "Sobrepeso (25-29.9)" : "Obeso (≥30)";
      map[category] = (map[category] || 0) + 1;
    });
    return Object.entries(map).map(([label, count]) => ({ label, count }));
  })();

  const diagnosticoData = (() => {
    const map = {};
    attrs.forEach(a => {
      (a.sstgestions?.data || []).forEach(g => {
        const k = g.attributes.categoria_cie || (g.attributes.diagnostico ? g.attributes.diagnostico.slice(0, 30) : null);
        if (k) map[k] = (map[k] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));
  })();

  const accionData = (() => {
    const map = {};
    attrs.forEach(a => {
      (a.sstgestions?.data || []).forEach(g => {
        const k = g.attributes.accion_realizada?.replace(/_/g, " ") || "Sin acción";
        map[k] = (map[k] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  })();

  const sistemaData = (() => {
    const map = {};
    attrs.forEach(a => {
      (a.sstgestions?.data || []).forEach(g => {
        const k = g.attributes.sistema_afectado;
        if (k) map[k] = (map[k] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  })();

  return {
    estadoCasos: groupBy(a => a.estado),
    entidad: groupBy(a => a.tipo_entidad),
    genero: groupBy(a => a.genero),
    categoria: groupBy(a => a.categoria?.replace(/_/g, " ")),
    imc: imcData,
    accion: accionData,
    sistema: sistemaData,
    diagnostico: diagnosticoData,
  };
}