"use client";

import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FeatureItem {
  id: number;
  title: string;
  image: string;
  description: string;
}

const defaultFeatures: FeatureItem[] = [
  {
    id: 1,
    title: "Court scheduling",
    image: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=600&q=80",
    description:
      "Members see real-time court availability and book instantly. Set durations, buffers, and court rotation rules — everything runs on autopilot.",
  },
  {
    id: 2,
    title: "Member management",
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80",
    description:
      "Track players, membership tiers, booking history, and no-shows. Know who's on your courts and when — with full player profiles and activity logs.",
  },
  {
    id: 3,
    title: "Smart payments",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80",
    description:
      "Collect court fees, memberships, or deposits at booking time. Supports cards and GCash — so you get paid before players step on the court.",
  },
  {
    id: 4,
    title: "Round robins & events",
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80",
    description:
      "Set up round robin sessions, clinics, and tournaments. Players register, pay, and get paired — all from your SKED page.",
  },
  {
    id: 5,
    title: "Automated reminders",
    image: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=600&q=80",
    description:
      "SMS and email reminders cut no-shows dramatically. Players confirm, reschedule, or cancel with one tap — freeing up courts for others.",
  },
];

export const FeatureAccordion = ({
  features = defaultFeatures,
}: {
  features?: FeatureItem[];
}) => {
  const [activeImage, setActiveImage] = useState(features[0]?.image ?? defaultFeatures[0]?.image ?? "");

  return (
    <section>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex w-full flex-col items-start gap-12 lg:flex-row">
          <div className="w-full lg:w-1/2">
            <Accordion type="single" defaultValue="item-1">
              {features.map((tab) => (
                <AccordionItem key={tab.id} value={`item-${tab.id}`}>
                  <AccordionTrigger
                    onClick={() => setActiveImage(tab.image)}
                    className="cursor-pointer py-5 !no-underline transition"
                  >
                    <h6
                      className={`text-left text-xl font-bold tracking-[-0.03em] transition-colors ${
                        tab.image === activeImage
                          ? "text-[#171a16]"
                          : "text-[#6e716b]"
                      }`}
                    >
                      {tab.title}
                    </h6>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mt-2 text-base leading-7">
                      {tab.description}
                    </p>
                    <div className="mt-6 lg:hidden">
                      <img
                        src={tab.image}
                        alt={tab.title}
                        className="h-full max-h-72 w-full rounded-2xl object-cover"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="relative m-auto hidden w-1/2 overflow-hidden rounded-2xl lg:block">
            <img
              src={activeImage}
              alt="Feature preview"
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[0_12px_40px_rgba(23,26,22,0.10)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
