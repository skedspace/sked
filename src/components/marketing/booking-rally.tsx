"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  CalendarCheck,
  Check,
  Clock3,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export function BookingRally() {
  const stageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const tiltX = useSpring(useTransform(pointerY, [-0.5, 0.5], [4, -4]), {
    stiffness: 100,
    damping: 22,
  });
  const tiltY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-5, 5]), {
    stiffness: 100,
    damping: 22,
  });

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  function resetPointer() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <div
      ref={stageRef}
      className="booking-rally-stage relative mx-auto h-[450px] w-full max-w-[660px] sm:h-[520px] lg:h-[640px]"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      aria-label="Animated preview showing a pickleball court booking becoming confirmed"
      role="img"
    >
      <div className="absolute inset-[8%_3%_6%] rounded-[50%] bg-[#b9f34b]/14 blur-[80px]" />

      <motion.div
        className="absolute inset-x-[3%] top-[7%] bottom-[8%]"
        style={
          reducedMotion
            ? undefined
            : { rotateX: tiltX, rotateY: tiltY, transformPerspective: 1100 }
        }
      >
        <div className="absolute inset-[5%_2%_7%_5%] rotate-[-3deg] rounded-[38px] border border-white/10 bg-white/[0.035] backdrop-blur-sm" />

        <motion.div
          className="absolute top-[6%] left-[3%] z-30 rounded-full border border-white/15 bg-[#081116]/82 px-3 py-2 shadow-2xl backdrop-blur-xl sm:px-4"
          initial={false}
          animate={
            reducedMotion ? undefined : { y: [0, -7, 0], rotate: [-2, 0, -2] }
          }
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.14em] text-white/78 uppercase sm:text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b9f34b] opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-[#b9f34b]" />
            </span>
            Live club activity
          </div>
        </motion.div>

        <div className="absolute inset-x-[9%] top-[14%] bottom-[10%] overflow-hidden rounded-[30px] border border-white/18 bg-[#071015]/88 shadow-[0_45px_120px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 sm:h-16 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#b9f34b] text-[#071004] sm:h-9 sm:w-9">
                <CalendarCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <div>
                <p className="text-xs font-black tracking-[-0.02em] text-white sm:text-sm">
                  Ace Pickleball
                </p>
                <p className="text-[9px] text-white/45 sm:text-[10px]">
                  Live court command
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b9f34b]" />
              <span className="text-[9px] font-bold text-white/65 sm:text-[10px]">
                8 courts online
              </span>
            </div>
          </div>

          <div className="grid h-[calc(100%-3.5rem)] grid-cols-[1fr_78px] sm:h-[calc(100%-4rem)] sm:grid-cols-[1fr_112px]">
            <div className="relative overflow-hidden border-r border-white/10 p-4 sm:p-6">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.16em] text-[#b9f34b] uppercase">
                    Today · 7:00 PM
                  </p>
                  <p className="mt-1 text-lg font-black tracking-[-0.04em] text-white sm:text-2xl">
                    Court 03
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold text-white/45">
                  Open play
                </span>
              </div>

              <div className="rally-court relative aspect-[1.42/1] overflow-hidden rounded-[18px] border border-[#b9f34b]/35 bg-[#b9f34b]/[0.055]">
                <div className="absolute inset-[7%] border-2 border-white/35" />
                <div className="absolute inset-x-[7%] top-1/2 h-px bg-white/45" />
                <div className="absolute top-[7%] bottom-[7%] left-1/2 w-px bg-white/30" />
                <div className="absolute inset-y-[7%] left-[26%] w-px bg-white/20" />
                <div className="absolute inset-y-[7%] right-[26%] w-px bg-white/20" />
                <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 border-y border-white/10 bg-black/25" />

                <motion.div
                  className="absolute top-[18%] left-[15%] z-20 h-5 w-5 rounded-full bg-[#b9f34b] shadow-[0_0_0_5px_rgba(185,243,75,0.12),0_0_28px_rgba(185,243,75,0.75)] sm:h-6 sm:w-6"
                  animate={
                    reducedMotion
                      ? { x: "190%", y: "160%" }
                      : {
                          x: ["0%", "220%", "80%", "280%", "190%"],
                          y: ["0%", "75%", "190%", "230%", "160%"],
                          scale: [1, 0.82, 1.08, 0.86, 1],
                          rotate: [0, 140, 300, 520, 720],
                        }
                  }
                  transition={{
                    duration: 4.8,
                    times: [0, 0.22, 0.48, 0.72, 1],
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 1.4,
                  }}
                >
                  <span className="absolute top-[27%] left-[20%] h-1 w-1 rounded-full bg-[#071004]/35" />
                  <span className="absolute right-[18%] bottom-[23%] h-1 w-1 rounded-full bg-[#071004]/35" />
                </motion.div>

                <motion.div
                  className="absolute right-[12%] bottom-[13%] z-10"
                  animate={
                    reducedMotion
                      ? undefined
                      : { rotate: [10, 10, -28, 10], scale: [1, 1, 1.08, 1] }
                  }
                  transition={{
                    duration: 4.8,
                    times: [0, 0.7, 0.78, 1],
                    repeat: Infinity,
                    repeatDelay: 1.4,
                  }}
                >
                  <div className="h-12 w-9 rotate-[-15deg] rounded-[50%_50%_42%_42%] border border-[#ff8064]/70 bg-[#ff6b4a] shadow-[0_10px_24px_rgba(0,0,0,0.32)] sm:h-14 sm:w-10">
                    <div className="mx-auto mt-2 h-7 w-px bg-white/28" />
                  </div>
                  <div className="mx-auto -mt-1 h-7 w-2 rotate-[14deg] rounded-full bg-[#e7c39d]" />
                </motion.div>

                <div className="absolute bottom-[10%] left-[11%] flex items-center gap-2 rounded-full border border-white/10 bg-[#071015]/75 px-2 py-1 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#b9f34b]" />
                  <span className="text-[8px] font-bold text-white/64">
                    Smart slot detected
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["Utilization", "84%"],
                  ["Bookings", "32"],
                  ["Revenue", "₱18.4k"],
                ].map(([label, value], index) => (
                  <motion.div
                    key={label}
                    className="rounded-xl border border-white/8 bg-white/[0.045] px-2 py-2.5 sm:px-3"
                    animate={
                      reducedMotion
                        ? undefined
                        : { y: [0, index === 1 ? -3 : -1, 0] }
                    }
                    transition={{
                      duration: 3.4,
                      delay: index * 0.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <p className="truncate text-[8px] text-white/38 sm:text-[9px]">
                      {label}
                    </p>
                    <p className="mt-0.5 text-[11px] font-black text-white sm:text-sm">
                      {value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 p-2.5 sm:p-4">
              <p className="text-[8px] font-bold tracking-[0.13em] text-white/35 uppercase">
                Next up
              </p>
              {[
                ["7:00", "C3", true],
                ["8:00", "C1", false],
                ["9:30", "C5", false],
              ].map(([time, court, active]) => (
                <div
                  key={String(time)}
                  className={`rounded-xl border p-2.5 ${
                    active
                      ? "border-[#b9f34b]/35 bg-[#b9f34b]/10"
                      : "border-white/8 bg-white/[0.025]"
                  }`}
                >
                  <p
                    className={`text-[10px] font-black ${
                      active ? "text-[#b9f34b]" : "text-white/65"
                    }`}
                  >
                    {time}
                  </p>
                  <p className="mt-1 text-[8px] text-white/35">{court}</p>
                </div>
              ))}
              <div className="mt-auto rounded-xl bg-[#b9f34b] p-2.5 text-[#071004]">
                <TrendingUp className="h-3 w-3" />
                <p className="mt-1 text-[9px] leading-tight font-black">
                  Peak hour
                </p>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          className="absolute right-[1%] bottom-[4%] z-40 w-[210px] rounded-2xl border border-white/16 bg-[#f7f6ef] p-3.5 text-[#071004] shadow-[0_26px_70px_rgba(0,0,0,0.4)] sm:w-[250px] sm:p-4"
          initial={false}
          animate={
            reducedMotion
              ? undefined
              : {
                  y: [18, 18, 0, 0, 18],
                  opacity: [0, 0, 1, 1, 0],
                  scale: [0.94, 0.94, 1, 1, 0.96],
                }
          }
          transition={{
            duration: 6.2,
            times: [0, 0.56, 0.66, 0.9, 1],
            repeat: Infinity,
            ease,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#b9f34b]">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.12em] text-[#537812] uppercase">
                Booking confirmed
              </p>
              <p className="mt-0.5 truncate text-sm font-black">
                Mia + 3 friends
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-3 border-t border-black/8 pt-3 text-[9px] font-bold text-black/48">
            <span className="flex items-center gap-1">
              <Clock3 className="h-3 w-3" /> 7:00 PM
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> Court 03
            </span>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-[1%] right-[2%] z-40 hidden items-center gap-2 rounded-full bg-[#ff6b4a] px-4 py-2.5 text-[10px] font-black tracking-[0.08em] text-white uppercase shadow-[0_18px_40px_rgba(255,107,74,0.28)] sm:flex"
          animate={
            reducedMotion ? undefined : { y: [0, -8, 0], rotate: [2, -1, 2] }
          }
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Make every court count
        </motion.div>
      </motion.div>
    </div>
  );
}
