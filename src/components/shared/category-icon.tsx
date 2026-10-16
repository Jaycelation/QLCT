import {
  Baby,
  Briefcase,
  Car,
  Circle,
  CircleEllipsis,
  Clapperboard,
  Coffee,
  Coins,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Users,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-bag": ShoppingBag,
  car: Car,
  receipt: Receipt,
  clapperboard: Clapperboard,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  house: House,
  users: Users,
  plane: Plane,
  shirt: Shirt,
  gift: Gift,
  coffee: Coffee,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  "paw-print": PawPrint,
  baby: Baby,
  wrench: Wrench,
  briefcase: Briefcase,
  "trending-up": TrendingUp,
  coins: Coins,
  "piggy-bank": PiggyBank,
  landmark: Landmark,
  "circle-ellipsis": CircleEllipsis,
};

export function IconGlyph({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Circle;
  return <Icon className={className} aria-hidden />;
}

/** Colored rounded badge with the category/goal icon. Color comes from a validated hex value. */
export function CategoryIcon({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        size === "sm" && "size-7 [&_svg]:size-3.5",
        size === "md" && "size-9 [&_svg]:size-4",
        size === "lg" && "size-11 [&_svg]:size-5",
        className,
      )}
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <IconGlyph name={icon} />
    </span>
  );
}
