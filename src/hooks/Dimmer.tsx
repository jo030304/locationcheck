// Dimmer.tsx
type DimmerProps = { opacity?: number; z?: number };
export default function Dimmer({ opacity = 0.4, z = 5 }: DimmerProps) {
  return (
    <div
      className="fixed inset-0"
      style={{ backgroundColor: `rgba(0,0,0,${opacity})`, zIndex: z }}
    />
  );
}
