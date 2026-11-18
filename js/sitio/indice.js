/*
 * ===================================================================
 * BUSCADOR (1/3) · INDICE DE CONTENIDOS
 * ===================================================================
 * El buscador no usa una lista de paginas escrita a mano: cuando el
 * usuario va a buscar, este modulo recorre el propio sitio y crea el
 * indice a partir de los ficheros HTML publicados. Asi el buscador
 * siempre refleja el contenido real, aunque se anadan o cambien paginas.
 *
 * Funcionamiento:
 *   1. Empieza en la portada y en el mapa del sitio del idioma actual.
 *   2. Descarga cada pagina con fetch() y la analiza con DOMParser.
 *   3. Sigue los enlaces internos a otros .html (rastreo en anchura).
 *   4. Del contenido de <main> crea una entrada por pagina y otra por cada
 *      seccion, articulo o titulo con id, para poder enlazar a su ancla.
 *   5. Guarda el indice en sessionStorage para no repetir el rastreo en
 *      cada pagina; se regenera cuando cambia la fecha de actualizacion.
 *
 * Cada entrada del indice es un objeto con:
 *   u      direccion de la pagina o de la seccion (con #ancla)
 *   t      titulo de la entrada (h1 de la pagina o titulo de la seccion)
 *   p      nombre de la pagina (del <title>, antes del «|»)
 *   d      texto visible de la pagina o de la seccion
 *   padre  posicion en el indice de la entrada que la contiene (-1 si es la pagina)
 * Y, una vez preparado, las versiones normalizadas nt, np y nd.
 *
 * Exporta: Sitio.indice.cargar(), normalizar(), palabras() y BASE.
 * Lo usan busqueda.js (logica) y buscador.js (interfaz).
 */
(function (Sitio) {
  'use strict';

  var IDIOMA = Sitio.IDIOMA;
  var RAIZ = Sitio.RAIZ;

  /* Palabras vacias: articulos, preposiciones y conjunciones que aparecen en
     casi todos los textos y no ayudan a encontrar nada, por lo que se ignoran
     en las consultas («la experiencia de trabajo» busca «experiencia trabajo»). */
  var VACIAS = {
    es: ['de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'del', 'un', 'una', 'mi', 'mis', 'que', 'con', 'por', 'para', 'lo', 'al', 'se', 'su'],
    en: ['the', 'of', 'and', 'a', 'an', 'in', 'to', 'my', 'is', 'on', 'for', 'with', 'at', 'by']
  }[IDIOMA];

  /* Carpeta del idioma actual: la raiz del sitio para español y en/ para ingles.
     El rastreo no sale de ella, asi cada idioma solo encuentra sus paginas. */
  var BASE = new URL(IDIOMA === 'en' ? 'en/' : './', RAIZ);

  /* Paginas que se recorren para descubrir enlaces, pero que no se muestran
     como resultado: el propio buscador, el mapa del sitio y la pagina de error. */
  var SIN_INDEXAR = ['buscar.html', 'mapa.html', '404.html'];

  /* Limite de seguridad para que el rastreo nunca descargue demasiadas paginas. */
  var MAXIMO_PAGINAS = 60;

  /* Clave con la que se guarda el indice en sessionStorage. Incluye el idioma,
     la fecha de ultima actualizacion del pie y la version del codigo: si
     cualquiera de las tres cambia, la clave es otra y el indice se regenera. */
  var fechaPie = document.querySelector('footer time');
  var versionGuion = Sitio.version;
  var CLAVE_INDICE = 'indice-busqueda-' + IDIOMA + '-' + (fechaPie ? fechaPie.getAttribute('datetime') : '') + '-' + versionGuion;

  /**
   * Pasa un texto a minusculas y le quita las tildes, para que «Japón»,
   * «japon» y «JAPÓN» se consideren la misma palabra.
   * NFD separa cada letra de su tilde y la expresion regular borra las tildes.
   * @param {string} texto
   * @returns {string}
   */
  function normalizar(texto) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /**
   * Divide una consulta en terminos de busqueda: normaliza el texto, lo corta
   * por todo lo que no sea letra o numero (se conservan # y + para C# o C++)
   * y descarta las palabras de una letra y las palabras vacias.
   * @param {string} consulta  Texto que escribe el usuario.
   * @returns {string[]}       Terminos normalizados.
   */
  function palabras(consulta) {
    return normalizar(consulta).split(/[^a-z0-9#+]+/).filter(function (p) {
      return p.length > 1 && VACIAS.indexOf(p) === -1;
    });
  }

  /** Une los espacios, tabuladores y saltos de linea seguidos en un solo espacio. */
  function limpiarEspacios(texto) {
    return texto.replace(/\s+/g, ' ').trim();
  }

  /**
   * Texto visible de un elemento. Se trabaja sobre una copia para no tocar la
   * pagina y se quitan las partes que no son contenido: menus, formularios,
   * scripts, iconos SVG, textos de reserva de audio y video y los textos
   * ocultos para lectores de pantalla (clase oculto).
   * @param {Element} elemento
   * @returns {string}
   */
  function textoDe(elemento) {
    var copia = elemento.cloneNode(true);
    copia.querySelectorAll('script, style, noscript, svg, nav, form, audio, video, .oculto').forEach(function (n) {
      n.remove();
    });
    /* Se anade un espacio al final de cada bloque para que el texto de dos
       elementos seguidos no se junte («audio» + «Fragmento» → «audioFragmento»). */
    copia.querySelectorAll('p, li, dt, dd, td, th, summary, h1, h2, h3, h4, h5, h6, figcaption').forEach(function (n) {
      n.appendChild(document.createTextNode(' '));
    });
    return limpiarEspacios(copia.textContent);
  }

  /** Indica si un elemento es un titulo (h1 a h6). */
  function esTitulo(elemento) {
    return /^H[1-6]$/.test(elemento.tagName);
  }

  /**
   * Convierte un documento HTML descargado en entradas del indice.
   * La primera entrada es la pagina completa; despues, una por cada elemento
   * con id dentro de <main> (secciones, articulos y titulos), para que los
   * resultados puedan llevar directamente a esa parte de la pagina.
   * @param {Document} doc  Pagina analizada con DOMParser.
   * @param {string} url    Direccion de la pagina.
   * @returns {Object[]}    Entradas de esa pagina.
   */
  function extraerEntradas(doc, url) {
    var principal = doc.querySelector('main');
    if (!principal) { return []; }
    var pagina = limpiarEspacios(doc.title.split('|')[0]);
    var h1 = principal.querySelector('h1');
    var entradas = [{ u: url, t: h1 ? textoDe(h1) : pagina, p: pagina, d: textoDe(principal), padre: -1 }];

    /* Relaciona cada elemento indexado con su posicion en «entradas», para
       saber despues que seccion contiene a cual. */
    var posicion = new Map();
    posicion.set(principal, 0);

    principal.querySelectorAll('[id]').forEach(function (el) {
      /* Se ignoran los ids de formularios y menus, y los titulos que solo dan
         nombre a su seccion (ya se indexa la seccion completa). */
      if (el.closest('nav, form')) { return; }
      if (esTitulo(el) && el.closest('[aria-labelledby="' + el.id + '"]')) { return; }

      var titulo;
      var texto;
      if (esTitulo(el)) {
        /* Un titulo con id abarca los elementos que le siguen hasta el
           siguiente titulo: ese es el texto de su apartado. */
        titulo = textoDe(el);
        var partes = [titulo];
        var siguiente = el.nextElementSibling;
        while (siguiente && !esTitulo(siguiente)) {
          partes.push(textoDe(siguiente));
          siguiente = siguiente.nextElementSibling;
        }
        texto = partes.join(' ');
      } else {
        /* Seccion o articulo: su titulo es el primer encabezado que contiene. */
        var encabezado = el.querySelector('h1, h2, h3, h4');
        titulo = encabezado ? textoDe(encabezado) : pagina;
        texto = textoDe(el);
      }

      /* La entrada «padre» es la seccion con id que la contiene (o la pagina).
         buscar() la usa para no mostrar a la vez una seccion y su contenedor. */
      var ancestro = el.parentElement;
      while (ancestro && !posicion.has(ancestro)) { ancestro = ancestro.parentElement; }
      posicion.set(el, entradas.length);
      entradas.push({ u: url + '#' + el.id, t: titulo, p: pagina, d: texto, padre: ancestro ? posicion.get(ancestro) : 0 });
    });
    return entradas;
  }

  /**
   * Devuelve los enlaces de una pagina que llevan a otras paginas .html del
   * mismo sitio y del mismo idioma, sin #ancla ni parametros, para seguirlos.
   * @param {Document} doc
   * @param {string} url  Direccion de la pagina, para resolver enlaces relativos.
   * @returns {string[]}  Direcciones absolutas.
   */
  function enlacesInternos(doc, url) {
    var encontrados = [];
    doc.querySelectorAll('a[href]').forEach(function (a) {
      var destino;
      try { destino = new URL(a.getAttribute('href'), url); } catch (e) { return; }
      /* Fuera del sitio o fuera de la carpeta del idioma: no se sigue. */
      if (destino.origin !== BASE.origin || destino.pathname.indexOf(BASE.pathname) !== 0) { return; }
      /* En español se excluye la carpeta en/ (version inglesa). */
      if (IDIOMA === 'es' && destino.pathname.indexOf(BASE.pathname + 'en/') === 0) { return; }
      /* Una carpeta («/») equivale a su index.html. */
      if (/\/$/.test(destino.pathname)) { destino.pathname += 'index.html'; }
      /* Solo paginas HTML: se descartan imagenes, audios, PDF, etc. */
      if (!/\.html$/.test(destino.pathname)) { return; }
      destino.hash = '';
      destino.search = '';
      encontrados.push(destino.href);
    });
    return encontrados;
  }

  /**
   * Recorre el sitio en anchura: descarga en paralelo todas las paginas de un
   * nivel, recoge sus enlaces y pasa al siguiente nivel con las que no se han
   * visitado todavia, hasta que no quedan paginas nuevas.
   * @returns {Promise<Object[]>}  Todas las entradas del indice.
   */
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
            /* Las posiciones «padre» de una pagina son relativas a ella: se
               desplazan para que apunten a su lugar en el indice global. */
            var desplazamiento = entradas.length;
            extraerEntradas(doc, url).forEach(function (e) {
              if (e.padre >= 0) { e.padre += desplazamiento; }
              entradas.push(e);
            });
          }
          return enlacesInternos(doc, url);
        }).catch(function () { return []; }); /* una pagina que falla no detiene el rastreo */
      })).then(function (listas) {
        /* Siguiente nivel: todos los enlaces encontrados en este. */
        return visitar([].concat.apply([], listas));
      });
    }

    return visitar([new URL('index.html', BASE).href, new URL('mapa.html', BASE).href]).then(function () {
      if (!entradas.length) { throw new Error('No se ha podido leer ninguna pagina'); }
      return entradas;
    });
  }

  /**
   * Prepara el indice para buscar rapido: guarda en cada entrada su titulo,
   * pagina y texto ya normalizados, cuenta las paginas distintas y crea el
   * vocabulario (palabras de mas de tres letras) que usa la correccion de erratas.
   * @param {Object[]} entradas
   * @returns {{entradas: Object[], vocabulario: string[], paginas: number}}
   */
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

  /* Promesa del indice compartida: si varias partes piden el indice a la vez
     (sugerencias y pagina de resultados), el rastreo se hace una sola vez. */
  var promesaIndice = null;

  /**
   * Devuelve el indice listo para buscar. Lo toma de sessionStorage si ya se
   * creo en esta visita; si no, rastrea el sitio y lo guarda.
   * @returns {Promise<{entradas: Object[], vocabulario: string[], paginas: number}>}
   */
  function cargarIndice() {
    if (promesaIndice) { return promesaIndice; }
    try {
      var guardado = window.sessionStorage.getItem(CLAVE_INDICE);
      if (guardado) {
        promesaIndice = Promise.resolve(prepararIndice(JSON.parse(guardado)));
        return promesaIndice;
      }
    } catch (e) { /* sin almacenamiento (modo privado, permisos): se rastrea de nuevo */ }

    promesaIndice = rastrear().then(function (entradas) {
      try {
        /* Solo se guardan los datos originales; las versiones normalizadas
           se recalculan al cargar, para ocupar menos espacio. */
        window.sessionStorage.setItem(CLAVE_INDICE, JSON.stringify(entradas.map(function (e) {
          return { u: e.u, t: e.t, p: e.p, d: e.d, padre: e.padre };
        })));
      } catch (e) { /* sin almacenamiento o lleno: el indice sirve igual en esta pagina */ }
      return prepararIndice(entradas);
    });
    /* Si el rastreo falla (por ejemplo, sin conexion) se permite reintentarlo. */
    promesaIndice.catch(function () { promesaIndice = null; });
    return promesaIndice;
  }

  Sitio.indice = { cargar: cargarIndice, normalizar: normalizar, palabras: palabras, BASE: BASE };
}(window.Sitio = window.Sitio || {}));
