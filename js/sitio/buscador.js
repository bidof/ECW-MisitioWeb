/*
 * Interfaz del buscador: sugerencias mientras se escribe en la cabecera,
 * pagina de resultados y aviso si se busca sin escribir nada.
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

  function iniciar() {
    /* --- Sugerencias mientras se escribe en la cabecera (patron combobox) --- */
    var formCabecera = document.querySelector('body > header form[role="search"]');
    var enPaginaBuscador = Boolean(document.querySelector('main form[role="search"]'));

    if (formCabecera && !enPaginaBuscador) {
      var entrada = formCabecera.querySelector('input');
      /* La lista solo se anade a la pagina cuando tiene contenido: asi no queda una lista
         vacia en el codigo (TAW, WCAG 1.3.1 «presencia de listas vacias»). */
      var lista = crear('ul', { id: 'sugerencias', role: 'listbox', 'aria-label': entrada.placeholder });
      lista.hidden = true;
      entrada.setAttribute('role', 'combobox');
      entrada.setAttribute('aria-autocomplete', 'list');
      entrada.setAttribute('aria-expanded', 'false');
      var activa = -1;

      var abrirLista = function () {
        if (!lista.isConnected) { formCabecera.appendChild(lista); }
        entrada.setAttribute('aria-controls', 'sugerencias');
        lista.hidden = false;
        entrada.setAttribute('aria-expanded', 'true');
      };

      var cerrarSugerencias = function () {
        lista.hidden = true;
        lista.remove();
        entrada.removeAttribute('aria-controls');
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
        abrirLista();
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
          abrirLista();
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
          window.location.href = destino;
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

    /* Buscar sin escribir nada no hace nada: en su lugar se avisa y se marca el campo. */
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

  Sitio.buscador = { iniciar: iniciar };
}(window.Sitio = window.Sitio || {}));
