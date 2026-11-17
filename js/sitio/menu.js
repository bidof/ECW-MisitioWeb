/*
 * Menu plegable en pantallas pequenas.
 */
(function (Sitio) {
  'use strict';

  var T = Sitio.T;

  var botonMenu = document.querySelector('body > header > button[aria-controls]');

  function cerrarMenu() {
    if (botonMenu && botonMenu.getAttribute('aria-expanded') === 'true') {
      botonMenu.setAttribute('aria-expanded', 'false');
      botonMenu.lastChild.textContent = T.menu;
      return true;
    }
    return false;
  }

  function iniciar() {
    if (botonMenu) {
      botonMenu.hidden = false;
      botonMenu.addEventListener('click', function () {
        var abierto = botonMenu.getAttribute('aria-expanded') === 'true';
        botonMenu.setAttribute('aria-expanded', String(!abierto));
        botonMenu.lastChild.textContent = abierto ? T.menu : T.cerrar;
      });
    }
  }

  Sitio.menu = { iniciar: iniciar, cerrar: cerrarMenu, boton: function () { return botonMenu; } };
}(window.Sitio = window.Sitio || {}));
