type IconBadgeSize = "sm" | "md";

interface IconBadgeProps {
  icon: React.ElementType;
  iconColor: string;
  background: string;
  size?: IconBadgeSize;
  border?: string;
  strokeWidth?: number;
  className?: string;
}

const SIZE_CLASSES: Record<IconBadgeSize, { container: string; icon: string }> = {
  sm: { container: "w-8 h-8", icon: "w-4 h-4" },
  md: { container: "w-9 h-9", icon: "w-4 h-4" },
};

export function IconBadge({
  icon: Icon,
  iconColor,
  background,
  size = "md",
  border,
  strokeWidth = 1.5,
  className = "",
}: Readonly<IconBadgeProps>) {
  const { container, icon } = SIZE_CLASSES[size];

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center rounded-[10px] ${container} ${className}`}
      style={{ background, border }}
    >
      <Icon className={icon} style={{ color: iconColor }} strokeWidth={strokeWidth} />
    </div>
  );
}
