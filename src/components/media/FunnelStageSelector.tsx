import { motion } from 'framer-motion';
import { FunnelStage, FUNNEL_STAGES } from '@/types/media';
import { cn } from '@/lib/utils';

interface FunnelStageSelectorProps {
  value: FunnelStage;
  onChange: (stage: FunnelStage) => void;
}

export function FunnelStageSelector({ value, onChange }: FunnelStageSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Etapa do Funil *</label>
      <div className="grid grid-cols-3 gap-3">
        {FUNNEL_STAGES.map((stage) => (
          <motion.button
            key={stage.value}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(stage.value)}
            className={cn(
              "relative p-4 rounded-lg border-2 text-left transition-all",
              value === stage.value
                ? stage.color + " border-current"
                : "bg-muted/30 border-border hover:border-muted-foreground/50"
            )}
          >
            {value === stage.value && (
              <motion.div
                layoutId="funnel-indicator"
                className="absolute inset-0 rounded-lg ring-2 ring-current ring-offset-2 ring-offset-background"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className="relative">
              <div className="font-semibold mb-1">{stage.label}</div>
              <div className="text-xs opacity-80">{stage.description}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}