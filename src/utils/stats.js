import { calcAge, calcYears } from "./helpers";

function getAgeRange(age) {
  if (age === null || age === undefined || Number.isNaN(age)) return "Sin dato";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  return "55+";
}

function getAntiguedadRange(years) {
  if (years === null || years === undefined || Number.isNaN(years)) return "Sin dato";
  if (years < 1) return "<1 año";
  if (years < 3) return "1-2 años";
  if (years < 5) return "3-4 años";
  if (years < 8) return "5-7 años";
  if (years < 12) return "8-11 años";
  return "12+ años";
}

export function computeStats(reportes, empleadosByDoc = {}) {
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

  const cargoData = (() => {
    const map = {};
    attrs.forEach(a => {
      const emp = empleadosByDoc[a.colaborador_documento];
      const k = emp?.cargo?.trim() || "Sin cargo";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));
  })();

  const edadData = (() => {
    const map = {};
    attrs.forEach(a => {
      const emp = empleadosByDoc[a.colaborador_documento];
      const age = emp?.birthday ? calcAge(emp.birthday) : null;
      const k = getAgeRange(age);
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  })();

  const antiguedadData = (() => {
    const map = {};
    attrs.forEach(a => {
      const emp = empleadosByDoc[a.colaborador_documento];
      const years = emp?.ingreso ? calcYears(emp.ingreso) : null;
      const k = getAntiguedadRange(years);
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  })();

  const areaData = (() => {
    const map = {};
    attrs.forEach(a => {
      const emp = empleadosByDoc[a.colaborador_documento];
      const k = emp?.area_nombre || emp?.departamento || emp?.area || "Sin área";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));
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
    cargo: cargoData,
    edadRango: edadData,
    antiguedadRango: antiguedadData,
    area: areaData,
  };
}