/*
 * Logica de busqueda: puntuacion, sinonimos, correccion de erratas,
 * fragmentos de texto y resaltado de las palabras buscadas.
 */
(function (Sitio) {
  'use strict';

  var crear = Sitio.crear;
  var normalizar = Sitio.indice.normalizar;
  var palabras = Sitio.indice.palabras;
  var BASE = Sitio.indice.BASE;

  function escaparRegExp(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function puntuar(entrada, termino) {
    var inicioPalabra = new RegExp('(^|[^a-z0-9])' + escaparRegExp(termino));
    var puntos = 0;
    if (entrada.nt.indexOf(termino) !== -1) { puntos += inicioPalabra.test(entrada.nt) ? 12 : 6; }
    if (entrada.np.indexOf(termino) !== -1) { puntos += 2; }
    var apariciones = entrada.nd.split(termino).length - 1;
    if (apariciones) {
      puntos += Math.min(apariciones, 5) + (inicioPalabra.test(entrada.nd) ? 3 : 0);
    }
    return puntos;
  }

  /* Sinonimos: palabras que usa la gente y que no aparecen tal cual en el sitio.
     Mejora de la tanda 2: los usuarios buscaban la experiencia laboral sin
     saber que estaba en Formacion. */
  var SINONIMOS = {
    trabajo: ['experiencia', 'ntt'], trabaje: ['experiencia', 'ntt'], trabajado: ['experiencia', 'ntt'],
    empresa: ['experiencia', 'ntt'], empleo: ['experiencia', 'ntt'], laboral: ['experiencia'],
    practicas: ['experiencia'], curriculum: ['experiencia', 'formacion'], cv: ['experiencia', 'formacion'],
    estudios: ['formacion', 'grado', 'master'], carrera: ['formacion', 'grado'], universidad: ['formacion'],
    work: ['experience', 'ntt'], job: ['experience', 'ntt'], company: ['experience', 'ntt'],
    employer: ['experience', 'ntt'], internship: ['experience'], studies: ['education', 'degree', 'master'],
    resume: ['experience', 'education']
  };

  function puntuarConSinonimos(entrada, termino) {
    var mejor = puntuar(entrada, termino);
    (SINONIMOS[termino] || []).forEach(function (sinonimo) {
      mejor = Math.max(mejor, puntuar(entrada, sinonimo) * 0.9);
    });
    return mejor;
  }

  function buscar(indice, consulta) {
    var terminos = palabras(consulta);
    if (!terminos.length) { return { terminos: [], lista: [], parcial: false }; }

    var porPosicion = {};
    var puntuadas = [];
    indice.entradas.forEach(function (entrada, i) {
      var total = 0;
      var aciertos = 0;
      terminos.forEach(function (termino) {
        var p = puntuarConSinonimos(entrada, termino);
        if (p) { aciertos += 1; total += p; }
      });
      if (total) {
        var r = { entrada: entrada, posicion: i, total: total, aciertos: aciertos };
        porPosicion[i] = r;
        puntuadas.push(r);
      }
    });

    /* Si una seccion coincide igual de bien que la pagina o seccion que la contiene,
       se muestra solo la mas concreta para no repetir resultados. */
    puntuadas.forEach(function (r) {
      var padre = r.entrada.padre;
      while (padre >= 0) {
        var superior = porPosicion[padre];
        if (superior && superior.aciertos <= r.aciertos) { superior.oculta = true; }
        padre = indice.entradas[padre].padre;
      }
    });
    puntuadas = puntuadas.filter(function (r) { return !r.oculta; });

    var completas = puntuadas.filter(function (r) { return r.aciertos === terminos.length; });
    var parcial = completas.length === 0 && puntuadas.length > 0;
    /* La portada resume todo el sitio y coincide con casi cualquier busqueda:
       se muestra siempre al final para dar prioridad a las paginas concretas. */
    function esPortada(r) { return /\/index\.html(#|$)/.test(r.entrada.u) ? 1 : 0; }
    var lista = (parcial ? puntuadas : completas).sort(function (a, b) {
      return esPortada(a) - esPortada(b) || b.aciertos - a.aciertos || b.total - a.total;
    });
    return { terminos: terminos, lista: lista, parcial: parcial };
  }

  /* Distancia de Levenshtein para sugerir correcciones de escritura. */
  function distancia(a, b) {
    var fila = [];
    var i;
    var j;
    for (j = 0; j <= b.length; j += 1) { fila[j] = j; }
    for (i = 1; i <= a.length; i += 1) {
      var anterior = fila[0];
      fila[0] = i;
      for (j = 1; j <= b.length; j += 1) {
        var temporal = fila[j];
        fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
        anterior = temporal;
      }
    }
    return fila[b.length];
  }

  function sugerirCorreccion(indice, consulta) {
    var cambiado = false;
    var corregida = palabras(consulta).map(function (termino) {
      if (termino.length < 4 || buscar(indice, termino).lista.length) { return termino; }
      var mejor = null;
      var mejorDistancia = termino.length > 6 ? 3 : 2;
      indice.vocabulario.forEach(function (p) {
        var d = distancia(termino, p);
        if (d < mejorDistancia) { mejor = p; mejorDistancia = d; }
      });
      if (mejor) { cambiado = true; return mejor; }
      return termino;
    });
    return cambiado ? corregida.join(' ') : null;
  }

  /* Fragmento de unos 200 caracteres alrededor de la primera coincidencia. */
  function fragmento(texto, terminos) {
    var normal = normalizar(texto);
    var primera = -1;
    terminos.forEach(function (t) {
      var pos = normal.indexOf(t);
      if (pos !== -1 && (primera === -1 || pos < primera)) { primera = pos; }
    });
    if (texto.length <= 200) { return texto; }
    var inicio = Math.max(0, primera - 60);
    if (inicio > 0) {
      var espacio = texto.indexOf(' ', inicio);
      inicio = espacio !== -1 && espacio < primera ? espacio + 1 : inicio;
    }
    var fin = Math.min(texto.length, inicio + 200);
    var corte = texto.lastIndexOf(' ', fin);
    if (fin < texto.length && corte > inicio + 120) { fin = corte; }
    return (inicio > 0 ? '… ' : '') + texto.slice(inicio, fin) + (fin < texto.length ? ' …' : '');
  }

  /* Escribe un texto marcando con <mark> las palabras buscadas. */
  function resaltar(destino, texto, terminos) {
    var normal = '';
    var mapa = [];
    var i;
    for (i = 0; i < texto.length; i += 1) {
      var n = normalizar(texto[i]);
      for (var j = 0; j < n.length; j += 1) { normal += n[j]; mapa.push(i); }
    }
    var marcas = [];
    terminos.forEach(function (termino) {
      var desde = 0;
      var pos = normal.indexOf(termino, desde);
      while (pos !== -1) {
        marcas.push([mapa[pos], mapa[pos + termino.length - 1] + 1]);
        desde = pos + termino.length;
        pos = normal.indexOf(termino, desde);
      }
    });
    marcas.sort(function (a, b) { return a[0] - b[0]; });
    var cursor = 0;
    marcas.forEach(function (m) {
      if (m[0] < cursor) { return; }
      destino.appendChild(document.createTextNode(texto.slice(cursor, m[0])));
      destino.appendChild(crear('mark', {}, texto.slice(m[0], m[1])));
      cursor = m[1];
    });
    destino.appendChild(document.createTextNode(texto.slice(cursor)));
  }

  function paginaBuscador(consulta) {
    return new URL('buscar.html', BASE).href + (consulta ? '?q=' + encodeURIComponent(consulta) : '');
  }

  Sitio.busqueda = { buscar: buscar, sugerirCorreccion: sugerirCorreccion, fragmento: fragmento, resaltar: resaltar, paginaBuscador: paginaBuscador };
}(window.Sitio = window.Sitio || {}));
