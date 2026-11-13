// Fallback for the Home window (owner: Habiba).
// The screen asks for getSampleData('from-home') first. data/from-home.json does not exist yet, so until
// Malak adds it (same shape as below) this local copy is used. Remove this file once that data file exists.
export const FROM_HOME_FALLBACK = {
  localTime: '19:40', // story time at home: the Earth picture is Cairo at 7:40 pm
  city: 'Cairo',
  period: 'evening',
  delayMinutes: 18,
  messages: [
    { id: 'mom-voice', kind: 'voice', title: 'Voice message from Mom', when: '2 days ago' },
    { id: 'laila-rocket', kind: 'photo', title: 'Laila drew you a rocket', when: 'Photo · yesterday' },
  ],
};
