import { useMemo } from "react";

/**
 * Confetti, built out of divs.
 *
 * Duolingo fires something celebratory at the moment a run extends, and that
 * moment is the entire reason anybody comes back tomorrow. No library and no
 * canvas: a dozen absolutely-positioned squares, each given a random angle and
 * distance once, thrown outward by a single keyframe.
 */
export function Burst({ colours }: { colours: string[] }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 60 + Math.random() * 90;
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 30,
          spin: Math.round((Math.random() - 0.5) * 540),
          delay: Math.random() * 90,
          size: 5 + Math.round(Math.random() * 5),
          colour: colours[i % colours.length],
        };
      }),
    [colours],
  );

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {bits.map((b, i) => (
        <span
          key={i}
          className="absolute top-1/2 left-1/2 block rounded-[2px]"
          style={{
            width: b.size,
            height: b.size,
            background: b.colour,
            animation: `fly 900ms cubic-bezier(0.16, 1, 0.3, 1) ${b.delay}ms both`,
            // Read by the keyframe, so every bit flies its own way.
            ["--fx" as string]: `${b.x}px`,
            ["--fy" as string]: `${b.y}px`,
            ["--fr" as string]: `${b.spin}deg`,
          }}
        />
      ))}
    </span>
  );
}
