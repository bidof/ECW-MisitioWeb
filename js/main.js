/*
 * Interactividad del sitio: buscador, menu movil, avisos,
 * boton para volver arriba, formulario de contacto y reproductor de musica.
 * Todo es mejora progresiva: sin JavaScript el sitio sigue funcionando.
 */
(function () {
  'use strict';

  var guion = document.currentScript;
  /* La carpeta js/ esta en la raiz, asi que la raiz es su carpeta padre. */
  var RAIZ = new URL('..', guion ? guion.src : window.location.href);
  var IDIOMA = document.documentElement.lang === 'en' ? 'en' : 'es';

  var TEXTOS = {
    es: {
      menu: 'Menú',
      cerrar: 'Cerrar',
      arriba: 'Volver arriba',
      verTodos: function (n) { return 'Ver todos los resultados (' + n + ')'; },
      sinResultados: function (q) { return 'No hay resultados para «' + q + '».'; },
      prueba: 'Prueba con otra palabra o consulta el mapa del sitio.',
      quizas: '¿Quizás quisiste decir',
      resultados: function (n, q) {
        return n === 1 ? '1 resultado para «' + q + '»' : n + ' resultados para «' + q + '»';
      },
      parcial: 'No hay resultados con todas las palabras; se muestran coincidencias parciales.',
      vacio: 'Escribe al menos dos letras para buscar.',
      cargando: 'Buscando en todas las páginas del sitio…',
      errorIndice: 'No se ha podido leer el contenido del sitio. Si lo has abierto como archivo local, usa un servidor web; mientras tanto puedes consultar el mapa del sitio.',
      revisadas: function (n) { return ' en ' + n + ' páginas revisadas.'; },
      copiado: 'Correo copiado al portapapeles',
      copiarError: 'No se pudo copiar. Selecciona el correo y cópialo manualmente.',
      sonando: function (t) { return 'Reproduciendo: ' + t; },
      nuevaPestana: 'Se abre en una pestaña nueva',
      errores: {
        nombre: 'Escribe tu nombre.',
        nombreCorto: 'El nombre debe tener al menos 2 caracteres.',
        correo: 'Escribe tu correo electrónico.',
        correoFormato: 'El correo no parece válido. Ejemplo: nombre@dominio.com',
        asunto: 'Elige un asunto de la lista.',
        mensaje: 'Escribe tu mensaje.',
        mensajeCorto: function (n) { return 'El mensaje debe tener al menos 20 caracteres (faltan ' + n + ').'; }
      },
      revisa: function (n) {
        return n === 1 ? 'Revisa el campo marcado en rojo.' : 'Revisa los ' + n + ' campos marcados en rojo.';
      },
      enviado: function (nombre, correo) {
        return '¡Gracias, ' + nombre + '! Se ha abierto tu programa de correo con el mensaje preparado. ' +
          'Si no se abre, escríbeme directamente a ' + correo + '.';
      },
      avisoEnviado: 'Mensaje preparado en tu programa de correo',
      asuntoCorreo: 'Mensaje desde la web',
      cuerpo: function (n, c, m) { return 'Nombre: ' + n + '\nCorreo: ' + c + '\n\n' + m; }
    },
    en: {
      menu: 'Menu',
      cerrar: 'Close',
      arriba: 'Back to top',
      verTodos: function (n) { return 'See all results (' + n + ')'; },
      sinResultados: function (q) { return 'No results for “' + q + '”.'; },
      prueba: 'Try another word or check the site map.',
      quizas: 'Did you mean',
      resultados: function (n, q) {
        return n === 1 ? '1 result for “' + q + '”' : n + ' results for “' + q + '”';
      },
      parcial: 'No results contain every word; showing partial matches.',
      vacio: 'Type at least two letters to search.',
      cargando: 'Searching every page of the site…',
      errorIndice: 'The site content could not be read. If you opened it as a local file, please use a web server; meanwhile you can check the site map.',
      revisadas: function (n) { return ' across ' + n + ' pages checked.'; },
      copiado: 'Email copied to the clipboard',
      copiarError: 'Could not copy. Please select the email and copy it manually.',
      sonando: function (t) { return 'Now playing: ' + t; },
      nuevaPestana: 'Opens in a new tab',
      errores: {
        nombre: 'Please enter your name.',
        nombreCorto: 'Your name must be at least 2 characters long.',
        correo: 'Please enter your email address.',
        correoFormato: 'That email does not look valid. Example: name@domain.com',
        asunto: 'Please choose a subject from the list.',
        mensaje: 'Please write your message.',
        mensajeCorto: function (n) { return 'Your message must be at least 20 characters long (' + n + ' to go).'; }
      },
      revisa: function (n) {
        return n === 1 ? 'Please check the field marked in red.' : 'Please check the ' + n + ' fields marked in red.';
      },
      enviado: function (nombre, correo) {
        return 'Thank you, ' + nombre + '! Your email app has opened with the message ready. ' +
          'If it did not open, write to me directly at ' + correo + '.';
      },
      avisoEnviado: 'Message ready in your email app',
      asuntoCorreo: 'Message from the website',
      cuerpo: function (n, c, m) { return 'Name: ' + n + '\nEmail: ' + c + '\n\n' + m; }
    }
  };
  var T = TEXTOS[IDIOMA];

  /* ---------------------------------------------------------------
     Utilidades
     --------------------------------------------------------------- */
  function crear(etiqueta, atributos, texto) {
    var el = document.createElement(etiqueta);
    Object.keys(atributos || {}).forEach(function (k) { el.setAttribute(k, atributos[k]); });
    if (texto) { el.textContent = texto; }
    return el;
  }

  var ICONO_ARRIBA = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 19V5M5 12l7-7 7 7"/></svg>';

  /* ---------------------------------------------------------------
     Aviso emergente (toast) con region viva para lectores de pantalla
     --------------------------------------------------------------- */
  var aviso = crear('div', { role: 'status', 'aria-live': 'polite', 'data-visible': 'false' });
  document.body.appendChild(aviso);
  var temporizadorAviso;

  function avisar(mensaje) {
    window.clearTimeout(temporizadorAviso);
    aviso.textContent = mensaje;
    aviso.setAttribute('data-visible', 'true');
    temporizadorAviso = window.setTimeout(function () {
      aviso.setAttribute('data-visible', 'false');
    }, 3500);
  }

  /* ---------------------------------------------------------------
     Menu plegable en movil
     --------------------------------------------------------------- */
  var botonMenu = document.querySelector('body > header > button[aria-controls]');

  function cerrarMenu() {
    if (botonMenu && botonMenu.getAttribute('aria-expanded') === 'true') {
      botonMenu.setAttribute('aria-expanded', 'false');
      botonMenu.lastChild.textContent = T.menu;
      return true;
    }
    return false;
  }

  if (botonMenu) {
    botonMenu.hidden = false;
    botonMenu.addEventListener('click', function () {
      var abierto = botonMenu.getAttribute('aria-expanded') === 'true';
      botonMenu.setAttribute('aria-expanded', String(!abierto));
      botonMenu.lastChild.textContent = abierto ? T.menu : T.cerrar;
    });
  }

  /* ---------------------------------------------------------------
     Boton para volver arriba
     --------------------------------------------------------------- */
  var botonArriba = crear('button', { type: 'button', 'aria-label': T.arriba, title: T.arriba });
  botonArriba.innerHTML = ICONO_ARRIBA;
  botonArriba.hidden = true;
  document.body.appendChild(botonArriba);

  botonArriba.addEventListener('click', function () {
    window.scrollTo({ top: 0 });
    var logo = document.querySelector('body > header > a');
    if (logo) { logo.focus({ preventScroll: true }); }
  });

  var pendienteScroll = false;
  window.addEventListener('scroll', function () {
    if (pendienteScroll) { return; }
    pendienteScroll = true;
    window.requestAnimationFrame(function () {
      botonArriba.hidden = window.scrollY < 600;
      pendienteScroll = false;
    });
  }, { passive: true });

  /* ---------------------------------------------------------------
     Enlaces externos: aviso de que se abren en otra pestaña
     --------------------------------------------------------------- */
  document.querySelectorAll('a[target="_blank"]').forEach(function (enlace) {
    if (!enlace.title) { enlace.title = T.nuevaPestana; }
  });

  /* ---------------------------------------------------------------
     Copiar el correo al portapapeles
     --------------------------------------------------------------- */
  document.querySelectorAll('button[data-copiar]').forEach(function (boton) {
    boton.hidden = false;
    boton.addEventListener('click', function () {
      var texto = boton.getAttribute('data-copiar');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto).then(function () {
          avisar(T.copiado);
        }, function () {
          avisar(T.copiarError);
        });
      } else {
        avisar(T.copiarError);
      }
    });
  });

  /* ---------------------------------------------------------------
     Buscador interno: rastrea los ficheros HTML del sitio
     ---------------------------------------------------------------
     1. Empieza en la portada y en el mapa del sitio del idioma actual.
     2. Descarga cada pagina con fetch() y la analiza con DOMParser.
     3. Sigue todos los enlaces internos a otros .html (rastreo en anchura).
     4. Indexa el texto de <main>: una entrada por pagina y otra por cada
        seccion, articulo o titulo con id, para poder enlazar con su ancla.
     El indice se guarda en sessionStorage y se regenera cuando cambia la
     fecha de ultima actualizacion del pie, asi siempre refleja el contenido real.
     --------------------------------------------------------------- */
  var VACIAS = {
    es: ['de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'del', 'un', 'una', 'mi', 'mis', 'que', 'con', 'por', 'para', 'lo', 'al', 'se', 'su'],
    en: ['the', 'of', 'and', 'a', 'an', 'in', 'to', 'my', 'is', 'on', 'for', 'with', 'at', 'by']
  }[IDIOMA];

  /* Carpeta del idioma actual: la raiz para español y en/ para ingles. */
  var BASE = new URL(IDIOMA === 'en' ? 'en/' : './', RAIZ);
  /* Paginas que se recorren para descubrir enlaces pero no se muestran como resultado. */
  var SIN_INDEXAR = ['buscar.html', 'mapa.html', '404.html'];
  var MAXIMO_PAGINAS = 60;
  var fechaPie = document.querySelector('footer time');
  var versionGuion = guion ? new URL(guion.src).searchParams.get('v') : '';
  var CLAVE_INDICE = 'indice-busqueda-' + IDIOMA + '-' + (fechaPie ? fechaPie.getAttribute('datetime') : '') + '-' + versionGuion;

  function normalizar(texto) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function palabras(consulta) {
    return normalizar(consulta).split(/[^a-z0-9#+]+/).filter(function (p) {
      return p.length > 1 && VACIAS.indexOf(p) === -1;
    });
  }

  function limpiarEspacios(texto) {
    return texto.replace(/\s+/g, ' ').trim();
  }

  /* Texto visible de un elemento, sin menus, formularios ni textos de reserva multimedia. */
  function textoDe(elemento) {
    var copia = elemento.cloneNode(true);
    copia.querySelectorAll('script, style, noscript, svg, nav, form, audio, video').forEach(function (n) {
      n.remove();
    });
    return limpiarEspacios(copia.textContent);
  }

  function esTitulo(elemento) {
    return /^H[1-6]$/.test(elemento.tagName);
  }

  /* Convierte un documento HTML en entradas del indice. */
  function extraerEntradas(doc, url) {
    var principal = doc.querySelector('main');
    if (!principal) { return []; }
    var pagina = limpiarEspacios(doc.title.split('|')[0]);
    var h1 = principal.querySelector('h1');
    var entradas = [{ u: url, t: h1 ? limpiarEspacios(h1.textContent) : pagina, p: pagina, d: textoDe(principal), padre: -1 }];
    var posicion = new Map();
    posicion.set(principal, 0);

    principal.querySelectorAll('[id]').forEach(function (el) {
      /* Se ignoran los ids de formularios y menus, y los titulos que solo dan nombre a su seccion. */
      if (el.closest('nav, form')) { return; }
      if (esTitulo(el) && el.closest('[aria-labelledby="' + el.id + '"]')) { return; }

      var titulo;
      var texto;
      if (esTitulo(el)) {
        /* Un titulo con id abarca los elementos que le siguen hasta el siguiente titulo. */
        titulo = limpiarEspacios(el.textContent);
        var partes = [titulo];
        var siguiente = el.nextElementSibling;
        while (siguiente && !esTitulo(siguiente)) {
          partes.push(textoDe(siguiente));
          siguiente = siguiente.nextElementSibling;
        }
        texto = partes.join(' ');
      } else {
        var encabezado = el.querySelector('h1, h2, h3, h4');
        titulo = encabezado ? limpiarEspacios(encabezado.textContent) : pagina;
        texto = textoDe(el);
      }

      /* La entrada "padre" es la seccion con id que la contiene (o la pagina). */
      var ancestro = el.parentElement;
      while (ancestro && !posicion.has(ancestro)) { ancestro = ancestro.parentElement; }
      posicion.set(el, entradas.length);
      entradas.push({ u: url + '#' + el.id, t: titulo, p: pagina, d: texto, padre: ancestro ? posicion.get(ancestro) : 0 });
    });
    return entradas;
  }

  function enlacesInternos(doc, url) {
    var encontrados = [];
    doc.querySelectorAll('a[href]').forEach(function (a) {
      var destino;
      try { destino = new URL(a.getAttribute('href'), url); } catch (e) { return; }
      if (destino.origin !== BASE.origin || destino.pathname.indexOf(BASE.pathname) !== 0) { return; }
      if (IDIOMA === 'es' && destino.pathname.indexOf(BASE.pathname + 'en/') === 0) { return; }
      if (/\/$/.test(destino.pathname)) { destino.pathname += 'index.html'; }
      if (!/\.html$/.test(destino.pathname)) { return; }
      destino.hash = '';
      destino.search = '';
      encontrados.push(destino.href);
    });
    return encontrados;
  }

  /* Rastreo en anchura: cada nivel descarga en paralelo las paginas nuevas. */
  function rastrear() {
    var visitadas = {};
    var entradas = [];
    var total = 0;

    function visitar(urls) {
      /* Cada direccion se descarga una sola vez aunque la enlacen varias paginas. */
      var nuevas = [];
      urls.forEach(function (u) {
        if (!visitadas[u] && total + nuevas.length < MAXIMO_PAGINAS) {
          visitadas[u] = true;
          nuevas.push(u);
        }
      });
      if (!nuevas.length) { return Promise.resolve(); }
      total += nuevas.length;

      return Promise.all(nuevas.map(function (url) {
        return fetch(url).then(function (respuesta) {
          return respuesta.ok ? respuesta.text() : '';
        }).then(function (html) {
          if (!html) { return []; }
          var doc = new DOMParser().parseFromString(html, 'text/html');
          if (SIN_INDEXAR.indexOf(url.split('/').pop()) === -1) {
            var desplazamiento = entradas.length;
            extraerEntradas(doc, url).forEach(function (e) {
              if (e.padre >= 0) { e.padre += desplazamiento; }
              entradas.push(e);
            });
          }
          return enlacesInternos(doc, url);
        }).catch(function () { return []; });
      })).then(function (listas) {
        return visitar([].concat.apply([], listas));
      });
    }

    return visitar([new URL('index.html', BASE).href, new URL('mapa.html', BASE).href]).then(function () {
      if (!entradas.length) { throw new Error('No se ha podido leer ninguna pagina'); }
      return entradas;
    });
  }

  function prepararIndice(entradas) {
    var conjunto = {};
    var paginas = {};
    entradas.forEach(function (e) {
      e.nt = normalizar(e.t);
      e.np = normalizar(e.p);
      e.nd = normalizar(e.d);
      paginas[e.u.split('#')[0]] = true;
      (e.nt + ' ' + e.nd).split(/[^a-z0-9#+]+/).forEach(function (p) {
        if (p.length > 3) { conjunto[p] = true; }
      });
    });
    return { entradas: entradas, vocabulario: Object.keys(conjunto), paginas: Object.keys(paginas).length };
  }

  var promesaIndice = null;
  function cargarIndice() {
    if (promesaIndice) { return promesaIndice; }
    try {
      var guardado = window.sessionStorage.getItem(CLAVE_INDICE);
      if (guardado) {
        promesaIndice = Promise.resolve(prepararIndice(JSON.parse(guardado)));
        return promesaIndice;
      }
    } catch (e) { /* sin almacenamiento: se rastrea de nuevo */ }

    promesaIndice = rastrear().then(function (entradas) {
      try {
        window.sessionStorage.setItem(CLAVE_INDICE, JSON.stringify(entradas.map(function (e) {
          return { u: e.u, t: e.t, p: e.p, d: e.d, padre: e.padre };
        })));
      } catch (e) { /* sin almacenamiento */ }
      return prepararIndice(entradas);
    });
    promesaIndice.catch(function () { promesaIndice = null; });
    return promesaIndice;
  }

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

  function buscar(indice, consulta) {
    var terminos = palabras(consulta);
    if (!terminos.length) { return { terminos: [], lista: [], parcial: false }; }

    var porPosicion = {};
    var puntuadas = [];
    indice.entradas.forEach(function (entrada, i) {
      var total = 0;
      var aciertos = 0;
      terminos.forEach(function (termino) {
        var p = puntuar(entrada, termino);
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
    var lista = (parcial ? puntuadas : completas).sort(function (a, b) {
      return b.aciertos - a.aciertos || b.total - a.total;
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

  /* --- Sugerencias mientras se escribe en la cabecera (patron combobox) --- */
  var formCabecera = document.querySelector('body > header form[role="search"]');
  var enPaginaBuscador = Boolean(document.querySelector('main form[role="search"]'));

  if (formCabecera && !enPaginaBuscador) {
    var entrada = formCabecera.querySelector('input');
    var lista = crear('ul', { id: 'sugerencias', role: 'listbox', 'aria-label': entrada.placeholder });
    lista.hidden = true;
    formCabecera.appendChild(lista);
    entrada.setAttribute('role', 'combobox');
    entrada.setAttribute('aria-autocomplete', 'list');
    entrada.setAttribute('aria-expanded', 'false');
    entrada.setAttribute('aria-controls', 'sugerencias');
    var activa = -1;

    var cerrarSugerencias = function () {
      lista.hidden = true;
      entrada.setAttribute('aria-expanded', 'false');
      entrada.removeAttribute('aria-activedescendant');
      activa = -1;
    };

    var marcarActiva = function (indice) {
      var opciones = lista.querySelectorAll('[role="option"]');
      if (!opciones.length) { return; }
      activa = (indice + opciones.length) % opciones.length;
      opciones.forEach(function (op, i) { op.setAttribute('aria-selected', String(i === activa)); });
      entrada.setAttribute('aria-activedescendant', opciones[activa].id);
      opciones[activa].scrollIntoView({ block: 'nearest' });
    };

    var mostrarAviso = function (texto) {
      lista.textContent = '';
      lista.appendChild(crear('li', { role: 'presentation' }, texto));
      lista.hidden = false;
      entrada.setAttribute('aria-expanded', 'true');
    };

    var pintarSugerencias = function () {
      var consulta = entrada.value.trim();
      activa = -1;
      entrada.removeAttribute('aria-activedescendant');
      if (consulta.length < 2) { lista.textContent = ''; cerrarSugerencias(); return; }
      if (lista.hidden || !lista.children.length) { mostrarAviso(T.cargando); }

      cargarIndice().then(function (indice) {
        if (entrada.value.trim() !== consulta) { return; }
        lista.textContent = '';
        var r = buscar(indice, consulta);
        r.lista.slice(0, 6).forEach(function (item, i) {
          var li = crear('li', { role: 'option', id: 'sugerencia-' + i, 'aria-selected': 'false' });
          var a = crear('a', { href: item.entrada.u, tabindex: '-1' });
          var titulo = crear('strong');
          resaltar(titulo, item.entrada.t, r.terminos);
          a.appendChild(titulo);
          a.appendChild(crear('span', {}, item.entrada.p));
          li.appendChild(a);
          lista.appendChild(li);
        });

        if (r.lista.length) {
          var todos = crear('li', { role: 'option', id: 'sugerencia-todos', 'aria-selected': 'false' });
          todos.appendChild(crear('a', { href: paginaBuscador(consulta), tabindex: '-1' }, T.verTodos(r.lista.length)));
          lista.appendChild(todos);
        } else {
          var correccion = sugerirCorreccion(indice, consulta);
          var vacio = crear('li', { role: 'presentation' }, T.sinResultados(consulta) + ' ');
          if (correccion) {
            vacio.appendChild(document.createTextNode(T.quizas + ' '));
            vacio.appendChild(crear('a', { href: paginaBuscador(correccion) }, correccion));
            vacio.appendChild(document.createTextNode('?'));
          } else {
            vacio.appendChild(document.createTextNode(T.prueba));
          }
          lista.appendChild(vacio);
        }
        lista.hidden = false;
        entrada.setAttribute('aria-expanded', 'true');
      }, function () {
        mostrarAviso(T.errorIndice);
      });
    };

    var temporizador;
    entrada.addEventListener('input', function () {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(pintarSugerencias, 120);
    });
    entrada.addEventListener('focus', function () {
      /* Se empieza a rastrear en cuanto el usuario va a buscar, para que este listo antes. */
      cargarIndice().catch(function () {});
      if (entrada.value.trim().length >= 2) { pintarSugerencias(); }
    });

    entrada.addEventListener('keydown', function (evento) {
      if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        if (lista.hidden) { pintarSugerencias(); }
        evento.preventDefault();
        marcarActiva(activa + (evento.key === 'ArrowDown' ? 1 : -1));
      } else if (evento.key === 'Enter' && activa >= 0) {
        evento.preventDefault();
        var opcion = lista.querySelectorAll('[role="option"]')[activa];
        var destino = opcion.querySelector('a').href;
        /* En un estudio de RealEye se conservan sus parametros al cambiar de pagina. */
        window.location.href = window.realEyeEnlace ? window.realEyeEnlace(destino) : destino;
      } else if (evento.key === 'Escape') {
        if (!lista.hidden) {
          evento.stopPropagation();
          cerrarSugerencias();
        } else {
          entrada.value = '';
        }
      }
    });

    document.addEventListener('click', function (evento) {
      if (!formCabecera.contains(evento.target)) { cerrarSugerencias(); }
    });
    formCabecera.addEventListener('focusout', function (evento) {
      if (!formCabecera.contains(evento.relatedTarget)) { cerrarSugerencias(); }
    });
  }

  /* --- Pagina de resultados (buscar.html y pagina 404) --- */
  var formPagina = document.querySelector('main form[role="search"]');
  if (formPagina) {
    var entradaPagina = formPagina.querySelector('input');
    var resumen = document.getElementById('resumen-busqueda');
    var resultados = document.getElementById('resultados');
    var consultaInicial = new URLSearchParams(window.location.search).get('q') || '';
    entradaPagina.value = consultaInicial;
    if (formCabecera) { formCabecera.querySelector('input').value = consultaInicial; }

    var pintarResultados = function () {
      var consulta = entradaPagina.value.trim();
      if (consulta.length < 2) {
        resultados.textContent = '';
        resumen.textContent = consulta.length ? T.vacio : '';
        return;
      }
      if (!resultados.children.length) { resumen.textContent = T.cargando; }

      cargarIndice().then(function (indice) {
        if (entradaPagina.value.trim() !== consulta) { return; }
        resultados.textContent = '';
        var r = buscar(indice, consulta);
        if (!r.lista.length) {
          resumen.textContent = T.sinResultados(consulta) + ' ';
          var correccion = sugerirCorreccion(indice, consulta);
          if (correccion) {
            resumen.appendChild(document.createTextNode(T.quizas + ' '));
            var enlace = crear('a', { href: paginaBuscador(correccion) }, correccion);
            enlace.addEventListener('click', function (evento) {
              evento.preventDefault();
              entradaPagina.value = correccion;
              actualizar();
            });
            resumen.appendChild(enlace);
            resumen.appendChild(document.createTextNode('?'));
          } else {
            resumen.appendChild(document.createTextNode(T.prueba));
          }
          return;
        }
        resumen.textContent = T.resultados(r.lista.length, consulta) + T.revisadas(indice.paginas) +
          (r.parcial ? ' ' + T.parcial : '');
        r.lista.forEach(function (item) {
          var li = crear('li');
          var a = crear('a', { href: item.entrada.u });
          resaltar(a, item.entrada.t, r.terminos);
          li.appendChild(a);
          li.appendChild(crear('span', {}, item.entrada.p));
          /* El texto no repite al principio el titulo que ya se muestra encima. */
          var cuerpo = item.entrada.d;
          var posTitulo = cuerpo.indexOf(item.entrada.t);
          if (posTitulo !== -1 && posTitulo < 60) { cuerpo = cuerpo.slice(posTitulo + item.entrada.t.length).trim() || cuerpo; }
          var p = crear('p');
          resaltar(p, fragmento(cuerpo, r.terminos), r.terminos);
          li.appendChild(p);
          resultados.appendChild(li);
        });
      }, function () {
        resultados.textContent = '';
        resumen.textContent = T.errorIndice;
      });
    };

    var actualizar = function () {
      pintarResultados();
      var consulta = entradaPagina.value.trim();
      if (formCabecera) { formCabecera.querySelector('input').value = consulta; }
      /* Se cambia solo el parametro q y se conservan los demas (por ejemplo, los de RealEye). */
      var parametrosUrl = new URLSearchParams(window.location.search);
      if (consulta) { parametrosUrl.set('q', consulta); } else { parametrosUrl.delete('q'); }
      var cadena = parametrosUrl.toString();
      window.history.replaceState(null, '', window.location.pathname + (cadena ? '?' + cadena : ''));
    };

    var temporizadorPagina;
    entradaPagina.addEventListener('input', function () {
      window.clearTimeout(temporizadorPagina);
      temporizadorPagina = window.setTimeout(actualizar, 150);
    });
    formPagina.addEventListener('submit', function (evento) {
      evento.preventDefault();
      actualizar();
      cargarIndice().then(function () {
        var primero = resultados.querySelector('a');
        if (primero) { primero.focus(); }
      }, function () {});
    });
    pintarResultados();
  }

  /* Atajo de teclado: «/» lleva al buscador y «Esc» cierra el menu. */
  document.addEventListener('keydown', function (evento) {
    var objetivo = evento.target;
    var escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(objetivo.tagName) || objetivo.isContentEditable;
    if (evento.key === '/' && !escribiendo && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
      var campo = document.querySelector('main form[role="search"] input') ||
        document.querySelector('body > header form[role="search"] input');
      if (campo) {
        evento.preventDefault();
        campo.focus();
        campo.select();
      }
    } else if (evento.key === 'Escape' && cerrarMenu()) {
      botonMenu.focus();
    }
  });

  /* ---------------------------------------------------------------
     Formulario de contacto con validacion en linea
     --------------------------------------------------------------- */
  var formulario = document.querySelector('main form[action^="mailto:"]');
  if (formulario) {
    formulario.noValidate = true;
    var correoDestino = formulario.getAttribute('action').replace('mailto:', '');
    var estado = formulario.querySelector('[role="status"]');
    var campos = {
      nombre: formulario.querySelector('#nombre'),
      correo: formulario.querySelector('#correo'),
      asunto: formulario.querySelector('#asunto'),
      mensaje: formulario.querySelector('#mensaje')
    };
    var contador = formulario.querySelector('#contador-mensaje');
    var MINIMO_MENSAJE = 20;

    /* El asunto se puede elegir desde la URL, por ejemplo ?asunto=referencias */
    var asuntoUrl = new URLSearchParams(window.location.search).get('asunto');
    if (asuntoUrl && campos.asunto.querySelector('option[value="' + asuntoUrl.replace(/[^a-z-]/g, '') + '"]')) {
      campos.asunto.value = asuntoUrl;
    }

    var errorDe = function (nombre) {
      var campo = campos[nombre];
      var valor = campo.value.trim();
      var E = T.errores;
      if (nombre === 'nombre') {
        if (!valor) { return E.nombre; }
        if (valor.length < 2) { return E.nombreCorto; }
      } else if (nombre === 'correo') {
        if (!valor) { return E.correo; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) { return E.correoFormato; }
      } else if (nombre === 'asunto') {
        if (!valor) { return E.asunto; }
      } else if (nombre === 'mensaje') {
        if (!valor) { return E.mensaje; }
        if (valor.length < MINIMO_MENSAJE) { return E.mensajeCorto(MINIMO_MENSAJE - valor.length); }
      }
      return '';
    };

    var comprobar = function (nombre) {
      var campo = campos[nombre];
      var error = errorDe(nombre);
      document.getElementById('error-' + nombre).textContent = error;
      campo.setAttribute('aria-invalid', String(Boolean(error)));
      return !error;
    };

    Object.keys(campos).forEach(function (nombre) {
      var campo = campos[nombre];
      campo.addEventListener('blur', function () {
        if (campo.value.trim() || campo.hasAttribute('aria-invalid')) { comprobar(nombre); }
      });
      campo.addEventListener(nombre === 'asunto' ? 'change' : 'input', function () {
        if (campo.hasAttribute('aria-invalid')) { comprobar(nombre); }
      });
    });

    var actualizarContador = function () {
      contador.textContent = String(campos.mensaje.value.length);
    };
    campos.mensaje.addEventListener('input', actualizarContador);
    actualizarContador();

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      var invalidos = Object.keys(campos).filter(function (nombre) { return !comprobar(nombre); });
      if (invalidos.length) {
        estado.setAttribute('data-tipo', 'error');
        estado.textContent = T.revisa(invalidos.length);
        campos[invalidos[0]].focus();
        return;
      }
      var nombre = campos.nombre.value.trim();
      var asuntoTexto = campos.asunto.options[campos.asunto.selectedIndex].text;
      var enlace = 'mailto:' + correoDestino +
        '?subject=' + encodeURIComponent('[' + T.asuntoCorreo + '] ' + asuntoTexto + ' · ' + nombre) +
        '&body=' + encodeURIComponent(T.cuerpo(nombre, campos.correo.value.trim(), campos.mensaje.value.trim()));
      estado.setAttribute('data-tipo', 'exito');
      estado.textContent = T.enviado(nombre, correoDestino);
      avisar(T.avisoEnviado);
      window.location.href = enlace;
    });
  }

  /* ---------------------------------------------------------------
     Musica: solo suena un fragmento a la vez y se indica cual
     --------------------------------------------------------------- */
  var audios = document.querySelectorAll('main audio');
  audios.forEach(function (audio) {
    var articulo = audio.closest('article');
    audio.addEventListener('play', function () {
      audios.forEach(function (otro) {
        if (otro !== audio) { otro.pause(); }
      });
      if (articulo) {
        articulo.setAttribute('data-sonando', 'true');
        var artista = articulo.querySelector('p');
        avisar(T.sonando((artista ? artista.textContent + ' — ' : '') + articulo.querySelector('h3').textContent));
      }
    });
    ['pause', 'ended'].forEach(function (tipo) {
      audio.addEventListener(tipo, function () {
        if (articulo) { articulo.removeAttribute('data-sonando'); }
      });
    });
  });
}());
