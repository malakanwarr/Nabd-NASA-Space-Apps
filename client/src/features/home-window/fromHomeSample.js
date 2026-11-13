// Fallback for the Home window when the sample-data request is unavailable.
export const FROM_HOME_FALLBACK = {
  localTime: '19:40', // story time at home: the Earth picture is Cairo at 7:40 pm
  city: 'Cairo',
  period: 'evening',
  delayMinutes: 18,
  messages: [
    {
      id: 'mom-voice',
      kind: 'voice',
      title: 'Voice message from Mom',
      when: '2 days ago',
      mediaUrl: '/demo/empty-message.mp4',
      demoPlaceholder: true,
    },
    {
      id: 'laila-rocket',
      kind: 'photo',
      title: 'Laila drew you a rocket',
      when: 'Photo · yesterday',
      mediaUrl: '/demo/empty-photo.png',
      alt: 'Blank demo photo placeholder',
    },
  ],
};
