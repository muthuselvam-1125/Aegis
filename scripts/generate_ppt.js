const PptxGenJS = require("pptxgenjs");

let pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';

// Slide 1: Title
let slide1 = pptx.addSlide();
slide1.background = { color: "111111" };
slide1.addText("Weather Disaster Management Platform\n(AEGIS)", {
  x: 1, y: 1.5, w: '80%', h: 1.5,
  fontSize: 44, color: "FFFFFF", bold: true, align: "center"
});
slide1.addText("Presented By:\nMuthuselvam\nArunkumar\n\nGuide: Dr. Jayakumar", {
  x: 1, y: 3.5, w: '80%', h: 2,
  fontSize: 24, color: "CCCCCC", align: "center"
});

// Slide 2: Daily Outlook (7-Day Forecast)
let slide2 = pptx.addSlide();
slide2.background = { color: "111111" };
slide2.addText("Module 1: 7-Day Weather Forecast (Daily Outlook)", { x: 0.5, y: 0.5, fontSize: 32, color: "FFFFFF", bold: true });
slide2.addText("Provides a comprehensive, user-friendly 7-day outlook using live Open-Meteo ensemble models. Features intuitive UI with visual temperature range bars and precise rain probabilities.", { x: 0.5, y: 1.2, w: '90%', fontSize: 20, color: "DDDDDD" });
slide2.addText(`// Key Code Snippet (src/app/(app)/page.tsx)
<PanelHeader kicker="Next 7 days" title="Daily Forecast" />
<DailyList days={fc.daily.slice(0, 7)} />

// Inside DailyList:
<span className="mono text-xs flex items-center gap-1">
  {d.precipProb > 0 && <span className="text-[10px]">💧</span>}
  {d.precipProb > 0 ? \`\${d.precipProb}%\` : ''}
</span>`, { x: 0.5, y: 2.2, w: '90%', h: 2.8, fill: "222222", color: "4ade80", fontSize: 16, fontFace: "Consolas" });

// Slide 3: Interactive Map Module
let slide3 = pptx.addSlide();
slide3.background = { color: "111111" };
slide3.addText("Module 2: Interactive Geographical Map", { x: 0.5, y: 0.5, fontSize: 32, color: "FFFFFF", bold: true });
slide3.addText("Visualizes the exact location, coastal proximity, and elevation. Integrated with Mapbox GL to show dynamic map styles (Light/Dark mode) and pinpoint the user's focus area.", { x: 0.5, y: 1.2, w: '90%', fontSize: 20, color: "DDDDDD" });
slide3.addText(`// Key Code Snippet (src/components/Map.tsx)
import mapboxgl from 'mapbox-gl';

const map = new mapboxgl.Map({
  container: mapContainer.current,
  style: isDark ? 'mapbox://styles/mapbox/dark-v11' : '...',
  center: [lon, lat],
  zoom: 12
});
new mapboxgl.Marker({ color: 'var(--brand)' })
  .setLngLat([lon, lat]).addTo(map);`, { x: 0.5, y: 2.2, w: '90%', h: 2.8, fill: "222222", color: "4ade80", fontSize: 16, fontFace: "Consolas" });

// Slide 4: Disaster Risk Board
let slide4 = pptx.addSlide();
slide4.background = { color: "111111" };
slide4.addText("Module 3: Deterministic Disaster Risk Board", { x: 0.5, y: 0.5, fontSize: 32, color: "FFFFFF", bold: true });
slide4.addText("Calculates risk scores for Flood, Cyclone, Wildfire, etc. based purely on strict meteorological rules applied to live weather data (precipitation, wind, AQI, heat index).", { x: 0.5, y: 1.2, w: '90%', fontSize: 20, color: "DDDDDD" });
slide4.addText(`// Key Code Snippet (src/lib/hazards.ts)
if (hazard === "flood") {
  if (wx.code === "heavy-rain") {
    score += 60;
    drivers.push("Heavy rainfall detected");
  } else if (wx.code === "rain") {
    score += 30;
  }
}
// Outputs context-aware actions and exact drivers.`, { x: 0.5, y: 2.2, w: '90%', h: 2.8, fill: "222222", color: "4ade80", fontSize: 16, fontFace: "Consolas" });

// Slide 5: Hero / Current Conditions
let slide5 = pptx.addSlide();
slide5.background = { color: "111111" };
slide5.addText("Module 4: Real-time Telemetry (Hero)", { x: 0.5, y: 0.5, fontSize: 32, color: "FFFFFF", bold: true });
slide5.addText("Displays live Air Quality (AQI), PM2.5, Wind speeds, UV Index, and current temperature. Uses Open-Meteo's API to fetch instantaneous environmental data.", { x: 0.5, y: 1.2, w: '90%', fontSize: 20, color: "DDDDDD" });
slide5.addText(`// Key Code Snippet (src/lib/wx.ts)
const wxUrl = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current=temperature_2m,relative_humidity_2m...\`;
const res = await fetch(wxUrl);
const data = await res.json();
return {
  tempC: Math.round(data.current.temperature_2m),
  windKph: Math.round(data.current.wind_speed_10m),
  aqi: data.current.us_aqi,
};`, { x: 0.5, y: 2.2, w: '90%', h: 2.8, fill: "222222", color: "4ade80", fontSize: 16, fontFace: "Consolas" });

// Slide 6: Thank you
let slide6 = pptx.addSlide();
slide6.background = { color: "111111" };
slide6.addText("Thank You!", {
  x: 1, y: 2, w: '80%', h: 1.5,
  fontSize: 54, color: "FFFFFF", bold: true, align: "center"
});
slide6.addText("Questions & Feedback", {
  x: 1, y: 3.5, w: '80%', h: 1.5,
  fontSize: 24, color: "CCCCCC", align: "center"
});

const fileName = "Weather_Disaster_Management_Project.pptx";
pptx.writeFile({ fileName: fileName }).then(() => {
  console.log("Successfully created " + fileName);
}).catch(err => {
  console.error(err);
});
