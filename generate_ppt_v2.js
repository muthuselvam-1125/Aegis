const PptxGenJS = require("pptxgenjs");

let pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';

// ---------------------------------------------------------
// SLIDE 1: Title
// ---------------------------------------------------------
let slide1 = pptx.addSlide();
slide1.background = { color: "111111" };
slide1.addText("Weather Forecasting and Disaster Management", {
  x: 1, y: 1.5, w: '80%', h: 1.5,
  fontSize: 44, color: "FFFFFF", bold: true, align: "center"
});
slide1.addText("Presented By:\nMuthuselvam\nArunkumar\n\nGuide: Dr. Jayakumar", {
  x: 1, y: 3.5, w: '80%', h: 2,
  fontSize: 24, color: "CCCCCC", align: "center"
});

// ---------------------------------------------------------
// SLIDE 2: First Photo (Hero / Current Conditions)
// ---------------------------------------------------------
let slide2 = pptx.addSlide();
slide2.background = { color: "111111" };
slide2.addText("Live Telemetry & Environmental Monitoring", { x: 0.5, y: 0.3, fontSize: 24, color: "FFFFFF", bold: true });
slide2.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.8, w: 4.8, h: 2.8, fill: { color: "333333" }, line: { color: "666666" } });
slide2.addText("Drag and drop Photo 1 Here", { x: 0.5, y: 1.8, w: 4.8, align: "center", color: "888888" });
slide2.addText("Provides real-time surface-level weather conditions, river gauge telemetry, and atmospheric data using Open-Meteo integration.", { x: 0.5, y: 3.8, w: '90%', fontSize: 16, color: "DDDDDD" });
slide2.addText(`// src/lib/wx.ts
export async function currentConditions(lat, lon, now = new Date()) {
  const wxUrl = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m\`;
  const res = await fetchWithTimeout(wxUrl);
  const data = await res.json();
  return { tempC: data.current.temperature_2m, windKph: data.current.wind_speed_10m };
}`, { x: 5.5, y: 0.8, w: 4.3, h: 2.8, fill: "222222", color: "4ade80", fontSize: 12, fontFace: "Consolas" });

// ---------------------------------------------------------
// SLIDE 3: Second Photo (Map)
// ---------------------------------------------------------
let slide3 = pptx.addSlide();
slide3.background = { color: "111111" };
slide3.addText("Household & Hazard Radar (GIS Map)", { x: 0.5, y: 0.3, fontSize: 24, color: "FFFFFF", bold: true });
slide3.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.8, w: 4.8, h: 2.8, fill: { color: "333333" }, line: { color: "666666" } });
slide3.addText("Drag and drop Photo 2 Here", { x: 0.5, y: 1.8, w: 4.8, align: "center", color: "888888" });
slide3.addText("Interactive spatial visualization utilizing Mapbox GL to track global family member locations and localized environmental threats.", { x: 0.5, y: 3.8, w: '90%', fontSize: 16, color: "DDDDDD" });
slide3.addText(`// src/components/Map.tsx
import mapboxgl from 'mapbox-gl';

export default function RadarMap({ places }) {
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lon, lat], zoom: 4
    });
    // Add markers for all household locations
  }, []);
}`, { x: 5.5, y: 0.8, w: 4.3, h: 2.8, fill: "222222", color: "4ade80", fontSize: 12, fontFace: "Consolas" });

// ---------------------------------------------------------
// SLIDE 4: Third Photo (Active Alerts)
// ---------------------------------------------------------
let slide4 = pptx.addSlide();
slide4.background = { color: "111111" };
slide4.addText("Active Warning & Alert System", { x: 0.5, y: 0.3, fontSize: 24, color: "FFFFFF", bold: true });
slide4.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.8, w: 4.8, h: 2.8, fill: { color: "333333" }, line: { color: "666666" } });
slide4.addText("Drag and drop Photo 3 Here", { x: 0.5, y: 1.8, w: 4.8, align: "center", color: "888888" });
slide4.addText("Consolidates official government warnings and platform-derived deterministic alerts to ensure users receive timely critical notifications.", { x: 0.5, y: 3.8, w: '90%', fontSize: 16, color: "DDDDDD" });
slide4.addText(`// src/lib/data.ts
export async function getAlerts(placeId: string): Promise<Alert[]> {
  // Query official and platform-derived alerts
  const { rows } = await sql\`
    SELECT * FROM alerts 
    WHERE place_id = \${placeId} 
    AND expires_at > NOW()
    ORDER BY severity DESC
  \`;
  return rows as Alert[];
}`, { x: 5.5, y: 0.8, w: 4.3, h: 2.8, fill: "222222", color: "4ade80", fontSize: 12, fontFace: "Consolas" });

// ---------------------------------------------------------
// SLIDE 5: Fourth Photo (Household)
// ---------------------------------------------------------
let slide5 = pptx.addSlide();
slide5.background = { color: "111111" };
slide5.addText("Personal & Household Safety Roster", { x: 0.5, y: 0.3, fontSize: 24, color: "FFFFFF", bold: true });
slide5.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.8, w: 4.8, h: 2.8, fill: { color: "333333" }, line: { color: "666666" } });
slide5.addText("Drag and drop Photo 4 Here", { x: 0.5, y: 1.8, w: 4.8, align: "center", color: "888888" });
slide5.addText("A private household management module tracking family members' live safety status, blood groups, and emergency SOS contacts.", { x: 0.5, y: 3.8, w: '90%', fontSize: 16, color: "DDDDDD" });
slide5.addText(`// src/app/(app)/page.tsx
<HouseholdRoster roster={roster} onStatusUpdate={handleStatusUpdate} />

// Component Logic
function HouseholdRoster({ roster }) {
  return roster.map(member => (
    <div key={member.id} className="flex justify-between items-center">
       <span>{member.name} - {member.bloodGroup}</span>
       <Button variant="danger" onClick={() => triggerSOS(member.id)}>SOS</Button>
    </div>
  ));
}`, { x: 5.5, y: 0.8, w: 4.3, h: 2.8, fill: "222222", color: "4ade80", fontSize: 12, fontFace: "Consolas" });

// ---------------------------------------------------------
// SLIDE 6: Fifth Photo (Preparedness)
// ---------------------------------------------------------
let slide6 = pptx.addSlide();
slide6.background = { color: "111111" };
slide6.addText("Disaster Preparedness & Hazard Guides", { x: 0.5, y: 0.3, fontSize: 24, color: "FFFFFF", bold: true });
slide6.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.8, w: 4.8, h: 2.8, fill: { color: "333333" }, line: { color: "666666" } });
slide6.addText("Drag and drop Photo 5 Here", { x: 0.5, y: 1.8, w: 4.8, align: "center", color: "888888" });
slide6.addText("Provides actionable preparedness protocols and emergency packing lists tailored for different extreme weather and geological events.", { x: 0.5, y: 3.8, w: '90%', fontSize: 16, color: "DDDDDD" });
slide6.addText(`// src/app/(app)/page.tsx
<section id="prepare">
  <h2 className="text-xl">Hazard guides</h2>
  <div className="grid grid-cols-2 gap-4">
    <HazardCard type="Flood" steps={[
      "Move to higher ground",
      "Switch off mains electricity",
      "Keep go-bag charged"
    ]} />
    <HazardCard type="Cyclone" steps={[...]} />
  </div>
</section>`, { x: 5.5, y: 0.8, w: 4.3, h: 2.8, fill: "222222", color: "4ade80", fontSize: 12, fontFace: "Consolas" });

// ---------------------------------------------------------
// SLIDE 7: Empty Page
// ---------------------------------------------------------
let slide7 = pptx.addSlide();
slide7.background = { color: "111111" };
// Left empty as requested

const fileName = "Weather_Disaster_Management_Project_V2.pptx";
const fullPath = "C:\\Users\\acer\\Downloads\\Weather_Disaster_Management_Project_V2.pptx";
pptx.writeFile({ fileName: fullPath }).then(() => {
  console.log("Successfully created " + fullPath);
}).catch(err => {
  console.error(err);
});
