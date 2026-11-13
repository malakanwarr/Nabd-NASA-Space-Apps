// "Laila drew you a rocket" (owner: Habiba): a child's crayon drawing as an SVG on a paper card.
// Wobbly hand-drawn lines, drawn twice with a slight offset like a crayon pressed twice, and a rough
// edge from a small displacement filter. Colors come from the theme variables (see .paper in styles.module.css).
// Coordinates are SVG units on a 240 x 180 canvas.
export default function RocketDrawing({ label }) {
  return (
    <svg viewBox="0 0 240 180" role="img" aria-label={label}>
      <defs>
        <filter id="crayon" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="2.2" />
        </filter>
      </defs>
      <g filter="url(#crayon)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Stars: little wobbly crosses and one star */}
        <g stroke="var(--crayon-yellow)" strokeWidth="3.5">
          <path d="M30 30 L31 44 M24 37 L38 36" />
          <path d="M200 26 L201 38 M195 32 L207 31" />
          <path d="M208 110 L209 120 M203 115 L213 114" />
          <path d="M40 120 L41 130 M35 125 L46 124" />
        </g>
        <path stroke="var(--crayon-yellow)" strokeWidth="3.5" d="M168 56 L172 66 L183 67 L174 74 L178 85 L168 78 L159 86 L162 74 L153 67 L164 66 Z" />

        {/* Flame, scribbled in */}
        <path stroke="var(--crayon-orange)" strokeWidth="4" d="M104 128 C98 142 100 150 108 163 C112 154 118 156 121 146 C125 154 128 150 132 162 C140 148 138 140 134 128" />
        <path stroke="var(--crayon-yellow)" strokeWidth="3" d="M111 131 C109 140 112 145 117 150 C121 144 124 141 124 131" />
        <path stroke="var(--crayon-orange)" strokeWidth="2.5" d="M110 134 L124 137 M111 141 L123 143" />

        {/* Fins */}
        <path stroke="var(--crayon-pink)" strokeWidth="4" d="M97 104 C86 108 82 120 80 132 C90 128 96 126 104 124" />
        <path stroke="var(--crayon-pink)" strokeWidth="4" d="M139 104 C151 108 156 119 158 132 C148 128 142 126 134 124" />

        {/* Body, drawn twice a little off */}
        <path stroke="var(--crayon-blue)" strokeWidth="4.5" d="M119 22 C94 44 90 82 98 128 C108 131 130 130 140 127 C148 84 142 44 119 22 Z" />
        <path stroke="var(--crayon-blue)" strokeWidth="2" opacity="0.6" d="M120 25 C97 46 94 84 101 125 C110 128 128 128 137 125 C144 86 139 47 120 25 Z" />

        {/* Window and stripes */}
        <circle cx="119" cy="70" r="14" stroke="var(--crayon-purple)" strokeWidth="4" />
        <path stroke="var(--crayon-pink)" strokeWidth="3" d="M101 108 C112 112 128 111 138 107" />
        <path stroke="var(--crayon-pink)" strokeWidth="3" d="M100 116 C111 120 129 119 139 115" />

        {/* A smile in the window, because Laila drew it */}
        <path stroke="var(--crayon-purple)" strokeWidth="2.5" d="M112 73 C116 79 122 79 126 73" />
      </g>
    </svg>
  );
}
