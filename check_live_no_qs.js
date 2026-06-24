fetch("https://sigasion.pages.dev/")
  .then(r => r.text())
  .then(html => {
    const matches = html.match(/js\/main\.js[^'"\s]*/g);
    console.log("Script src matches:", matches);
  });
