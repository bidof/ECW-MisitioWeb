/*
 * ===================================================================
 * BUSCADOR (3/3) · INTERFAZ
 * ===================================================================
 * Conecta la logica de busqueda con la pagina. Hay tres partes:
 *
 *   1. Sugerencias de la cabecera: mientras se escribe aparece una lista
 *      con los 6 mejores resultados y un enlace a «Ver todos». Sigue el
 *      patron combobox de WAI-ARIA, asi se puede usar con teclado
 *      (flechas, Intro y Esc) y con lector de pantalla.
 *   2. Pagina de resultados (buscar.html y pagina 404): lista completa con
 *      el titulo, la pagina y un fragmento con las palabras resaltadas, y
 *      propuesta de correccion si no hay resultados.
 *   3. Aviso si se pulsa Buscar sin escribir nada (mejora de la version 3).
 *
 * Sin JavaScript los formularios siguen funcionando: envian la consulta a
 * buscar.html, que muestra los enlaces a las paginas principales.
 *
 * Exporta: Sitio.buscador.iniciar(), que llama main.js.
 */
(function (Sitio) {
  'use strict';

  var T = Sitio.T;
  var crear = Sitio.crear;
  var cargarIndice = Sitio.indice.cargar;
  var buscar = Sitio.busqueda.buscar;
  var sugerirCorreccion = Sitio.busqueda.sugerirCorreccion;
  var fragmento = Sitio.busqueda.fragmento;
  var resaltar = Sitio.busqueda.resaltar;
  var paginaBuscador = Sitio.busqueda.paginaBuscador;

  /* Numero de sugerencias que se muestran bajo el buscador de la cabecera. */
  var MAXIMO_SUGERENCIAS = 6;

  /**
   * 1. Sugerencias mientras se escribe en el buscador de la cabecera.
   * En la pagina del buscador no se usan, porque los resultados ya se
   * actualizan en la propia pagina.
   * @param {HTMLFormElement} formCabecera
   */
  function iniciarSugerencias(formCabecera) {
    var entrada = formCabecera.querySelector('input');

    /* La lista solo se anade a la pagina cuando tiene contenido: asi no queda
       una lista vacia en el codigo (TAW, WCAG 1.3.1 «presencia de listas vacias»). */
    var lista = crear('ul', { id: 'sugerencias', role: 'listbox', 'aria-label': entrada.placeholder });
    lista.hidden = true;

    /* El campo se convierte en un combobox: anuncia que controla una lista
       desplegable y si esta abierta o cerrada. */
    entrada.setAttribute('role', 'combobox');
    entrada.setAttribute('aria-autocomplete', 'list');
    entrada.setAttribute('aria-expanded', 'false');

    /* Posicion de la sugerencia seleccionada con las flechas (-1: ninguna). */
    var activa = -1;

    /** Muestra la lista bajo el campo y lo indica a los lectores de pantalla. */
    function abrirLista() {
      if (!lista.isConnected) { formCabecera.appendChild(lista); }
      entrada.setAttribute('aria-controls', 'sugerencias');
      lista.hidden = false;
      entrada.setAttribute('aria-expanded', 'true');
    }

    /** Oculta y quita la lista, y deja el campo como si no se hubiera abierto. */
    function cerrarSugerencias() {
      lista.hidden = true;
      lista.remove();
      entrada.removeAttribute('aria-controls');
      entrada.setAttribute('aria-expanded', 'false');
      entrada.removeAttribute('aria-activedescendant');
      activa = -1;
    }

    /**
     * Marca como seleccionada la sugerencia de una posicion. El foco se queda
     * en el campo (para poder seguir escribiendo) y aria-activedescendant
     * indica al lector de pantalla cual es la opcion activa.
     * Al pasar del final vuelve al principio y al reves.
     */
    function marcarActiva(indice) {
      var opciones = lista.querySelectorAll('[role="option"]');
      if (!opciones.length) { return; }
      activa = (indice + opciones.length) % opciones.length;
      opciones.forEach(function (op, i) { op.setAttribute('aria-selected', String(i === activa)); });
      entrada.setAttribute('aria-activedescendant', opciones[activa].id);
      opciones[activa].scrollIntoView({ block: 'nearest' });
    }

    /** Muestra un mensaje dentro de la lista («Buscando…», error…). */
    function mostrarAviso(texto) {
      lista.textContent = '';
      lista.appendChild(crear('li', { role: 'presentation' }, texto));
      abrirLista();
    }

    /** Busca lo escrito y pinta las sugerencias (o el aviso de sin resultados). */
    function pintarSugerencias() {
      var consulta = entrada.value.trim();
      activa = -1;
      entrada.removeAttribute('aria-activedescendant');
      /* Con menos de dos letras no se busca. */
      if (consulta.length < 2) { lista.textContent = ''; cerrarSugerencias(); return; }
      /* La primera vez el indice tarda un momento en crearse: se avisa. */
      if (lista.hidden || !lista.children.length) { mostrarAviso(T.cargando); }

      cargarIndice().then(function (indice) {
        /* Si el usuario ha seguido escribiendo, esta respuesta ya no sirve. */
        if (entrada.value.trim() !== consulta) { return; }
        lista.textContent = '';
        var r = buscar(indice, consulta);

        /* Cada sugerencia: titulo con las palabras resaltadas y nombre de la pagina. */
        r.lista.slice(0, MAXIMO_SUGERENCIAS).forEach(function (item, i) {
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
          /* Ultima opcion: ir a la pagina con todos los resultados. */
          var todos = crear('li', { role: 'option', id: 'sugerencia-todos', 'aria-selected': 'false' });
          todos.appendChild(crear('a', { href: paginaBuscador(consulta), tabindex: '-1' }, T.verTodos(r.lista.length)));
          lista.appendChild(todos);
        } else {
          /* Sin resultados: se propone una correccion si parece una errata. */
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
        abrirLista();
      }, function () {
        mostrarAviso(T.errorIndice);
      });
    }

    /* Se busca 120 ms despues de la ultima tecla, no en cada pulsacion. */
    var temporizador;
    entrada.addEventListener('input', function () {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(pintarSugerencias, 120);
    });

    entrada.addEventListener('focus', function () {
      /* Se empieza a rastrear el sitio en cuanto el usuario entra en el
         buscador, para que el indice este listo cuando termine de escribir. */
      cargarIndice().catch(function () {});
      if (entrada.value.trim().length >= 2) { pintarSugerencias(); }
    });

    /* Teclado: flechas para moverse por las sugerencias, Intro para abrir la
       seleccionada y Esc para cerrar la lista (o borrar el campo si ya esta cerrada). */
    entrada.addEventListener('keydown', function (evento) {
      if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        if (lista.hidden) { pintarSugerencias(); }
        evento.preventDefault();
        marcarActiva(activa + (evento.key === 'ArrowDown' ? 1 : -1));
      } else if (evento.key === 'Enter' && activa >= 0) {
        evento.preventDefault();
        var opcion = lista.querySelectorAll('[role="option"]')[activa];
        window.location.href = opcion.querySelector('a').href;
      } else if (evento.key === 'Escape') {
        if (!lista.hidden) {
          evento.stopPropagation();
          cerrarSugerencias();
        } else {
          entrada.value = '';
        }
      }
    });

    /* La lista se cierra al pulsar fuera del buscador o al salir de el con el tabulador. */
    document.addEventListener('click', function (evento) {
      if (!formCabecera.contains(evento.target)) { cerrarSugerencias(); }
    });
    formCabecera.addEventListener('focusout', function (evento) {
      if (!formCabecera.contains(evento.relatedTarget)) { cerrarSugerencias(); }
    });
  }

  /**
   * 2. Pagina de resultados: lee la consulta de la direccion (?q=), muestra
   * todos los resultados y los actualiza mientras se escribe.
   * @param {HTMLFormElement} formPagina    Formulario de la propia pagina.
   * @param {?HTMLFormElement} formCabecera Buscador de la cabecera, que se
   *                                        mantiene con el mismo texto.
   */
  function iniciarPaginaResultados(formPagina, formCabecera) {
    var entradaPagina = formPagina.querySelector('input');
    var resumen = document.getElementById('resumen-busqueda');
    var resultados = document.getElementById('resultados');
    var consultaInicial = new URLSearchParams(window.location.search).get('q') || '';
    entradaPagina.value = consultaInicial;
    if (formCabecera) { formCabecera.querySelector('input').value = consultaInicial; }

    /** Busca lo escrito y pinta la lista completa de resultados. */
    function pintarResultados() {
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
          /* Sin resultados: mensaje y, si parece una errata, enlace a la
             consulta corregida que busca sin recargar la pagina. */
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

        /* Resumen: cuantos resultados, en cuantas paginas y si son parciales. */
        resumen.textContent = T.resultados(r.lista.length, consulta) + T.revisadas(indice.paginas) +
          (r.parcial ? ' ' + T.parcial : '');

        /* Cada resultado: titulo enlazado, nombre de la pagina y fragmento del texto. */
        r.lista.forEach(function (item) {
          var li = crear('li');
          var a = crear('a', { href: item.entrada.u });
          resaltar(a, item.entrada.t, r.terminos);
          li.appendChild(a);
          li.appendChild(crear('span', {}, item.entrada.p));
          /* El fragmento no repite al principio el titulo que ya se muestra encima. */
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
    }

    /**
     * Repite la busqueda y actualiza la direccion (?q=) sin recargar, para
     * que se pueda compartir o recargar la pagina con la misma busqueda.
     */
    function actualizar() {
      pintarResultados();
      var consulta = entradaPagina.value.trim();
      if (formCabecera) { formCabecera.querySelector('input').value = consulta; }
      /* Se cambia solo el parametro q y se conservan los demas. */
      var parametrosUrl = new URLSearchParams(window.location.search);
      if (consulta) { parametrosUrl.set('q', consulta); } else { parametrosUrl.delete('q'); }
      var cadena = parametrosUrl.toString();
      window.history.replaceState(null, '', window.location.pathname + (cadena ? '?' + cadena : ''));
    }

    /* Los resultados se actualizan mientras se escribe (150 ms tras la ultima tecla). */
    var temporizadorPagina;
    entradaPagina.addEventListener('input', function () {
      window.clearTimeout(temporizadorPagina);
      temporizadorPagina = window.setTimeout(actualizar, 150);
    });

    /* Al pulsar Buscar, el foco pasa al primer resultado (util con teclado). */
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

  /**
   * 3. Buscar sin escribir nada no hace nada: en su lugar se muestra un aviso
   * y se marca el campo (data-vacio) para que se vea que falta texto.
   */
  function iniciarAvisoVacio() {
    document.querySelectorAll('form[action$="buscar.html"]').forEach(function (form) {
      var campo = form.querySelector('input[type="search"]');
      if (!campo) { return; }
      form.addEventListener('submit', function (evento) {
        if (campo.value.trim()) { return; }
        evento.preventDefault();
        form.setAttribute('data-vacio', '');
        Sitio.avisos.avisar(T.escribe);
        campo.focus();
      });
      campo.addEventListener('input', function () { form.removeAttribute('data-vacio'); });
    });
  }

  /** Arranca las tres partes del buscador segun lo que haya en la pagina. */
  function iniciar() {
    var formCabecera = document.querySelector('body > header form[role="search"]');
    var formPagina = document.querySelector('main form[role="search"]');

    if (formCabecera && !formPagina) { iniciarSugerencias(formCabecera); }
    if (formPagina) { iniciarPaginaResultados(formPagina, formCabecera); }
    iniciarAvisoVacio();
  }

  Sitio.buscador = { iniciar: iniciar };
}(window.Sitio = window.Sitio || {}));
