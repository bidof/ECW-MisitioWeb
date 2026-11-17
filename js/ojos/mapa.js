/*
 * Seguimiento de ojos: visor del mapa de calor y del recorrido de la mirada (?ojos=ver).
 */
(function (Ojos) {
  'use strict';

  var T = Ojos.T;
  var crear = Ojos.crear;
  var leer = Ojos.leer;
  var CLAVE_DATOS = Ojos.config.CLAVE_DATOS;
  var pagina = Ojos.pagina;

  /* ================== VISOR DEL MAPA ================== */
  function mostrarMapa() {
    if (document.querySelector('[data-ojos="panel"]')) { return; }
    var todos = leer(CLAVE_DATOS, {});
    var actual = todos[pagina];
    var puntos = actual ? actual.puntos : [];

    var alto = Math.min(document.documentElement.scrollHeight, 16000);
    var ancho = document.documentElement.scrollWidth;
    var lienzo = crear('canvas', { 'data-ojos': 'lienzo', width: String(ancho), height: String(alto), 'aria-hidden': 'true' });
    document.body.appendChild(lienzo);

    var panel = crear('section', { 'data-ojos': 'panel', 'aria-labelledby': 'ojos-panel' });
    panel.appendChild(crear('h2', { id: 'ojos-panel' }, T.panel));

    var botonCalor = crear('button', { type: 'button', 'aria-pressed': 'true' }, T.calor);
    var botonRecorrido = crear('button', { type: 'button', 'aria-pressed': 'false' }, T.recorrido);

    if (puntos.length) {
      panel.appendChild(crear('p', {}, T.muestras(puntos.length, actual.tiempo || 0)));
      if (Math.abs(actual.ancho - window.innerWidth) > 20) { panel.appendChild(crear('p', {}, T.ancho(actual.ancho))); }
      panel.append(botonCalor, botonRecorrido);
    } else {
      panel.appendChild(crear('p', {}, T.vacio));
    }

    var otras = Object.keys(todos).filter(function (p) { return p !== pagina && todos[p].puntos.length; });
    if (otras.length) {
      panel.appendChild(crear('p', {}, T.otras));
      var lista = crear('ul');
      otras.forEach(function (p) {
        var li = crear('li');
        li.appendChild(crear('a', { href: p + '?ojos=ver' }, p.split('/').slice(-2).join('/') + ' (' + todos[p].puntos.length + ')'));
        lista.appendChild(li);
      });
      panel.appendChild(lista);
    }

    var descargar = crear('button', { type: 'button' }, T.descargar);
    var ocultar = crear('button', { type: 'button' }, T.ocultar);
    var cerrar = crear('button', { type: 'button' }, T.cerrar);
    panel.append(descargar, ocultar, cerrar);
    document.body.appendChild(panel);

    var mostrar = crear('button', { type: 'button', 'data-ojos': 'mostrar', hidden: '' }, T.mostrar);
    document.body.appendChild(mostrar);

    function pintar(tipo) {
      botonCalor.setAttribute('aria-pressed', String(tipo === 'calor'));
      botonRecorrido.setAttribute('aria-pressed', String(tipo === 'recorrido'));
      var ctx = lienzo.getContext('2d');
      ctx.clearRect(0, 0, ancho, alto);
      if (tipo === 'calor') { pintarCalor(ctx, puntos, ancho, alto); } else { pintarRecorrido(ctx, puntos); }
    }

    botonCalor.addEventListener('click', function () { pintar('calor'); });
    botonRecorrido.addEventListener('click', function () { pintar('recorrido'); });
    descargar.addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
      var enlace = crear('a', { href: URL.createObjectURL(blob), download: 'mirada-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json' });
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    });
    ocultar.addEventListener('click', function () { panel.hidden = true; mostrar.hidden = false; });
    mostrar.addEventListener('click', function () { panel.hidden = false; mostrar.hidden = true; });
    cerrar.addEventListener('click', function () { panel.remove(); mostrar.remove(); lienzo.remove(); });

    if (puntos.length) { pintar('calor'); }
  }

  /* Mapa de calor: se acumula la densidad de miradas y se colorea de azul (poca) a rojo (mucha). */
  function pintarCalor(ctx, puntos, ancho, alto) {
    var radio = Math.max(30, Math.round(Math.min(window.innerWidth, 1400) / 30));
    var capa = document.createElement('canvas');
    capa.width = ancho;
    capa.height = alto;
    var c = capa.getContext('2d');
    puntos.forEach(function (p) {
      var g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], radio);
      g.addColorStop(0, 'rgba(0,0,0,0.1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(p[0] - radio, p[1] - radio, radio * 2, radio * 2);
    });
    var imagen = c.getImageData(0, 0, ancho, alto);
    var d = imagen.data;
    var maximo = 0;
    for (var i = 3; i < d.length; i += 4) { if (d[i] > maximo) { maximo = d[i]; } }
    if (!maximo) { return; }
    for (var j = 0; j < d.length; j += 4) {
      var a = d[j + 3];
      if (!a) { continue; }
      var v = a / maximo;
      var color = paleta(v);
      d[j] = color[0];
      d[j + 1] = color[1];
      d[j + 2] = color[2];
      d[j + 3] = Math.round(70 + v * 150);
    }
    ctx.putImageData(imagen, 0, 0);
  }

  function paleta(v) {
    var paradas = [[0, [40, 80, 255]], [0.35, [0, 200, 220]], [0.55, [40, 200, 60]], [0.75, [255, 220, 0]], [1, [230, 30, 30]]];
    for (var i = 1; i < paradas.length; i += 1) {
      if (v <= paradas[i][0]) {
        var a = paradas[i - 1];
        var b = paradas[i];
        var f = (v - a[0]) / (b[0] - a[0]);
        return [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * f); });
      }
    }
    return paradas[paradas.length - 1][1];
  }

  /* Recorrido: las muestras seguidas y cercanas se agrupan en fijaciones
     (circulos numerados, mas grandes cuanto mas tiempo) unidas en orden. */
  function fijaciones(puntos) {
    var lista = [];
    var grupo = [];
    function cerrarGrupo() {
      if (grupo.length >= 2) {
        var x = 0;
        var y = 0;
        grupo.forEach(function (p) { x += p[0]; y += p[1]; });
        lista.push({ x: x / grupo.length, y: y / grupo.length, duracion: grupo[grupo.length - 1][2] - grupo[0][2] });
      }
      grupo = [];
    }
    puntos.forEach(function (p) {
      if (grupo.length) {
        var cx = 0;
        var cy = 0;
        grupo.forEach(function (q) { cx += q[0]; cy += q[1]; });
        cx /= grupo.length;
        cy /= grupo.length;
        var salto = p[2] - grupo[grupo.length - 1][2] > 1000;
        if (salto || Math.hypot(p[0] - cx, p[1] - cy) > 70) { cerrarGrupo(); }
      }
      grupo.push(p);
    });
    cerrarGrupo();
    return lista;
  }

  function pintarRecorrido(ctx, puntos) {
    var lista = fijaciones(puntos);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(28,92,76,0.8)';
    ctx.beginPath();
    lista.forEach(function (f, i) { if (i) { ctx.lineTo(f.x, f.y); } else { ctx.moveTo(f.x, f.y); } });
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px system-ui, sans-serif';
    lista.forEach(function (f, i) {
      var r = Math.min(40, 10 + f.duracion / 60);
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? 'rgba(46,157,106,0.75)' : 'rgba(230,80,30,0.6)';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(String(i + 1), f.x, f.y);
    });
  }

  Ojos.mapa = { mostrar: mostrarMapa };
}(window.Ojos = window.Ojos || {}));
