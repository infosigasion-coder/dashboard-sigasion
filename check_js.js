fetch("https://sigasion.pages.dev/js/main.js?v=" + Date.now())
  .then(r => r.text())
  .then(js => {
    if (js.includes("googleLoginBtn.style.display = 'none'")) console.log("FIX DEL BOTON ESTA EN PRODUCCION!");
    else console.log("NO SE ENCONTRO EL FIX DEL BOTON!");
    
    if (js.includes("seccion: currentSeccion")) console.log("FIX DE GETPENDING ESTA EN PRODUCCION!");
    else console.log("NO SE ENCONTRO EL FIX DE GETPENDING!");
  });
