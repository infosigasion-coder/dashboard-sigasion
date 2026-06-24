fetch("https://sigasion.pages.dev/")
  .then(r => r.text())
  .then(html => {
    const lines = html.split("\n");
    for(let i=0; i<lines.length; i++) {
      if(lines[i].includes("students") || lines[i].includes("Gesti") || lines[i].includes("Estudiantes")) {
        console.log(i + ": " + lines[i].trim());
      }
    }
  });
