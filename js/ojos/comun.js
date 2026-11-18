/*
 * Seguimiento de ojos: configuracion, textos, almacenamiento y utilidades comunes.
 */
(function (Ojos) {
  'use strict';

  var VERSION_LIB = '3.5.3';
  var LIB = 'https://cdn.jsdelivr.net/npm/webgazer@' + VERSION_LIB + '/dist/webgazer.js';
  var MODELO = 'https://cdn.jsdelivr.net/npm/webgazer@' + VERSION_LIB + '/dist/mediapipe/face_mesh';
  var CLAVE_ESTADO = 'ojos-estado';
  var CLAVE_DATOS = 'ojos-datos';
  var PULSACIONES = 5;
  var INTERVALO = 100; /* ms entre muestras guardadas */

  var INGLES = document.documentElement.lang === 'en';
  var T = INGLES ? {
    cargando: 'Starting the camera…',
    errorCamara: 'The camera could not be started. Allow camera access and reload the page.',
    titulo: 'Eye tracking calibration',
    instrucciones: 'Sit about an arm’s length from the screen, with your face inside the box. Look at each dot and click it ' + PULSACIONES + ' times without looking away. It turns green when done.',
    listo: 'Calibration finished. The red dot shows where the camera thinks you are looking: check that it follows your eyes.',
    empezar: 'Start the task',
    repetir: 'Calibrate again',
    punto: 'Calibration dot',
    panel: 'Gaze map of this page',
    muestras: function (n, s) { return n + ' gaze samples · ' + s + ' s on this page'; },
    vacio: 'No gaze data was recorded on this page.',
    otras: 'Other pages with data:',
    calor: 'Heat map',
    recorrido: 'Gaze path',
    descargar: 'Download data (JSON)',
    ocultar: 'Hide panel',
    mostrar: 'Gaze map',
    cerrar: 'Close',
    ancho: function (a) { return 'Recorded with a window ' + a + ' px wide; use the same width so the map matches the page.'; }
  } : {
    cargando: 'Iniciando la cámara…',
    errorCamara: 'No se ha podido iniciar la cámara. Permite el acceso a la cámara y recarga la página.',
    titulo: 'Calibración del seguimiento de ojos',
    instrucciones: 'Siéntate a un brazo de distancia de la pantalla, con la cara dentro del recuadro. Mira cada punto y púlsalo ' + PULSACIONES + ' veces sin dejar de mirarlo. Se pone verde al terminar.',
    listo: 'Calibración terminada. El punto rojo indica dónde cree la cámara que miras: comprueba que sigue a tus ojos.',
    empezar: 'Empezar la tarea',
    repetir: 'Volver a calibrar',
    punto: 'Punto de calibración',
    panel: 'Mapa de la mirada de esta página',
    muestras: function (n, s) { return n + ' muestras de mirada · ' + s + ' s en esta página'; },
    vacio: 'No se registró la mirada en esta página.',
    otras: 'Otras páginas con datos:',
    calor: 'Mapa de calor',
    recorrido: 'Recorrido',
    descargar: 'Descargar datos (JSON)',
    ocultar: 'Ocultar panel',
    mostrar: 'Mapa de la mirada',
    cerrar: 'Cerrar',
    ancho: function (a) { return 'Se registró con una ventana de ' + a + ' px de ancho; usa el mismo ancho para que el mapa coincida con la página.'; }
  };

  /* ---------- almacenamiento seguro ---------- */
  function leer(clave, porDefecto) {
    try {
      var valor = window.sessionStorage.getItem(clave);
      return valor === null ? porDefecto : JSON.parse(valor);
    } catch (e) { return porDefecto; }
  }
  function escribir(clave, valor) {
    try { window.sessionStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
  }
  function borrar(clave) {
    try { window.sessionStorage.removeItem(clave); } catch (e) { /* sin almacenamiento */ }
  }

  /* Ruta de la pagina actual: los datos de la mirada se guardan por pagina. */
  var pagina = window.location.pathname;

  /* Estilos de la herramienta: solo se anaden cuando esta activa. */
  function ponerEstilos() {
    var estilos = document.createElement('style');
    estilos.textContent = [
      '[data-ojos="capa"]{position:fixed;inset:0;width:auto;height:auto;max-width:none;max-height:none;margin:0;padding:0;border:0;z-index:2147483000;background:rgb(255 255 255 / 0.94);color:#1c2222;font:16px/1.5 system-ui,sans-serif}',
      '[data-ojos="aviso"]{position:absolute;left:50%;top:22%;transform:translateX(-50%);width:min(34rem,calc(100% - 7rem));text-align:center}',
      '[data-ojos="aviso"] h2{margin:0 0 .5rem;font-size:1.25rem}',
      '[data-ojos="aviso"] button{margin:.75rem .25rem 0;padding:.6rem 1.1rem;border:0;border-radius:.5rem;background:#1c5c4c;color:#fff;font:inherit;cursor:pointer}',
      '[data-ojos="aviso"] button+button{background:#5a6464}',
      '[data-ojos="punto"]{position:absolute;width:28px;height:28px;margin:-14px 0 0 -14px;padding:0;border:3px solid #fff;border-radius:50%;background:#c0392b;box-shadow:0 0 0 2px #c0392b;cursor:pointer}',
      '[data-ojos="punto"][disabled]{background:#2e9d6a;box-shadow:0 0 0 2px #2e9d6a;cursor:default}',
      '[data-ojos="lienzo"]{position:absolute;top:0;left:0;z-index:2147482000;pointer-events:none}',
      '[data-ojos="panel"]{position:fixed;right:1rem;bottom:1rem;z-index:2147483000;width:min(22rem,calc(100% - 2rem));max-height:70vh;overflow:auto;padding:1rem;border-radius:.75rem;background:#fff;color:#1c2222;box-shadow:0 8px 30px rgb(0 0 0 / 0.25);font:14px/1.45 system-ui,sans-serif}',
      '[data-ojos="panel"] h2{margin:0 0 .4rem;font-size:1rem}',
      '[data-ojos="panel"] p{margin:.3rem 0}',
      '[data-ojos="panel"] a{color:#1c5c4c}',
      '[data-ojos="panel"] button{margin:.5rem .4rem 0 0;padding:.4rem .7rem;border:1px solid #1c5c4c;border-radius:.4rem;background:#fff;color:#1c5c4c;font:inherit;cursor:pointer}',
      '[data-ojos="panel"] button[aria-pressed="true"]{background:#1c5c4c;color:#fff}',
      '[data-ojos="mostrar"]{position:fixed;right:1rem;bottom:1rem;z-index:2147483000;padding:.5rem .8rem;border:0;border-radius:.5rem;background:#1c5c4c;color:#fff;font:14px system-ui,sans-serif;cursor:pointer}',
      /* La camara va en el hueco entre las dos filas inferiores de puntos y el
         texto entre las dos superiores, para no tapar ningun punto. */
      '#webgazerVideoContainer{z-index:2147483001!important;top:71%!important;left:50%!important;transform:translate(-50%,-50%)}',
      '[data-ojos="aviso"]{top:29%;transform:translate(-50%,-50%)}'
    ].join('');
    document.head.appendChild(estilos);
  }

  function crear(etiqueta, atributos, texto) {
    var el = document.createElement(etiqueta);
    Object.keys(atributos || {}).forEach(function (clave) { el.setAttribute(clave, atributos[clave]); });
    if (texto) { el.textContent = texto; }
    return el;
  }

  function cuandoCargue(fn) {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn); } else { fn(); }
  }

  Ojos.config = { LIB: LIB, MODELO: MODELO, CLAVE_ESTADO: CLAVE_ESTADO, CLAVE_DATOS: CLAVE_DATOS, PULSACIONES: PULSACIONES, INTERVALO: INTERVALO };
  Ojos.T = T;
  Ojos.pagina = pagina;
  Ojos.leer = leer;
  Ojos.escribir = escribir;
  Ojos.borrar = borrar;
  Ojos.crear = crear;
  Ojos.cuandoCargue = cuandoCargue;
  Ojos.ponerEstilos = ponerEstilos;
}(window.Ojos = window.Ojos || {}));
