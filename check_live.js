fetch("https://sigasion.pages.dev/?v=" + Date.now())
  .then(r => r.text())
  .then(html => {
    if (html.includes("GestiA3n")) console.log("GestiA3n ESTA en el servidor!");
    if (html.includes("Gestión")) console.log("Gestión (correcto) ESTA en el servidor!");
    const match = html.match(/js\/main\.js\?v=[^\"]+/);
    console.log("Script src:", match ? match[0] : "no match");
  });
