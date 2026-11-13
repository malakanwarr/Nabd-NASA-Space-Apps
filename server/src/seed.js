// Seed script (Malak). Stub: will load data/mood-checkins.json and the four crew members into MongoDB.
import 'dotenv/config';

// Demo crew (PINs from data/crew.json).
const crew = [
  { id: 'sara', name: 'Sara Haddad', pin: '1404' },
  { id: 'adam', name: 'Adam Kareem', pin: '2201' },
  { id: 'mei', name: 'Mei Chen', pin: '3302' },
  { id: 'lucas', name: 'Lucas Martin', pin: '4403' },
];

console.log('Seed is not implemented yet. Would load', crew.length, 'crew members and data/mood-checkins.json.');
// TODO: connect with db.js, then insert crew (Crew model) and mood check-ins (MoodCheckin model).
