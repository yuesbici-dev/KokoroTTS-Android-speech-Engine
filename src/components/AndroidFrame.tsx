import React from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  activeScreen: string;
  isDarkTheme?: boolean;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  activeScreen,
  isDarkTheme = true,
}) => {
  // Format current device time (e.g. 10:08)
  const [timeStr, setTimeStr] = React.useState('10:08');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[420px] rounded-[48px] p-3 shadow-2xl transition-all duration-300 ring-1 ring-slate-800 bg-slate-950">
      {/* Outer Aluminum Bezel */}
      <div className="relative flex h-[780px] w-full flex-col overflow-hidden rounded-[40px] bg-slate-900 border border-slate-800">
        
        {/* Android Status Bar */}
        <div className="relative z-30 flex h-9 w-full shrink-0 items-center justify-between px-6 pt-1 text-xs font-medium text-slate-300 select-none">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] tracking-tight">{timeStr}</span>
          </div>

          {/* Front Camera Punch Hole */}
          <div className="absolute left-1/2 top-2 h-4 w-4 -translate-x-1/2 rounded-full bg-black ring-1 ring-slate-800 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-900/80"></div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Signal className="h-3.5 w-3.5" />
            <Wifi className="h-3.5 w-3.5" />
            <BatteryMedium className="h-4 w-4 text-slate-300" />
          </div>
        </div>

        {/* Jetpack Compose Screen Viewport */}
        <div className={`relative flex flex-1 flex-col overflow-hidden ${isDarkTheme ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
          {children}
        </div>

        {/* Android 15 Gesture Bar */}
        <div className="flex h-5 w-full shrink-0 items-center justify-center bg-slate-900 pb-1">
          <div className="h-1 w-32 rounded-full bg-slate-600/70"></div>
        </div>
      </div>
    </div>
  );
};
