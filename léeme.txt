SITIO WEB PERSONAL
==================

TECNOLOGIAS
-----------

HTML5
Se utiliza para estructurar las cinco paginas con elementos semanticos y
accesibles. Sus elementos nativos permiten incorporar imagenes adaptables,
audio y video sin instalar complementos.

CSS
Se utiliza para definir la presentacion y adaptar la distribucion del
contenido a pantallas de escritorio y moviles. Las hojas de estilo estan
separadas por pagina y comparten reglas generales.

CARACTERISTICAS MODERNAS DE CSS
-------------------------------

Se usan variables CSS para centralizar colores y espaciados, Grid y Flexbox para
la maquetacion, el anidamiento (nesting) para agrupar las reglas de cada
componente y una consulta de contenedor (@container) en la portada para que las
tarjetas se adapten al ancho real del contenido. Todo es CSS estandar, sin
preprocesadores ni dependencias.

IMAGENES RESPONSIVE
-------------------

La fotografia personal utiliza el elemento picture para elegir entre cuatro
archivos segun el ancho de pantalla: img_movil.jpeg, img_tablet.jpeg,
img_portatil.jpeg e img_escritorio.jpeg. Cada imagen se muestra a su tamaño
intrinseco; los atributos width y height reservan espacio durante la carga.

Las fotografias de Japon se sirven desde Unsplash, un servicio externo de
alojamiento de imagenes. Los parametros w y h solicitan el ancho y el alto en
pixeles; picture selecciona una variante segun el ancho de pantalla. Se
incluyen las dimensiones en el HTML para reservar espacio durante la carga.

El CSS no escala las imagenes. El video conserva max-width: 100% y height: auto
para ajustarse a la pantalla sin perder su proporcion. Su poster es
imagen/kyoto_poster.jpeg.

HERRAMIENTAS Y DEPENDENCIAS
---------------------------

El sitio no utiliza bibliotecas JavaScript ni frameworks. Se prefieren las
funciones nativas del navegador para reducir dependencias y facilitar el
desarrollo.

Google Fonts sirve la familia tipografica Roboto. Se incluyen fuentes
alternativas del sistema para que el texto siga siendo legible si el servicio
no esta disponible. Unsplash aporta las fotografias de Japon y requiere
conexion a Internet para cargarlas.

CONTENIDO
--------------------------------

El sitio consta de cinco paginas: inicio, sobre mi, viajes, musica y formacion.
Incluye datos personales, fotografia personal, fotografias de viajes, un video
y varios audios de canciones.

Los audios de musica.html son fragmentos breves (de unos 15 a 60 segundos) de
cada cancion, comprimidos para reducir el peso del sitio. El titulo de cada uno
lo indica con la palabra "fragmento".
