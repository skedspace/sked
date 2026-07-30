"use client";
import React from "react";

type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={`testimonials-column-group ${props.className || ""}`}>
      <div
        className="testimonials-column-scroll flex flex-col gap-6 pb-6"
        style={
          {
            "--scroll-duration": `${props.duration || 10}s`,
          } as React.CSSProperties
        }
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div
                  className="shadow-primary/10 hover:shadow-primary/20 hover:border-primary/40 hover:bg-card testimonial-card w-full max-w-xs rounded-3xl border p-10 shadow-lg transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl"
                  key={i}
                >
                  <div>{text}</div>
                  <div className="mt-5 flex items-center gap-2">
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={name}
                      className="h-10 w-10 rounded-full"
                    />
                    <div className="flex flex-col">
                      <div className="leading-5 font-medium tracking-tight">
                        {name}
                      </div>
                      <div className="leading-5 tracking-tight opacity-60">
                        {role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </div>
    </div>
  );
};
