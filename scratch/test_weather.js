const start = Date.now();
fetch("https://api.open-meteo.com/v1/forecast?latitude=9.45&longitude=77.8&current=temperature_2m")
  .then(r => r.json())
  .then(d => {
    console.log("Time taken:", Date.now() - start, "ms");
    console.log(d.current.temperature_2m);
  })
  .catch(console.error);
