"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  onClick?: () => void;
}

export function AnimatedCard({
  children,
  className,
  hoverScale = 1.02,
  onClick
}: AnimatedCardProps) {
  return (
    <motion.div
      whileHover={{ scale: hoverScale, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className={className} onClick={onClick}>
        {children}
      </Card>
    </motion.div>
  );
}
