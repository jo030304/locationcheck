// Dimmer.tsx
type DimmerProps = { opacity?: number; z?: number; onClick?: () => void; };

export default function Dimmer({ opacity = 0.4, z = 5, onClick }: DimmerProps) {
  return (
    <div
      className="fixed inset-0"
      style={{ backgroundColor: `rgba(0,0,0,${opacity})`, zIndex: z }}
      onClick={onClick}
      aria-hidden
    />
  );
}
