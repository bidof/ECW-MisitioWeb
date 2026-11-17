/*
 * Indice del buscador: rastrea los ficheros HTML del sitio y guarda su texto.
 */
(function (Sitio) {
  'use strict';

  var IDIOMA = Sitio.IDIOMA;
  var RAIZ = Sitio.RAIZ;

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
  var versionGuion = Sitio.version;
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

  /* Texto visible de un elemento, sin menus, formularios, textos de reserva multimedia
     ni los textos ocultos para lectores de pantalla (clase oculto). */
  function textoDe(elemento) {
    var copia = elemento.cloneNode(true);
    copia.querySelectorAll('script, style, noscript, svg, nav, form, audio, video, .oculto').forEach(function (n) {
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
    var entradas = [{ u: url, t: h1 ? textoDe(h1) : pagina, p: pagina, d: textoDe(principal), padre: -1 }];
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
        titulo = textoDe(el);
        var partes = [titulo];
        var siguiente = el.nextElementSibling;
        while (siguiente && !esTitulo(siguiente)) {
          partes.push(textoDe(siguiente));
          siguiente = siguiente.nextElementSibling;
        }
        texto = partes.join(' ');
      } else {
        var encabezado = el.querySelector('h1, h2, h3, h4');
        titulo = encabezado ? textoDe(encabezado) : pagina;
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

  Sitio.indice = { cargar: cargarIndice, normalizar: normalizar, palabras: palabras, BASE: BASE };
}(window.Sitio = window.Sitio || {}));
