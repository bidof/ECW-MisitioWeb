/*
 * Seguimiento de ojos para las pruebas de usabilidad (WebGazer.js).
 *
 * Solo se activa a peticion del evaluador; el resto de visitantes no
 * descarga la libreria ni ve ningun cambio.
 *
 *   ?ojos=1    calibra la camara y empieza a registrar la mirada.
 *              El registro sigue activo al cambiar de pagina (misma pestaña).
 *   ?ojos=ver  termina el registro y muestra sobre la pagina el mapa de
 *              calor y el recorrido de la mirada que se registro en ella.
 *   ?ojos=0    termina el registro sin mostrar nada.
 *
 * Los puntos de mirada se guardan en sessionStorage (solo en ese navegador),
 * en coordenadas de la pagina, y se pueden descargar en JSON.
 * Libreria: https://webgazer.cs.brown.edu (Universidad de Brown, licencia GPLv3).
 *
 * Codigo propio que usa la libreria WebGazer.js; esta dividido en js/ojos/:
 *   comun.js        configuracion, textos, almacenamiento y estilos
 *   registro.js     registro de la mirada, carga de WebGazer y camara
 *   calibracion.js  calibracion con nueve puntos
 *   mapa.js         visor del mapa de calor y del recorrido
 * Este fichero solo decide que hacer segun el parametro ?ojos.
 */
(function (Ojos) {
  'use strict';

  var CLAVE_ESTADO = Ojos.config.CLAVE_ESTADO;
  var CLAVE_DATOS = Ojos.config.CLAVE_DATOS;
  var leer = Ojos.leer;
  var escribir = Ojos.escribir;
  var borrar = Ojos.borrar;
  var pagina = Ojos.pagina;

  var parametros = new URLSearchParams(window.location.search);
  var modo = parametros.get('ojos');
  var estado = leer(CLAVE_ESTADO, null);

  /* Se quita ?ojos de la direccion para que recargar no repita la accion. */
  if (modo !== null) {
    parametros.delete('ojos');
    var resto = parametros.toString();
    window.history.replaceState(null, '', pagina + (resto ? '?' + resto : '') + window.location.hash);
  }

  if (modo === '1') {
    borrar(CLAVE_DATOS);
    estado = 'calibrando';
    escribir(CLAVE_ESTADO, estado);
  } else if (modo === '0' || modo === 'ver') {
    estado = null;
    borrar(CLAVE_ESTADO);
  }

  if (!estado && modo !== 'ver') { return; }

  Ojos.ponerEstilos();

  if (modo === 'ver') {
    Ojos.cuandoCargue(function () { window.addEventListener('load', Ojos.mapa.mostrar); if (document.readyState === 'complete') { Ojos.mapa.mostrar(); } });
    return;
  }

  Ojos.registro.preparar();

  Ojos.cuandoCargue(function () {
    if (estado === 'grabando') {
      /* La camara y el modelo facial son pesados: se arrancan cuando la
         pagina ya se ha cargado y pintado, para que el usuario no la vea
         bloqueada al cambiar de pagina. */
      var arrancar = function () {
        window.setTimeout(function () {
          Ojos.registro.cargarLibreria()
            .then(function (webgazer) { return Ojos.registro.arrancar(webgazer, false); })
            .then(Ojos.registro.empezar)
            .catch(function (error) { console.warn('Seguimiento de ojos no disponible', error); });
        }, 300);
      };
      if (document.readyState === 'complete') { arrancar(); } else { window.addEventListener('load', arrancar); }
      return;
    }
    Ojos.calibracion.iniciar();
  });
}(window.Ojos));
