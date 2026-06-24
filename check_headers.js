fetch("https://sigasion.pages.dev/")
  .then(r => {
    console.log("Cache-Control:", r.headers.get("cache-control"));
    console.log("CF-Cache-Status:", r.headers.get("cf-cache-status"));
    console.log("Age:", r.headers.get("age"));
  });
