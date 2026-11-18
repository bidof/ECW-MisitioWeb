/*
 * Punto de entrada de la interactividad del sitio.
 * Cada funcionalidad esta en su propio fichero de js/sitio/ y se carga antes que este:
 *   nucleo.js      idioma, textos de la interfaz y utilidades
 *   avisos.js      aviso emergente accesible
 *   menu.js        menu plegable en movil
 *   navegacion.js  volver arriba, enlaces externos, barra de carga y atajos de teclado
 *   indice.js      rastreo de las paginas para el buscador
 *   busqueda.js    logica de busqueda (puntuacion, sinonimos, erratas)
 *   buscador.js    interfaz del buscador (sugerencias y pagina de resultados)
 *   contacto.js    copiar el correo y formulario de contacto
 *   musica.js      reproductor de la pagina de musica
 * Todo es mejora progresiva: sin JavaScript el sitio sigue funcionando.
 */
(function (Sitio) {
  'use strict';

  Sitio.avisos.iniciar();
  Sitio.menu.iniciar();
  Sitio.navegacion.iniciar();
  Sitio.buscador.iniciar();
  Sitio.contacto.iniciar();
  Sitio.musica.iniciar();
}(window.Sitio));
