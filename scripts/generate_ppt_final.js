const PptxGenJS = require("pptxgenjs");

let pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';

// Base path for images
const basePath = "C:/Users/acer/.gemini/antigravity-ide/brain/72120aac-3139-4abf-9163-ed05bb947519/.user_uploaded/";

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
slide2.addImage({ path: basePath + "media_1789752442322.png", x: 0.5, y: 0.8, w: 4.8, h: 2.8 });
slide2.addText("Provides real-time surface-level weather conditions, river gauge telemetry, and atmospheric data using Open-Meteo integration.", { x: 0.5, y: 3.8, w: '90%', fontSize: 16, color: "DDDDDD" });
slide2.addText(`// src/lib/wx.ts
export async function currentConditions(lat, lon, now = new Date()) {
  const wxUrl = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current=temperature_2m...\`;
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
slide3.addImage({ path: basePath + "media_1789752555618.png", x: 0.5, y: 0.8, w: 4.8, h: 2.8 });
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
slide4.addImage({ path: basePath + "media_1789752646990.png", x: 0.5, y: 0.8, w: 4.8, h: 2.8 });
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
slide5.addImage({ path: basePath + "media_1789752754671.png", x: 0.5, y: 0.8, w: 4.8, h: 2.8 });
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
slide6.addImage({ path: basePath + "media_1789752816309.png", x: 0.5, y: 0.8, w: 4.8, h: 2.8 });
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
// SLIDE 7: Community & Mutual Aid
// ---------------------------------------------------------
let slide7 = pptx.addSlide();
slide7.background = { color: "111111" };
slide7.addText("Community Ground-Truth & Mutual Aid", { x: 0.5, y: 0.3, fontSize: 24, color: "FFFFFF", bold: true });
slide7.addImage({ path: basePath + "media_1789754130662.png", x: 0.5, y: 0.8, w: 4.8, h: 2.8 });
slide7.addText("Crowdsourced live reports from people on the ground. Clearly separates verified official data from unverified community observations.", { x: 0.5, y: 3.8, w: '90%', fontSize: 16, color: "DDDDDD" });
slide7.addText(`// src/app/(app)/page.tsx
<section id="community">
  <div className="flex items-center gap-4">
    <h2>Live Ground Reports</h2>
    <Button onClick={postReport}>+ Post Report</Button>
  </div>
  <CommunityFeed reports={reports} />
</section>`, { x: 5.5, y: 0.8, w: 4.3, h: 2.8, fill: "222222", color: "4ade80", fontSize: 12, fontFace: "Consolas" });

// ---------------------------------------------------------
// SLIDE 8: Grounded AI Assistant
// ---------------------------------------------------------
let slide8 = pptx.addSlide();
slide8.background = { color: "111111" };
slide8.addText("Context-Aware Grounded Assistant", { x: 0.5, y: 0.3, fontSize: 24, color: "FFFFFF", bold: true });
slide8.addImage({ path: basePath + "media_1789754298346.png", x: 0.5, y: 0.8, w: 4.8, h: 2.8 });
slide8.addText("An AI assistant strictly grounded on the platform's live forecast and active hazard states, ensuring zero hallucination for critical data.", { x: 0.5, y: 3.8, w: '90%', fontSize: 16, color: "DDDDDD" });
slide8.addText(`// src/components/Assistant.tsx
const groundingContext = \`
  Location: \${location.name}
  Weather: \${currentWx.tempC}°C, \${currentWx.code}
  Active Alerts: \${alerts.length}
\`;

<ChatWindow 
  context={groundingContext}
  onPrompt={(q) => queryAI(q, groundingContext)}
/>`, { x: 5.5, y: 0.8, w: 4.3, h: 2.8, fill: "222222", color: "4ade80", fontSize: 12, fontFace: "Consolas" });

// ---------------------------------------------------------
// SLIDE 9: Situational Awareness (Admin)
// ---------------------------------------------------------
let slide9 = pptx.addSlide();
slide9.background = { color: "111111" };
slide9.addText("Situational Awareness Dashboard", { x: 0.5, y: 0.3, fontSize: 24, color: "FFFFFF", bold: true });
slide9.addImage({ path: basePath + "media_1789754369167.png", x: 0.5, y: 0.8, w: 4.8, h: 2.8 });
slide9.addText("Provides an aggregate operational view for coordinators, tracking total active warnings, missing persons, and shelter capacities.", { x: 0.5, y: 3.8, w: '90%', fontSize: 16, color: "DDDDDD" });
slide9.addText(`// src/app/(app)/page.tsx
<DashboardMetrics>
  <MetricCard label="Needs Help" value={stats.needsHelp} />
  <MetricCard label="Unaccounted" value={stats.unaccounted} />
  <MetricCard label="Active Warnings" value={alerts.length} />
  <MetricCard label="Shelter Load" value={\`\${stats.shelterLoad}%\`} />
</DashboardMetrics>`, { x: 5.5, y: 0.8, w: 4.3, h: 2.8, fill: "222222", color: "4ade80", fontSize: 12, fontFace: "Consolas" });

// ---------------------------------------------------------
// SLIDE 10: Settings & Accessibility
// ---------------------------------------------------------
let slide10 = pptx.addSlide();
slide10.background = { color: "111111" };
slide10.addText("Settings & Accessibility", { x: 0.5, y: 0.3, fontSize: 24, color: "FFFFFF", bold: true });
slide10.addImage({ path: basePath + "media_1789754477282.png", x: 0.5, y: 0.8, w: 4.8, h: 2.8 });
slide10.addText("Empowers users with crucial accessibility features including Dark/Light themes, voice alert narration, and reduced motion for low-end devices.", { x: 0.5, y: 3.8, w: '90%', fontSize: 16, color: "DDDDDD" });
slide10.addText(`// src/components/Settings.tsx
<section id="settings">
  <ThemeToggle theme={theme} onChange={setTheme} />
  <Toggle 
    label="Voice alert narration" 
    description="Reads critical alerts aloud for low-vision use"
    checked={voiceAlerts} 
    onChange={setVoiceAlerts} 
  />
</section>`, { x: 5.5, y: 0.8, w: 4.3, h: 2.8, fill: "222222", color: "4ade80", fontSize: 12, fontFace: "Consolas" });

const fileName = "Weather_Disaster_Management_Project_Complete.pptx";
const fullPath = "C:/Users/acer/Downloads/" + fileName;
pptx.writeFile({ fileName: fullPath }).then(() => {
  console.log("Successfully created " + fullPath);
}).catch(err => {
  console.error(err);
});
