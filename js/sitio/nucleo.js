/*
 * Nucleo comun: idioma de la pagina, textos de la interfaz y utilidades.
 * Se carga el primero; el resto de modulos usan lo que deja en window.Sitio.
 */
(function (Sitio) {
  'use strict';

  var guion = document.currentScript;
  /* Este fichero esta en js/sitio/, asi que la raiz del sitio esta dos carpetas mas arriba. */
  var RAIZ = new URL('../../', guion ? guion.src : window.location.href);

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
      escribe: 'Escribe qué quieres buscar, por ejemplo «experiencia».',
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
      escribe: 'Type what you are looking for, for example “experience”.',
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

  Sitio.RAIZ = RAIZ;
  Sitio.IDIOMA = IDIOMA;
  Sitio.T = T;
  Sitio.crear = crear;
  Sitio.ICONO_ARRIBA = ICONO_ARRIBA;
  Sitio.version = guion ? new URL(guion.src).searchParams.get('v') : '';
}(window.Sitio = window.Sitio || {}));
