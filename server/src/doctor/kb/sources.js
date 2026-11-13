// NASA pages for the AI doctor's knowledge base (owner: Hana Haytham).
// build.js downloads each page, cuts it into chunks and tags every chunk with these fields.
// To add a page: add one line here and run `node src/doctor/kb/build.js` from server/.
//
// type:     risk | research | hazard | context
// category: physiology | behavioral | radiation | overview
// hazards:  NASA's 5 hazards of human spaceflight that the page relates to
// risk:     id of the HRP risk the page belongs to (research pages point to the risk they study)

export const HAZARDS = {
  radiation: 'Space radiation',
  isolation: 'Isolation and confinement',
  distance: 'Distance from Earth',
  gravity: 'Gravity fields',
  environment: 'Hostile/closed environments',
};

const REF = 'https://www.nasa.gov/reference/';

export const SOURCES = [
  // ---- The 17 HRP risks (https://www.nasa.gov/hrp/risks/) ----
  { id: 'immune', type: 'risk', category: 'physiology', title: 'Risk of Altered Immune System Responses', hazards: ['radiation', 'gravity', 'isolation', 'environment'], risk: 'immune', url: REF + 'risk-of-altered-immune-system-responses/' },
  { id: 'sensorimotor', type: 'risk', category: 'physiology', title: 'Risk of Altered Sensorimotor and Vestibular Function', hazards: ['gravity'], risk: 'sensorimotor', url: REF + 'risk-of-altered-sensorimotor-and-vestibular-function/' },
  { id: 'cardiovascular', type: 'risk', category: 'physiology', title: 'Risk of Cardiovascular Adaptations', hazards: ['gravity'], risk: 'cardiovascular', url: REF + 'risk-of-cardiovascular-adaptations/' },
  { id: 'decompression', type: 'risk', category: 'physiology', title: 'Risk of Decompression Sickness', hazards: ['environment'], risk: 'decompression', url: REF + 'risk-of-decompression-sickness/' },
  { id: 'microbes', type: 'risk', category: 'physiology', title: 'Risk of Host-Microorganism Interactions', hazards: ['environment'], risk: 'microbes', url: REF + 'risk-of-host-microorganism-interactions/' },
  { id: 'hypoxia', type: 'risk', category: 'physiology', title: 'Risk of Hypoxia', hazards: ['environment'], risk: 'hypoxia', url: REF + 'risk-of-hypoxia/' },
  { id: 'nutrition', type: 'risk', category: 'physiology', title: 'Risk of Inadequate Food and Nutrition', hazards: ['distance', 'environment'], risk: 'nutrition', url: REF + 'risk-of-inadequate-food-and-nutrition/' },
  { id: 'eva', type: 'risk', category: 'physiology', title: 'Risk of Injury and Compromised Performance from Spacewalks', hazards: ['environment', 'gravity'], risk: 'eva', url: REF + 'risk-of-injury-and-compromised-performance-from-extravehicular-activity-eva/' },
  { id: 'fitness', type: 'risk', category: 'physiology', title: 'Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness', hazards: ['gravity'], risk: 'fitness', url: REF + 'risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/' },
  { id: 'sans', type: 'risk', category: 'physiology', title: 'Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)', hazards: ['gravity'], risk: 'sans', url: REF + 'risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/' },
  { id: 'bone', type: 'risk', category: 'physiology', title: 'Risk of Spaceflight-Induced Bone Changes', hazards: ['gravity'], risk: 'bone', url: REF + 'risk-of-spaceflight-induced-bone-changes/' },
  { id: 'behavioral', type: 'risk', category: 'behavioral', title: 'Risk of Behavioral Changes and Psychiatric Disorders', hazards: ['isolation', 'distance', 'radiation'], risk: 'behavioral', url: REF + 'risk-of-behavioral-conditions-and-psychiatric-disorders/' },
  { id: 'teamwork', type: 'risk', category: 'behavioral', title: 'Risk of Inadequate Teamwork', hazards: ['isolation', 'distance'], risk: 'teamwork', url: REF + 'risk-of-inadequate-teamwork/' },
  { id: 'sleep', type: 'risk', category: 'behavioral', title: 'Risk of Inadequate Sleep and Irregular Schedules', hazards: ['isolation', 'environment'], risk: 'sleep', url: REF + 'risk-from-inadequate-sleep-and-irregular-schedules/' },
  { id: 'systems_support', type: 'risk', category: 'behavioral', title: 'Risk of Inadequate Systems Operations Support', hazards: ['distance'], risk: 'systems_support', url: REF + 'risk-of-inadequate-systems-operations-support/' },
  { id: 'dynamic_loads', type: 'risk', category: 'behavioral', title: 'Risk of Injury from Dynamic Loads', hazards: ['gravity'], risk: 'dynamic_loads', url: REF + 'risk-of-injury-from-dynamic-loads/' },
  { id: 'radiation_cancer', type: 'risk', category: 'radiation', title: 'Risk of Radiation-Induced Cancers', hazards: ['radiation'], risk: 'radiation_cancer', url: REF + 'risk-of-radiation-induced-cancers/' },

  // ---- The 5 hazards (one page) ----
  { id: 'hazards', type: 'hazard', category: 'overview', title: '5 Hazards of Human Spaceflight', hazards: Object.keys(HAZARDS), risk: null, url: 'https://www.nasa.gov/hrp/hazards/' },

  // ---- Research pages (https://www.nasa.gov/hrp/ongoing-hrp-research/) ----
  { id: 'b_complex', type: 'research', category: 'physiology', title: 'B-Complex', hazards: ['gravity'], risk: 'sans', url: REF + 'b-complex/' },
  { id: 'thigh_cuff', type: 'research', category: 'physiology', title: 'Thigh Cuff', hazards: ['gravity'], risk: 'sans', url: REF + 'thigh-cuff/' },
  { id: 'brain_fluid_pressure', type: 'research', category: 'physiology', title: 'Brain Fluid Pressure', hazards: ['gravity'], risk: 'sans', url: REF + 'brain-fluid-pressure/' },
  { id: 'venous_haemostasis', type: 'research', category: 'physiology', title: 'Venous Haemostasis', hazards: ['gravity'], risk: 'cardiovascular', url: REF + 'venous-haemostasis/' },
  { id: 'zero_t2', type: 'research', category: 'physiology', title: 'Zero T2', hazards: ['gravity'], risk: 'fitness', url: REF + 'zero-t2/' },
  { id: 'space_gardening', type: 'research', category: 'behavioral', title: 'Can Space Gardening Help Astronauts Cope with Isolation?', hazards: ['isolation'], risk: 'behavioral', url: 'https://www.nasa.gov/humans-in-space/can-space-gardening-help-astronauts-cope-with-isolation/' },
  { id: 'tempus_pro', type: 'research', category: 'physiology', title: 'Tempus Pro', hazards: ['distance'], risk: 'immune', url: REF + 'tempus-pro/' },
];
