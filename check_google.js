fetch("https://sigasion.pages.dev/js/main.js?v=" + Date.now())
  .then(r => r.text())
  .then(js => {
    const fn = js.match(/async function handleGoogleSignIn[\s\S]+?\}\s*\}/);
    if(fn) console.log(fn[0]);
    else console.log("NO SE ENCONTRO LA FUNCION");
  });
